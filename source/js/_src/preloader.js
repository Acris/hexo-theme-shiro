;(() => {
    'use strict';

    // Dismiss after this page's theme fonts settle, or a connection-aware deadline.
    // CSS failsafe must outlive the longest JS deadline (.shiro-preloader).
    const overlay = document.getElementById('shiroPreloader');
    if (!overlay) return;

    const storageKey = 'shiro:fonts-ready';
    const shiro = window.__shiro || {};
    const fontsReadyToken = typeof (shiro.fontsReadyToken || window.__shiroFontsReadyToken) === 'string'
        ? (shiro.fontsReadyToken || window.__shiroFontsReadyToken)
        : '';

    const markReady = () => {
        document.documentElement.classList.add('shiro-preloader-done');
        if (!fontsReadyToken) return;
        try {
            sessionStorage.setItem(storageKey, fontsReadyToken);
        } catch (error) {}
    };

    if (document.documentElement.classList.contains('shiro-preloader-done')) {
        overlay.parentNode && overlay.parentNode.removeChild(overlay);
        return;
    }

    let hidden = false;
    let failsafe = 0;

    const remove = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    const hide = (remember) => {
        // Timeout may win first; a later settle still caches readiness.
        if (hidden) {
            if (remember) markReady();
            return;
        }
        hidden = true;
        if (failsafe) clearTimeout(failsafe);

        // is-loaded before markReady so :not(.is-loaded) display:none can't cut the fade.
        overlay.classList.add('is-loaded');
        if (remember) markReady();

        const fallbackTimer = setTimeout(remove, 600);
        overlay.addEventListener('transitionend', (event) => {
            if (event.target === overlay && event.propertyName === 'opacity') {
                clearTimeout(fallbackTimer);
                remove();
            }
        }, { once: true });
    };

    const slowConnection = () => {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return false;
        return Boolean(connection.saveData) || /(^|-)2g$/.test(connection.effectiveType || '');
    };

    // CSS failsafe is 6s; keep JS deadline strictly below it.
    const fontWaitTimeout = slowConnection() ? 2000 : 5000;

    const whenDocumentLoad = () => {
        if (document.readyState === 'complete') return Promise.resolve();
        return new Promise((resolve) => {
            window.addEventListener('load', resolve, { once: true });
        });
    };

    // Thin wait: only load/error on the font <link>. No styleSheets probing, no sub-cap.
    // load already fired + sheet present → resolve; hang → overall hide(false).
    const whenFontStylesheetReady = () => {
        const links = Array.from(
            document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]')
        );
        if (!links.length) return Promise.resolve();

        return Promise.all(
            links.map(
                (link) =>
                    new Promise((resolve, reject) => {
                        const sheetReady = () => {
                            try {
                                return Boolean(link.sheet);
                            } catch (error) {
                                return false;
                            }
                        };

                        if (sheetReady()) {
                            resolve();
                            return;
                        }

                        link.addEventListener('load', resolve, { once: true });
                        link.addEventListener('error', reject, { once: true });
                        // load may have already fired between the first check and listeners.
                        if (sheetReady()) resolve();
                    })
            )
        );
    };

    const whenThemeFontsReady = () => {
        if (!document.fonts || !document.fonts.ready) {
            return whenDocumentLoad();
        }

        // Font CSS first (avoids idle fonts.ready before @font-face exists), then
        // ready → rAF → ready so layout can request faces. Timeout → hide(false).
        // CSS error → reject → hide(false), never markReady.
        return whenFontStylesheetReady()
            .then(() => document.fonts.ready)
            .then(
                () =>
                    new Promise((resolve) => {
                        requestAnimationFrame(() => resolve());
                    })
            )
            .then(() => document.fonts.ready);
    };

    failsafe = setTimeout(() => hide(false), fontWaitTimeout);

    whenThemeFontsReady().then(
        () => hide(true),
        () => hide(false)
    );
})();
