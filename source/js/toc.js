document.addEventListener('DOMContentLoaded', () => {
    const tocSidebar = document.getElementById('tocSidebar');
    const tocInline = document.getElementById('tocInline');
    const prose = document.querySelector('.prose-shiro');
    if (!prose || (!tocSidebar && !tocInline)) return;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const maxDepth = parseInt(document.body.dataset.tocDepth || '3', 10);
    const minHeadings = parseInt(document.body.dataset.tocMin || '3', 10);

    const levels = [];
    for (let i = 1; i <= maxDepth; i++) levels.push('h' + (i + 1));
    const selector = levels.join(',');
    const headings = prose.querySelectorAll(selector);
    if (headings.length < minHeadings) {
        if (tocSidebar) tocSidebar.remove();
        if (tocInline) tocInline.remove();
        return;
    }

    // Generate semantic slug from text content
    function slugify(text) {
        return text.trim()
            .toLowerCase()
            .replace(/[\s]+/g, '-')
            .replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            || 'heading';
    }

    // Ensure all headings have unique IDs (prefer existing, fallback to slug)
    const usedIds = new Set();
    headings.forEach((h) => {
        if (!h.id) {
            let base = slugify(h.textContent);
            let id = base;
            let counter = 1;
            while (usedIds.has(id) || document.getElementById(id)) {
                id = base + '-' + counter++;
            }
            h.id = id;
        }
        usedIds.add(h.id);
    });

    // Determine the minimum heading level present to normalize indentation
    let minLevel = 6;
    headings.forEach((h) => {
        const lvl = parseInt(h.tagName[1], 10);
        if (lvl < minLevel) minLevel = lvl;
    });

    // Build TOC HTML
    function buildToc() {
        let html = '<ul class="toc-list">';
        headings.forEach((h) => {
            const level = parseInt(h.tagName[1], 10);
            const indent = level - minLevel;
            html += '<li class="toc-item" data-level="' + indent + '">' +
                '<a class="toc-link" href="#' + h.id + '" data-target="' + h.id + '">' +
                h.textContent.trim() + '</a></li>';
        });
        html += '</ul>';
        return html;
    }

    const tocHtml = buildToc();

    // Populate sidebar TOC
    if (tocSidebar) {
        const sidebarList = tocSidebar.querySelector('.toc-body');
        if (sidebarList) sidebarList.innerHTML = tocHtml;
    }

    // Populate inline TOC
    if (tocInline) {
        const inlineList = tocInline.querySelector('.toc-body');
        if (inlineList) inlineList.innerHTML = tocHtml;

        // Toggle inline TOC with dynamic max-height
        const toggleBtn = tocInline.querySelector('.toc-toggle');
        const body = tocInline.querySelector('.toc-body');
        if (toggleBtn && body) {
            toggleBtn.addEventListener('click', () => {
                const open = body.dataset.open === 'true';
                if (open) {
                    body.dataset.open = 'false';
                    body.style.maxHeight = '0';
                    body.style.opacity = '0';
                } else {
                    body.dataset.open = 'true';
                    body.style.maxHeight = body.scrollHeight + 'px';
                    body.style.opacity = '1';
                }
                toggleBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
                const chevron = toggleBtn.querySelector('.toc-chevron');
                if (chevron && !prefersReduced) {
                    chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            });
        }
    }

    // Smooth scroll (respects prefers-reduced-motion)
    const scrollBehavior = prefersReduced ? 'auto' : 'smooth';
    document.querySelectorAll('.toc-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(link.dataset.target);
            if (target) {
                target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
                history.replaceState(null, '', '#' + link.dataset.target);
            }
        });
    });

    // Scroll tracking: find the heading closest to the top of the viewport
    const allLinks = document.querySelectorAll('.toc-link');
    const headingArr = Array.from(headings);
    let ticking = false;

    function updateActiveHeading() {
        const scrollY = window.scrollY;
        const offset = 100; // px from top
        let currentId = '';

        for (let i = headingArr.length - 1; i >= 0; i--) {
            if (headingArr[i].getBoundingClientRect().top + window.scrollY - offset <= scrollY) {
                currentId = headingArr[i].id;
                break;
            }
        }

        // If scrolled to very top, no active heading
        if (!currentId && scrollY < (headingArr[0] ? headingArr[0].offsetTop - offset : 200)) {
            currentId = '';
        }

        allLinks.forEach((link) => {
            link.classList.toggle('active', link.dataset.target === currentId);
        });
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateActiveHeading);
            ticking = true;
        }
    }, { passive: true });

    // Initial highlight
    updateActiveHeading();

    // Check URL hash on load and scroll to matching heading
    if (location.hash) {
        const hashTarget = document.getElementById(location.hash.slice(1));
        if (hashTarget) {
            setTimeout(() => {
                hashTarget.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
                updateActiveHeading();
            }, 100);
        }
    }

    // Sidebar fade-in animation
    if (tocSidebar && !prefersReduced) {
        tocSidebar.style.opacity = '0';
        tocSidebar.style.transition = 'opacity 0.4s var(--ease-soft)';
        requestAnimationFrame(() => {
            tocSidebar.style.opacity = '1';
        });
    }
});
