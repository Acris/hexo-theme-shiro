;(() => {
    const script = window.__lightgalleryScript || '';
    if (!script) return;

    let loading = false;

    function removeBootstrapListeners() {
        document.removeEventListener('click', handleClick, true);
    }

    function open(target) {
        if (window.__shiroLightGalleryOpen) {
            window.__shiroLightGalleryOpen(target);
            removeBootstrapListeners();
            return;
        }

        window.__shiroLightGalleryAutoOpen = target;
        if (loading) return;
        loading = true;

        const loader = document.createElement('script');
        loader.src = script;
        loader.defer = true;
        loader.onload = () => {
            removeBootstrapListeners();
        };
        loader.onerror = () => {
            loading = false;
            window.__shiroLightGalleryAutoOpen = null;
        };
        document.head.appendChild(loader);
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
