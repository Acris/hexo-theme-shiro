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
                // Constrain TOC button within paper boundaries
                const fabHeight = tocBtn.offsetHeight || 35;
                const fabBottomMargin = 16; // default 1rem
                const minTop = 16; // minimum distance from paper top
                // Calculate ideal bottom position
                let bottomPos = fabBottomMargin;
                // Check if paper bottom is above viewport bottom
                const paperBottom = rect.bottom;
                const viewportHeight = window.innerHeight;

                if (paperBottom < viewportHeight) {
                    // Paper's bottom is visible, constrain button to not go below it
                    const maxBottom = viewportHeight - paperBottom;
                    bottomPos = Math.max(maxBottom + fabBottomMargin, fabBottomMargin);
                }

                // Check if button would go above paper's top
                const buttonTop = viewportHeight - bottomPos - fabHeight;
                if (buttonTop < rect.top + minTop) {
                    // Adjust to stay below paper's top
                    bottomPos = viewportHeight - rect.top - minTop - fabHeight;
                }

                // Hide button if paper is completely out of view or too small
                if (rect.bottom < 0 || rect.top > viewportHeight || rect.height < fabHeight + minTop + fabBottomMargin) {
                    tocBtn.style.opacity = '0';
                    tocBtn.style.pointerEvents = 'none';
                } else {
                    tocBtn.style.opacity = '1';
                    tocBtn.style.pointerEvents = 'auto';
                }

                tocBtn.style.bottom = bottomPos + 'px';
                // Keep panel aligned with button
                tocPanel.style.bottom = (bottomPos + fabHeight + 12) + 'px';

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

    // Code Copy Functionality
    document.querySelectorAll('.prose-shiro .highlight').forEach((block) => {
        if (block.querySelector('.copy-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copy';
        block.appendChild(btn);

        btn.onclick = async () => {
            try {
                const lines = block.querySelectorAll('.code .line');
                const code = lines.length 
                    ? Array.from(lines).map(l => l.textContent).join('\n')
                    : (block.querySelector('.code pre')?.textContent || block.querySelector('pre')?.textContent || '');
                await navigator.clipboard.writeText(code);
                btn.textContent = '✓';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = 'Copy';
                    btn.classList.remove('copied');
                }, 2000);
            } catch (e) {
                btn.textContent = '✗';
                setTimeout(() => btn.textContent = 'Copy', 2000);
            }
        };
    });
});
