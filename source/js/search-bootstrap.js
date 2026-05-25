;(() => {
    const script = window.__searchScript || '';
    if (!script) return;

    /* global loadBootstrapScript */
    // <shiro-script-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-script-loader>

    const toggle = document.getElementById('searchToggle');
    let loading = false;

    function removeBootstrapListeners() {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleKeydown);
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

        loadBootstrapScript(script, {
            onload: () => {
                loading = false;
                removeBootstrapListeners();
            },
            onerror: () => { loading = false; }
        });
    }

    function isTypingTarget(element) {
        const tag = element && element.tagName;
        return !!(element && (element.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'));
    }

    function handleKeydown(event) {
        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(document.activeElement)) return;
        event.preventDefault();
        openSearch();
    }

    function handleClick(event) {
        if (!toggle || !toggle.contains(event.target)) return;
        event.preventDefault();
        openSearch();
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
})();
