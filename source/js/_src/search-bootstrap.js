;(() => {
    'use strict';

    const rt = window.__shiroRuntime;
    if (!rt) return;

    const pagefindBase = window.__pagefindBase || '';
    const searchCss = window.__searchCss || '';
    if (!pagefindBase) return;

    const { loadAsset, connectionAllowsWarm, scheduleIdleWarm } = rt;

    // Host has no id so Pagefind does not copy a host id onto the internal dialog
    // (duplicate ids). Stable dialog id matches header aria-controls.
    const MODAL_SELECTOR = '.shiro-search-components > pagefind-modal';
    const DIALOG_ID = 'shiroSearchDialog';
    // Slow safety net only: MutationObserver + dialog close cover normal paths.
    const CHROME_POLL_MS = 250;
    const toggle = document.getElementById('searchToggle');
    const modal = document.querySelector(MODAL_SELECTOR);

    let loading = null;
    let loaded = false;
    let chromePollTimer = 0;
    let chromeObserver = null;
    let chromeWatching = false;
    let boundDialog = null;

    function logError(error) {
        const message = error && error.message ? error.message : error;
        console.error('[shiro-search]', message);
    }

    function isModalOpen() {
        return !!(modal && modal.isOpen);
    }

    // Keep aria-controls target stable after Pagefind creates/replaces the dialog.
    function ensureDialogId() {
        if (!modal) return null;
        const dialog = modal.querySelector('dialog');
        if (dialog && dialog.id !== DIALOG_ID) dialog.id = DIALOG_ID;
        return dialog;
    }

    function onDialogClose() {
        // Native <dialog> close (Esc / form method=dialog / backdrop depending on UA).
        applyModalChrome(false);
    }

    function bindDialogClose(dialog) {
        if (!dialog || dialog === boundDialog) return;
        if (boundDialog) {
            boundDialog.removeEventListener('close', onDialogClose);
        }
        boundDialog = dialog;
        dialog.addEventListener('close', onDialogClose);
    }

    function stopChromeWatch() {
        chromeWatching = false;
        if (chromePollTimer) {
            clearTimeout(chromePollTimer);
            chromePollTimer = 0;
        }
        if (chromeObserver) {
            chromeObserver.disconnect();
            chromeObserver = null;
        }
    }

    function applyModalChrome(open) {
        const html = document.documentElement;
        if (open) {
            html.setAttribute('data-modal-open', 'true');
            if (toggle) toggle.setAttribute('aria-expanded', 'true');
            startChromeWatch();
        } else {
            html.removeAttribute('data-modal-open');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
            stopChromeWatch();
        }
    }

    function syncModalChrome() {
        const dialog = ensureDialogId();
        if (dialog) bindDialogClose(dialog);

        const open = isModalOpen();
        if (open) {
            const html = document.documentElement;
            if (html.getAttribute('data-modal-open') !== 'true') {
                html.setAttribute('data-modal-open', 'true');
            }
            if (toggle) toggle.setAttribute('aria-expanded', 'true');
            if (!chromeWatching) startChromeWatch();
        } else {
            applyModalChrome(false);
        }
    }

    // Prefer DOM observation over a tight poll. Pagefind has no host close event;
    // watch subtree for dialog open/replace, bind dialog "close", and keep a slow
    // isOpen poll only as a safety net while the modal is open.
    function startChromeWatch() {
        if (!modal || chromeWatching) return;
        chromeWatching = true;

        if (typeof MutationObserver === 'function') {
            chromeObserver = new MutationObserver(() => {
                syncModalChrome();
            });
            // Prefer dialog open/replace over deep attribute spam during result updates.
            chromeObserver.observe(modal, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['open']
            });
        }

        const dialog = ensureDialogId();
        if (dialog) bindDialogClose(dialog);

        const tick = () => {
            if (!chromeWatching) return;
            if (!isModalOpen()) {
                applyModalChrome(false);
                return;
            }
            ensureDialogId();
            const nextDialog = modal.querySelector('dialog');
            if (nextDialog) bindDialogClose(nextDialog);
            chromePollTimer = setTimeout(tick, CHROME_POLL_MS);
        };
        chromePollTimer = setTimeout(tick, CHROME_POLL_MS);
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
                if (modal.isOpen) applyModalChrome(true);
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

    function proactiveWarm() {
        if (loaded || !connectionAllowsWarm()) return;
        scheduleIdleWarm(() => warm());
    }

    function handleKeydown(event) {
        if (event.key === 'Escape' && isModalOpen()) {
            // Pagefind closes the dialog; resync chrome after its handlers run.
            queueMicrotask(syncModalChrome);
            setTimeout(syncModalChrome, 0);
            return;
        }
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
