;(() => {
    'use strict';

    const rt = window.__shiroRuntime;
    if (!rt) return;

    const script = window.__mobileMenuScript || '';
    if (!script) return;

    const { loadBootstrapScript } = rt;

    const query = window.matchMedia('(max-width: 767px)');
    let loading = false;

    function removeViewportListener() {
        if (query.removeEventListener) {
            query.removeEventListener('change', handleViewportChange);
        } else if (query.removeListener) {
            query.removeListener(handleViewportChange);
        }
    }

    function loadMobileMenu() {
        if (loading) return;
        loading = true;

        loadBootstrapScript(script, {
            onload: () => {
                loading = false;
                removeViewportListener();
            },
            onerror: () => { loading = false; }
        }, 'mobile-menu');
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
