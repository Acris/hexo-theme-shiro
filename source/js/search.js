(function () {
    'use strict';

    var modal = document.getElementById('searchModal');
    var toggle = document.getElementById('searchToggle');
    if (!modal || !toggle) return;

    var i18n = (window.__i18n && window.__i18n.search) || {};
    var base = window.__pagefindBase || '/pagefind/';
    var loaded = false;
    var loading = null;
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

    function focusInput() {
        var input = modal.querySelector('.pagefind-ui__search-input');
        if (input) { try { input.focus(); } catch (_) {} }
    }

    function open() {
        if (modal.getAttribute('data-open') === 'true') return;
        lastFocus = document.activeElement;
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

    function close() {
        if (modal.getAttribute('data-open') !== 'true') return;
        modal.setAttribute('data-open', 'false');
        modal.setAttribute('aria-hidden', 'true');
        document.documentElement.removeAttribute('data-modal-open');
        if (lastFocus && typeof lastFocus.focus === 'function') {
            try { lastFocus.focus(); } catch (_) {}
        }
    }

    toggle.addEventListener('click', function (e) { e.preventDefault(); open(); });

    modal.addEventListener('click', function (e) {
        var t = e.target;
        if (t && (t.closest && t.closest('[data-search-close]'))) {
            e.preventDefault();
            close();
        }
    });

    document.addEventListener('keydown', function (e) {
        var isOpen = modal.getAttribute('data-open') === 'true';
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

    // Focus trap inside modal
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
})();
