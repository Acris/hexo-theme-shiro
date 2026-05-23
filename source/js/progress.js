;(() => {
    const bar = document.getElementById('progressBar');
    const backBtn = document.getElementById('backToTop');
    const sentinel = document.getElementById('backToTopSentinel');
    if (!bar && !backBtn) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let ticking = false;

    function updateProgress() {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;

        if (docHeight <= 0) {
            bar.style.opacity = '0';
            bar.style.transform = 'scaleX(0)';
        } else {
            bar.style.opacity = '1';
            const progress = Math.min(window.scrollY / docHeight, 1);
            bar.style.transform = 'scaleX(' + progress + ')';
        }

        ticking = false;
    }

    function scheduleProgressUpdate() {
        if (!bar || ticking) return;
        requestAnimationFrame(updateProgress);
        ticking = true;
    }

    if (bar) {
        window.addEventListener('scroll', scheduleProgressUpdate, { passive: true });
        window.addEventListener('resize', scheduleProgressUpdate, { passive: true });
        updateProgress();
    }

    if (backBtn) {
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
    }
})();
