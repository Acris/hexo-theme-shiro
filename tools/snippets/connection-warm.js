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
