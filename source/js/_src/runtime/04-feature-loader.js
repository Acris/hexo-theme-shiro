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
     */
    function featureReady(id) {
        const channel = getFeatureChannel(id);
        if (channel.status === 'ready') return;
        channel.status = 'ready';
        channel.error = null;
        settleFeatureWaiters(channel, true);
    }

    /**
     * Feature script signals hard failure (missing config, etc.).
     * Treated as permanent for that feature id (no silent 8s retry hang).
     */
    function featureAbort(id, error) {
        const channel = getFeatureChannel(id);
        if (channel.status === 'ready') return;
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
                settled = true;
                const err = new Error('Feature ready timeout: ' + id);
                if (channel.status === 'pending') {
                    channel.status = 'aborted';
                    channel.error = err;
                }
                channel.waiters = channel.waiters.filter((w) => w.resolve !== onResolve);
                reject(err);
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

        function reportError(error) {
            if (typeof opts.onError === 'function') opts.onError(error);
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
                    reportError(err);
                    return settleLoad(Promise.reject(err), onReady);
                }

                if (ready) {
                    return settleLoad(ready, onReady);
                }

                if (terminalError) {
                    reportError(terminalError);
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
                            if (channel.status === 'aborted') {
                                failPermanent(err);
                            }
                            reportError(err);
                            return Promise.reject(err);
                        });
                }

                return settleLoad(inflight, onReady);
            }
        };
    }
