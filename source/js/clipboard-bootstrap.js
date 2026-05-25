;(() => {
    const script = window.__clipboardScript || '';
    if (!script) return;

    /* global loadBootstrapScript */
    // <shiro-script-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-script-loader>

    function createCodeBlockCursor() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
            acceptNode(node) {
                if (!node.classList || !node.classList.contains('highlight')) return NodeFilter.FILTER_SKIP;
                return node.closest && node.closest('.prose-shiro')
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_SKIP;
            }
        });

        function next(limit) {
            const blocks = [];
            while (blocks.length < limit) {
                const block = walker.nextNode();
                if (!block) break;
                blocks.push(block);
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
        if (typeof window.__shiroEnhanceClipboard === 'function') {
            enhanceTargets(targets);
            if (typeof onLoaded === 'function') onLoaded();
            return;
        }

        queueTargets(targets);
        if (loading) return;
        loading = true;

        loadBootstrapScript(script, {
            onload: () => {
                loading = false;
                enhanceTargets(pendingTargets);
                pendingTargets.length = 0;
                window.__shiroClipboardTargets = [];
                if (typeof onLoaded === 'function') onLoaded();
            },
            onerror: () => { loading = false; }
        });
    }

    function enhanceRemaining() {
        let blocks = cursor.next(12);
        while (blocks.length) {
            enhanceTargets(blocks);
            blocks = cursor.next(12);
        }
    }

    function schedule(task) {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(task, { timeout: 1000 });
        } else {
            window.setTimeout(() => task(), 64);
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
        const blocks = cursor.next(8);
        observeBatch(blocks);
        if (blocks.length) schedule(observeNextBatch);
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
    schedule(observeNextBatch);
})();
