;(() => {
    const script = window.__mobileMenuScript || '';
    if (!script) return;

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
        if (loading || window.__shiroMobileMenuLoaded) return;
        loading = true;

        const loader = document.createElement('script');
        loader.src = script;
        loader.defer = true;
        loader.onload = () => {
            loading = false;
            window.__shiroMobileMenuLoaded = true;
            removeViewportListener();
        };
        loader.onerror = () => { loading = false; };
        document.head.appendChild(loader);
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
