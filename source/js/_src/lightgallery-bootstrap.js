;(() => {
    'use strict';

    // Bootstrap owns document capture clicks for the page lifetime (hardFail only
    // unbinds). Feature installs lightGalleryOpen/Warm + CDN — no second click path.
    const shiro = window.__shiro || {};
    const rt = shiro.runtime;
    if (!rt || typeof rt.get !== 'function') return;

    const lg = rt.get('lightgallery') || {};
    const script = String(lg.script || '').trim();
    if (!script) return;

    const {
        createFeatureLoader,
        bindIntentWarm,
        isSafeImageUrl,
        isDecorativeImg,
        hasConflictingImageAction,
        imageSource,
        isModifiedClick,
        navigateFromImage,
        dispatchLiveOrStash,
        dispatchLiveOrWarm,
        connectionAllowsWarm,
        scheduleIdleWarm
    } = rt;

    let warmed = false;
    let failed = false;
    let unbindWarm = null;

    function unbindIntentWarm() {
        if (typeof unbindWarm === 'function') {
            unbindWarm();
            unbindWarm = null;
        }
    }

    function cleanupAllListeners() {
        document.removeEventListener('click', handleClick, true);
        unbindIntentWarm();
    }

    function hardFail() {
        if (failed) return;
        failed = true;
        warmed = false;
        cleanupAllListeners();
        const pending = shiro.lightGalleryAutoOpen;
        shiro.lightGalleryAutoOpen = null;
        shiro.lightGalleryWarmRequested = false;
        if (pending) navigateFromImage(pending);
    }

    function fallbackPendingClick() {
        const pending = shiro.lightGalleryAutoOpen;
        shiro.lightGalleryAutoOpen = null;
        if (pending) navigateFromImage(pending);
    }

    // onReady: feature open/warm installed — drop intent warm only (keep click capture).
    // Permanent errors (abort/timeout) hardFail; network fetch remains retryable.
    const feature = createFeatureLoader({
        id: 'lightgallery',
        src: script,
        onReady: unbindIntentWarm,
        onError: (error, meta) => {
            if (meta && meta.permanent) {
                hardFail();
                return;
            }
            fallbackPendingClick();
            console.warn('[shiro-lightgallery] load failed (retryable)', error);
        }
    });

    function shouldHandleImage(img) {
        const src = imageSource(img);
        return isSafeImageUrl(src)
            && !isDecorativeImg(img)
            && !hasConflictingImageAction(img);
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

    function loadGallery() {
        if (failed) return;
        feature.load();
    }

    function warm() {
        const path = dispatchLiveOrWarm({
            failed: failed,
            done: warmed,
            live: shiro.lightGalleryWarm,
            markPending: () => {
                shiro.lightGalleryWarmRequested = true;
            },
            load: loadGallery
        });
        if (path === 'skip') return;
        warmed = true;
        unbindIntentWarm();
    }

    function open(target) {
        dispatchLiveOrStash({
            failed: failed,
            live: shiro.lightGalleryOpen,
            target: target,
            // Last click wins while the feature script is still loading.
            stash: (img) => {
                shiro.lightGalleryAutoOpen = img;
            },
            load: loadGallery,
            navigate: navigateFromImage
        });
    }

    function handleClick(event) {
        if (failed || isModifiedClick(event)) return;

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
