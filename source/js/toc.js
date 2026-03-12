;(() => {
    const tocSidebar = document.getElementById('tocSidebar');
    const tocInline = document.getElementById('tocInline');
    const prose = document.querySelector('.prose-shiro');
    if (!prose || (!tocSidebar && !tocInline)) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tocCfg = window.__tocConfig || {};
    const maxDepth = tocCfg.depth || 3;
    const minHeadings = tocCfg.minHeadings || 3;

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
            .replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\uAC00-\uD7AF-]/g, '')
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

    // Build TOC DOM to avoid innerHTML XSS risks
    function buildToc() {
        const ul = document.createElement('ul');
        ul.className = 'toc-list';
        headings.forEach((h) => {
            const level = parseInt(h.tagName[1], 10);
            const indent = level - minLevel;
            const li = document.createElement('li');
            li.className = 'toc-item';
            li.dataset.level = indent;
            const a = document.createElement('a');
            a.className = 'toc-link';
            a.href = '#' + h.id;
            a.dataset.target = h.id;
            a.textContent = h.textContent.trim();
            li.appendChild(a);
            ul.appendChild(li);
        });
        return ul;
    }

    const tocHtml = buildToc();

    // Populate sidebar TOC
    if (tocSidebar) {
        const sidebarList = tocSidebar.querySelector('.toc-body');
        if (sidebarList) { sidebarList.textContent = ''; sidebarList.appendChild(tocInline ? tocHtml.cloneNode(true) : tocHtml); }
    }

    if (tocInline) {
        const inlineList = tocInline.querySelector('.toc-body');
        if (inlineList) { inlineList.textContent = ''; inlineList.appendChild(tocHtml); }

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
                if (chevron && !reducedMotion.matches) {
                    chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            });
        }
    }

    // Smooth scroll (respects prefers-reduced-motion, checked at click time)
    document.querySelectorAll('.toc-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(link.dataset.target);
            if (target) {
                target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
                history.replaceState(null, '', '#' + link.dataset.target);
            }
        });
    });

    // Scroll tracking: find the heading closest to the top of the viewport
    const allLinks = document.querySelectorAll('.toc-link');
    const headingArr = Array.from(headings);
    let ticking = false;

    // Cache heading positions using getBoundingClientRect + scrollY for accurate
    // absolute positions (offsetTop is relative to offsetParent, which may not be <body>)
    let headingPositions = headingArr.map(h => ({ id: h.id, top: h.getBoundingClientRect().top + window.scrollY }));
    function cachePositions() {
        headingPositions = headingArr.map(h => ({ id: h.id, top: h.getBoundingClientRect().top + window.scrollY }));
    }
    let debounceTimer;
    window.addEventListener('resize', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(cachePositions, 200);
    }, { passive: true });

    // Re-cache positions after images load (they change page layout)
    // Uses the same debounce as resize to avoid rapid successive calls
    // when multiple images load nearly simultaneously
    function debouncedCachePositions() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(cachePositions, 200);
    }
    document.querySelectorAll('.prose-shiro img').forEach(img => {
        if (!img.complete) img.addEventListener('load', debouncedCachePositions, { once: true });
    });

    // Re-cache after web fonts finish loading (line-height changes shift headings)
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(debouncedCachePositions);
    }

    function updateActiveHeading() {
        const scrollY = window.scrollY;
        const offset = 100; // px from top
        let currentId = '';

        for (let i = headingPositions.length - 1; i >= 0; i--) {
            if (headingPositions[i].top - offset <= scrollY) {
                currentId = headingPositions[i].id;
                break;
            }
        }

        // If scrolled to very top, no active heading
        if (!currentId && scrollY < (headingPositions[0] ? headingPositions[0].top - offset : 200)) {
            currentId = '';
        }

        allLinks.forEach((link) => {
            link.classList.toggle('active', link.dataset.target === currentId);
        });

        // Scroll active TOC item into view within the sidebar
        if (currentId && tocSidebar) {
            const activeLink = tocSidebar.querySelector('.toc-link.active');
            const scrollContainer = tocSidebar.querySelector('.toc-sidebar-inner .toc-body');
            if (activeLink && scrollContainer) {
                const linkRect = activeLink.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();
                if (linkRect.top < containerRect.top || linkRect.bottom > containerRect.bottom) {
                    activeLink.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
                }
            }
        }

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
                hashTarget.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
                updateActiveHeading();
            }, 100);
        }
    }

    // Sidebar fade-in animation
    if (tocSidebar && !reducedMotion.matches) {
        tocSidebar.classList.add('toc-fade-in');
        requestAnimationFrame(() => tocSidebar.classList.add('toc-visible'));
    }
})();
