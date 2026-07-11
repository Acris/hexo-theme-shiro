;(() => {
    'use strict';

    // URLs from bag lightgallery config only (gates / feature_var). No hardcoded CDN
    // fallback — keeps version pin in _config.yml + feature-gates only.
    // Signals featureReady/Abort so createFeatureLoader waits for true usability.
    const shiro = window.__shiro || {};
    const rt = shiro.runtime;
    const FEATURE_ID = 'lightgallery';

    const signalAbort = (error) => {
        if (rt && typeof rt.featureAbort === 'function') {
            rt.featureAbort(FEATURE_ID, error);
        }
    };
    const signalReady = () => {
        if (rt && typeof rt.featureReady === 'function') {
            rt.featureReady(FEATURE_ID);
        }
    };

    if (!rt || typeof rt.get !== 'function') {
        console.error('[shiro-lightgallery] runtime missing; aborting');
        signalAbort(new Error('runtime missing'));
        return;
    }

    const lg = rt.get('lightgallery') || {};
    const cssHref = String(lg.css || '').trim();
    const jsSrc = String(lg.js || '').trim();
    const themeCssHref = String(lg.themeCss || '').trim();
    const cssIntegrity = String(lg.cssIntegrity || '').trim();
    const jsIntegrity = String(lg.jsIntegrity || '').trim();
    if (!cssHref || !jsSrc) {
        console.error('[shiro-lightgallery] missing lightgallery css/js; aborting');
        signalAbort(new Error('missing lightgallery css/js'));
        return;
    }

    // Bootstrap owns all document click capture; this file only installs open/warm.
    const {
        loadAsset,
        isSafeImageUrl,
        isDecorativeImg,
        imageSource,
        safeNavigate,
        navigateFromImage,
        scheduleIdle
    } = rt;

    let assetsLoading = null;
    const instances = new Map();
    const preparedImages = new WeakSet();
    const galleryItemCache = new WeakMap();

