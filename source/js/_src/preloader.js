;(() => {
    'use strict';

    // Font-load preloader: fades #shiroPreloader out once the title font is ready
    // (or after a short failsafe timeout). A CSS animation dismisses it if this
    // script never runs.
    const overlay = document.getElementById('shiroPreloader');
    if (!overlay) return;

    const storageKey = 'shiro:title-font-ready';
    const markReady = () => {
        document.documentElement.classList.add('shiro-preloader-done');
        try {
            sessionStorage.setItem(storageKey, '1');
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
        if (hidden) return;
        hidden = true;
        if (failsafe) clearTimeout(failsafe);

        // Fade first, then persist readiness: add `is-loaded` before markReady() so
        // the `:not(.is-loaded)` display:none rule can't cut the fade short.
        overlay.classList.add('is-loaded');
        if (remember) markReady();

        const fallbackTimer = setTimeout(remove, 600);
        overlay.addEventListener('transitionend', (event) => {
            if (event.target === overlay && event.propertyName === 'opacity') {
                clearTimeout(fallbackTimer);
                remove();
            }
        });
    };

    // Failsafe: hide even if font loading never settles (kept shorter than the 2s CSS delay).
    // On metered/slow links (Save-Data or 2g) the brand font likely won't arrive in time, so
    // fade out sooner instead of holding content back — mirrors the LightGallery/search warm gate.
    const slowConnection = () => {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return false;
        return Boolean(connection.saveData) || /(^|-)2g$/.test(connection.effectiveType || '');
    };
    failsafe = setTimeout(() => hide(false), slowConnection() ? 600 : 1200);

    if (document.fonts && document.fonts.load) {
        // Pass the title text so we wait for its unicode-range chunks.
        const text = overlay.getAttribute('data-shiro-font-text') || '';
        let ready;
        try {
            ready = document.fonts.load('1em "Yuji Syuku"', text);
        } catch (error) {
            ready = null;
        }
        if (ready && ready.then) {
            ready.then(() => hide(true), () => hide(false));
        } else {
            document.fonts.ready.then(() => hide(true), () => hide(false));
        }
    } else if (document.readyState === 'complete') {
        hide(true);
    } else {
        window.addEventListener('load', () => hide(true));
    }
})();
