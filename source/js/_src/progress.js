;(() => {
    'use strict';

    const bar = document.getElementById('progressBar');
    if (!bar) return;
    let ticking = false;

    function updateProgress() {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;

        if (docHeight <= 0) {
            bar.style.opacity = '0';
            bar.style.transform = 'scaleX(0)';
        } else {
            bar.style.opacity = '1';
            const progress = Math.max(0, Math.min(window.scrollY / docHeight, 1));
            bar.style.transform = 'scaleX(' + progress + ')';
        }

        ticking = false;
    }

    function scheduleProgressUpdate() {
        if (ticking) return;
        requestAnimationFrame(updateProgress);
        ticking = true;
    }

    window.addEventListener('scroll', scheduleProgressUpdate, { passive: true });
    window.addEventListener('resize', scheduleProgressUpdate, { passive: true });
    updateProgress();
})();
