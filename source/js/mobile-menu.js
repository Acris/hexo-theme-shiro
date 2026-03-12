;(() => {
    // Menu Logic
    const btn = document.getElementById('menuBtn');
    const panel = document.getElementById('mobileMenu');
    const chevron = document.getElementById('menuChevron');

    if (btn && panel && chevron) {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        function setOpen(open) {
            panel.dataset.open = open ? "true" : "false";
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (reducedMotion.matches) {
                chevron.style.transform = 'none';
            } else {
                chevron.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = panel.dataset.open !== "true";
            setOpen(willOpen);
            if (willOpen) {
                const first = panel.querySelector('a, button');
                if (first) first.focus();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel.dataset.open === 'true') { setOpen(false); btn.focus(); }
            // Focus trap: cycle Tab within open menu
            if (e.key === 'Tab' && panel.dataset.open === 'true') {
                const focusable = panel.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault(); last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault(); first.focus();
                }
            }
        });

        // Close when clicking outside (skip if already closed)
        document.addEventListener('click', (e) => {
            if (panel.dataset.open === 'true' && !btn.contains(e.target) && !panel.contains(e.target)) {
                setOpen(false);
            }
        });
    }
})();
