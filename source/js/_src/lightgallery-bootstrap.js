;(() => {
    'use strict';

    const rt = window.__shiroRuntime;
    if (!rt) return;

    const script = window.__lightgalleryScript || '';
    if (!script) return;

    const {
        loadBootstrapScript,
        isSafeImageUrl,
        isDecorativeImg,
        imageSource,
        connectionAllowsWarm,
        scheduleIdleWarm
    } = rt;

    let loading = false;
    let warmed = false;

    function shouldHandleImage(img) {
        const src = imageSource(img);
        return isSafeImageUrl(src) && !isDecorativeImg(img);
    }

    // Resolve the qualifying gallery image for a click target, or null.
    function qualifyingImage(target) {
        if (!target || !target.closest) return null;

        const prose = target.closest('.prose-shiro');
        if (!prose) return null;

        const img = target.closest('img');
        if (!img || !prose.contains(img)) return null;
        if (!shouldHandleImage(img)) return null;
        return img;
    }

    function cleanupWarmListeners() {
        document.removeEventListener('pointerover', handleIntent, true);
        document.removeEventListener('pointerdown', handleIntent, true);
        document.removeEventListener('focusin', handleIntent, true);
    }

    function cleanupBootstrapListeners() {
        document.removeEventListener('click', handleClick, true);
        cleanupWarmListeners();
    }

    function loadGallery() {
        loading = true;
        loadBootstrapScript(script, {
            onload: cleanupBootstrapListeners,
            onerror: () => {
                loading = false;
                warmed = false;
                window.__shiroLightGalleryAutoOpen = null;
                window.__shiroLightGalleryWarmRequested = false;
            }
        });
    }

    // Eagerly fetch the gallery script and CDN assets on the first hint of
    // intent (hover / press / focus) so the click itself opens instantly.
    function warm() {
        if (warmed) return;
        warmed = true;
        cleanupWarmListeners();

        if (window.__shiroLightGalleryOpen) {
            if (typeof window.__shiroLightGalleryWarm === 'function') window.__shiroLightGalleryWarm();
            return;
        }
        if (loading) return;

        window.__shiroLightGalleryWarmRequested = true;
        loadGallery();
    }

    function open(target) {
        if (window.__shiroLightGalleryOpen) {
            window.__shiroLightGalleryOpen(target);
            cleanupBootstrapListeners();
            return;
        }

        window.__shiroLightGalleryAutoOpen = target;
        if (loading) return;
        loadGallery();
    }

    function handleClick(event) {
        const img = qualifyingImage(event.target);
        if (!img) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        open(img);
    }

    function handleIntent(event) {
        if (warmed) return;

        const target = event.target;
        if (!target || !target.closest) return;

        const prose = target.closest('.prose-shiro');
        if (!prose) return;

        // Hover/press lands on the image; keyboard focus lands on its wrapping link.
        let img = target.closest('img');
        if ((!img || !prose.contains(img)) && target.querySelector) {
            img = target.querySelector('img');
        }
        if (!img || !prose.contains(img) || !shouldHandleImage(img)) return;

        warm();
    }

    // Touch devices have no hover, so per-image intent fires too late (pointerdown is
    // almost simultaneous with click). Proactively warm when the first image nears the
    // viewport (or on idle), gated on connection quality to avoid wasting metered data.
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
    document.addEventListener('pointerover', handleIntent, true);
    document.addEventListener('pointerdown', handleIntent, true);
    document.addEventListener('focusin', handleIntent, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleProactiveWarm, { once: true });
    } else {
        scheduleProactiveWarm();
    }
})();
