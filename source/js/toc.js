;(() => {
    const tocSidebar = document.getElementById('tocSidebar');
    const tocInline = document.getElementById('tocInline');
    if (!tocSidebar && !tocInline) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const links = Array.from(document.querySelectorAll('.toc-link[data-target]'));
    if (!links.length) return;

    const headingArr = [];
    const linksByTarget = new Map();
    links.forEach((link) => {
        const target = link.dataset.target;
        if (!target) return;
        const heading = document.getElementById(target);
        if (heading && !headingArr.includes(heading)) headingArr.push(heading);
        if (!linksByTarget.has(target)) linksByTarget.set(target, []);
        linksByTarget.get(target).push(link);
    });
    if (!headingArr.length) return;

    if (tocInline) {
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

    links.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(link.dataset.target);
            if (target) {
                target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
                history.replaceState(null, '', '#' + link.dataset.target);
            }
        });
    });

    let activeId = '';
    let updateQueued = false;

    function setLinksActive(id, active) {
        const targetLinks = linksByTarget.get(id) || [];
        targetLinks.forEach(link => link.classList.toggle('active', active));
    }

    function scrollSidebarActiveLink(id) {
        if (!id || !tocSidebar) return;
        const targetLinks = linksByTarget.get(id) || [];
        const activeLink = targetLinks.find(link => tocSidebar.contains(link));
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
