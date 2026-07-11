;(() => {
    'use strict';

    const shiro = window.__shiro || {};
    const rt = shiro.runtime;
    if (!rt || typeof rt.get !== 'function') return;

    const script = rt.get('mobileMenuScript') || '';
    if (!script) return;

    const { createFeatureLoader } = rt;
    const query = window.matchMedia('(max-width: 767px)');
    let permanent = false;

    function removeViewportListener() {
        if (query.removeEventListener) {
            query.removeEventListener('change', handleViewportChange);
        } else if (query.removeListener) {
            query.removeListener(handleViewportChange);
        }
    }

    // Permanent errors stop retry; network failures keep the viewport listener.
    const feature = createFeatureLoader({
        id: 'mobile-menu',
        src: script,
        onReady: removeViewportListener,
        onError: (error, meta) => {
            if (meta && meta.permanent) {
                permanent = true;
                removeViewportListener();
                console.warn('[shiro-mobile-menu] feature aborted', error);
                return;
            }
            console.warn('[shiro-mobile-menu] load failed (retryable)', error);
        }
    });

    function loadMobileMenu() {
        if (permanent) return;
        feature.load();
    }

    function handleViewportChange(event) {
        if (event.matches) loadMobileMenu();
    }

    if (query.matches) {
        loadMobileMenu();
    } else if (query.addEventListener) {
        query.addEventListener('change', handleViewportChange);
    } else if (query.addListener) {
        query.addListener(handleViewportChange);
    }
})();
