;(() => {
    'use strict';

    const shiro = window.__shiro || {};
    const rt = shiro.runtime || window.__shiroRuntime;
    if (!rt) return;
    const get = rt.get || shiro.get || (() => undefined);

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
    let failed = false;
    let unbindWarm = null;

    function navigateFromImage(img) {
        if (!img || !img.closest) return;
        const link = img.closest('a');
        const original = link
            ? (link.getAttribute('data-shiro-original-href') || link.getAttribute('href') || '').trim()
            : '';
        const src = (imageSource(img) || '').trim();
        const href = original || src;
        if (!href) return;

        if (/^(?:javascript|vbscript|data):/i.test(href) || /[\u0000-\u001F\u007F]/.test(href)) {
            return;
        }
        if (/^https?:\/\//i.test(href) || href.indexOf('//') === 0) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return;
        }
        window.location.href = href;
    }

    function hardFail() {
        if (failed) return;
        failed = true;
        warmed = false;
        cleanupBootstrapListeners();
        const pending = shiro.lightGalleryAutoOpen;
        shiro.lightGalleryAutoOpen = null;
        shiro.lightGalleryWarmRequested = false;
        if (pending) navigateFromImage(pending);
    }

    const feature = createFeatureLoader({
        id: 'lightgallery',
        src: script,
        onReady: () => {
            cleanupBootstrapListeners();
        },
        onError: hardFail
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
        if (failed) return;
        feature.load();
    }

    function warm() {
        if (failed || warmed) return;
        warmed = true;
        if (typeof unbindWarm === 'function') {
            unbindWarm();
            unbindWarm = null;
        }

        const openFn = shiro.lightGalleryOpen;
        if (openFn) {
            const warmFn = shiro.lightGalleryWarm;
            if (typeof warmFn === 'function') warmFn();
            return;
        }

        shiro.lightGalleryWarmRequested = true;
        loadGallery();
    }

    function open(target) {
        if (failed) {
            navigateFromImage(target);
            return;
        }

        const openFn = shiro.lightGalleryOpen;
        if (openFn) {
            openFn(target);
            cleanupBootstrapListeners();
            return;
        }

        shiro.lightGalleryAutoOpen = target;
        loadGallery();
    }

    function handleClick(event) {
        if (failed) return;

        const img = qualifyingImage(event.target);
        if (!img) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        open(img);
    }

    function intentShouldWarm(event) {
        if (failed) return false;
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
        if (failed || warmed || !connectionAllowsWarm()) return;
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
