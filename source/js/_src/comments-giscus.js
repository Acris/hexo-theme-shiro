;(() => {
    'use strict';

    // Giscus provider boot (deferred). Config: window.__shiroCommentsConfig.
    // Runs after comments-bootstrap installs whenReady / near-viewport helpers.
    const shiro = window.__shiro || {};
    const whenReady = shiro.whenCommentsReady || window.__shiroWhenCommentsReady;
    if (typeof whenReady !== 'function') {
        console.error('[shiro-comments] giscus boot skipped: whenReady missing');
        return;
    }

    whenReady(function () {
        const d = document;
        const w = window;
        const container = d.getElementById('giscus-container');
        if (!container) {
            console.warn('[shiro-comments] #giscus-container missing');
            return;
        }

        const cfgRoot = shiro.__shiroCommentsConfig || w.__shiroCommentsConfig;
        const g = (cfgRoot && cfgRoot.giscus) || {};
        const loadCommentsCss = shiro.loadCommentsCss || w.__shiroLoadCommentsCss || (() => Promise.resolve());
        let loaded = false;

        // Keep iframe color-scheme aligned with html[data-theme]
        // (giscus CSS uses prefers-color-scheme).
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

            const binaryAttr = (value, fallback) => {
                if (value === true) return '1';
                if (value === false) return '0';
                const text = String(value == null ? fallback : value).trim().toLowerCase();
                if (text === 'true') return '1';
                if (text === 'false') return '0';
                return text || fallback;
            };
            const safeScriptSrc = (value, fallback) => {
                const text = String(value || '').trim();
                if (!text) return fallback;
                if (/[\u0000-\u001F\u007F]/.test(text)) return fallback;
                if (/^https?:\/\//i.test(text) || /^\/\//.test(text)) return text;
                return /^[a-z][a-z0-9+.-]*:/i.test(text) ? fallback : text;
            };

            const s = d.createElement('script');
            s.src = safeScriptSrc(g.src, 'https://giscus.app/client.js');
            s.async = true;
            s.crossOrigin = 'anonymous';
            const nonce = shiro.__shiroCspNonce || w.__shiroCspNonce || '';
            if (nonce) s.setAttribute('nonce', nonce);
            const attrs = {
                'data-repo': g.repo || '',
                'data-repo-id': g.repo_id || '',
                'data-category': g.category || '',
                'data-category-id': g.category_id || '',
                'data-mapping': g.mapping || 'pathname',
                'data-strict': binaryAttr(g.strict, '0'),
                'data-reactions-enabled': binaryAttr(g.reactions_enabled, '1'),
                'data-emit-metadata': binaryAttr(g.emit_metadata, '0'),
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
                const watch = new MutationObserver(() => {
                    if (paintFrame()) watch.disconnect();
                });
                watch.observe(container, { childList: true, subtree: true });
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

        const onNear = shiro.onNearViewport || w.__shiroOnNearViewport;
        if (typeof onNear !== 'function') {
            console.warn('[shiro-comments] near-viewport helper missing');
            return;
        }
        onNear(container, loadGiscus);
    });
})();
