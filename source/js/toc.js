;(() => {
    const tocSidebar = document.getElementById('tocSidebar');
    const tocInline = document.getElementById('tocInline');
    const prose = document.querySelector('.prose-shiro');
    if (!prose || (!tocSidebar && !tocInline)) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tocCfg = window.__tocConfig || {};
    const maxDepth = Math.max(1, Number(tocCfg.depth) || 3);
    const minHeadings = Math.max(1, Number(tocCfg.minHeadings) || 3);

    const levels = [];
    for (let i = 1; i <= maxDepth; i++) levels.push('h' + (i + 1));
    const selector = levels.join(',');
    const headings = prose.querySelectorAll(selector);
    if (headings.length < minHeadings) {
        if (tocSidebar) tocSidebar.remove();
        if (tocInline) tocInline.remove();
        return;
    }

    function slugify(text) {
        return text.trim()
            .toLowerCase()
            .replace(/[\s]+/g, '-')
            .replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\uAC00-\uD7AF-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            || 'heading';
    }

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

    let minLevel = 6;
    headings.forEach((h) => {
        const lvl = parseInt(h.tagName[1], 10);
        if (lvl < minLevel) minLevel = lvl;
    });

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

    if (tocSidebar) {
        const sidebarList = tocSidebar.querySelector('.toc-body');
        if (sidebarList) { sidebarList.textContent = ''; sidebarList.appendChild(tocInline ? tocHtml.cloneNode(true) : tocHtml); }
    }

    if (tocInline) {
        const inlineList = tocInline.querySelector('.toc-body');
        if (inlineList) { inlineList.textContent = ''; inlineList.appendChild(tocHtml); }

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

    const headingArr = Array.from(headings);
    const linksByTarget = new Map();
    document.querySelectorAll('.toc-link').forEach((link) => {
        const target = link.dataset.target;
        if (!linksByTarget.has(target)) linksByTarget.set(target, []);
        linksByTarget.get(target).push(link);
    });

    let activeId = '';
    let updateQueued = false;

    function setLinksActive(id, active) {
        const links = linksByTarget.get(id) || [];
        links.forEach(link => link.classList.toggle('active', active));
    }

    function scrollSidebarActiveLink(id) {
        if (!id || !tocSidebar) return;
        const links = linksByTarget.get(id) || [];
        const activeLink = links.find(link => tocSidebar.contains(link));
        const scrollContainer = tocSidebar.querySelector('.toc-sidebar-inner .toc-body');
        if (!activeLink || !scrollContainer) return;

        const linkRect = activeLink.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        if (linkRect.top < containerRect.top || linkRect.bottom > containerRect.bottom) {
            activeLink.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        }
    }

    function setActiveHeading(id) {
        if (id === activeId) return;
        if (activeId) setLinksActive(activeId, false);
        activeId = id;
        if (activeId) {
            setLinksActive(activeId, true);
            scrollSidebarActiveLink(activeId);
        }
    }

    function updateActiveHeading() {
        const offset = 100;
        let currentId = '';
        for (let i = 0; i < headingArr.length; i++) {
            if (headingArr[i].getBoundingClientRect().top - offset <= 0) {
                currentId = headingArr[i].id;
            } else {
                break;
            }
        }
        setActiveHeading(currentId);
    }

    function scheduleActiveUpdate() {
        if (updateQueued) return;
        updateQueued = true;
        requestAnimationFrame(() => {
            updateQueued = false;
            updateActiveHeading();
        });
    }

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(scheduleActiveUpdate, {
            rootMargin: '-100px 0px -60% 0px',
            threshold: 0
        });
        headingArr.forEach(heading => observer.observe(heading));
    } else {
        window.addEventListener('scroll', scheduleActiveUpdate, { passive: true });
    }

    window.addEventListener('resize', scheduleActiveUpdate, { passive: true });
    document.querySelectorAll('.prose-shiro img').forEach(img => {
        if (!img.complete) img.addEventListener('load', scheduleActiveUpdate, { once: true });
    });
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scheduleActiveUpdate);
    }

    scheduleActiveUpdate();

    if (location.hash) {
        const hashTarget = document.getElementById(location.hash.slice(1));
        if (hashTarget) {
            setTimeout(() => {
                hashTarget.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
                scheduleActiveUpdate();
            }, 100);
        }
    }

    if (tocSidebar && !reducedMotion.matches) {
        tocSidebar.classList.add('toc-fade-in');
        requestAnimationFrame(() => tocSidebar.classList.add('toc-visible'));
    }
})();
