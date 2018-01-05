document.addEventListener('DOMContentLoaded', () => {
    // Menu Logic
    const btn = document.getElementById('menuBtn');
    const panel = document.getElementById('mobileMenu');
    const chevron = document.getElementById('menuChevron');

    if (btn && panel && chevron) {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function setOpen(open) {
            panel.dataset.open = open ? "true" : "false";
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            chevron.style.transform = (open && !prefersReduced) ? 'rotate(180deg)' : (prefersReduced ? 'none' : 'rotate(0deg)');
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setOpen(panel.dataset.open !== "true");
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setOpen(false);
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !panel.contains(e.target)) {
                setOpen(false);
            }
        });
    }
});
