;(() => {
    'use strict';

    const commentsCss = window.__commentsCss || '';
    let commentsCssLoading = null;

    // Resolve loadAsset at call time so a late-loaded runtime still works if
    // comments bootstrap runs before runtime in unusual orderings.
    window.__shiroLoadCommentsCss = window.__shiroLoadCommentsCss || (() => {
        if (!commentsCss) return Promise.resolve();
        if (commentsCssLoading) return commentsCssLoading;
        const loadAsset = window.__shiroRuntime && window.__shiroRuntime.loadAsset;
        if (!loadAsset) return Promise.resolve();
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
})();
