;(() => {
    const backBtn = document.getElementById('backToTop');
    const sentinel = document.getElementById('backToTopSentinel');
    if (!backBtn) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const setBackToTopVisible = (visible) => {
        backBtn.dataset.visible = visible ? 'true' : 'false';
    };

    backBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
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
