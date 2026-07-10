;(() => {
    'use strict';

    // Shared client helpers for feature bootstraps (asset load, bootstrap script,
    // image safety, connection-aware warm). Loaded once as runtime.min.js before
    // any dependent deferred/sync feature script.
    if (window.__shiroRuntime) return;

    const assetTimeout = 12000;

    function watchAssetLoad(el, reject) {
        let settled = false;
        let timer;
        const settle = (callback) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            callback();
        };
        const fail = (error) => {
            settle(() => {
                el.dataset.shiroError = 'true';
                el.remove();
                reject(error);
            });
        };
        timer = setTimeout(() => fail(new Error('Asset load timed out')), assetTimeout);
        return { settle, fail };
    }

    function assetReady(el, tag) {
        if (el.dataset.shiroLoaded === 'true' || (tag === 'link' && el.sheet)) {
            el.dataset.shiroLoaded = 'true';
            return Promise.resolve();
        }
        if (el.dataset.shiroError === 'true') {
            el.remove();
            return Promise.reject(new Error('Asset failed to load'));
        }
        return new Promise((resolve, reject) => {
            const { settle, fail } = watchAssetLoad(el, reject);
            el.addEventListener('load', () => {
                settle(() => {
                    el.dataset.shiroLoaded = 'true';
                    delete el.dataset.shiroError;
                    resolve();
                });
            }, { once: true });
            el.addEventListener('error', (event) => {
                fail(event);
            }, { once: true });
        });
    }

    function loadAsset(tag, attrs, selector) {
        const existing = selector ? document.querySelector(selector) : null;
        if (existing && existing.dataset.shiroError === 'true') {
            existing.remove();
        } else if (existing) {
            return assetReady(existing, tag);
        }

        return new Promise((resolve, reject) => {
            const el = document.createElement(tag);
            const { settle, fail } = watchAssetLoad(el, reject);
            Object.keys(attrs).forEach((key) => {
                if (attrs[key] === true) {
                    el.setAttribute(key, '');
                } else {
                    el.setAttribute(key, attrs[key]);
                }
            });
            el.onload = () => {
                settle(() => {
                    el.dataset.shiroLoaded = 'true';
                    delete el.dataset.shiroError;
                    resolve();
                });
            };
            el.onerror = (event) => {
                fail(event);
            };
            document.head.appendChild(el);
        });
    }

    function loadBootstrapScript(src, callbacks) {
        const opts = callbacks || {};
        const timeout = 12000;
        const loader = document.createElement('script');
        let settled = false;
        let timer;
        const settle = (callback) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            callback();
        };
        const fail = (error) => {
            settle(() => {
                loader.remove();
                if (typeof opts.onerror === 'function') opts.onerror(error);
            });
        };
        timer = setTimeout(() => fail(new Error('Script load timed out')), timeout);
        loader.src = src;
        loader.defer = true;
        loader.onload = () => {
            settle(() => {
                if (typeof opts.onload === 'function') opts.onload();
            });
        };
        loader.onerror = (event) => {
            fail(event);
        };
        document.head.appendChild(loader);
    }

    function isSafeImageUrl(url) {
        const value = String(url || '').trim();
        if (!value || value[0] === '#') return false;
        if (/[\u0000-\u001F\u007F]/.test(value)) return false;
        if (/^https?:\/\//i.test(value) || /^\/\//.test(value) || /^blob:/i.test(value)) return true;
        if (/^data:image\/(?:avif|bmp|gif|jpe?g|png|webp);/i.test(value)) return true;
        return !/^[a-z][a-z0-9+.-]*:/i.test(value);
    }

    function isDecorativeImg(img) {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w && h && w <= 3 && h <= 3) return true;
        if (img.getAttribute('role') === 'presentation') return true;
        if (img.classList.contains('emoji')) return true;
        return false;
    }

    function imageSource(img) {
        const attrSrc = (img.getAttribute('src') || '').trim();
        const attrSrcset = (img.getAttribute('srcset') || '').trim();
        const dataSrc = (img.getAttribute('data-src') || '').trim();
        const selectedSrc = (img.currentSrc || '').trim();
        if (selectedSrc && (attrSrc || attrSrcset)) return selectedSrc;
        return attrSrc || dataSrc;
    }

    function connectionAllowsWarm() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return true;
        if (connection.saveData) return false;
        return !/(^|-)2g$/.test(connection.effectiveType || '');
    }

    function scheduleIdleWarm(task, options) {
        const opts = options || {};
        const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, opts.fallbackMs || 1200));
        idle(() => task(), { timeout: opts.timeout || 2000 });
    }

    window.__shiroRuntime = {
        loadAsset,
        loadBootstrapScript,
        isSafeImageUrl,
        isDecorativeImg,
        imageSource,
        connectionAllowsWarm,
        scheduleIdleWarm
    };
})();
