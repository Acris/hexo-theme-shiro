;(() => {
    const script = window.__searchScript || '';
    if (!script) return;

    /* global loadBootstrapScript */
    // <shiro-script-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-script-loader>

    const toggle = document.getElementById('searchToggle');
    let loading = false;

    function removeClickListener() {
        document.removeEventListener('click', handleClick);
    }

    function openSearch() {
        if (window.__shiroSearchOpen) {
            window.__shiroSearchOpen();
            removeClickListener();
            return;
        }

        window.__shiroSearchAutoOpen = true;
        if (loading) return;
        loading = true;

        loadBootstrapScript(script, {
            onload: () => {
                loading = false;
                removeClickListener();
            },
            onerror: () => { loading = false; }
        });
    }

    function handleClick(event) {
        if (!toggle || !toggle.contains(event.target)) return;
        event.preventDefault();
        openSearch();
    }

    document.addEventListener('click', handleClick);
})();
