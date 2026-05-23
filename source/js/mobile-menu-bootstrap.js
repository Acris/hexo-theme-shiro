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
        loader.onload = function() { window.__shiroMobileMenuLoaded = true; };
        loader.onerror = function() { loading = false; };
        document.head.appendChild(loader);
    }

    if (query.matches) {
        loadMobileMenu();
    } else if (query.addEventListener) {
        query.addEventListener('change', function onChange(event) {
            if (event.matches) loadMobileMenu();
        }, { once: true });
    } else if (query.addListener) {
        query.addListener(function(event) {
            if (event.matches) loadMobileMenu();
        });
    }
})();
