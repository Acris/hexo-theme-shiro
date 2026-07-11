;(() => {
    'use strict';

    // URLs from bag lightgallery config only (gates / feature_var). No hardcoded CDN
    // fallback — keeps version pin in _config.yml + feature-gates only.
    // Signals featureReady/Abort so createFeatureLoader waits for true usability.
    const shiro = window.__shiro || {};
    const rt = shiro.runtime || window.__shiroRuntime;
    const FEATURE_ID = 'lightgallery';

    const signalAbort = (error) => {
        if (rt && typeof rt.featureAbort === 'function') {
            rt.featureAbort(FEATURE_ID, error);
        }
    };
    const signalReady = () => {
        if (rt && typeof rt.featureReady === 'function') {
            rt.featureReady(FEATURE_ID);
        }
    };

    if (!rt || typeof rt.get !== 'function') {
        console.error('[shiro-lightgallery] runtime missing; aborting');
        signalAbort(new Error('runtime missing'));
        return;
    }

    const lg = rt.get('lightgallery') || {};
    const cssHref = String(lg.css || '').trim();
    const jsSrc = String(lg.js || '').trim();
    const themeCssHref = String(lg.themeCss || '').trim();
    const cssIntegrity = String(lg.cssIntegrity || '').trim();
    const jsIntegrity = String(lg.jsIntegrity || '').trim();
    if (!cssHref || !jsSrc) {
        console.error('[shiro-lightgallery] missing lightgallery css/js; aborting');
        signalAbort(new Error('missing lightgallery css/js'));
        return;
    }

    // Bootstrap owns all document click capture; this file only installs open/warm.
    const {
        loadAsset,
        isSafeImageUrl,
        isDecorativeImg,
        imageSource,
        safeNavigate,
        navigateFromImage,
        scheduleIdle
    } = rt;

    let assetsLoading = null;
    const instances = new Map();
    const preparedImages = new WeakSet();
    const galleryItemCache = new WeakMap();

    function withSri(attrs, integrity) {
        if (!integrity) return attrs;
        attrs.integrity = integrity;
        attrs.crossorigin = 'anonymous';
        return attrs;
    }

    function ensureStylesheet() {
        return loadAsset('link', withSri({
            rel: 'stylesheet',
            href: cssHref,
            'data-shiro-lightgallery-css': 'true'
        }, cssIntegrity), 'link[data-shiro-lightgallery-css]');
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
        return loadAsset('script', withSri({
            src: jsSrc,
            async: true,
            'data-shiro-lightgallery-js': 'true'
        }, jsIntegrity), 'script[data-shiro-lightgallery-js]');
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
        safeNavigate(fallbackNavigationUrl(link));
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

    function schedule(task) {
        if (scheduleIdle) {
            scheduleIdle(task, { timeout: 1000, fallbackMs: 48 });
            return;
        }
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
            const img = current.matches && current.matches('img')
                ? current
                : current.querySelector && current.querySelector('img');
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

    shiro.lightGalleryOpen = openFromElement;

    // Prefetch the LightGallery library + styles ahead of the first click.
    shiro.lightGalleryWarm = () => {
        ensureLightGalleryAssets().catch(() => {});
    };

    // Usable for bootstrap live path + autoOpen drain. Bootstrap keeps capture.
    signalReady();

    const autoOpen = shiro.lightGalleryAutoOpen;
    if (autoOpen) {
        shiro.lightGalleryAutoOpen = null;
        if (!openFromElement(autoOpen)) navigateFromImage(autoOpen);
    } else if (shiro.lightGalleryWarmRequested) {
        shiro.lightGalleryWarmRequested = false;
        shiro.lightGalleryWarm();
    }
})();
