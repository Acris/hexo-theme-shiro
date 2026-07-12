    function galleryIndex(container, item) {
        const state = syncGalleryItems(container);
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
        syncGalleryItems(container);
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

    // API-ready (open/warm installed), not CDN asset-ready — open() loads CDN
    // and falls back to navigate on failure. Bootstrap keeps capture.
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

