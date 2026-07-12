;(() => {
    'use strict';

    const tocSidebar = document.getElementById('tocSidebar');
    const tocInline = document.getElementById('tocInline');
    if (!tocSidebar && !tocInline) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tocRoots = [tocSidebar, tocInline].filter(Boolean);
    const links = tocRoots.flatMap(root => Array.from(root.querySelectorAll('.toc-link[data-target]')));
    const sidebarScrollContainer = tocSidebar ? tocSidebar.querySelector('.toc-sidebar-inner .toc-body') : null;
    if (!links.length) return;

    const headingArr = [];
    const linksByTarget = new Map();
    const headingIds = new Set();
    links.forEach((link) => {
        const target = link.dataset.target;
        if (!target) return;
        const heading = document.getElementById(target);
        if (heading && !headingIds.has(target)) {
            headingIds.add(target);
            headingArr.push(heading);
        }
        let targetLinks = linksByTarget.get(target);
        if (!targetLinks) {
            targetLinks = [];
            linksByTarget.set(target, targetLinks);
        }
        targetLinks.push(link);
    });
    if (!headingArr.length) return;

    let syncInlineHeight = () => {};
    if (tocInline) {
        const toggleBtn = tocInline.querySelector('.toc-toggle');
        const body = tocInline.querySelector('.toc-body');
        if (toggleBtn && body) {
            function setInlineOpen(open) {
                body.dataset.open = open ? 'true' : 'false';
                body.inert = !open;
                body.style.maxHeight = open ? body.scrollHeight + 'px' : '0';
                body.style.opacity = open ? '1' : '0';
                toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            }

            const handleToggle = () => {
                const open = body.dataset.open === 'true';
                setInlineOpen(!open);
                const chevron = toggleBtn.querySelector('.toc-chevron');
                if (chevron && !reducedMotion.matches) {
                    chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            };
            toggleBtn.addEventListener('click', handleToggle);
            try {
                setInlineOpen(false);
                toggleBtn.hidden = false;
                tocInline.dataset.enhanced = 'true';
                syncInlineHeight = () => {
                    if (body.dataset.open === 'true') body.style.maxHeight = body.scrollHeight + 'px';
                };
            } catch (_) {
                toggleBtn.removeEventListener('click', handleToggle);
                toggleBtn.hidden = true;
                delete tocInline.dataset.enhanced;
                body.dataset.open = 'true';
                body.inert = false;
                body.style.removeProperty('max-height');
                body.style.removeProperty('opacity');
            }
        }
    }

    function handleTocClick(e) {
        const link = e.target && e.target.closest && e.target.closest('.toc-link[data-target]');
        if (!link) return;
        const root = e.currentTarget;
        if (!root || !root.contains(link)) return;
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const target = document.getElementById(link.dataset.target);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
            history.replaceState(null, '', '#' + encodeURIComponent(link.dataset.target));
            const hadTabindex = target.hasAttribute('tabindex');
            if (!hadTabindex) target.setAttribute('tabindex', '-1');
            try {
                target.focus({ preventScroll: true });
            } catch (_) {
                target.focus();
            }
            if (!hadTabindex) {
                target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
            }
        }
    }

    if (tocSidebar) tocSidebar.addEventListener('click', handleTocClick);
    if (tocInline) tocInline.addEventListener('click', handleTocClick);

    let activeId = '';
    let updateQueued = false;
    const headingIndex = new Map();
    const passedHeadings = new Set();
    headingArr.forEach((heading, index) => headingIndex.set(heading.id, index));

    function setLinksActive(id, active) {
        const targetLinks = linksByTarget.get(id) || [];
        targetLinks.forEach((link) => {
            link.classList.toggle('active', active);
            if (active) {
                link.setAttribute('aria-current', 'location');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    function scrollSidebarActiveLink(id) {
        if (!id || !tocSidebar) return;
        const targetLinks = linksByTarget.get(id) || [];
        const activeLink = targetLinks.find(link => tocSidebar.contains(link));
        const scrollContainer = sidebarScrollContainer;
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

    function currentPassedHeadingId() {
        let index = -1;
        passedHeadings.forEach((id) => {
            const candidate = headingIndex.get(id);
            if (candidate > index) index = candidate;
        });
        return index >= 0 ? headingArr[index].id : '';
    }

    // Single scroll-spy model: geometry-based "passed" set + last passed id.
    // Used for both IntersectionObserver updates and resize/load rebuilds so
    // the two paths never disagree.
    const OFFSET = 100;

    function rebuildPassedFromGeometry() {
        passedHeadings.clear();
        headingArr.forEach((heading) => {
            if (heading.getBoundingClientRect().top - OFFSET <= 0) {
                passedHeadings.add(heading.id);
            }
        });
        setActiveHeading(currentPassedHeadingId());
    }

    function scheduleActiveUpdate(update) {
        if (updateQueued) return;
        updateQueued = true;
        requestAnimationFrame(() => {
            updateQueued = false;
            update();
        });
    }

    const scheduleGeometryUpdate = () => scheduleActiveUpdate(rebuildPassedFromGeometry);

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const id = entry.target.id;
                if (!id) return;
                if (entry.boundingClientRect.top <= OFFSET && !entry.isIntersecting) {
                    passedHeadings.add(id);
                } else {
                    passedHeadings.delete(id);
                }
            });
            scheduleActiveUpdate(() => setActiveHeading(currentPassedHeadingId()));
        }, {
            rootMargin: '-' + OFFSET + 'px 0px 0px 0px',
            threshold: 0
        });
        headingArr.forEach(heading => observer.observe(heading));
        scheduleGeometryUpdate();
    } else {
        window.addEventListener('scroll', scheduleGeometryUpdate, { passive: true });
        scheduleGeometryUpdate();
    }

    const handleViewportChange = () => {
        scheduleGeometryUpdate();
        syncInlineHeight();
    };
    window.addEventListener('resize', handleViewportChange, { passive: true });
    if (document.readyState !== 'complete') {
        window.addEventListener('load', handleViewportChange, { once: true });
    }
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(handleViewportChange).catch(() => {});
    }

    function decodedHashTarget() {
        if (!location.hash) return null;
        const raw = location.hash.slice(1);
        try {
            return document.getElementById(decodeURIComponent(raw));
        } catch (_) {
            return document.getElementById(raw);
        }
    }

    const hashTarget = decodedHashTarget();
    if (hashTarget) {
        setTimeout(() => {
            hashTarget.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
            scheduleGeometryUpdate();
        }, 100);
    }

    if (tocSidebar && !reducedMotion.matches) {
        tocSidebar.classList.add('toc-fade-in');
        requestAnimationFrame(() => tocSidebar.classList.add('toc-visible'));
    }
})();
