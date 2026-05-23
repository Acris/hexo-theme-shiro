;(() => {
    const script = window.__mobileMenuScript || '';
    if (!script) return;

    const query = window.matchMedia('(max-width: 767px)');
    let loading = false;

    function loadMobileMenu() {
        if (loading || window.__shiroMobileMenuLoaded) return;
        loading = true;

        const loader = document.createElement('script');
        loader.src = script;
        loader.defer = true;
        loader.onload = () => { window.__shiroMobileMenuLoaded = true; };
        loader.onerror = () => { loading = false; };
        document.head.appendChild(loader);
    }

    if (query.matches) {
        loadMobileMenu();
    } else if (query.addEventListener) {
        query.addEventListener('change', (event) => {
            if (event.matches) loadMobileMenu();
        }, { once: true });
    } else if (query.addListener) {
        query.addListener((event) => {
            if (event.matches) loadMobileMenu();
        });
    }
})();
