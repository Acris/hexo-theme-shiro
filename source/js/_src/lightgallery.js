;(() => {
    'use strict';

    const configValue = (key, fallback) => (
        Object.prototype.hasOwnProperty.call(window, key) ? window[key] : fallback
    );
    const cssHref = configValue('__lightgalleryCss', 'https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/css/lightgallery.min.css');
    const jsSrc = configValue('__lightgalleryJs', 'https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/lightgallery.min.js');
    const themeCssHref = window.__lightgalleryThemeCss || '';

    let assetsLoading = null;
    const instances = new Map();
    const preparedImages = new WeakSet();
    const galleryItemCache = new WeakMap();
    /* global loadAsset */
    // <shiro-asset-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-asset-loader>

    function ensureStylesheet() {
        return loadAsset('link', {
            rel: 'stylesheet',
            href: cssHref,
            'data-shiro-lightgallery-css': 'true'
        }, 'link[data-shiro-lightgallery-css]');
    }

    function ensureThemeStylesheet() {
        if (!themeCssHref) return Promise.resolve();
        return loadAsset('link', {
            rel: 'stylesheet',
            href: themeCssHref,
            'data-shiro-lightgallery-theme-css': 'true'
        }, 'link[data-shiro-lightgallery-theme-css]');
    }

    function ensureScript() {
        if (typeof window.lightGallery === 'function') {
            return Promise.resolve();
        }
        return loadAsset('script', {
            src: jsSrc,
            async: true,
            'data-shiro-lightgallery-js': 'true'
        }, 'script[data-shiro-lightgallery-js]');
    }

    function ensureLightGalleryAssets() {
        if (typeof window.lightGallery === 'function') {
            return ensureStylesheet().then(ensureThemeStylesheet);
        }
        if (assetsLoading) return assetsLoading;

        assetsLoading = Promise.all([ensureStylesheet().then(ensureThemeStylesheet), ensureScript()]).then(() => {
            if (typeof window.lightGallery !== 'function') {
                throw new Error('LightGallery failed to load');
            }
        }).catch((error) => {
            assetsLoading = null;
            throw error;
        });

        return assetsLoading;
    }

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

    // Return a normalized meaningful HTTP(S) link, or null.
    const normalizedSourceUrl = (url) => {
        const value = String(url || '').trim();
        return !/[\u0000-\u001F\u007F]/.test(value) && /^https?:\/\//i.test(value) ? value : null;
    };

    const isSafeImageUrl = (url) => {
        const value = String(url || '').trim();
        if (!value || value[0] === '#') return false;
        if (/[\u0000-\u001F\u007F]/.test(value)) return false;
        if (/^https?:\/\//i.test(value) || /^\/\//.test(value) || /^blob:/i.test(value)) return true;
        if (/^data:image\/(?:avif|bmp|gif|jpe?g|png|webp);/i.test(value)) return true;
        return !/^[a-z][a-z0-9+.-]*:/i.test(value);
    };

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

    const i18nGallery = () => (window.__i18n && window.__i18n.gallery) || {};

    const imageSource = (img) => {
        const attrSrc = (img.getAttribute('src') || '').trim();
        const attrSrcset = (img.getAttribute('srcset') || '').trim();
        const dataSrc = (img.getAttribute('data-src') || '').trim();
        const selectedSrc = (img.currentSrc || '').trim();
        if (selectedSrc && (attrSrc || attrSrcset)) return selectedSrc;
        return attrSrc || dataSrc;
    };

    // Build data-sub-html with optional linked source button
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

    const setLgAttributes = (link, imgSrc, caption, linkedUrl) => {
        const setIfChanged = (name, value) => {
            if (link.getAttribute(name) !== value) link.setAttribute(name, value);
        };

        // Use data-src so lightgallery reads the image URL from it,
        // preserving the original href for SEO and right-click behavior.
        setIfChanged('data-src', imgSrc);
        setIfChanged('data-lg-item', 'true');

        const subHtml = buildSubHtml(caption, linkedUrl);
        if (subHtml) {
            setIfChanged('data-sub-html', subHtml);
        } else if (link.hasAttribute('data-sub-html')) {
            link.removeAttribute('data-sub-html');
        }
    };

    const ensureLink = (container, img) => {
        // Prefer currentSrc once available, but only when the image has an
        // explicit source attribute so empty src cannot resolve to page URL.
        const src = imageSource(img);
        if (!isSafeImageUrl(src)) return null;

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
            const linkedUrl = normalizedSourceUrl(href);

            // Set lightgallery attributes; original href is preserved
            setLgAttributes(existing, src, caption, linkedUrl);
            rememberGalleryItem(container, existing);
            if (!existing.getAttribute('aria-label')) {
                const viewText = i18nGallery().view_image || 'View image';
                existing.setAttribute('aria-label', caption ? viewText + ': ' + caption : viewText);
            }
            return existing;
        }

        // No wrapping <a> - create one
        const link = document.createElement('a');
        link.setAttribute('href', src);
        img.parentNode.insertBefore(link, img);
        link.appendChild(img);

        const viewText = i18nGallery().view_image || 'View image';
        link.setAttribute('aria-label', caption ? viewText + ': ' + caption : viewText);
        setLgAttributes(link, src, caption, null);
        rememberGalleryItem(container, link);
        return link;
    };

    function galleryIndex(container, item) {
        const state = cachedGalleryItems(container);
        const items = state.items.filter(item => item.isConnected);
        if (items.length !== state.items.length) {
            rebuildGalleryItems(state, items);
        }
        const index = state.itemIndex.get(item);
        return index === undefined ? -1 : index;
    }

    function getOrCreateInstance(container) {
        const existing = instances.get(container);
        if (existing) return existing;
        if (typeof window.lightGallery !== 'function') return null;

        const instance = window.lightGallery(container, {
            selector: 'a[data-lg-item]',
            download: false
        });
        instances.set(container, instance);
        return instance;
    }

    function followFallbackLink(link) {
        // If LightGallery fails to load after we prepared a gallery item, keep
        // the click aligned with the lightbox intent by opening the image URL.
        const href = link.getAttribute('data-src') || link.getAttribute('href');
        if (!isSafeImageUrl(href)) return;
        window.location.href = href;
    }

    function refreshGallery(container) {
        const instance = instances.get(container);
        if (instance && typeof instance.refresh === 'function') {
            try { instance.refresh(); } catch (_) {}
        }
    }

    function openGallery(container, trigger, onReady) {
        ensureLightGalleryAssets().then(() => {
            const instance = getOrCreateInstance(container);
            refreshGallery(container);
            const index = Math.max(galleryIndex(container, trigger), 0);
            if (instance && typeof instance.openGallery === 'function') {
                if (typeof onReady === 'function') onReady();
                instance.openGallery(index);
            } else {
                followFallbackLink(trigger);
            }
        }).catch(() => {
            followFallbackLink(trigger);
        });
    }

    function clickedImage(event) {
        const target = event.target;
        if (!target || !target.closest) return null;

        const container = target.closest('.prose-shiro');
        if (!container) return null;

        const img = target.closest('img');
        if (img && container.contains(img)) return img;

        const link = target.closest('a');
        if (!link || !container.contains(link)) return null;
        return link.querySelector('img');
    }

    function schedule(task) {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(task, { timeout: 1000 });
        } else {
            window.setTimeout(() => task(), 48);
        }
    }

    function prepareGalleryBatch(container, images) {
        const queue = Array.from(images);
        const run = (deadline) => {
            const hasTime = () => !deadline || deadline.timeRemaining() > 4;
            let count = 0;
            while (queue.length && hasTime() && count < 8) {
                ensureLink(container, queue.shift());
                count += 1;
            }
            refreshGallery(container);
            if (queue.length) schedule(run);
        };
        if (queue.length) schedule(run);
    }

    function nearestImageFrom(node, container, direction) {
        let current = node;
        while (current && current !== container) {
            current = direction === 'previous' ? current.previousElementSibling : current.nextElementSibling;
            if (!current) {
                node = node.parentElement;
                current = node;
                continue;
            }
            const img = current.matches && current.matches('img') ? current : current.querySelector && current.querySelector('img');
            if (img && container.contains(img) && !img.closest('a[data-lg-item]')) return img;
        }
        return null;
    }

    function nearbyImages(container, activeImage, range) {
        const images = [];
        let previous = activeImage;
        let next = activeImage;
        for (let i = 0; i < range; i += 1) {
            previous = nearestImageFrom(previous, container, 'previous');
            next = nearestImageFrom(next, container, 'next');
            if (previous) images.unshift(previous);
            if (next) images.push(next);
            if (!previous && !next) break;
        }
        return images;
    }

    function prepareNearbyGallery(container, activeImage) {
        if (preparedImages.has(activeImage)) return;
        preparedImages.add(activeImage);
        schedule(() => {
            prepareGalleryBatch(container, nearbyImages(container, activeImage, 3));
        });
    }

    function openFromElement(target) {
        if (!target || !target.closest) return false;
        const container = target.closest('.prose-shiro');
        if (!container) return false;

        const img = target.tagName === 'IMG' ? target : target.querySelector && target.querySelector('img');
        if (!img || !container.contains(img)) return false;

        const trigger = ensureLink(container, img);
        if (!trigger) return false;

        openGallery(container, trigger, () => prepareNearbyGallery(container, img));
        return true;
    }

    window.__shiroLightGalleryOpen = openFromElement;

    // Prefetch the LightGallery library + styles ahead of the first click so a
    // warmed gallery opens instantly. Failures are swallowed; the click path retries.
    window.__shiroLightGalleryWarm = () => {
        ensureLightGalleryAssets().catch(() => {});
    };

    document.addEventListener('click', (event) => {
        const img = clickedImage(event);
        if (!img) return;

        if (openFromElement(img)) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    });

    if (window.__shiroLightGalleryAutoOpen) {
        const target = window.__shiroLightGalleryAutoOpen;
        window.__shiroLightGalleryAutoOpen = null;
        openFromElement(target);
    } else if (window.__shiroLightGalleryWarmRequested) {
        window.__shiroLightGalleryWarmRequested = false;
        window.__shiroLightGalleryWarm();
    }

})();
