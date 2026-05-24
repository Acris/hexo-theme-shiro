;(() => {
    const script = window.__searchScript || '';
    if (!script) return;

    /* global loadBootstrapScript */
    // <shiro-script-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-script-loader>

    const toggle = document.getElementById('searchToggle');
    let loading = false;

    function removeIntentListeners() {
        document.removeEventListener('click', handleIntent);
        document.removeEventListener('keydown', handleIntent);
    }

    function isTypingTarget(element) {
        const tag = element && element.tagName;
        return !!(element && (element.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'));
    }

    function openSearch() {
        if (window.__shiroSearchOpen) {
            window.__shiroSearchOpen();
            removeIntentListeners();
            return;
        }

        window.__shiroSearchAutoOpen = true;
        if (loading) return;
        loading = true;

        loadBootstrapScript(script, {
            onload: () => {
                loading = false;
                removeIntentListeners();
            },
            onerror: () => { loading = false; }
        });
    }

    function handleIntent(event) {
        if (event.type === 'click') {
            if (!toggle || !toggle.contains(event.target)) return;
            event.preventDefault();
            openSearch();
            return;
        }

        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

        if (isTypingTarget(document.activeElement)) return;

        event.preventDefault();
        openSearch();
    }

    document.addEventListener('click', handleIntent);
    document.addEventListener('keydown', handleIntent);
})();
