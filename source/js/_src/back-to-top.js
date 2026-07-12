;(() => {
    'use strict';

    const backBtn = document.getElementById('backToTop');
    const sentinel = document.getElementById('backToTopSentinel');
    if (!backBtn) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const setBackToTopVisible = (visible) => {
        backBtn.dataset.visible = visible ? 'true' : 'false';
        backBtn.hidden = !visible;
    };

    backBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        const main = document.getElementById('main-content');
        if (main && document.activeElement === backBtn) {
            try {
                main.focus({ preventScroll: true });
            } catch (_) {
                main.focus();
            }
        }
    });

    if (sentinel && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            setBackToTopVisible(!entries[0].isIntersecting);
        });
        observer.observe(sentinel);
    } else {
        const updateBackToTop = () => setBackToTopVisible(window.scrollY > window.innerHeight * 0.5);
        window.addEventListener('scroll', updateBackToTop, { passive: true });
        updateBackToTop();
    }
})();
