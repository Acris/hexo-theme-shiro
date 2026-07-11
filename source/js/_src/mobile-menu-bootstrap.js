;(() => {
    'use strict';

    const shiro = window.__shiro || {};
    const rt = shiro.runtime;
    if (!rt || typeof rt.get !== 'function') return;

    const script = rt.get('mobileMenuScript') || '';
    if (!script) return;

    const { createFeatureLoader } = rt;
    const query = window.matchMedia('(max-width: 767px)');
    const RETRY_MS = 2000;
    let permanent = false;
    let retryTimer = 0;

    function removeViewportListener() {
        if (query.removeEventListener) {
            query.removeEventListener('change', handleViewportChange);
        } else if (query.removeListener) {
            query.removeListener(handleViewportChange);
        }
    }

    function scheduleRetry() {
        if (permanent || retryTimer || !query.matches) return;
        retryTimer = setTimeout(() => {
            retryTimer = 0;
            if (!permanent && query.matches) loadMobileMenu();
        }, RETRY_MS);
    }

    // Permanent errors stop retry; network failures reschedule while still mobile.
    const feature = createFeatureLoader({
        id: 'mobile-menu',
        src: script,
        onReady: () => {
            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = 0;
            }
            removeViewportListener();
        },
        onError: (error, meta) => {
            if (meta && meta.permanent) {
                permanent = true;
                if (retryTimer) {
                    clearTimeout(retryTimer);
                    retryTimer = 0;
                }
                removeViewportListener();
                console.warn('[shiro-mobile-menu] feature aborted', error);
                return;
            }
            console.warn('[shiro-mobile-menu] load failed (retryable)', error);
            scheduleRetry();
        }
    });

    function loadMobileMenu() {
        if (permanent) return;
        feature.load();
    }

    function handleViewportChange(event) {
        if (event.matches) loadMobileMenu();
    }

    // Always listen: recovers after retryable fail without leaving mobile, and
    // still loads when crossing down from desktop.
    if (query.addEventListener) {
        query.addEventListener('change', handleViewportChange);
    } else if (query.addListener) {
        query.addListener(handleViewportChange);
    }
    if (query.matches) {
        loadMobileMenu();
    }
})();
