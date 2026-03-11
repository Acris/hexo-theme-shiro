/**
 * Theme Toggle — smart cycling based on default theme config.
 * When default is "system": 3-state cycle (system → light → dark).
 * When default is "light" or "dark": 2-state toggle (light ↔ dark).
 * Applies .dark class on <html> and persists preference in localStorage.
 * Inline script in <head> handles initial state to prevent FOUC.
 */
;(() => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    const html = document.documentElement;
    const defaultTheme = window.__themeDefault || 'system';
    const states = defaultTheme === 'system'
        ? ['system', 'light', 'dark']
        : ['light', 'dark'];

    function getState() {
        const saved = localStorage.getItem('theme');
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

    function apply(state) {
        if (state === 'dark') {
            html.classList.add('dark');
            html.style.colorScheme = 'dark';
        } else if (state === 'light') {
            html.classList.remove('dark');
            html.style.colorScheme = 'light';
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.classList.toggle('dark', prefersDark);
            html.style.colorScheme = prefersDark ? 'dark' : 'light';
        }
        updateIcon(state);
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function cycle(e) {
        const current = getState();
        const next = states[(states.indexOf(current) + 1) % states.length];
        localStorage.setItem('theme', next);

        // Skip all animation when user prefers reduced motion
        if (prefersReduced.matches) {
            apply(next);
            return;
        }

        // Use View Transitions API for circle-expand effect (Chrome 111+, Safari 18+)
        if (document.startViewTransition) {
            // Pass click coordinates for the circle origin
            const rect = btn.getBoundingClientRect();
            const x = e ? (rect.left + rect.width / 2) : (window.innerWidth / 2);
            const y = e ? (rect.top + rect.height / 2) : (window.innerHeight / 2);
            html.style.setProperty('--toggle-x', x + 'px');
            html.style.setProperty('--toggle-y', y + 'px');

            document.startViewTransition(() => apply(next));
        } else {
            // Fallback: CSS class-based transition
            html.classList.add('theme-transition');
            apply(next);
            // 450ms matches longest transition duration (0.4s) in _tailwind.css + buffer
            setTimeout(() => html.classList.remove('theme-transition'), 450);
        }
    }

    btn.addEventListener('click', cycle);

    // Listen for system preference changes when in 'system' mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getState() === 'system') apply('system');
    });

    // Initial icon sync (class already applied by inline script)
    updateIcon(getState());
})();
