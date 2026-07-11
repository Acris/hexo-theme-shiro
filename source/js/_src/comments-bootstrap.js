;(() => {
    'use strict';

    // Comments CSS + near-viewport helpers, then drain the parse-time boot queue.
    // Stub in comments/bootstrap.njk pushes onto __shiro.commentsReadyQueue; this
    // deferred file (after runtime.min.js) installs helpers and runs the queue.

    const shiro = window.__shiro || {};
    const rt = shiro.runtime || window.__shiroRuntime;
    if (!rt || typeof rt.loadAsset !== 'function' || typeof rt.get !== 'function') {
        console.error('[shiro-comments] runtime missing; comments bootstrap aborted');
        return;
    }

    const commentsCss = rt.get('commentsCss') || '';
    let commentsCssLoading = null;

    shiro.loadCommentsCss = shiro.loadCommentsCss || (() => {
        if (!commentsCss) return Promise.resolve();
        if (commentsCssLoading) return commentsCssLoading;
        commentsCssLoading = rt.loadAsset('link', {
            rel: 'stylesheet',
            href: commentsCss,
            'data-shiro-comments-css': 'true'
        }, 'link[data-shiro-comments-css]').catch((error) => {
            commentsCssLoading = null;
            throw error;
        });
        return commentsCssLoading;
    });

    shiro.onNearViewport = shiro.onNearViewport || ((element, callback, options) => {
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

    // Activate: later callers run immediately; drain parse-time queue.
    shiro.whenCommentsReady = (callback) => {
        runCommentBoot(callback);
    };

    const queued = Array.isArray(shiro.commentsReadyQueue)
        ? shiro.commentsReadyQueue.slice()
        : [];
    shiro.commentsReadyQueue = [];
    queued.forEach(runCommentBoot);
})();
