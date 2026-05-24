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

    const rect = firstBlock.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top < window.innerHeight + 300 || !('IntersectionObserver' in window)) {
        loadClipboard();
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        loadClipboard(() => observer.disconnect());
    }, { rootMargin: '300px 0px', threshold: 0 });

    observer.observe(firstBlock);
})();
