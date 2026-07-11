;(() => {
    'use strict';

    // Comments CSS + near-viewport helpers, then drain the parse-time boot queue.
    // Stub in comments/bootstrap.njk only enqueues onto __shiro.commentsReadyQueue.
    // Canonical live API: runtime.comments.{whenReady,loadCss,onNearViewport}.
    // Bag whenCommentsReady is retired after drain (no-op / abort no-op).

    const shiro = window.__shiro || {};
    const rt = shiro.runtime;

    function abortComments(reason) {
        const message = reason || 'comments bootstrap aborted';
        console.error('[shiro-comments]', message);
        const fail = function () { /* permanent no-op after abort */ };
        shiro.commentsReadyQueue = [];
        // Retire bag stub so late callers never re-queue forever.
        shiro.whenCommentsReady = fail;
        if (rt) {
            rt.comments = {
                failed: true,
                whenReady: fail,
                loadCss: function () { return Promise.resolve(); },
                onNearViewport: function (_el, callback) {
                    if (typeof callback === 'function') callback();
                }
            };
        }
    }

    if (!rt || typeof rt.loadAsset !== 'function' || typeof rt.get !== 'function') {
        abortComments('runtime missing; comments bootstrap aborted');
        return;
    }

    const commentsCss = rt.get('commentsCss') || '';
    let commentsCssLoading = null;

    function loadCommentsCss() {
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
    }

    function onNearViewport(element, callback, options) {
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
    }

    function runCommentBoot(callback) {
        if (typeof callback !== 'function') return;
        try {
            callback();
        } catch (error) {
            console.warn('[shiro-comments] provider boot failed', error);
        }
    }

    function whenCommentsReady(callback) {
        runCommentBoot(callback);
    }

    rt.comments = {
        failed: false,
        whenReady: whenCommentsReady,
        loadCss: loadCommentsCss,
        onNearViewport: onNearViewport
    };

    const queued = Array.isArray(shiro.commentsReadyQueue)
        ? shiro.commentsReadyQueue.slice()
        : [];
    shiro.commentsReadyQueue = [];
    // Retire bag surface: providers must use runtime.comments.whenReady only.
    shiro.whenCommentsReady = function () { /* retired parse-time stub */ };

    queued.forEach(runCommentBoot);
})();
