;(() => {
    'use strict';

    // Comments CSS + near-viewport helpers, then drain the parse-time boot queue.
    // Stub in comments/bootstrap.njk pushes onto __shiroCommentsReadyQueue; this
    // deferred file (after runtime.min.js) installs helpers and runs the queue.

    const rt = window.__shiroRuntime;
    if (!rt || typeof rt.loadAsset !== 'function') {
        console.error('[shiro-comments] runtime missing; comments bootstrap aborted');
        return;
    }

    const commentsCss = window.__commentsCss || '';
    let commentsCssLoading = null;

    window.__shiroLoadCommentsCss = window.__shiroLoadCommentsCss || (() => {
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

    // Activate: later callers run immediately; drain parse-time queue.
    window.__shiroWhenCommentsReady = (callback) => {
        runCommentBoot(callback);
    };

    const queued = Array.isArray(window.__shiroCommentsReadyQueue)
        ? window.__shiroCommentsReadyQueue.slice()
        : [];
    window.__shiroCommentsReadyQueue = [];
    queued.forEach(runCommentBoot);
})();
