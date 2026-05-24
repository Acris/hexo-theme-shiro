;(() => {
    const script = window.__clipboardScript || '';
    if (!script) return;

    const eagerBlocks = Array.from(document.querySelectorAll('.prose-shiro .highlight')).slice(0, 4);
    if (!eagerBlocks.length) return;

    let loading = false;

    function loadClipboard(onLoaded) {
        if (loading || window.__shiroClipboardLoaded) return;
        loading = true;

        const loader = document.createElement('script');
        loader.src = script;
        loader.defer = true;
        loader.onload = () => {
            loading = false;
            window.__shiroClipboardLoaded = true;
            if (typeof onLoaded === 'function') onLoaded();
        };
        loader.onerror = () => { loading = false; };
        document.head.appendChild(loader);
    }

    // Load immediately when IntersectionObserver is unavailable or one of the
    // first few code blocks is already inside the eager-load zone (≤ 300px below
    // the viewport bottom — which also covers any block already scrolled past).
    const isNearViewport = (block) => block.getBoundingClientRect().top < window.innerHeight + 300;
    if (!('IntersectionObserver' in window) || eagerBlocks.some(isNearViewport)) {
        loadClipboard();
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        loadClipboard(() => observer.disconnect());
    }, { rootMargin: '300px 0px', threshold: 0 });

    eagerBlocks.forEach(block => observer.observe(block));
})();
