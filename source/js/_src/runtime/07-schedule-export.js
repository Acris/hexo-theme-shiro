    function connectionAllowsWarm() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return true;
        if (connection.saveData) return false;
        return !/(^|-)2g$/.test(connection.effectiveType || '');
    }

    function scheduleIdle(task, options) {
        const opts = options || {};
        const idle = window.requestIdleCallback
            || ((fn) => window.setTimeout(fn, opts.fallbackMs != null ? opts.fallbackMs : 64));
        idle(() => task(), { timeout: opts.timeout != null ? opts.timeout : 1000 });
    }

    function scheduleIdleWarm(task, options) {
        const opts = options || {};
        scheduleIdle(task, {
            timeout: opts.timeout != null ? opts.timeout : 2000,
            fallbackMs: opts.fallbackMs != null ? opts.fallbackMs : 1200
        });
    }

    const api = {
        loadAsset,
        loadBootstrapScript,
        createFeatureLoader,
        featureReady,
        featureAbort,
        bindIntentWarm,
        isSafeImageUrl,
        isDecorativeImg,
        hasConflictingImageAction,
        imageSource,
        isModifiedClick,
        safeNavigate,
        imageNavigationHref,
        navigateFromImage,
        dispatchLiveOrStash,
        dispatchLiveOrWarm,
        connectionAllowsWarm,
        scheduleIdle,
        scheduleIdleWarm,
        escapeHtml,
        escapeAttr,
        cspNonce,
        get
    };
    root.runtime = api;
})();
