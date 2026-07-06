/**
 * Theme Toggle — smart cycling based on default theme config.
 * When default is "system": 3-state cycle (system → light → dark).
 * When default is "light" or "dark": 2-state toggle (light ↔ dark).
 * Applies data-theme and colorScheme on <html>; when search is enabled also
 * syncs data-pf-theme for Pagefind. Persists preference in localStorage.
 * Inline script in <head> handles initial state (FOUC) and live OS theme
 * following in "system" mode, so following works even when this toggle is off.
 */
;(() => {
    'use strict';

    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    const html = document.documentElement;
    const defaultTheme = window.__themeDefault || 'system';
    const syncPagefindTheme = window.__shiroSearchEnabled === true;
    const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const states = defaultTheme === 'system'
        ? ['system', 'light', 'dark']
        : ['light', 'dark'];

    function getState() {
        let saved;
        try { saved = localStorage.getItem('theme'); } catch (_) {}
        if (saved && states.includes(saved)) return saved;
        return defaultTheme;
    }

    function updateIcon(state) {
        // Drive icon visibility via CSS attribute selector on <html>
        html.setAttribute('data-theme-state', state);
        // Update aria-label so screen readers announce the current theme state
        const label = btn.dataset['label' + state.charAt(0).toUpperCase() + state.slice(1)];
        if (label) btn.setAttribute('aria-label', label);
    }

    // Mirrors head.njk FOUC script (data-pf-theme only when search is enabled).
    function applyResolvedTheme(dark) {
        html.setAttribute('data-theme', dark ? 'dark' : 'light');
        if (syncPagefindTheme) {
            if (dark) html.setAttribute('data-pf-theme', 'dark');
            else html.removeAttribute('data-pf-theme');
        }
        html.style.colorScheme = dark ? 'dark' : 'light';
    }

    function apply(state) {
        const isDark = state === 'dark' || (state !== 'light' && prefersDarkQuery.matches);
        applyResolvedTheme(isDark);
        updateIcon(state);
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function cycle() {
        const current = getState();
        const next = states[(states.indexOf(current) + 1) % states.length];
        try { localStorage.setItem('theme', next); } catch (_) {}

        // Skip all animation when user prefers reduced motion
        if (reducedMotionQuery.matches) {
            apply(next);
            return;
        }

        // Use View Transitions API for cross-fade effect (Chrome 111+, Safari 18+)
        if (document.startViewTransition) {
            try {
                document.startViewTransition(() => apply(next));
            } catch (_) {
                apply(next);
            }
        } else {
            // Fallback: CSS class-based transition
            html.classList.add('theme-transition');
            apply(next);
            // 450ms matches longest transition duration (0.4s) in _tailwind.css + buffer
            setTimeout(() => html.classList.remove('theme-transition'), 450);
        }
    }

    btn.addEventListener('click', cycle);

    // Initial icon sync (theme already applied by inline script)
    updateIcon(getState());
})();
