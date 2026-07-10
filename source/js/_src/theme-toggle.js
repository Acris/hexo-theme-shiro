/**
 * Theme Toggle — smart cycling based on default theme config.
 * When default is "system": 3-state cycle (system → light → dark).
 * When default is "light" or "dark": 2-state toggle (light ↔ dark).
 * Applies data-theme and colorScheme on <html> via the shared FOUC helper
 * window.__shiroApplyResolvedTheme (set in head.njk). When search is enabled
 * that helper also syncs data-pf-theme for Pagefind. Preference is persisted
 * in localStorage. The head FOUC script still owns initial paint and live OS
 * following in "system" mode when this toggle is off.
 */
;(() => {
    'use strict';

    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    const html = document.documentElement;
    const defaultTheme = window.__themeDefault || 'system';
    const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const states = defaultTheme === 'system'
        ? ['system', 'light', 'dark']
        : ['light', 'dark'];

    // Prefer the FOUC-installed helper so theme + Pagefind contracts stay single-source.
    // Fallback mirrors head.njk only if the inline script was stripped.
    const applyResolvedTheme = typeof window.__shiroApplyResolvedTheme === 'function'
        ? window.__shiroApplyResolvedTheme
        : (dark) => {
            html.setAttribute('data-theme', dark ? 'dark' : 'light');
            if (window.__shiroSearchEnabled === true) {
                if (dark) html.setAttribute('data-pf-theme', 'dark');
                else html.removeAttribute('data-pf-theme');
            }
            html.style.colorScheme = dark ? 'dark' : 'light';
        };

    function getState() {
        let saved;
        try { saved = localStorage.getItem('theme'); } catch (_) {}
        if (saved && states.includes(saved)) return saved;
        return defaultTheme;
    }

    function updateIcon(state) {
        html.setAttribute('data-theme-state', state);
        const label = btn.dataset['label' + state.charAt(0).toUpperCase() + state.slice(1)];
        if (label) btn.setAttribute('aria-label', label);
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

        if (reducedMotionQuery.matches) {
            apply(next);
            return;
        }

        if (document.startViewTransition) {
            try {
                document.startViewTransition(() => apply(next));
            } catch (_) {
                apply(next);
            }
        } else {
            html.classList.add('theme-transition');
            apply(next);
            // 450ms matches longest transition duration (0.4s) in theme-toggle CSS + buffer
            setTimeout(() => html.classList.remove('theme-transition'), 450);
        }
    }

    btn.addEventListener('click', cycle);
    updateIcon(getState());
})();
