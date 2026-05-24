    const assetTimeout = 12000;

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
            const timer = setTimeout(() => {
                el.dataset.shiroError = 'true';
                el.remove();
                reject(new Error('Asset load timed out'));
            }, assetTimeout);
            el.addEventListener('load', () => {
                clearTimeout(timer);
                el.dataset.shiroLoaded = 'true';
                delete el.dataset.shiroError;
                resolve();
            }, { once: true });
            el.addEventListener('error', (event) => {
                clearTimeout(timer);
                el.dataset.shiroError = 'true';
                el.remove();
                reject(event);
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
            const timer = setTimeout(() => {
                el.dataset.shiroError = 'true';
                el.remove();
                reject(new Error('Asset load timed out'));
            }, assetTimeout);
            Object.keys(attrs).forEach((key) => {
                if (attrs[key] === true) {
                    el.setAttribute(key, '');
                } else {
                    el.setAttribute(key, attrs[key]);
                }
            });
            el.onload = () => {
                clearTimeout(timer);
                el.dataset.shiroLoaded = 'true';
                delete el.dataset.shiroError;
                resolve();
            };
            el.onerror = (event) => {
                clearTimeout(timer);
                el.dataset.shiroError = 'true';
                el.remove();
                reject(event);
            };
            document.head.appendChild(el);
        });
    }
