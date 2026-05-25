;(() => {
    'use strict';

    let modal = document.getElementById('searchModal');
    const i18n = (window.__i18n && window.__i18n.search) || {};
    const base = window.__pagefindBase || '/pagefind/';
    const searchCss = window.__searchCss || '';
    let loaded = false;
    let loading = null;
    let cssLoaded = false;
    let cssLoading = null;
    let lastFocus = null;
    /* global loadAsset */
    // <shiro-asset-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-asset-loader>

    function ensureSearchCss() {
        if (!searchCss || cssLoaded) return Promise.resolve();
        if (cssLoading) return cssLoading;
        cssLoading = loadAsset('link', {
            rel: 'stylesheet',
            href: searchCss,
            'data-shiro-search-css': 'true'
        }, 'link[data-shiro-search-css]').then(() => {
            cssLoaded = true;
        }).catch((error) => {
            cssLoading = null;
            throw error;
        });
        return cssLoading;
    }

    function ensurePagefind() {
        if (loaded) return Promise.resolve();
        if (loading) return loading;
        loading = loadAsset('link', {
            rel: 'stylesheet',
            href: base + 'pagefind-ui.css',
            'data-shiro-pagefind-css': 'true'
        }, 'link[data-shiro-pagefind-css]')
            .then(() => loadAsset('script', {
                src: base + 'pagefind-ui.js',
                'data-shiro-pagefind-js': 'true'
            }, 'script[data-shiro-pagefind-js]'))
            .then(() => {
                /* global PagefindUI */
                if (typeof PagefindUI !== 'function') throw new Error('Pagefind UI is unavailable');
                new PagefindUI({
                    element: '#pagefindContainer',
                    bundlePath: base,
                    showImages: false,
                    showSubResults: true,
                    resetStyles: false,
                    autofocus: true,
                    translations: {
                        placeholder: i18n.placeholder,
                        search_label: i18n.button,
                        zero_results: i18n.zero_results,
                        many_results: i18n.many_results,
                        one_result: i18n.one_result,
                        searching: i18n.loading
                    }
                });
                loaded = true;
            })
            .catch((error) => {
                loading = null;
                throw error;
            });
        return loading;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function reportPagefindError(error) {
        if (window.console && console.warn) {
            console.warn('[Shiro] Failed to load Pagefind search assets.', error);
        }
        ensureModal();
        const container = document.getElementById('pagefindContainer');
        if (container && !loaded) {
            container.innerHTML = '<p class="search-modal__status" role="status">'
                + escapeHtml(i18n.unavailable || 'Search is temporarily unavailable.')
                + '</p>';
        }
    }

    function loadPagefind() {
        ensurePagefind().then(() => {
            // Defer to after Pagefind UI mounts
            setTimeout(focusInput, 30);
        }).catch(reportPagefindError);
    }

    function ensureModal() {
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'searchModal';
        modal.className = 'search-modal';
        modal.setAttribute('data-open', 'false');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'searchModalTitle');
        modal.innerHTML = '<div class="search-modal__backdrop" data-search-close></div>'
            + '<div class="search-modal__panel" role="document">'
            + '<div class="search-modal__header">'
            + '<h2 id="searchModalTitle" class="search-modal__title">' + escapeHtml(i18n.button || 'Search') + '</h2>'
            + '<button type="button" class="search-modal__close" data-search-close aria-label="' + escapeHtml(i18n.close || 'Close') + '">'
            + '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
            + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 6l12 12M18 6L6 18"></path>'
            + '</svg></button></div>'
            + '<div class="search-modal__body"><div id="pagefindContainer"></div></div>'
            + '</div>';
        document.body.appendChild(modal);

        modal.addEventListener('click', (event) => {
            const target = event.target;
            if (!target || !target.closest) return;
            if (target.closest('[data-search-close]')) {
                event.preventDefault();
                close();
            }
        });

        modal.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') return;
            if (modal.getAttribute('data-open') !== 'true') return;
            const focusables = modal.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        return modal;
    }

    function focusInput() {
        const input = modal.querySelector('.pagefind-ui__search-input');
        if (input) { try { input.focus(); } catch (_) {} }
    }

    function showModal() {
        ensureModal();
        modal.setAttribute('data-open', 'true');
        modal.setAttribute('aria-hidden', 'false');
        // Mark <html> as modal-open so CSS can lock body scroll without
        // mutating inline styles (lets multiple modals coexist cleanly).
        document.documentElement.setAttribute('data-modal-open', 'true');
        loadPagefind();
    }

    function open() {
        ensureModal();
        if (modal.getAttribute('data-open') === 'true') return;
        lastFocus = document.activeElement;
        ensureSearchCss().then(showModal).catch(() => {
            showModal();
        });
    }

    function isTypingTarget(element) {
        const tag = element && element.tagName;
        return !!(element && (element.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'));
    }

    function close() {
        if (!modal || modal.getAttribute('data-open') !== 'true') return;
        modal.setAttribute('data-open', 'false');
        modal.setAttribute('aria-hidden', 'true');
        document.documentElement.removeAttribute('data-modal-open');
        if (lastFocus && typeof lastFocus.focus === 'function') {
            try { lastFocus.focus(); } catch (_) {}
        }
    }

    window.__shiroSearchOpen = open;

    const toggle = document.getElementById('searchToggle');
    if (toggle) {
        toggle.addEventListener('click', (event) => {
            event.preventDefault();
            open();
        });
    }

    document.addEventListener('keydown', (event) => {
        const isOpen = modal && modal.getAttribute('data-open') === 'true';
        if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            close();
            return;
        }

        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(document.activeElement)) return;
        event.preventDefault();
        open();
    });

    if (window.__shiroSearchAutoOpen) {
        window.__shiroSearchAutoOpen = false;
        open();
    }
})();
