;(() => {
    const script = window.__lightgalleryScript || '';
    if (!script) return;

    /* global loadBootstrapScript */
    // <shiro-script-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-script-loader>

    let loading = false;

    const isSafeImageUrl = (url) => {
        const value = String(url || '').trim();
        if (!value || value[0] === '#') return false;
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

    function shouldHandleImage(img) {
        const src = (img.currentSrc || img.src || img.getAttribute('data-src') || '').trim();
        return isSafeImageUrl(src) && !isDecorativeImg(img);
    }

    function cleanupBootstrapListeners() {
        document.removeEventListener('click', handleClick, true);
    }

    function open(target) {
        if (window.__shiroLightGalleryOpen) {
            window.__shiroLightGalleryOpen(target);
            cleanupBootstrapListeners();
            return;
        }

        window.__shiroLightGalleryAutoOpen = target;
        if (loading) return;
        loading = true;

        loadBootstrapScript(script, {
            onload: cleanupBootstrapListeners,
            onerror: () => {
                loading = false;
                window.__shiroLightGalleryAutoOpen = null;
            }
        });
    }

    function handleClick(event) {
        const target = event.target;
        if (!target || !target.closest) return;

        const prose = target.closest('.prose-shiro');
        if (!prose) return;

        const img = target.closest('img');
        if (!img || !prose.contains(img)) return;
        if (!shouldHandleImage(img)) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        open(img);
    }

    document.addEventListener('click', handleClick, true);
})();
