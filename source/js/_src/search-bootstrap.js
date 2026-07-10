;(() => {
    'use strict';

    const pagefindBase = window.__pagefindBase || '';
    const searchCss = window.__searchCss || '';
    if (!pagefindBase) return;

    /* global loadAsset */
    // <shiro-asset-loader>
    // Source requires build injection; do not serve this file directly.
    // </shiro-asset-loader>

    // Host has no id so Pagefind does not copy a host id onto the internal dialog
    // (duplicate ids). Stable dialog id matches header aria-controls.
    const MODAL_SELECTOR = '.shiro-search-components > pagefind-modal';
    const DIALOG_ID = 'shiroSearchDialog';
    const toggle = document.getElementById('searchToggle');
    const modal = document.querySelector(MODAL_SELECTOR);

    let loading = null;
    let loaded = false;
    let chromeWatchTimer = 0;

    function logError(error) {
        const message = error && error.message ? error.message : error;
        console.error('[shiro-search]', message);
    }

    // Keep aria-controls target stable after Pagefind creates/replaces the dialog.
    function ensureDialogId() {
        if (!modal) return;
        const dialog = modal.querySelector('dialog');
        if (dialog && dialog.id !== DIALOG_ID) dialog.id = DIALOG_ID;
    }

    function stopChromeWatch() {
        if (chromeWatchTimer) {
            clearTimeout(chromeWatchTimer);
            chromeWatchTimer = 0;
        }
    }

    function setModalChrome(open) {
        const html = document.documentElement;
        if (open) html.setAttribute('data-modal-open', 'true');
        else html.removeAttribute('data-modal-open');
        if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) startChromeWatch();
        else stopChromeWatch();
    }

    // Sole chrome path: while open, poll pagefind-modal.isOpen (public API).
    // Esc / backdrop / close control and Pagefind re-renders that replace the
    // internal dialog are all reflected here; host has no bubbling close event.
    // First tick ASAP, then every 50ms.
    function startChromeWatch() {
        stopChromeWatch();
        const tick = () => {
            if (!modal || !modal.isOpen) {
                setModalChrome(false);
                return;
            }
            ensureDialogId();
            chromeWatchTimer = setTimeout(tick, 50);
        };
        chromeWatchTimer = setTimeout(tick, 0);
    }

    function ensureAssets() {
        if (loaded) return Promise.resolve();
        if (loading) return loading;

        const cssLoads = [
            loadAsset('link', {
                rel: 'stylesheet',
                href: pagefindBase + 'pagefind-component-ui.css',
                'data-shiro-pagefind-css': 'true'
            }, 'link[data-shiro-pagefind-css]')
        ];
        if (searchCss) {
            cssLoads.push(loadAsset('link', {
                rel: 'stylesheet',
                href: searchCss,
                'data-shiro-search-css': 'true'
            }, 'link[data-shiro-search-css]'));
        }

        loading = Promise.all(cssLoads)
            .then(() => loadAsset('script', {
                type: 'module',
                src: pagefindBase + 'pagefind-component-ui.js',
                'data-shiro-pagefind-js': 'true'
            }, 'script[data-shiro-pagefind-js]'))
            .then(() => {
                if (window.customElements && customElements.whenDefined) {
                    return customElements.whenDefined('pagefind-modal');
                }
            })
            .then(() => {
                loaded = true;
                ensureDialogId();
            })
            .catch((error) => {
                loading = null;
                throw error;
            });

        return loading;
    }

    function openModal() {
        if (modal && modal.isOpen) return;

        ensureAssets()
            .then(() => {
                if (!modal || typeof modal.open !== 'function') return;
                if (modal.isOpen) return;
                modal.open();
                ensureDialogId();
                if (modal.isOpen) setModalChrome(true);
            })
            .catch(logError);
    }

    function removeWarmListeners() {
        if (!toggle) return;
        toggle.removeEventListener('pointerover', warm);
        toggle.removeEventListener('pointerdown', warm);
        toggle.removeEventListener('focusin', warm);
    }

    function warm() {
        if (loaded) {
            removeWarmListeners();
            return;
        }
        ensureAssets()
            .then(() => {
                removeWarmListeners();
            })
            .catch(logError);
    }

    /* global connectionAllowsWarm, scheduleIdleWarm */
    // <shiro-connection-warm>
    // Source requires build injection; do not serve this file directly.
    // </shiro-connection-warm>

    function proactiveWarm() {
        if (loaded || !connectionAllowsWarm()) return;
        scheduleIdleWarm(() => warm());
    }

    function handleKeydown(event) {
        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
        const active = document.activeElement;
        if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
        if (modal && modal.isOpen) return;
        event.preventDefault();
        openModal();
    }

    document.addEventListener('keydown', handleKeydown);

    if (toggle) {
        toggle.addEventListener('click', openModal);
        toggle.addEventListener('pointerover', warm);
        toggle.addEventListener('pointerdown', warm);
        toggle.addEventListener('focusin', warm);
    }
    proactiveWarm();
})();
