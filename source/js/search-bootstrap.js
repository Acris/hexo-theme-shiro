;(() => {
    const script = window.__searchScript || '';
    if (!script) return;

    let loading = false;

    function removeBootstrapListeners() {
        document.removeEventListener('click', handleIntent);
        document.removeEventListener('keydown', handleIntent);
    }

    function openSearch() {
        if (window.__shiroSearchOpen) {
            window.__shiroSearchOpen();
            removeBootstrapListeners();
            return;
        }

        window.__shiroSearchAutoOpen = true;
        if (loading) return;
        loading = true;

        const loader = document.createElement('script');
        loader.src = script;
        loader.defer = true;
        loader.onload = function() {
            removeBootstrapListeners();
        };
        loader.onerror = function() { loading = false; };
        document.head.appendChild(loader);
    }

    function handleIntent(event) {
        const toggle = document.getElementById('searchToggle');

        if (event.type === 'click') {
            if (!toggle || !toggle.contains(event.target)) return;
            event.preventDefault();
            openSearch();
            return;
        }

        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

        const active = document.activeElement;
        const tag = active && active.tagName;
        if (active && (active.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;

        event.preventDefault();
        openSearch();
    }

    document.addEventListener('click', handleIntent);
    document.addEventListener('keydown', handleIntent);
})();
