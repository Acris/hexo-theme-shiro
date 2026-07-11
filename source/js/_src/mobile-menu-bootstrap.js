;(() => {
    'use strict';

    const shiro = window.__shiro || {};
    const rt = shiro.runtime || window.__shiroRuntime;
    if (!rt || typeof rt.get !== 'function') return;

    const script = rt.get('mobileMenuScript') || '';
    if (!script) return;

    const { createFeatureLoader } = rt;
    const query = window.matchMedia('(max-width: 767px)');

    function removeViewportListener() {
        if (query.removeEventListener) {
            query.removeEventListener('change', handleViewportChange);
        } else if (query.removeListener) {
            query.removeListener(handleViewportChange);
        }
    }

    const feature = createFeatureLoader({
        id: 'mobile-menu',
        src: script,
        onReady: removeViewportListener,
        onError: (error) => {
            console.warn('[shiro-mobile-menu] feature failed', error);
            removeViewportListener();
        }
    });

    function loadMobileMenu() {
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
