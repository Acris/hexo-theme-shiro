    function loadBootstrapScript(src, callbacks) {
        const opts = callbacks || {};
        const loader = document.createElement('script');
        loader.src = src;
        loader.defer = true;
        loader.onload = () => {
            if (typeof opts.onload === 'function') opts.onload();
        };
        loader.onerror = (event) => {
            if (typeof opts.onerror === 'function') opts.onerror(event);
        };
        document.head.appendChild(loader);
    }
