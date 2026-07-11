;(() => {
    'use strict';

    // Shared client helpers for feature bootstraps (asset load, bootstrap script,
    // image safety, connection-aware warm). Loaded once as runtime.min.js before
    // any dependent deferred/sync feature script.
    // Namespace: window.__shiro.runtime (flat window.__shiroRuntime kept as alias).
    const root = (window.__shiro = window.__shiro || {});
    if (window.__shiroRuntime || root.runtime) return;

    const assetTimeout = 12000;

    /**
     * Read config/handoff from window.__shiro bare keys only.
     * Accepts bare names (`clipboardScript`) or legacy `__clipboardScript` (strips once).
     */
    function get(name) {
        if (name == null || name === '') return undefined;
        const key = String(name);
        const bare = key.indexOf('__') === 0 ? key.slice(2) : key;
        if (Object.prototype.hasOwnProperty.call(root, bare) && root[bare] != null) {
            return root[bare];
        }
        return undefined;
    }

    root.get = get;

    // Prefer bag cspNonce (head-theme). Fall back to this script's nonce attribute.
    function cspNonce() {
        const bagNonce = get('cspNonce');
        if (typeof bagNonce === 'string' && bagNonce) {
            return bagNonce;
        }
        try {
            const current = document.currentScript;
            if (current && current.nonce) return current.nonce;
        } catch (_) {}
        return '';
    }

    function applyCspNonce(el) {
        if (el.tagName !== 'SCRIPT') return;
        const nonce = cspNonce();
        if (nonce) el.setAttribute('nonce', nonce);
    }

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
                } else if (attrs[key] != null && attrs[key] !== false) {
                    el.setAttribute(key, attrs[key]);
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
        });
    }

    // Canonical lazy-feature loader for *-bootstrap.js scripts.
    // Protocol: window URL -> loadBootstrapScript(url, {onload,onerror}, shortId)
    // -> optional scheduleIdleWarm. Do not invent a parallel loader path.
    // `id` is a short stable token for dedupe (not the full URL - URLs break CSS selectors).
    // Dynamically inserted classic scripts are effectively async; we do not set
    // defer (it is a no-op on createElement('script') and documents the wrong model).
    function loadBootstrapScript(src, callbacks, id) {
        const opts = callbacks || {};
        const token = String(id || src || 'bootstrap')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .slice(0, 64) || 'bootstrap';
        if (!src) {
            const err = new Error('Missing bootstrap script URL for ' + token);
            if (typeof opts.onerror === 'function') opts.onerror(err);
            return Promise.reject(err);
        }
        const selector = 'script[data-shiro-bootstrap="' + token + '"]';
        return loadAsset('script', {
            src: src,
            'data-shiro-bootstrap': token
        }, selector).then(() => {
            if (typeof opts.onload === 'function') opts.onload();
        }).catch((error) => {
            if (typeof opts.onerror === 'function') opts.onerror(error);
            return Promise.reject(error);
        });
    }

    /**
     * Load a feature bootstrap script once; concurrent load() share one promise.
     * onReady runs after success (including late subscribers). Failures call
     * onError and clear pending so a later load() can retry.
     * @param {{ id: string, src: string, onReady?: function, onError?: function }} options
     * @returns {{ load: function, isLoading: function }}
     */
    function createFeatureLoader(options) {
        const opts = options || {};
        const id = opts.id || 'feature';
        const src = opts.src || '';
        // inflight: in-progress load. ready: resolved after first success (reuse).
        let inflight = null;
        let ready = null;

        return {
            isLoading: () => !!inflight,
            load: (onReady) => {
                if (!src) {
                    const err = new Error('Missing feature script URL for ' + id);
                    if (typeof opts.onError === 'function') opts.onError(err);
                    return Promise.reject(err);
                }

                if (ready) {
                    return ready.then(() => {
                        if (typeof onReady === 'function') onReady();
                    });
                }

                if (!inflight) {
                    inflight = loadBootstrapScript(src, {
                        onload: () => {
                            if (typeof opts.onReady === 'function') opts.onReady();
                        },
                        onerror: (error) => {
                            if (typeof opts.onError === 'function') opts.onError(error);
                        }
                    }, id).then(() => {
                        ready = Promise.resolve();
                        inflight = null;
                    }, () => {
                        inflight = null;
                        return Promise.reject(new Error('Feature script failed: ' + id));
                    });
                }

                return inflight.then(() => {
                    if (typeof onReady === 'function') onReady();
                }).catch(() => {
                    // onError already ran; call sites need no .catch.
                });
            }
        };
    }

    /**
     * Bind one-shot intent warm (hover/press/focus) and return a cleanup fn.
     * @param {function} warmFn
     * @param {{ root?: EventTarget, events?: string[], capture?: boolean, shouldWarm?: function(Event): boolean }} [options]
     */
    function bindIntentWarm(warmFn, options) {
        const opts = options || {};
        const root = opts.root || document;
        const events = opts.events || ['pointerover', 'pointerdown', 'focusin'];
        const capture = opts.capture !== false;
        let done = false;

        const handler = (event) => {
            if (done) return;
            if (typeof opts.shouldWarm === 'function' && !opts.shouldWarm(event)) return;
            done = true;
            events.forEach((name) => root.removeEventListener(name, handler, capture));
            warmFn(event);
        };

        events.forEach((name) => root.addEventListener(name, handler, capture));
        return () => {
            if (done) return;
            done = true;
            events.forEach((name) => root.removeEventListener(name, handler, capture));
        };
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
        bindIntentWarm,
        isSafeImageUrl,
        isDecorativeImg,
        imageSource,
        connectionAllowsWarm,
        scheduleIdle,
        scheduleIdleWarm,
        cspNonce,
        get
    };
    root.runtime = api;
    // Flat alias for existing bootstraps (clipboard / search / comments / …).
    window.__shiroRuntime = api;
})();
