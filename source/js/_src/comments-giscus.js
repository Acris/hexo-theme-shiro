;(() => {
    'use strict';

    // Giscus provider boot (deferred). Config: __shiro.commentsConfig.
    // Requires runtime.comments.whenReady from comments-bootstrap.
    const shiro = window.__shiro || {};
    const rt = shiro.runtime;
    const commentsApi = rt && rt.comments;
    const whenReady = commentsApi && commentsApi.whenReady;
    if (typeof whenReady !== 'function') {
        console.error('[shiro-comments] giscus boot skipped: runtime.comments.whenReady missing');
        return;
    }

    whenReady(function () {
        const d = document;
        const container = d.getElementById('giscus-container');
        if (!container) {
            console.warn('[shiro-comments] #giscus-container missing');
            return;
        }

        if (!rt || typeof rt.get !== 'function') {
            console.error('[shiro-comments] runtime missing during giscus boot');
            return;
        }

        const api = rt.comments || {};
        const get = rt.get;
        const cfgRoot = get('commentsConfig') || {};
        const g = cfgRoot.giscus || {};
        const loadCommentsCss = api.loadCss || (() => Promise.resolve());
        const nearViewport = api.onNearViewport;
        let loaded = false;

        const paintFrame = () => {
            const iframe = container.querySelector('iframe.giscus-frame');
            if (!iframe) return false;
            iframe.style.colorScheme = d.documentElement.getAttribute('data-theme') === 'dark'
                ? 'dark'
                : 'light';
            return true;
        };

        const loadGiscus = () => {
            if (loaded) return;
            loaded = true;

            // g.src is always set and scheme-normalized in buildCommentsClientConfig.
            const src = String(g.src || '').trim();
            if (!src) {
                console.error('[shiro-comments] giscus src missing after server normalize');
                return;
            }
            const s = d.createElement('script');
            s.src = src;
            s.async = true;
            s.crossOrigin = 'anonymous';
            const nonce = typeof rt.cspNonce === 'function' ? rt.cspNonce() : '';
            if (nonce) s.setAttribute('nonce', nonce);
            const attrs = {
                'data-repo': g.repo || '',
                'data-repo-id': g.repo_id || '',
                'data-category': g.category || '',
                'data-category-id': g.category_id || '',
                'data-mapping': g.mapping || 'pathname',
                'data-strict': g.strict,
                'data-reactions-enabled': g.reactions_enabled,
                'data-emit-metadata': g.emit_metadata,
                'data-input-position': g.input_position || 'bottom',
                'data-theme': g.theme || 'preferred_color_scheme',
                'data-lang': g.lang || 'en'
            };
            if (g.term) attrs['data-term'] = g.term;
            if (g.lazy_loading) attrs['data-loading'] = 'lazy';
            Object.keys(attrs).forEach((key) => {
                s.setAttribute(key, attrs[key]);
            });
            const appendScript = () => {
                container.appendChild(s);
                // Paint color-scheme when the iframe mounts; stop watching if it
                // never appears (failed/blocked load) so the observer is not sticky.
                let watchTimer = 0;
                const watch = new MutationObserver(() => {
                    if (!paintFrame()) return;
                    if (watchTimer) clearTimeout(watchTimer);
                    watch.disconnect();
                });
                watch.observe(container, { childList: true, subtree: true });
                watchTimer = setTimeout(() => {
                    watchTimer = 0;
                    watch.disconnect();
                }, 30000);
            };
            loadCommentsCss().then(appendScript).catch(appendScript);
        };

        let prevDark = d.documentElement.getAttribute('data-theme') === 'dark';
        new MutationObserver(() => {
            const isDark = d.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark === prevDark) return;
            prevDark = isDark;
            paintFrame();
        }).observe(d.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        if (typeof nearViewport === 'function') {
            nearViewport(container, loadGiscus);
        } else {
            console.warn('[shiro-comments] near-viewport helper missing; loading giscus immediately');
            loadGiscus();
        }
    });
})();
