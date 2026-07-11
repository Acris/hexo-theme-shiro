    function withSri(attrs, integrity) {
        if (!integrity) return attrs;
        attrs.integrity = integrity;
        attrs.crossorigin = 'anonymous';
        return attrs;
    }

    function ensureStylesheet() {
        return loadAsset('link', withSri({
            rel: 'stylesheet',
            href: cssHref,
            'data-shiro-lightgallery-css': 'true'
        }, cssIntegrity), 'link[data-shiro-lightgallery-css]');
    }

    function ensureThemeStylesheet() {
        if (!themeCssHref) return Promise.resolve();
        return loadAsset('link', {
            rel: 'stylesheet',
            href: themeCssHref,
            'data-shiro-lightgallery-theme-css': 'true'
        }, 'link[data-shiro-lightgallery-theme-css]');
    }

    function ensureScript() {
        if (typeof window.lightGallery === 'function') {
            return Promise.resolve();
        }
        return loadAsset('script', withSri({
            src: jsSrc,
            async: true,
            'data-shiro-lightgallery-js': 'true'
        }, jsIntegrity), 'script[data-shiro-lightgallery-js]');
    }

    function ensureLightGalleryAssets() {
        if (typeof window.lightGallery === 'function') {
            return ensureStylesheet().then(ensureThemeStylesheet);
        }
        if (assetsLoading) return assetsLoading;

        assetsLoading = Promise.all([ensureStylesheet().then(ensureThemeStylesheet), ensureScript()]).then(() => {
            if (typeof window.lightGallery !== 'function') {
                throw new Error('LightGallery failed to load');
            }
        }).catch((error) => {
            assetsLoading = null;
            throw error;
        });

        return assetsLoading;
    }

