    /**
     * Read config/handoff from window.__shiro bare keys only.
     * Accepts bare names (`clipboardScript`) or legacy `__clipboardScript` (strips once).
     */
    function get(name) {
        if (name == null || name === '') return undefined;
        const key = String(name);
        const bare = key.indexOf('__') === 0 ? key.slice(2) : key;
        if (Object.prototype.hasOwnProperty.call(root, bare) && root[bare] != null) {
            return root[bare];
        }
        return undefined;
    }

    // Prefer bag cspNonce (head-theme). Fall back to this script's nonce attribute.
    function cspNonce() {
        const bagNonce = get('cspNonce');
        if (typeof bagNonce === 'string' && bagNonce) {
            return bagNonce;
        }
        try {
            const current = document.currentScript;
            if (current && current.nonce) return current.nonce;
        } catch (_) {}
        return '';
    }

    function applyCspNonce(el) {
        if (el.tagName !== 'SCRIPT') return;
        const nonce = cspNonce();
        if (nonce) el.setAttribute('nonce', nonce);
    }

    // Align with scripts/lib/util.js escapeHtml / escapeAttr (server).
    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttr(value) {
        return escapeHtml(value);
    }
