;(() => {
    'use strict';

    // Disqus provider boot (deferred). Config: __shiro.commentsConfig.
    const shiro = window.__shiro || {};
    const get = shiro.get || (window.__shiroRuntime && window.__shiroRuntime.get) || (() => undefined);

    window.disqus_config = function () {
        const cfg = ((get('commentsConfig') || {}).disqus) || {};
        this.page.url = cfg.pageUrl || location.href;
        this.page.identifier = String(cfg.pageIdentifier || location.pathname).replace(/\/$/, '');
        this.colorScheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    };

    const whenReady = shiro.whenCommentsReady;
    if (typeof whenReady !== 'function') {
        console.error('[shiro-comments] Disqus boot skipped: whenReady missing');
        return;
    }

    whenReady(function () {
        const d = document;
        const w = window;
        const disqus_thread = d.getElementById('disqus_thread');
        if (!disqus_thread) {
            console.warn('[shiro-comments] #disqus_thread missing');
            return;
        }

        const cfg = ((get('commentsConfig') || {}).disqus) || {};
        const SHORTNAME = String(cfg.shortname || '').trim();
        if (!/^[a-z0-9-]+$/i.test(SHORTNAME)) return;
        const loadCommentsCss = shiro.loadCommentsCss || (() => Promise.resolve());
        let loaded = false;

        const loadDisqus = () => {
            if (loaded) return;
            loaded = true;
            const s = d.createElement('script');
            s.src = 'https://' + SHORTNAME + '.disqus.com/embed.js';
            s.setAttribute('data-timestamp', Date.now());
            const nonce = get('cspNonce') || shiro.cspNonce || '';
            if (nonce) s.setAttribute('nonce', nonce);
            const appendScript = () => {
                (d.head || d.body).appendChild(s);
            };
            loadCommentsCss().then(appendScript).catch(appendScript);
        };

        if (typeof shiro.onNearViewport !== 'function') {
            console.warn('[shiro-comments] near-viewport helper missing');
            return;
        }
        shiro.onNearViewport(disqus_thread, loadDisqus);

        const root = d.documentElement;
        let prevDark = root.dataset.theme === 'dark';
        let resetTimer;
        let resetObserver;
        let pendingThemeReset = false;

        const resetDisqusForTheme = () => {
            if (!loaded || !w.DISQUS || typeof w.DISQUS.reset !== 'function') return;
            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => {
                try {
                    w.DISQUS.reset({ reload: true, config: w.disqus_config });
                } catch (_) { /* Disqus may not be ready yet */ }
            }, 200);
        };

        const commentsNearViewport = () => {
            const rect = disqus_thread.getBoundingClientRect();
            return rect.top < w.innerHeight + 200 && rect.bottom > -200;
        };

        const resetWhenCommentsAreNear = () => {
            pendingThemeReset = true;
            if (commentsNearViewport() || !('IntersectionObserver' in w)) {
                pendingThemeReset = false;
                resetDisqusForTheme();
                return;
            }
            if (resetObserver) return;
            resetObserver = new IntersectionObserver((entries) => {
                if (!pendingThemeReset || !entries[0].isIntersecting) return;
                pendingThemeReset = false;
                resetObserver.disconnect();
                resetObserver = null;
                resetDisqusForTheme();
            }, { rootMargin: '200px 0px', threshold: 0 });
            resetObserver.observe(disqus_thread);
        };

        new MutationObserver(() => {
            const isDark = root.dataset.theme === 'dark';
            if (isDark === prevDark) return;
            prevDark = isDark;
            if (!loaded) return;
            resetWhenCommentsAreNear();
        }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    });
})();
