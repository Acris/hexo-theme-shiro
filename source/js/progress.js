;(() => {
    const bar = document.getElementById('progressBar');
    const backBtn = document.getElementById('backToTop');
    if (!bar && !backBtn) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let ticking = false;

    function update() {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;

        if (bar) {
            if (docHeight <= 0) {
                bar.style.opacity = '0';
                bar.style.transform = 'scaleX(0)';
            } else {
                bar.style.opacity = '1';
                const progress = Math.min(scrollY / docHeight, 1);
                bar.style.transform = 'scaleX(' + progress + ')';
            }
        }

        if (backBtn) {
            const show = scrollY > window.innerHeight * 0.5;
            backBtn.dataset.visible = show ? 'true' : 'false';
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        });
    }

    update();
})();
