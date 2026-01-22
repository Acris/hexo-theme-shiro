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

    // TOC Floating Button Logic
    const tocBtn = document.getElementById('tocFab');
    const tocPanel = document.getElementById('tocPanel');
    const tocOverlay = document.getElementById('tocOverlay');

    if (tocBtn && tocPanel) {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Positioning: keep the FAB fixed to the viewport but aligned to the right edge of the main 'paper' container.
        const paperEl = document.querySelector('.paper');

        function updateFabPosition() {
            try {
                // default margin from paper's right edge
                const margin = 16; // px
                if (!paperEl) {
                    // fallback: keep 1rem from viewport right
                    tocBtn.style.right = '1rem';
                    tocPanel.style.right = '1rem';
                    return;
                }

                const rect = paperEl.getBoundingClientRect();
                // distance from paper's right edge to viewport right edge
                const offsetRight = Math.max(12, Math.round(window.innerWidth - rect.right));
                const rightPx = offsetRight + margin;
                tocBtn.style.right = rightPx + 'px';
                tocPanel.style.right = rightPx + 'px';
                // overlay should cover the paper area — position it relative to viewport so make it full screen
                if (tocOverlay) {
                    // keep overlay fixed to viewport to cover entire screen for easier click-to-close
                    tocOverlay.style.position = 'fixed';
                }
            } catch (e) {
                // ignore positioning errors
            }
        }

        // update on load/resize/scroll
        window.addEventListener('resize', updateFabPosition, { passive: true });
        window.addEventListener('scroll', updateFabPosition, { passive: true });
        // run once now
        updateFabPosition();

        function setTocOpen(open) {
            tocPanel.dataset.open = open ? "true" : "false";
            if (tocOverlay) tocOverlay.dataset.open = open ? "true" : "false";
            tocBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            tocPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
            // simple transform for icon (no chevron here) - keep accessible
            if (!prefersReduced) {
                // no visual icon rotation needed for this icon
            }
        }

        tocBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = tocPanel.dataset.open === "true";
            setTocOpen(!isOpen);
        });

        if (tocOverlay) {
            tocOverlay.addEventListener('click', () => setTocOpen(false));
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setTocOpen(false);
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!tocBtn.contains(e.target) && !tocPanel.contains(e.target)) {
                setTocOpen(false);
            }
        });
    }
});
