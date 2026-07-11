;(() => {
    'use strict';

    const shiro = window.__shiro || {};
    const rt = shiro.runtime;
    if (!rt || typeof rt.get !== 'function') return;

    const script = rt.get('clipboardScript') || '';
    if (!script) return;

    const { scheduleIdle, createFeatureLoader } = rt;
    const RETRY_MS = 2000;

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
    let permanent = false;
    let observer = null;
    let retryTimer = 0;
    let afterLoad = null;

    function clearPending() {
        pendingTargets.length = 0;
        pendingTargetSet.clear();
        shiro.clipboardTargets = [];
    }

    function stopObserving() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function hardStop(error) {
        permanent = true;
        afterLoad = null;
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = 0;
        }
        clearPending();
        stopObserving();
        console.warn('[shiro-clipboard] feature aborted', error);
    }

    function runAfterLoad() {
        if (permanent) return;
        enhanceTargets(pendingTargets);
        clearPending();
        const cb = afterLoad;
        afterLoad = null;
        if (typeof cb === 'function') cb();
    }

    function scheduleRetry() {
        if (permanent || retryTimer) return;
        retryTimer = setTimeout(() => {
            retryTimer = 0;
            if (permanent) return;
            // Keep pending targets visible to the observer until enhance succeeds.
            if (observer) {
                pendingTargets.forEach((target) => {
                    if (target && target.isConnected) observer.observe(target);
                });
            }
            feature.load(runAfterLoad);
        }, RETRY_MS);
    }

    const feature = createFeatureLoader({
        id: 'clipboard',
        src: script,
        onError: (error, meta) => {
            if (meta && meta.permanent) {
                hardStop(error);
                return;
            }
            console.warn('[shiro-clipboard] load failed (retryable)', error);
            scheduleRetry();
        }
    });

    function queueTargets(targets) {
        (targets || []).forEach((target) => {
            if (target && target.isConnected && !pendingTargetSet.has(target)) {
                pendingTargetSet.add(target);
                pendingTargets.push(target);
            }
        });
        shiro.clipboardTargets = pendingTargets.slice();
    }

    function enhanceTargets(targets) {
        if (typeof shiro.enhanceClipboard === 'function') {
            shiro.enhanceClipboard(targets);
        }
    }

    function loadClipboard(targets, onLoaded) {
        if (permanent) return;
        if (typeof shiro.enhanceClipboard === 'function') {
            enhanceTargets(targets);
            if (typeof onLoaded === 'function') onLoaded();
            return;
        }

        if (typeof onLoaded === 'function') afterLoad = onLoaded;
        queueTargets(targets);
        feature.load(runAfterLoad);
    }

    function enhanceRemaining() {
        if (permanent) return;
        let blocks = cursor.next(12);
        while (blocks.length) {
            enhanceTargets(blocks);
            blocks = cursor.next(12);
        }
    }

    function schedule(task) {
        scheduleIdle(task, { timeout: 1000, fallbackMs: 64 });
    }

    observer = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            if (permanent) {
                stopObserving();
                return;
            }
            const targets = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
            if (!targets.length) return;
            // Unobserve only after a successful enhance (runAfterLoad path).
            // Retryable load fail re-observes pending targets in scheduleRetry.
            loadClipboard(targets, () => {
                if (observer) {
                    targets.forEach((target) => {
                        if (target) observer.unobserve(target);
                    });
                }
                observeNextBatch();
            });
        }, { rootMargin: '300px 0px', threshold: 0 })
        : null;

    function observeBatch(blocks) {
        if (permanent || !observer || !blocks.length) return;
        blocks.forEach(block => observer.observe(block));
    }

    function observeNextBatch() {
        if (permanent) return;
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
