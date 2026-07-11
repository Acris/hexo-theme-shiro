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

    function assetKey(tag, attrs, selector) {
        if (selector) return selector;
        const src = attrs && (attrs.src || attrs.href);
        return tag + ':' + String(src || '');
    }

    function loadAsset(tag, attrs, selector) {
        const key = assetKey(tag, attrs, selector);
        const pending = assetInflight.get(key);
        if (pending) return pending;

        const existing = selector ? document.querySelector(selector) : null;
        if (existing && existing.dataset.shiroError === 'true') {
            existing.remove();
        } else if (existing) {
            return assetReady(existing, tag);
        }

        const promise = new Promise((resolve, reject) => {
            const el = document.createElement(tag);
            const { settle, fail } = watchAssetLoad(el, reject);
            Object.keys(attrs || {}).forEach((name) => {
                if (attrs[name] === true) {
                    el.setAttribute(name, '');
                } else if (attrs[name] != null && attrs[name] !== false) {
                    el.setAttribute(name, attrs[name]);
                }
            });
            applyCspNonce(el);
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
        }).finally(() => {
            assetInflight.delete(key);
        });

        assetInflight.set(key, promise);
        return promise;
    }

    // Canonical lazy-feature script fetch. `id` is a short stable dedupe token
    // (not a full URL — URLs break CSS selectors). Classic dynamic scripts are
    // async; do not set defer. Prefer createFeatureLoader for ready/abort protocol.
    function loadBootstrapScript(src, id) {
        const token = String(id || src || 'bootstrap')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .slice(0, 64) || 'bootstrap';
        if (!src) {
            return Promise.reject(new Error('Missing bootstrap script URL for ' + token));
        }
        const selector = 'script[data-shiro-bootstrap="' + token + '"]';
        return loadAsset('script', {
            src: src,
            'data-shiro-bootstrap': token
        }, selector);
    }
