(function () {
    'use strict';

    var modal = document.getElementById('searchModal');
    var toggle = document.getElementById('searchToggle');
    if (!toggle) return;

    var i18n = (window.__i18n && window.__i18n.search) || {};
    var base = window.__pagefindBase || '/pagefind/';
    var searchCss = window.__searchCss || '';
    var loaded = false;
    var loading = null;
    var cssLoaded = false;
    var cssLoading = null;
    var lastFocus = null;

    function loadAsset(tag, attrs) {
        return new Promise(function (resolve, reject) {
            var el = document.createElement(tag);
            Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
            el.onload = resolve;
            el.onerror = reject;
            document.head.appendChild(el);
        });
    }

    function ensureSearchCss() {
        if (!searchCss || cssLoaded) return Promise.resolve();
        if (cssLoading) return cssLoading;
        var existing = document.querySelector('link[data-shiro-search-css]');
        if (existing) {
            cssLoaded = true;
            return Promise.resolve();
        }
        cssLoading = loadAsset('link', {
            rel: 'stylesheet',
            href: searchCss,
            'data-shiro-search-css': 'true'
        }).then(function () {
            cssLoaded = true;
        }).catch(function (e) {
            cssLoading = null;
            throw e;
        });
        return cssLoading;
    }

    function ensurePagefind() {
        if (loaded) return Promise.resolve();
        if (loading) return loading;
        loading = loadAsset('link', { rel: 'stylesheet', href: base + 'pagefind-ui.css' })
            .then(function () { return loadAsset('script', { src: base + 'pagefind-ui.js' }); })
            .then(function () {
                /* global PagefindUI */
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
            .catch(function (e) { loading = null; throw e; });
        return loading;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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
            + '<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
            + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 6l12 12M18 6L6 18"></path>'
            + '</svg></button></div>'
            + '<div class="search-modal__body"><div id="pagefindContainer"></div></div>'
            + '</div>';
        document.body.appendChild(modal);

        modal.addEventListener('click', function (e) {
            var t = e.target;
            if (t && (t.closest && t.closest('[data-search-close]'))) {
                e.preventDefault();
                close();
            }
        });

        modal.addEventListener('keydown', function (e) {
            if (e.key !== 'Tab') return;
            if (modal.getAttribute('data-open') !== 'true') return;
            var focusables = modal.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });

        return modal;
    }

    function focusInput() {
        var input = modal.querySelector('.pagefind-ui__search-input');
        if (input) { try { input.focus(); } catch (_) {} }
    }

    function showModal() {
        ensureModal();
        modal.setAttribute('data-open', 'true');
        modal.setAttribute('aria-hidden', 'false');
        // Mark <html> as modal-open so CSS can lock body scroll without
        // mutating inline styles (lets multiple modals coexist cleanly).
        document.documentElement.setAttribute('data-modal-open', 'true');
        ensurePagefind().then(function () {
            // Defer to after Pagefind UI mounts
            setTimeout(focusInput, 30);
        });
    }

    function open() {
        ensureModal();
        if (modal.getAttribute('data-open') === 'true') return;
        lastFocus = document.activeElement;
        ensureSearchCss().then(showModal).catch(function () {
            showModal();
        });
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

    toggle.addEventListener('click', function (e) { e.preventDefault(); open(); });


    document.addEventListener('keydown', function (e) {
        var isOpen = modal && modal.getAttribute('data-open') === 'true';
        if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            close();
            return;
        }
        if (e.key === '/' && !isOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
            var ae = document.activeElement;
            var tag = ae && ae.tagName;
            if (ae && (ae.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;
            e.preventDefault();
            open();
        }
    });


    if (window.__shiroSearchAutoOpen) {
        window.__shiroSearchAutoOpen = false;
        open();
    }
})();
