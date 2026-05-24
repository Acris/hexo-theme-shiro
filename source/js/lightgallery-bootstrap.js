;(() => {
    const script = window.__lightgalleryScript || '';
    if (!script) return;

    /* global loadBootstrapScript */
    // <shiro-script-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-script-loader>

    let loading = false;
    let loaded = false;
    let warmed = false;
    let imageObserver = null;
    const loadCallbacks = [];

    function schedule(task) {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(task, { timeout: 1200 });
        } else {
            window.setTimeout(() => task(), 64);
        }
    }

    function cleanupBootstrapListeners() {
        document.removeEventListener('click', handleClick, true);
        if (imageObserver) {
            imageObserver.disconnect();
            imageObserver = null;
        }
    }

    function flushLoadCallbacks(name, event) {
        const callbacks = loadCallbacks.splice(0);
        callbacks.forEach((callback) => {
            const handler = callback && callback[name];
            if (typeof handler === 'function') handler(event);
        });
    }

    function loadEnhancer(callbacks) {
        if (window.__shiroLightGalleryOpen) {
            loaded = true;
            if (callbacks && typeof callbacks.onload === 'function') callbacks.onload();
            return;
        }

        if (callbacks) loadCallbacks.push(callbacks);
        if (loading || loaded) return;
        loading = true;

        loadBootstrapScript(script, {
            onload: () => {
                loading = false;
                loaded = true;
                flushLoadCallbacks('onload');
            },
            onerror: (event) => {
                loading = false;
                flushLoadCallbacks('onerror', event);
            }
        });
    }

    function prefetchLightGallery() {
        if (warmed) return;
        warmed = true;

        loadEnhancer({
            onload: () => {
                cleanupBootstrapListeners();
                if (typeof window.__shiroLightGalleryPrefetch === 'function') {
                    window.__shiroLightGalleryPrefetch();
                }
            },
            onerror: () => {
                warmed = false;
                window.__shiroLightGalleryAutoOpen = null;
            }
        });
    }

    function schedulePrefetch() {
        if (warmed) return;
        schedule(prefetchLightGallery);
    }

    function observeArticleImages() {
        const images = Array.from(document.querySelectorAll('.prose-shiro img'));
        if (!images.length) return;

        if (!('IntersectionObserver' in window)) {
            schedulePrefetch();
            return;
        }

        imageObserver = new IntersectionObserver((entries) => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            imageObserver.disconnect();
            imageObserver = null;
            schedulePrefetch();
        }, { threshold: 0.01 });

        images.forEach(img => imageObserver.observe(img));
    }

    function open(target) {
        if (window.__shiroLightGalleryOpen) {
            window.__shiroLightGalleryOpen(target);
            cleanupBootstrapListeners();
            return;
        }

        window.__shiroLightGalleryAutoOpen = target;
        loadEnhancer({
            onload: cleanupBootstrapListeners,
            onerror: () => {
                window.__shiroLightGalleryAutoOpen = null;
            }
        });
    }

    function handleClick(event) {
        const target = event.target;
        if (!target || !target.closest) return;

        const prose = target.closest('.prose-shiro');
        if (!prose) return;

        const img = target.closest('img');
        if (!img || !prose.contains(img)) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        open(img);
    }

    document.addEventListener('click', handleClick, true);
    observeArticleImages();
})();
