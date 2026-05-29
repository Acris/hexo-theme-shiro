;(() => {
    'use strict';

    const script = window.__searchScript || '';
    if (!script) return;

    /* global loadBootstrapScript */
    // <shiro-script-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-script-loader>

    const toggle = document.getElementById('searchToggle');
    let loading = false;
    let warmed = false;

    function removeOpenListeners() {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleKeydown);
    }

    function removeWarmListeners() {
        if (!toggle) return;
        toggle.removeEventListener('pointerover', warm);
        toggle.removeEventListener('pointerdown', warm);
        toggle.removeEventListener('focusin', warm);
    }

    function removeBootstrapListeners() {
        removeOpenListeners();
        removeWarmListeners();
    }

    function loadSearch() {
        loading = true;
        loadBootstrapScript(script, {
            onload: () => {
                loading = false;
                removeBootstrapListeners();
            },
            onerror: () => {
                loading = false;
                warmed = false;
                window.__shiroSearchAutoOpen = false;
                window.__shiroSearchWarmRequested = false;
            }
        });
    }

    function openSearch() {
        if (window.__shiroSearchOpen) {
            window.__shiroSearchOpen();
            removeBootstrapListeners();
            return;
        }

        window.__shiroSearchAutoOpen = true;
        if (loading) return;
        loadSearch();
    }

    // The search button has no hover on touch devices, so eagerly fetch the search
    // script + assets on the first intent (hover / press / focus) or on idle, so the
    // click itself opens instantly. Gated on connection quality to spare metered data.
    function warm() {
        if (warmed) return;
        warmed = true;
        removeWarmListeners();

        if (window.__shiroSearchWarm) {
            window.__shiroSearchWarm();
            return;
        }
        if (loading) return;

        window.__shiroSearchWarmRequested = true;
        loadSearch();
    }

    function connectionAllowsWarm() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return true;
        if (connection.saveData) return false;
        return !/(^|-)2g$/.test(connection.effectiveType || '');
    }

    function proactiveWarm() {
        if (warmed || !connectionAllowsWarm()) return;
        const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 1200));
        idle(() => warm(), { timeout: 2000 });
    }

    function handleKeydown(event) {
        const active = document.activeElement;
        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
        if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
        event.preventDefault();
        openSearch();
    }

    function handleClick(event) {
        if (!toggle || !toggle.contains(event.target)) return;
        event.preventDefault();
        openSearch();
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    if (toggle) {
        toggle.addEventListener('pointerover', warm);
        toggle.addEventListener('pointerdown', warm);
        toggle.addEventListener('focusin', warm);
    }
    proactiveWarm();
})();
