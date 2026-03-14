;(() => {
    const containers = document.querySelectorAll('.prose-shiro');
    if (!containers.length || typeof window.lightGallery !== 'function') return;

    // Escape special characters for safe use inside HTML text content
    const escapeHtml = (value) => {
        if (!value) return '';
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    // Escape special characters for safe use inside HTML attributes
    const escapeAttr = (value) => {
        if (!value) return '';
        return escapeHtml(value).replace(/"/g, '&quot;');
    };

    // Check if a URL is a meaningful HTTP(S) link (not #, javascript:void, etc.)
    const isValidUrl = (url) => /^https?:\/\//i.test(url);

    // Skip tiny or decorative images (tracking pixels, icons, etc.)
    const isDecorativeImg = (img) => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w && h && w <= 3 && h <= 3) return true;
        if (img.getAttribute('role') === 'presentation') return true;
        if (img.classList.contains('emoji')) return true;
        return false;
    };

    const getCaption = (img) => img.getAttribute('title') || img.getAttribute('alt') || '';

    const i18nVisitSource = () =>
        (window.__i18n && window.__i18n.gallery_visit_source) || 'View Source Page';

    // Build data-sub-html with optional linked source button
    const buildSubHtml = (caption, linkedUrl) => {
        let html = '';
        if (caption) html += `<p>${escapeHtml(caption)}</p>`;
        if (linkedUrl) {
            const label = escapeHtml(i18nVisitSource());
            const safeUrl = escapeAttr(linkedUrl);
            html += `<a class="lg-source-btn" href="${safeUrl}" target="_blank" `
                + `rel="noopener noreferrer">`
                + `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" `
                + `stroke="currentColor" stroke-width="2" stroke-linecap="round" `
                + `stroke-linejoin="round">`
                + `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>`
                + `<polyline points="15 3 21 3 21 9"/>`
                + `<line x1="10" y1="14" x2="21" y2="3"/></svg>`
                + `${label}</a>`;
        }
        return html || null;
    };

    const setLgAttributes = (link, imgSrc, caption, linkedUrl) => {
        // Use data-src so lightgallery reads the image URL from it,
        // preserving the original href for SEO and right-click behavior.
        link.setAttribute('data-src', imgSrc);
        link.setAttribute('data-lg-item', 'true');

        const subHtml = buildSubHtml(caption, linkedUrl);
        if (subHtml) {
            link.setAttribute('data-sub-html', subHtml);
        }
    };

    const ensureLink = (container, img) => {
        // Prefer img.src (always available) over img.currentSrc (empty before load)
        const src = img.src || img.currentSrc || img.getAttribute('data-src') || '';
        if (!src) return null;

        if (isDecorativeImg(img)) return null;

        // Walk up from img but stop at container to avoid matching outer <a> tags
        let existing = img.parentElement;
        while (existing && existing !== container && existing.tagName !== 'A') {
            existing = existing.parentElement;
        }
        if (existing === container) existing = null;
        const caption = getCaption(img);

        if (existing) {
            const href = existing.getAttribute('href') || '';
            const linkedUrl = isValidUrl(href) ? href : null;

            // Set lightgallery attributes; original href is preserved
            setLgAttributes(existing, src, caption, linkedUrl);
            if (!existing.getAttribute('aria-label')) {
                const viewText = (window.__i18n && window.__i18n.gallery_view_image) || 'View image';
                existing.setAttribute('aria-label', caption ? viewText + ': ' + caption : viewText);
            }
            return existing;
        }

        // No wrapping <a> — create one
        const link = document.createElement('a');
        link.setAttribute('href', src);
        img.parentNode.insertBefore(link, img);
        link.appendChild(img);

        const viewText = (window.__i18n && window.__i18n.gallery_view_image) || 'View image';
        link.setAttribute('aria-label', caption ? viewText + ': ' + caption : viewText);
        setLgAttributes(link, src, caption, null);
        return link;
    };

    // Track instances for proper cleanup (e.g., Pjax/SPA navigation)
    const instances = [];

    containers.forEach((container) => {
        const images = container.querySelectorAll('img');
        if (!images.length) return;

        images.forEach((img) => {
            ensureLink(container, img);
        });

        instances.push(window.lightGallery(container, {
            selector: 'a[data-lg-item]',
            download: false
        }));
    });

    // Destroy instances on Pjax navigation to prevent memory leaks.
    // Currently unused — reserved for future Pjax/SPA support.
    document.addEventListener('pjax:send', () => {
        instances.forEach(i => { if (i && i.destroy) i.destroy(); });
        instances.length = 0;
    });
})();
