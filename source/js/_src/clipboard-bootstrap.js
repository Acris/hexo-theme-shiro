;(() => {
    'use strict';

    const shiro = window.__shiro || {};
    const rt = shiro.runtime || window.__shiroRuntime;
    if (!rt) return;
    const get = rt.get || shiro.get || ((k) => window[k.indexOf('__') === 0 ? k : '__' + k]);

    const script = get('clipboardScript') || '';
    if (!script) return;

    const { scheduleIdle, createFeatureLoader } = rt;

    function createCodeBlockCursor() {
        const root = document.querySelector('main') || document.body;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
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

    const pendingTargets = [];
    const pendingTargetSet = new Set();
    const feature = createFeatureLoader({
        id: 'clipboard',
        src: script,
        onError: () => {}
    });

    function queueTargets(targets) {
        (targets || []).forEach((target) => {
            if (target && target.isConnected && !pendingTargetSet.has(target)) {
                pendingTargetSet.add(target);
                pendingTargets.push(target);
            }
        });
        const targetsList = pendingTargets.slice();
        window.__shiroClipboardTargets = targetsList;
        shiro.clipboardTargets = targetsList;
        shiro.__shiroClipboardTargets = targetsList;
    }

    function enhanceTargets(targets) {
        const enhance = shiro.enhanceClipboard || shiro.__shiroEnhanceClipboard || window.__shiroEnhanceClipboard;
        if (typeof enhance === 'function') {
            enhance(targets);
        }
    }

    function loadClipboard(targets, onLoaded) {
        if (typeof (shiro.enhanceClipboard || shiro.__shiroEnhanceClipboard || window.__shiroEnhanceClipboard) === 'function') {
            enhanceTargets(targets);
            if (typeof onLoaded === 'function') onLoaded();
            return;
        }

        // Queue before load so concurrent load() subscribers enhance all targets.
        queueTargets(targets);
        feature.load(() => {
            enhanceTargets(pendingTargets);
            pendingTargets.length = 0;
            pendingTargetSet.clear();
            window.__shiroClipboardTargets = [];
            shiro.clipboardTargets = [];
            shiro.__shiroClipboardTargets = [];
            if (typeof onLoaded === 'function') onLoaded();
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
        if (scheduleIdle) {
            scheduleIdle(task, { timeout: 1000, fallbackMs: 64 });
            return;
        }
        window.setTimeout(() => task(), 64);
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
