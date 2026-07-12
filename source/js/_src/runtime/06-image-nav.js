    function isSafeImageUrl(url) {
        const value = String(url || '').trim();
        if (!value || value[0] === '#') return false;
        if (/[\u0000-\u001F\u007F]/.test(value)) return false;
        if (/^https?:\/\//i.test(value) || /^\/\//.test(value) || /^blob:/i.test(value)) return true;
        if (/^data:image\/(?:avif|bmp|gif|jpe?g|png|webp);/i.test(value)) return true;
        return !/^[a-z][a-z0-9+.-]*:/i.test(value);
    }

    function isDecorativeImg(img) {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w && h && w <= 3 && h <= 3) return true;
        if (img.getAttribute('role') === 'presentation') return true;
        if (img.classList.contains('emoji')) return true;
        return false;
    }

    function hasConflictingImageAction(img) {
        if (!img || typeof img.closest !== 'function') return false;
        return !!img.closest(
            'button, input, select, textarea, summary, label, '
            + '[role="button"], [role="link"], [contenteditable]:not([contenteditable="false"])'
        );
    }

    function imageSource(img) {
        const attrSrc = (img.getAttribute('src') || '').trim();
        const attrSrcset = (img.getAttribute('srcset') || '').trim();
        const dataSrc = (img.getAttribute('data-src') || '').trim();
        const selectedSrc = (img.currentSrc || '').trim();
        if (selectedSrc && (attrSrc || attrSrcset)) return selectedSrc;
        return attrSrc || dataSrc;
    }

    function isModifiedClick(event) {
        return !!(
            !event
            || event.button !== 0
            || event.metaKey
            || event.ctrlKey
            || event.shiftKey
            || event.altKey
        );
    }

    /**
     * Navigate to an allowlisted URL; open absolute http(s) in a new tab.
     * Blob URLs support image fallbacks. Unknown schemes and control chars are blocked.
     */
    function safeNavigate(href) {
        const value = String(href || '').trim();
        if (!value) return;
        if (/[\u0000-\u001F\u007F]/.test(value)) return;
        if (/^https?:\/\//i.test(value) || value.indexOf('//') === 0) {
            window.open(value, '_blank', 'noopener,noreferrer');
            return;
        }
        if (/^(?:mailto|tel|blob):/i.test(value) || !/^[a-z][a-z0-9+.-]*:/i.test(value)) {
            window.location.href = value;
        }
    }

    // Prefer original page href (pre-gallery), then image src — shared by LG bootstrap/feature.
    function imageNavigationHref(img) {
        if (!img || !img.closest) return '';
        const link = img.closest('a');
        const original = link
            ? (link.getAttribute('data-shiro-original-href') || link.getAttribute('href') || '').trim()
            : '';
        const src = (imageSource(img) || '').trim();
        return original || src;
    }

    function navigateFromImage(img) {
        safeNavigate(imageNavigationHref(img));
    }
