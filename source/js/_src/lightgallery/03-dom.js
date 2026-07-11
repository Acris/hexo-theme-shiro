    const escapeHtml = (value) => {
        if (!value) return '';
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    const escapeAttr = (value) => {
        if (!value) return '';
        return escapeHtml(value).replace(/"/g, '&quot;');
    };

    // Meaningful navigable page link for the "view source" caption button.
    // Absolute http(s) only (opens in a new tab); relative site paths stay on href.
    const normalizedSourceUrl = (url) => {
        const value = String(url || '').trim();
        return !/[\u0000-\u001F\u007F]/.test(value) && /^https?:\/\//i.test(value) ? value : null;
    };

    const ORIGINAL_HREF_ATTR = 'data-shiro-original-href';

    // Fallback when LightGallery assets fail: prefer the pre-gallery page href.
    const fallbackNavigationUrl = (link) => {
        const original = (link.getAttribute(ORIGINAL_HREF_ATTR) || '').trim();
        if (original && !/[\u0000-\u001F\u007F]/.test(original)
            && !/^(?:javascript|vbscript|data):/i.test(original)) {
            return original;
        }
        const href = (link.getAttribute('href') || '').trim();
        const dataSrc = (link.getAttribute('data-src') || '').trim();
        if (href && href !== dataSrc && !isSafeImageUrl(href)
            && !/^(?:javascript|vbscript|data):/i.test(href)) {
            return href;
        }
        const imageUrl = dataSrc || href;
        return isSafeImageUrl(imageUrl) ? imageUrl : '';
    };

    const getCaption = (img) => img.getAttribute('title') || img.getAttribute('alt') || '';

    const i18nGallery = () => {
        const i18n = shiro.i18n;
        return (i18n && i18n.gallery) || {};
    };

    const buildSubHtml = (caption, linkedUrl) => {
        let html = '';
        if (caption) html += `<p>${escapeHtml(caption)}</p>`;
        if (linkedUrl) {
            const label = escapeHtml(i18nGallery().visit_source || 'View Source Page');
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

    function cachedGalleryItems(container) {
        let state = galleryItemCache.get(container);
        if (!state) {
            state = { items: [], itemSet: new Set(), itemIndex: new Map() };
            galleryItemCache.set(container, state);
        }
        return state;
    }

    function rebuildGalleryItems(state, items) {
        state.items = items;
        state.itemSet = new Set(items);
        state.itemIndex = new Map();
        items.forEach((item, index) => state.itemIndex.set(item, index));
    }

    function rememberGalleryItem(container, link) {
        const state = cachedGalleryItems(container);
        if (!state.itemSet.has(link)) {
            state.itemIndex.set(link, state.items.length);
            state.itemSet.add(link);
            state.items.push(link);
        }
    }

    const setLgAttributes = (link, imgSrc, caption, linkedUrl, originalHref) => {
        const setIfChanged = (name, value) => {
            if (link.getAttribute(name) !== value) link.setAttribute(name, value);
        };

        setIfChanged('data-src', imgSrc);
        setIfChanged('data-lg-item', 'true');
        if (originalHref && originalHref !== imgSrc) {
            setIfChanged(ORIGINAL_HREF_ATTR, originalHref);
        } else if (link.hasAttribute(ORIGINAL_HREF_ATTR)) {
            link.removeAttribute(ORIGINAL_HREF_ATTR);
        }

        const subHtml = buildSubHtml(caption, linkedUrl);
        if (subHtml) {
            setIfChanged('data-sub-html', subHtml);
        } else if (link.hasAttribute('data-sub-html')) {
            link.removeAttribute('data-sub-html');
        }
    };

    const ensureLink = (container, img) => {
        const src = imageSource(img);
        if (!isSafeImageUrl(src)) return null;

        if (isDecorativeImg(img)) return null;

        let existing = img.parentElement;
        while (existing && existing !== container && existing.tagName !== 'A') {
            existing = existing.parentElement;
        }
        if (existing === container) existing = null;
        const caption = getCaption(img);

        if (existing) {
            const href = (existing.getAttribute('href') || '').trim();
            const linkedUrl = normalizedSourceUrl(href);
            const originalHref = href && href !== src ? href : '';

            setLgAttributes(existing, src, caption, linkedUrl, originalHref);
            rememberGalleryItem(container, existing);
            if (!existing.getAttribute('aria-label')) {
                const viewText = i18nGallery().view_image || 'View image';
                existing.setAttribute('aria-label', caption ? viewText + ': ' + caption : viewText);
            }
            return existing;
        }

        // Detached / racing DOM: refuse so openFromElement returns false → navigate.
        if (!img.parentNode) return null;

        const link = document.createElement('a');
        link.setAttribute('href', src);
        img.parentNode.insertBefore(link, img);
        link.appendChild(img);

        const viewText = i18nGallery().view_image || 'View image';
        link.setAttribute('aria-label', caption ? viewText + ': ' + caption : viewText);
        setLgAttributes(link, src, caption, null, '');
        rememberGalleryItem(container, link);
        return link;
    };

