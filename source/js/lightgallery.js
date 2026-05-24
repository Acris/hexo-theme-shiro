;(() => {
    const cssHref = 'https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/css/lightgallery.min.css';
    const cssIntegrity = 'sha384-YlypU+LX5577RgeZebpBZTy28roXf0lHGaOSxrroczh16ktxM0BoAMPXsrehqxx8';
    const jsSrc = 'https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/lightgallery.min.js';
    const jsIntegrity = 'sha384-yshhQEAY0bBxbxfLyRlLQ7v1z45XofL6adlFh192s2NpDzXS+HPKjXoloaHiNcYO';
    const themeCssHref = window.__lightgalleryThemeCss || '';

    let assetsLoading = null;
    const instances = new Map();
    const preparedContainers = new WeakSet();

    function assetReady(el, tag) {
        if (el.dataset.shiroLoaded === 'true' || (tag === 'link' && el.sheet)) {
            el.dataset.shiroLoaded = 'true';
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            el.addEventListener('load', () => {
                el.dataset.shiroLoaded = 'true';
                resolve();
            }, { once: true });
            el.addEventListener('error', reject, { once: true });
        });
    }

    function loadAsset(tag, attrs, selector) {
        const existing = selector ? document.querySelector(selector) : null;
        if (existing) return assetReady(existing, tag);

        return new Promise((resolve, reject) => {
            const el = document.createElement(tag);
            Object.keys(attrs).forEach((key) => {
                if (attrs[key] === true) {
                    el.setAttribute(key, '');
                } else {
                    el.setAttribute(key, attrs[key]);
                }
            });
            el.onload = () => {
                el.dataset.shiroLoaded = 'true';
                resolve();
            };
            el.onerror = (event) => {
                el.remove();
                reject(event);
            };
            document.head.appendChild(el);
        });
    }

    function ensureStylesheet() {
        return loadAsset('link', {
            rel: 'stylesheet',
            href: cssHref,
            integrity: cssIntegrity,
            crossorigin: 'anonymous',
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
            integrity: jsIntegrity,
            crossorigin: 'anonymous',
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
        } else {
            link.removeAttribute('data-sub-html');
        }
    };

    const ensureLink = (container, img) => {
        // Prefer img.currentSrc once available, but keep img.src as the fallback
        // so lazy images can still open before the browser has selected a source.
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
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

        // No wrapping <a> - create one
        const link = document.createElement('a');
        link.setAttribute('href', src);
        img.parentNode.insertBefore(link, img);
        link.appendChild(img);

        const viewText = (window.__i18n && window.__i18n.gallery_view_image) || 'View image';
        link.setAttribute('aria-label', caption ? viewText + ': ' + caption : viewText);
        setLgAttributes(link, src, caption, null);
        return link;
    };

    function galleryItems(container) {
        return Array.from(container.querySelectorAll('a[data-lg-item]'));
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

    function followOriginalLink(link) {
        const href = link.getAttribute('href');
        if (!href) return;
        if (link.target === '_blank') {
            window.open(href, '_blank', 'noopener');
            return;
        }
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
            const index = Math.max(galleryItems(container).indexOf(trigger), 0);
            if (instance && typeof instance.openGallery === 'function') {
                if (typeof onReady === 'function') onReady();
                instance.openGallery(index);
            } else {
                followOriginalLink(trigger);
            }
        }).catch(() => {
            followOriginalLink(trigger);
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

    function prepareRemainingGallery(container, activeImage) {
        if (preparedContainers.has(container)) return;
        preparedContainers.add(container);
        schedule(() => {
            const images = Array.from(container.querySelectorAll('img'))
                .filter(img => img !== activeImage && !img.closest('a[data-lg-item]'));
            prepareGalleryBatch(container, images);
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

        openGallery(container, trigger, () => prepareRemainingGallery(container, img));
        return true;
    }

    window.__shiroLightGalleryOpen = openFromElement;

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
    }

})();
