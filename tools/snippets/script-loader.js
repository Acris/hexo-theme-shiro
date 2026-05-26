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
