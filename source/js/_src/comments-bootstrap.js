;(() => {
    'use strict';

    // Mirrors scripts/lib/boot-queue.js (createBootQueue) — keep behavior aligned.
    // Stub in comments/bootstrap.njk enqueues; this deferred file activates + drains.

    const commentsCss = window.__commentsCss || '';
    let commentsCssLoading = null;

    window.__shiroLoadCommentsCss = window.__shiroLoadCommentsCss || (() => {
        if (!commentsCss) return Promise.resolve();
        if (commentsCssLoading) return commentsCssLoading;
        const loadAsset = window.__shiroRuntime && window.__shiroRuntime.loadAsset;
        if (!loadAsset) {
            console.warn('[shiro-comments] runtime loadAsset missing; comments CSS skipped');
            return Promise.resolve();
        }
        commentsCssLoading = loadAsset('link', {
            rel: 'stylesheet',
            href: commentsCss,
            'data-shiro-comments-css': 'true'
        }, 'link[data-shiro-comments-css]').catch((error) => {
            commentsCssLoading = null;
            throw error;
        });
        return commentsCssLoading;
    });

    window.__shiroOnNearViewport = window.__shiroOnNearViewport || ((element, callback, options) => {
        if (!element || typeof callback !== 'function') return;
        if (!('IntersectionObserver' in window)) {
            callback();
            return;
        }
        const io = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting) return;
            callback();
            io.disconnect();
        }, options || { rootMargin: '200px 0px', threshold: 0 });
        io.observe(element);
    });

    function runCommentBoot(callback) {
        if (typeof callback !== 'function') return;
        try {
            callback();
        } catch (error) {
            console.warn('[shiro-comments] provider boot failed', error);
        }
    }

    // Activate: replace stub so later callers run immediately; drain queued boots.
    window.__shiroWhenCommentsReady = (callback) => {
        runCommentBoot(callback);
    };

    const queued = Array.isArray(window.__shiroCommentsReadyQueue)
        ? window.__shiroCommentsReadyQueue.slice()
        : [];
    window.__shiroCommentsReadyQueue = [];
    queued.forEach(runCommentBoot);
})();
