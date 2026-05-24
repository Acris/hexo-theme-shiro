;(() => {
    const script = window.__clipboardScript || '';
    if (!script) return;

    const firstBlock = document.querySelector('.prose-shiro .highlight');
    if (!firstBlock) return;

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

    // Load immediately when IntersectionObserver is unavailable or the first
    // code block is already inside the eager-load zone (≤ 300px below the
    // viewport bottom — which also covers any block already scrolled past).
    if (!('IntersectionObserver' in window)
        || firstBlock.getBoundingClientRect().top < window.innerHeight + 300) {
        loadClipboard();
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        loadClipboard(() => observer.disconnect());
    }, { rootMargin: '300px 0px', threshold: 0 });

    observer.observe(firstBlock);
})();
