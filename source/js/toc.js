;(() => {
    const tocSidebar = document.getElementById('tocSidebar');
    const tocInline = document.getElementById('tocInline');
    if (!tocSidebar && !tocInline) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tocRoots = [tocSidebar, tocInline].filter(Boolean);
    const links = tocRoots.flatMap(root => Array.from(root.querySelectorAll('.toc-link[data-target]')));
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

    function handleTocClick(e) {
        const link = e.target && e.target.closest && e.target.closest('.toc-link[data-target]');
        if (!link) return;
        const root = e.currentTarget;
        if (!root || !root.contains(link)) return;

        e.preventDefault();
        const target = document.getElementById(link.dataset.target);
        if (target) {
            target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
            history.replaceState(null, '', '#' + link.dataset.target);
        }
    }

    if (tocSidebar) tocSidebar.addEventListener('click', handleTocClick);
    if (tocInline) tocInline.addEventListener('click', handleTocClick);

    let activeId = '';
    let updateQueued = false;
    let activeIndex = -1;
    const headingIndex = new Map();
    const passedHeadings = new Set();
    headingArr.forEach((heading, index) => headingIndex.set(heading.id, index));

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
        activeIndex = id && headingIndex.has(id) ? headingIndex.get(id) : -1;
        if (activeId) {
            setLinksActive(activeId, true);
            scrollSidebarActiveLink(activeId);
        }
    }

    function currentPassedHeadingId() {
        let index = -1;
        passedHeadings.forEach((id) => {
            const candidate = headingIndex.get(id);
            if (candidate > index) index = candidate;
        });
        return index >= 0 ? headingArr[index].id : '';
    }

    function updateActiveHeadingFromObserver() {
        setActiveHeading(currentPassedHeadingId());
    }

    function updateActiveHeadingByPosition() {
        const offset = 100;
        let currentIndex = activeIndex;
        if (currentIndex < 0) currentIndex = 0;

        while (currentIndex + 1 < headingArr.length
            && headingArr[currentIndex + 1].getBoundingClientRect().top - offset <= 0) {
            currentIndex += 1;
        }
        while (currentIndex >= 0 && headingArr[currentIndex].getBoundingClientRect().top - offset > 0) {
            currentIndex -= 1;
        }

        setActiveHeading(currentIndex >= 0 ? headingArr[currentIndex].id : '');
    }

    function scheduleActiveUpdate(update) {
        if (updateQueued) return;
        updateQueued = true;
        requestAnimationFrame(() => {
            updateQueued = false;
            update();
        });
    }

    const scheduleObserverUpdate = () => scheduleActiveUpdate(updateActiveHeadingFromObserver);
    const schedulePositionUpdate = () => scheduleActiveUpdate(updateActiveHeadingByPosition);

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const id = entry.target.id;
                if (!id) return;
                if (entry.boundingClientRect.top <= 100 && !entry.isIntersecting) {
                    passedHeadings.add(id);
                } else {
                    passedHeadings.delete(id);
                }
            });
            scheduleObserverUpdate();
        }, {
            rootMargin: '-100px 0px 0px 0px',
            threshold: 0
        });
        headingArr.forEach(heading => observer.observe(heading));
        schedulePositionUpdate();
    } else {
        window.addEventListener('scroll', schedulePositionUpdate, { passive: true });
        schedulePositionUpdate();
    }

    window.addEventListener('resize', schedulePositionUpdate, { passive: true });
    if (document.readyState !== 'complete') {
        window.addEventListener('load', schedulePositionUpdate, { once: true });
    }
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(schedulePositionUpdate);
    }

    if (location.hash) {
        const hashTarget = document.getElementById(location.hash.slice(1));
        if (hashTarget) {
            setTimeout(() => {
                hashTarget.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
                schedulePositionUpdate();
            }, 100);
        }
    }

    if (tocSidebar && !reducedMotion.matches) {
        tocSidebar.classList.add('toc-fade-in');
        requestAnimationFrame(() => tocSidebar.classList.add('toc-visible'));
    }
})();
