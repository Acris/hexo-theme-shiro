;(() => {
    const script = window.__clipboardScript || '';
    if (!script) return;

    function collectCodeBlocks(root, limit, blocks) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
            acceptNode(node) {
                return node.classList && node.classList.contains('highlight')
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_SKIP;
            }
        });

        while (blocks.length < limit) {
            const block = walker.nextNode();
            if (!block) break;
            blocks.push(block);
        }
    }

    function firstCodeBlocks(limit) {
        const blocks = [];
        const articles = document.querySelectorAll('.prose-shiro');
        for (let i = 0; i < articles.length && blocks.length < limit; i += 1) {
            collectCodeBlocks(articles[i], limit, blocks);
        }
        return blocks;
    }

    const eagerBlocks = firstCodeBlocks(4);
    if (!eagerBlocks.length) return;

    let loading = false;

    function loadClipboard(targets, onLoaded) {
        window.__shiroClipboardTargets = targets || [];
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
        loadClipboard(eagerBlocks);
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        const targets = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
        if (!targets.length) return;
        loadClipboard(targets, () => observer.disconnect());
    }, { rootMargin: '300px 0px', threshold: 0 });

    eagerBlocks.forEach(block => observer.observe(block));
})();
