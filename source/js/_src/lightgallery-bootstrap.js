;(() => {
    'use strict';

    const script = window.__lightgalleryScript || '';
    if (!script) return;

    /* global loadBootstrapScript */
    // <shiro-script-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-script-loader>

    let loading = false;
    let warmed = false;

    const isSafeImageUrl = (url) => {
        const value = String(url || '').trim();
        if (!value || value[0] === '#') return false;
        if (/[\u0000-\u001F\u007F]/.test(value)) return false;
        if (/^https?:\/\//i.test(value) || /^\/\//.test(value) || /^blob:/i.test(value)) return true;
        if (/^data:image\/(?:avif|bmp|gif|jpe?g|png|webp);/i.test(value)) return true;
        return !/^[a-z][a-z0-9+.-]*:/i.test(value);
    };

    const isDecorativeImg = (img) => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w && h && w <= 3 && h <= 3) return true;
        if (img.getAttribute('role') === 'presentation') return true;
        if (img.classList.contains('emoji')) return true;
        return false;
    };

    const imageSource = (img) => {
        const attrSrc = (img.getAttribute('src') || '').trim();
        const attrSrcset = (img.getAttribute('srcset') || '').trim();
        const dataSrc = (img.getAttribute('data-src') || '').trim();
        const selectedSrc = (img.currentSrc || '').trim();
        if (selectedSrc && (attrSrc || attrSrcset)) return selectedSrc;
        return attrSrc || dataSrc;
    };

    function shouldHandleImage(img) {
        const src = imageSource(img);
        return isSafeImageUrl(src) && !isDecorativeImg(img);
    }

    // Resolve the qualifying gallery image for a click target, or null.
    function qualifyingImage(target) {
        if (!target || !target.closest) return null;

        const prose = target.closest('.prose-shiro');
        if (!prose) return null;

        const img = target.closest('img');
        if (!img || !prose.contains(img)) return null;
        if (!shouldHandleImage(img)) return null;
        return img;
    }

    function cleanupWarmListeners() {
        document.removeEventListener('pointerover', handleIntent, true);
        document.removeEventListener('pointerdown', handleIntent, true);
        document.removeEventListener('focusin', handleIntent, true);
    }

    function cleanupBootstrapListeners() {
        document.removeEventListener('click', handleClick, true);
        cleanupWarmListeners();
    }

    function loadGallery() {
        loading = true;
        loadBootstrapScript(script, {
            onload: cleanupBootstrapListeners,
            onerror: () => {
                loading = false;
                warmed = false;
                window.__shiroLightGalleryAutoOpen = null;
                window.__shiroLightGalleryWarmRequested = false;
            }
        });
    }

    // Eagerly fetch the gallery script and CDN assets on the first hint of
    // intent (hover / press / focus) so the click itself opens instantly.
    function warm() {
        if (warmed) return;
        warmed = true;
        cleanupWarmListeners();

        if (window.__shiroLightGalleryOpen) {
            if (typeof window.__shiroLightGalleryWarm === 'function') window.__shiroLightGalleryWarm();
            return;
        }
        if (loading) return;

        window.__shiroLightGalleryWarmRequested = true;
        loadGallery();
    }

    function open(target) {
        if (window.__shiroLightGalleryOpen) {
            window.__shiroLightGalleryOpen(target);
            cleanupBootstrapListeners();
            return;
        }

        window.__shiroLightGalleryAutoOpen = target;
        if (loading) return;
        loadGallery();
    }

    function handleClick(event) {
        const img = qualifyingImage(event.target);
        if (!img) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        open(img);
    }

    function handleIntent(event) {
        if (warmed) return;

        const target = event.target;
        if (!target || !target.closest) return;

        const prose = target.closest('.prose-shiro');
        if (!prose) return;

        // Hover/press lands on the image; keyboard focus lands on its wrapping link.
        let img = target.closest('img');
        if ((!img || !prose.contains(img)) && target.querySelector) {
            img = target.querySelector('img');
        }
        if (!img || !prose.contains(img) || !shouldHandleImage(img)) return;

        warm();
    }

    // Touch devices have no hover, so per-image intent fires too late (pointerdown is
    // almost simultaneous with click). Proactively warm when the first image nears the
    // viewport (or on idle), gated on connection quality to avoid wasting metered data.
    function connectionAllowsWarm() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return true;
        if (connection.saveData) return false;
        return !/(^|-)2g$/.test(connection.effectiveType || '');
    }

    function proactiveWarm() {
        if (warmed || !connectionAllowsWarm()) return;
        const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 1200));
        idle(() => warm(), { timeout: 2000 });
    }

    function firstGalleryImage() {
        const images = document.querySelectorAll('.prose-shiro img');
        for (let i = 0; i < images.length; i += 1) {
            if (shouldHandleImage(images[i])) return images[i];
        }
        return null;
    }

    function scheduleProactiveWarm() {
        const firstImage = firstGalleryImage();
        if (!firstImage) return;

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    observer.disconnect();
                    proactiveWarm();
                }
            }, { rootMargin: '300px' });
            observer.observe(firstImage);
        } else {
            proactiveWarm();
        }
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('pointerover', handleIntent, true);
    document.addEventListener('pointerdown', handleIntent, true);
    document.addEventListener('focusin', handleIntent, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleProactiveWarm, { once: true });
    } else {
        scheduleProactiveWarm();
    }
})();
