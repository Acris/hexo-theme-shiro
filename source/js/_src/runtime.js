;(() => {
    'use strict';

    // Shared client helpers for feature bootstraps.
    // Namespace: window.__shiro.runtime only (no flat global init gate).
    // Config lives on window.__shiro bare keys only; read via runtime.get (not bag.get).
    const root = (window.__shiro = window.__shiro || {});
    if (root.runtime) return;

    const assetTimeout = 12000;
    const featureReadyTimeout = 8000;
    // In-flight loadAsset promises keyed by selector (or tag:src/href).
    const assetInflight = new Map();
    // Feature readiness channels: script onload ≠ usable; wait for featureReady/Abort.
    const featureChannels = new Map();

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

    // Align with scripts/lib/util.js escapeHtml / escapeAttr (server).
    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttr(value) {
        return escapeHtml(value);
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

    function getFeatureChannel(id) {
        const key = String(id || 'feature');
        let channel = featureChannels.get(key);
        if (!channel) {
            channel = { status: 'pending', error: null, waiters: [] };
            featureChannels.set(key, channel);
        }
        return channel;
    }

    function settleFeatureWaiters(channel, ok, error) {
        const waiters = channel.waiters.slice();
        channel.waiters = [];
        waiters.forEach((waiter) => {
            if (ok) waiter.resolve();
            else waiter.reject(error);
        });
    }

    /**
     * Feature script signals it is usable (API installed). Call once per load.
     * createFeatureLoader waits on this — script onload alone is not enough.
     * No-op if already ready or aborted (abort/timeout is permanent).
     */
    function featureReady(id) {
        const channel = getFeatureChannel(id);
        if (channel.status === 'ready' || channel.status === 'aborted') return;
        channel.status = 'ready';
        channel.error = null;
        settleFeatureWaiters(channel, true);
    }

    /**
     * Feature script signals hard failure (missing config, etc.).
     * Treated as permanent for that feature id (no silent 8s retry hang).
     * No-op if already ready or aborted.
     */
    function featureAbort(id, error) {
        const channel = getFeatureChannel(id);
        if (channel.status === 'ready' || channel.status === 'aborted') return;
        const err = error instanceof Error
            ? error
            : new Error(error ? String(error) : 'Feature aborted: ' + id);
        channel.status = 'aborted';
        channel.error = err;
        settleFeatureWaiters(channel, false, err);
    }

    function waitForFeature(id, options) {
        const opts = options || {};
        const channel = getFeatureChannel(id);
        if (channel.status === 'ready') return Promise.resolve();
        if (channel.status === 'aborted') {
            return Promise.reject(channel.error || new Error('Feature aborted: ' + id));
        }

        const timeoutMs = opts.timeout != null ? opts.timeout : featureReadyTimeout;
        return new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                const err = new Error('Feature ready timeout: ' + id);
                if (channel.status === 'pending') {
                    channel.status = 'aborted';
                    channel.error = err;
                }
                // Drain all waiters (including this one) so co-waiters do not hang.
                settleFeatureWaiters(channel, false, err);
            }, timeoutMs);

            function onResolve() {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve();
            }

            function onReject(error) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                reject(error);
            }

            channel.waiters.push({ resolve: onResolve, reject: onReject });
        });
    }

    /**
     * Load a feature script once; concurrent load() share one promise.
     * load() always settles fulfilled after onError (call sites need no .catch).
     * Success runs onReady; detect failure only via options.onError side effects.
     * - featureAbort / ready-timeout → permanent (immediate onError on later load)
     * - network/script fetch failure → retryable (node removed by loadAsset)
     * @param {{ id: string, src: string, onReady?: function, onError?: function }} options
     * @returns {{ load: function, isLoading: function }}
     */
    function createFeatureLoader(options) {
        const opts = options || {};
        const id = opts.id || 'feature';
        const src = opts.src || '';
        let inflight = null;
        let ready = null;
        // Permanent terminal error after featureAbort or ready-timeout (not network).
        let terminalError = null;

        function failPermanent(error) {
            const err = error instanceof Error
                ? error
                : new Error(error ? String(error) : 'Feature failed: ' + id);
            terminalError = err;
            return err;
        }

        // meta.permanent: abort/timeout (or missing src). Network fail is retryable.
        function reportError(error, meta) {
            if (typeof opts.onError === 'function') opts.onError(error, meta || {});
        }

        // Always fulfill so callers can omit .catch; onError already reported failures.
        function settleLoad(promise, onReady) {
            return promise.then(() => {
                if (typeof onReady === 'function') onReady();
            }).catch(() => {});
        }

        return {
            isLoading: () => !!inflight,
            load: (onReady) => {
                if (!src) {
                    const err = new Error('Missing feature script URL for ' + id);
                    reportError(err, { permanent: true });
                    return settleLoad(Promise.reject(err), onReady);
                }

                if (ready) {
                    return settleLoad(ready, onReady);
                }

                if (terminalError) {
                    reportError(terminalError, { permanent: true });
                    return settleLoad(Promise.reject(terminalError), onReady);
                }

                if (!inflight) {
                    // featureAbort/timeout → terminalError (permanent).
                    // Network fetch fail leaves channel pending so a later load() can retry.
                    inflight = loadBootstrapScript(src, id)
                        .then(() => waitForFeature(id))
                        .then(() => {
                            ready = Promise.resolve();
                            inflight = null;
                            if (typeof opts.onReady === 'function') opts.onReady();
                        }, (error) => {
                            inflight = null;
                            const err = error instanceof Error
                                ? error
                                : new Error('Feature script failed: ' + id);
                            const channel = getFeatureChannel(id);
                            // Abort/timeout: permanent. Network fetch fail: channel still pending.
                            const permanent = channel.status === 'aborted';
                            if (permanent) {
                                failPermanent(err);
                            }
                            reportError(err, { permanent: permanent });
                            return Promise.reject(err);
                        });
                }

                return settleLoad(inflight, onReady);
            }
        };
    }

    /**
     * Prefer a live API if already installed; otherwise stash + load.
     * Shared by LightGallery (and similar) bootstraps — single source for tests.
     * If live returns exactly false (open refused), navigate — same as stash drain.
     * @param {{ failed?: boolean, live?: function, target?: *, stash?: function, load?: function, navigate?: function }} options
     * @returns {'navigate'|'live'|'stash'}
     */
    function dispatchLiveOrStash(options) {
        const opts = options || {};
        if (opts.failed) {
            if (typeof opts.navigate === 'function') opts.navigate(opts.target);
            return 'navigate';
        }
        if (typeof opts.live === 'function') {
            // false = refused (e.g. openFromElement); undefined/true = opened or async.
            if (opts.live(opts.target) === false) {
                if (typeof opts.navigate === 'function') opts.navigate(opts.target);
                return 'navigate';
            }
            return 'live';
        }
        if (typeof opts.stash === 'function') opts.stash(opts.target);
        if (typeof opts.load === 'function') opts.load();
        return 'stash';
    }

    /**
     * Prefer live warm if installed; otherwise mark pending + load.
     * @param {{ failed?: boolean, done?: boolean, live?: function, markPending?: function, load?: function }} options
     * @returns {'skip'|'live'|'stash'}
     */
    function dispatchLiveOrWarm(options) {
        const opts = options || {};
        if (opts.failed || opts.done) return 'skip';
        if (typeof opts.live === 'function') {
            opts.live();
            return 'live';
        }
        if (typeof opts.markPending === 'function') opts.markPending();
        if (typeof opts.load === 'function') opts.load();
        return 'stash';
    }

    /**
     * Bind one-shot intent warm (hover/press/focus) and return a cleanup fn.
     * @param {function} warmFn
     * @param {{ root?: EventTarget, events?: string[], capture?: boolean, shouldWarm?: function(Event): boolean }} [options]
     */
    function bindIntentWarm(warmFn, options) {
        const opts = options || {};
        const target = opts.root || document;
        const events = opts.events || ['pointerover', 'pointerdown', 'focusin'];
        const capture = opts.capture !== false;
        let done = false;

        const handler = (event) => {
            if (done) return;
            if (typeof opts.shouldWarm === 'function' && !opts.shouldWarm(event)) return;
            done = true;
            events.forEach((name) => target.removeEventListener(name, handler, capture));
            warmFn(event);
        };

        events.forEach((name) => target.addEventListener(name, handler, capture));
        return () => {
            if (done) return;
            done = true;
            events.forEach((name) => target.removeEventListener(name, handler, capture));
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

    function hasConflictingImageAction(img) {
        if (!img || typeof img.closest !== 'function') return false;
        return !!img.closest(
            'button, input, select, textarea, summary, label, '
            + '[role="button"], [role="link"], [contenteditable]:not([contenteditable="false"])'
        );
    }

    function imageSource(img) {
        const attrSrc = (img.getAttribute('src') || '').trim();
        const attrSrcset = (img.getAttribute('srcset') || '').trim();
        const dataSrc = (img.getAttribute('data-src') || '').trim();
        const selectedSrc = (img.currentSrc || '').trim();
        if (selectedSrc && (attrSrc || attrSrcset)) return selectedSrc;
        return attrSrc || dataSrc;
    }

    function isModifiedClick(event) {
        return !!(
            !event
            || event.button !== 0
            || event.metaKey
            || event.ctrlKey
            || event.shiftKey
            || event.altKey
        );
    }

    /**
     * Navigate to an allowlisted URL; open absolute http(s) in a new tab.
     * Blob URLs support image fallbacks. Unknown schemes and control chars are blocked.
     */
    function safeNavigate(href) {
        const value = String(href || '').trim();
        if (!value) return;
        if (/[\u0000-\u001F\u007F]/.test(value)) return;
        if (/^https?:\/\//i.test(value) || value.indexOf('//') === 0) {
            window.open(value, '_blank', 'noopener,noreferrer');
            return;
        }
        if (/^(?:mailto|tel|blob):/i.test(value) || !/^[a-z][a-z0-9+.-]*:/i.test(value)) {
            window.location.href = value;
        }
    }

    // Prefer original page href (pre-gallery), then image src — shared by LG bootstrap/feature.
    function imageNavigationHref(img) {
        if (!img || !img.closest) return '';
        const link = img.closest('a');
        const original = link
            ? (link.getAttribute('data-shiro-original-href') || link.getAttribute('href') || '').trim()
            : '';
        const src = (imageSource(img) || '').trim();
        return original || src;
    }

    function navigateFromImage(img) {
        safeNavigate(imageNavigationHref(img));
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