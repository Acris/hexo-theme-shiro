;(() => {
    'use strict';

    const shiro = window.__shiro || {};
    const rt = shiro.runtime || window.__shiroRuntime;
    if (!rt) return;
    const get = rt.get || shiro.get || ((k) => window['__' + k] || window[k]);

    const script = get('lightgalleryScript') || '';
    if (!script) return;

    const {
        createFeatureLoader,
        bindIntentWarm,
        isSafeImageUrl,
        isDecorativeImg,
        imageSource,
        connectionAllowsWarm,
        scheduleIdleWarm
    } = rt;

    let warmed = false;
    let unbindWarm = null;

    const feature = createFeatureLoader({
        id: 'lightgallery',
        src: script,
        onReady: () => {
            cleanupBootstrapListeners();
        },
        onError: () => {
            warmed = false;
            window.__shiroLightGalleryAutoOpen = null;
            window.__shiroLightGalleryWarmRequested = false;
            shiro.lightGalleryAutoOpen = null;
            shiro.lightGalleryWarmRequested = false;
        }
    });

    function shouldHandleImage(img) {
        const src = imageSource(img);
        return isSafeImageUrl(src) && !isDecorativeImg(img);
    }

    function qualifyingImage(target) {
        if (!target || !target.closest) return null;

        const prose = target.closest('.prose-shiro');
        if (!prose) return null;

        const img = target.closest('img');
        if (!img || !prose.contains(img)) return null;
        if (!shouldHandleImage(img)) return null;
        return img;
    }

    function cleanupBootstrapListeners() {
        document.removeEventListener('click', handleClick, true);
        if (typeof unbindWarm === 'function') {
            unbindWarm();
            unbindWarm = null;
        }
    }

    function loadGallery() {
        // Concurrent load() shares one promise (createFeatureLoader).
        feature.load();
    }

    function warm() {
        if (warmed) return;
        warmed = true;
        if (typeof unbindWarm === 'function') {
            unbindWarm();
            unbindWarm = null;
        }

        const openFn = shiro.lightGalleryOpen || window.__shiroLightGalleryOpen;
        if (openFn) {
            const warmFn = shiro.lightGalleryWarm || window.__shiroLightGalleryWarm;
            if (typeof warmFn === 'function') warmFn();
            return;
        }

        window.__shiroLightGalleryWarmRequested = true;
        shiro.lightGalleryWarmRequested = true;
        loadGallery();
    }

    function open(target) {
        const openFn2 = shiro.lightGalleryOpen || window.__shiroLightGalleryOpen;
        if (openFn2) {
            openFn2(target);
            cleanupBootstrapListeners();
            return;
        }

        window.__shiroLightGalleryAutoOpen = target;
        shiro.lightGalleryAutoOpen = target;
        loadGallery();
    }

    function handleClick(event) {
        const img = qualifyingImage(event.target);
        if (!img) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        open(img);
    }

    function intentShouldWarm(event) {
        const target = event.target;
        if (!target || !target.closest) return false;

        const prose = target.closest('.prose-shiro');
        if (!prose) return false;

        let img = target.closest('img');
        if ((!img || !prose.contains(img)) && target.querySelector) {
            img = target.querySelector('img');
        }
        return !!(img && prose.contains(img) && shouldHandleImage(img));
    }

    function proactiveWarm() {
        if (warmed || !connectionAllowsWarm()) return;
        scheduleIdleWarm(() => warm());
    }

    function firstGalleryImage() {
        const images = document.querySelectorAll('.prose-shiro img');
        for (let i = 0; i < images.length; i += 1) {
            if (shouldHandleImage(images[i])) return images[i];
        }
        return null;
    }

    function scheduleProactiveWarm() {
        const firstImage = firstGalleryImage();
        if (!firstImage) return;

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    observer.disconnect();
                    proactiveWarm();
                }
            }, { rootMargin: '300px' });
            observer.observe(firstImage);
        } else {
            proactiveWarm();
        }
    }

    document.addEventListener('click', handleClick, true);
    unbindWarm = bindIntentWarm(() => warm(), {
        capture: true,
        shouldWarm: intentShouldWarm
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleProactiveWarm, { once: true });
    } else {
        scheduleProactiveWarm();
    }
})();
