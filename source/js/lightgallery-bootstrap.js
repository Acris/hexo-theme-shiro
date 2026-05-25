;(() => {
    const script = window.__lightgalleryScript || '';
    if (!script) return;

    /* global loadBootstrapScript */
    // <shiro-script-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-script-loader>

    let loading = false;

    function cleanupBootstrapListeners() {
        document.removeEventListener('click', handleClick, true);
    }

    function open(target) {
        if (window.__shiroLightGalleryOpen) {
            window.__shiroLightGalleryOpen(target);
            cleanupBootstrapListeners();
            return;
        }

        window.__shiroLightGalleryAutoOpen = target;
        if (loading) return;
        loading = true;

        loadBootstrapScript(script, {
            onload: cleanupBootstrapListeners,
            onerror: () => {
                loading = false;
                window.__shiroLightGalleryAutoOpen = null;
            }
        });
    }

    function handleClick(event) {
        const target = event.target;
        if (!target || !target.closest) return;

        const prose = target.closest('.prose-shiro');
        if (!prose) return;

        const img = target.closest('img');
        if (!img || !prose.contains(img)) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        open(img);
    }

    document.addEventListener('click', handleClick, true);
})();
