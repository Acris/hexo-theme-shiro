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
