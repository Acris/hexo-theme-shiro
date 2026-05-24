;(() => {
    const script = window.__clipboardScript || '';
    if (!script) return;

    function createCodeBlockCursor() {
        const articles = document.querySelectorAll('.prose-shiro');
        let articleIndex = 0;
        let walker = null;

        function next(limit) {
            const blocks = [];
            while (blocks.length < limit && articleIndex < articles.length) {
                if (!walker) {
                    walker = document.createTreeWalker(articles[articleIndex], NodeFilter.SHOW_ELEMENT, {
                        acceptNode(node) {
                            return node.classList && node.classList.contains('highlight')
                                ? NodeFilter.FILTER_ACCEPT
                                : NodeFilter.FILTER_SKIP;
                        }
                    });
                }

                const block = walker.nextNode();
                if (block) {
                    blocks.push(block);
                } else {
                    articleIndex += 1;
                    walker = null;
                }
            }
            return blocks;
        }

        return { next };
    }

    const cursor = createCodeBlockCursor();
    const eagerBlocks = cursor.next(4);
    if (!eagerBlocks.length) return;

    let loading = false;
    const pendingTargets = [];

    function queueTargets(targets) {
        (targets || []).forEach((target) => {
            if (target && target.isConnected && !pendingTargets.includes(target)) {
                pendingTargets.push(target);
            }
        });
        window.__shiroClipboardTargets = pendingTargets.slice();
    }

    function enhanceTargets(targets) {
        if (typeof window.__shiroEnhanceClipboard === 'function') {
            window.__shiroEnhanceClipboard(targets);
        }
    }

    function loadClipboard(targets, onLoaded) {
        queueTargets(targets);

        if (window.__shiroClipboardLoaded) {
            enhanceTargets(targets);
            if (typeof onLoaded === 'function') onLoaded();
            return;
        }
        if (loading) return;
        loading = true;

        const loader = document.createElement('script');
        loader.src = script;
        loader.defer = true;
        loader.onload = () => {
            loading = false;
            window.__shiroClipboardLoaded = true;
            enhanceTargets(pendingTargets);
            pendingTargets.length = 0;
            window.__shiroClipboardTargets = [];
            if (typeof onLoaded === 'function') onLoaded();
        };
        loader.onerror = () => { loading = false; };
        document.head.appendChild(loader);
    }

    function enhanceRemaining() {
        let blocks = cursor.next(12);
        while (blocks.length) {
            enhanceTargets(blocks);
            blocks = cursor.next(12);
        }
    }

    const observer = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            const targets = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
            if (!targets.length) return;
            targets.forEach(target => observer.unobserve(target));
            loadClipboard(targets, observeNextBatch);
        }, { rootMargin: '300px 0px', threshold: 0 })
        : null;

    function observeBatch(blocks) {
        if (!observer || !blocks.length) return;
        blocks.forEach(block => observer.observe(block));
    }

    function observeNextBatch() {
        observeBatch(cursor.next(8));
    }

    // Load immediately when IntersectionObserver is unavailable or one of the
    // first few code blocks is already inside the eager-load zone (≤ 300px below
    // the viewport bottom — which also covers any block already scrolled past).
    const isNearViewport = (block) => block.getBoundingClientRect().top < window.innerHeight + 300;
    if (!observer) {
        loadClipboard(eagerBlocks, enhanceRemaining);
        return;
    }
    if (eagerBlocks.some(isNearViewport)) {
        loadClipboard(eagerBlocks, observeNextBatch);
        return;
    }

    observeBatch(eagerBlocks);
})();
