/**
 * Theme Toggle — 3-state cycling: system → light → dark
 * Applies .dark class on <html> and persists preference in localStorage.
 * Inline script in <head> handles initial state to prevent FOUC.
 */
;(() => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    const states = ['system', 'light', 'dark'];

    // Cache SVG icon references once to avoid repeated DOM queries in updateIcon
    const icons = {};
    states.forEach(s => { icons[s] = btn.querySelector(`[data-icon="${s}"]`); });

    function getState() {
        return localStorage.getItem('theme') || (window.__themeDefault || 'system');
    }

    function updateIcon(state) {
        states.forEach(s => {
            if (icons[s]) icons[s].classList.toggle('hidden', s !== state);
        });
        // Update aria-label so screen readers announce the current theme state
        const label = btn.dataset['label' + state.charAt(0).toUpperCase() + state.slice(1)];
        if (label) btn.setAttribute('aria-label', label);
    }

    function apply(state) {
        const html = document.documentElement;
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

    function cycle() {
        const current = getState();
        const next = states[(states.indexOf(current) + 1) % states.length];
        localStorage.setItem('theme', next);

        const html = document.documentElement;
        html.classList.add('theme-transition');
        apply(next);
        // 350ms matches .theme-transition duration in _tailwind.css
        setTimeout(() => html.classList.remove('theme-transition'), 350);
    }

    btn.addEventListener('click', cycle);

    // Listen for system preference changes when in 'system' mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getState() === 'system') apply('system');
    });

    // Initial icon sync (class already applied by inline script)
    updateIcon(getState());
})();
