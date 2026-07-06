;(() => {
    'use strict';

    // Font-load preloader: fades #shiroPreloader out once document fonts are ready
    // (or after a bounded failsafe timeout). A CSS animation dismisses it if this
    // script never runs.
    const overlay = document.getElementById('shiroPreloader');
    if (!overlay) return;

    const storageKey = 'shiro:fonts-ready';
    const fontWaitTimeout = 5000;
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
        if (hidden) {
            if (remember) markReady();
            return;
        }
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

    // Failsafe: hide even if font loading never settles.
    failsafe = setTimeout(() => hide(false), fontWaitTimeout);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => hide(true), () => hide(false));
    } else if (document.readyState === 'complete') {
        hide(true);
    } else {
        window.addEventListener('load', () => hide(true));
    }
})();
