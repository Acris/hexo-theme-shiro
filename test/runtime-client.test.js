'use strict';

// Lightweight DOM + window mock to exercise client runtime protocol without a browser.
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const runtimeSource = fs.readFileSync(
    path.join(__dirname, '../source/js/_src/runtime.js'),
    'utf8'
);
const lightgallerySource = fs.readFileSync(
    path.join(__dirname, '../source/js/_src/lightgallery.js'),
    'utf8'
);

function createHarness() {
    const elements = [];
    const document = {
        currentScript: null,
        head: {
            appendChild(el) {
                elements.push(el);
                queueMicrotask(() => {
                    if (el.tagName === 'SCRIPT' && typeof el.onload === 'function') {
                        el.dataset.shiroLoaded = 'true';
                        el.onload();
                    }
                    if (el.tagName === 'LINK' && typeof el.onload === 'function') {
                        el.dataset.shiroLoaded = 'true';
                        el.onload();
                    }
                });
            }
        },
        querySelector(selector) {
            return elements.find((el) => {
                if (selector.indexOf('data-shiro-bootstrap=') !== -1) {
                    const m = /data-shiro-bootstrap="([^"]+)"/.exec(selector);
                    return el.tagName === 'SCRIPT'
                        && el.getAttribute('data-shiro-bootstrap') === (m && m[1]);
                }
                return false;
            }) || null;
        },
        createElement(tag) {
            const attrs = Object.create(null);
            const el = {
                tagName: String(tag).toUpperCase(),
                dataset: {},
                onload: null,
                onerror: null,
                sheet: tag === 'link' ? {} : undefined,
                getAttribute(name) {
                    return attrs[name] != null ? attrs[name] : null;
                },
                setAttribute(name, value) {
                    attrs[name] = String(value);
                    if (name.indexOf('data-') === 0) {
                        const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                        el.dataset[key] = String(value);
                    }
                },
                remove() {
                    const idx = elements.indexOf(el);
                    if (idx >= 0) elements.splice(idx, 1);
                },
                addEventListener() {},
                removeEventListener() {}
            };
            return el;
        }
    };

    const window = {
        document,
        __shiro: {},
        setTimeout,
        clearTimeout,
        requestIdleCallback: null,
        open() {},
        location: { href: '' }
    };
    window.window = window;
    document.defaultView = window;

    vm.runInNewContext(runtimeSource, {
        window,
        document,
        console,
        setTimeout,
        clearTimeout,
        queueMicrotask
    });

    return { window, document, elements, rt: window.__shiro.runtime };
}

describe('runtime build contract', () => {
    it('is a single IIFE with required APIs', () => {
        const openCount = (runtimeSource.match(/;\(\(\)\s*=>\s*\{/g) || []).length;
        const closeCount = (runtimeSource.match(/\}\)\(\);/g) || []).length;
        assert.equal(openCount, 1);
        assert.equal(closeCount, 1);
        ['featureReady', 'createFeatureLoader', 'loadAsset', 'dispatchLiveOrStash', 'escapeHtml'].forEach((token) => {
            assert.ok(runtimeSource.includes(token), 'missing required runtime symbol: ' + token);
        });
        assert.match(runtimeSource, /^;\(\(\)\s*=>\s*\{/);
        assert.match(runtimeSource, /\}\)\(\);\s*$/);
    });

    it('keeps the LightGallery feature in one complete IIFE', () => {
        const openCount = (lightgallerySource.match(/;\(\(\)\s*=>\s*\{/g) || []).length;
        const closeCount = (lightgallerySource.match(/\}\)\(\);/g) || []).length;
        assert.equal(openCount, 1);
        assert.equal(closeCount, 1);
        ['lightGalleryOpen', 'ensureLightGalleryAssets', 'openFromElement'].forEach((token) => {
            assert.ok(lightgallerySource.includes(token), 'missing LightGallery symbol: ' + token);
        });
        assert.match(lightgallerySource, /^;\(\(\)\s*=>\s*\{/);
        assert.match(lightgallerySource, /\}\)\(\);\s*$/);
    });

    it('wraps a responsive picture instead of moving its fallback image', () => {
        assert.match(lightgallerySource, /tagName === 'PICTURE'[\s\S]*?\? img\.parentElement[\s\S]*?: img/);
        assert.match(lightgallerySource, /insertBefore\(link, linkTarget\);\s*link\.appendChild\(linkTarget\)/);
        assert.doesNotMatch(lightgallerySource, /link\.appendChild\(img\)/);
    });

    it('preserves safe relative image links in LightGallery captions', () => {
        const { window, document } = createHarness();
        const anchorAttrs = { href: '/posts/linked/' };
        const container = {
            contains: (node) => node === image,
            querySelectorAll: () => anchorAttrs['data-lg-item'] ? [anchor] : []
        };
        const anchor = {
            tagName: 'A',
            isConnected: true,
            parentElement: container,
            getAttribute: (name) => anchorAttrs[name] || null,
            setAttribute: (name, value) => {
                anchorAttrs[name] = String(value);
            },
            hasAttribute: (name) => Object.prototype.hasOwnProperty.call(anchorAttrs, name),
            removeAttribute: (name) => {
                delete anchorAttrs[name];
            }
        };
        const imageAttrs = { src: '/images/preview.jpg', alt: 'Preview' };
        const image = {
            tagName: 'IMG',
            parentElement: anchor,
            parentNode: anchor,
            naturalWidth: 800,
            naturalHeight: 600,
            currentSrc: '',
            classList: { contains: () => false },
            getAttribute: (name) => imageAttrs[name] || '',
            closest(selector) {
                if (selector === '.prose-shiro') return container;
                return null;
            }
        };

        window.__shiro.lightgallery = {
            css: '/vendor/lightgallery.css',
            js: '/vendor/lightgallery.js'
        };
        window.lightGallery = () => ({ refresh() {}, openGallery() {} });
        vm.runInNewContext(lightgallerySource, {
            window,
            document,
            console,
            setTimeout,
            clearTimeout,
            queueMicrotask
        });

        assert.equal(window.__shiro.lightGalleryOpen(image), true);
        assert.match(anchorAttrs['data-sub-html'], /href="\/posts\/linked\/"/);
    });
});

describe('client accessibility contracts', () => {
    function clientSource(name) {
        return fs.readFileSync(path.join(__dirname, '../source/js/_src', name), 'utf8');
    }

    it('loads mobile menu as a plain deferred script and enables the first-paint toggle', () => {
        const feature = clientSource('mobile-menu.js');
        assert.match(feature, /panel\.inert\s*=\s*!open/);
        assert.match(feature, /setOpen\(false\)/);
        assert.match(feature, /btn\.disabled\s*=\s*false/);
        assert.doesNotMatch(feature, /createFeatureLoader|featureReady|featureAbort|mobileMenuScript/);
        assert.doesNotMatch(feature, /mobile-menu-ready|mobile-menu-initializing/);
        assert.ok(
            !fs.existsSync(path.join(__dirname, '../source/js/_src/mobile-menu-bootstrap.js')),
            'mobile-menu-bootstrap.js should be removed'
        );
        const header = fs.readFileSync(
            path.join(__dirname, '../layout/_partial/common/header.njk'),
            'utf8'
        );
        assert.match(header, /id="mobileMenu"[^>]*data-open="false"/);
        assert.match(header, /id="menuBtn"[^>]*\sdisabled(?:\s|>)/);
        assert.doesNotMatch(header, /id="menuBtn"[^>]*\shidden(?:\s|>)/);
        const headTheme = fs.readFileSync(
            path.join(__dirname, '../layout/_partial/common/head-theme.njk'),
            'utf8'
        );
        assert.match(headTheme, /classList\.add\(['"]js['"]\)/);
        const layout = fs.readFileSync(path.join(__dirname, '../layout/_layout.njk'), 'utf8');
        assert.doesNotMatch(layout, /mobileMenuScript/);
        const components = fs.readFileSync(
            path.join(__dirname, '../source/css/_core/components.css'),
            'utf8'
        );
        assert.match(components, /html\.js \.menu-panel/);
        assert.match(components, /html\.js #menuBtn:not\(\[hidden\]\)/);
        assert.doesNotMatch(components, /mobile-menu-ready|mobile-menu-initializing/);
        assert.match(header, /menuPanel\.inert\s*=\s*true|getElementById\(['"]mobileMenu['"]\)[\s\S]*inert/);
    });

    it('paints the search trigger early and enables it when the handler is ready', () => {
        const header = fs.readFileSync(
            path.join(__dirname, '../layout/_partial/common/header.njk'),
            'utf8'
        );
        const bootstrap = clientSource('search-bootstrap.js');
        const components = fs.readFileSync(
            path.join(__dirname, '../source/css/_core/components.css'),
            'utf8'
        );

        assert.match(header, /id="searchToggle"[^>]*\sdisabled(?:\s|>)/);
        assert.doesNotMatch(header, /id="searchToggle"[^>]*\shidden(?:\s|>)/);
        assert.match(components, /html\.js #searchToggle:not\(\[hidden\]\)/);
        assert.match(
            bootstrap,
            /toggle\.addEventListener\('click', openModal\);[\s\S]*?toggle\.disabled\s*=\s*false/
        );
        assert.match(bootstrap, /hideSearchToggle/);
        assert.doesNotMatch(header, /id="searchToggle"[^>]*aria-controls=/);
        assert.match(
            bootstrap,
            /if \(dialog && toggle\) toggle\.setAttribute\('aria-controls', DIALOG_ID\)/
        );
    });

    it('uses server-normalized giscus binary attributes directly', () => {
        const giscus = clientSource('comments-giscus.js');
        assert.doesNotMatch(giscus, /binaryAttr/);
        assert.match(giscus, /'data-strict': g\.strict/);
        assert.match(giscus, /'data-reactions-enabled': g\.reactions_enabled/);
        assert.match(giscus, /'data-emit-metadata': g\.emit_metadata/);
    });

    it('paints the theme trigger early and enables it when the handler is ready', () => {
        const header = fs.readFileSync(
            path.join(__dirname, '../layout/_partial/common/header.njk'),
            'utf8'
        );
        const toggle = clientSource('theme-toggle.js');
        const components = fs.readFileSync(
            path.join(__dirname, '../source/css/_core/components.css'),
            'utf8'
        );

        assert.match(header, /id="themeToggle"[^>]*\sdisabled(?:\s|>)/);
        assert.doesNotMatch(header, /id="themeToggle"[^>]*\shidden(?:\s|>)/);
        assert.match(components, /html\.js #themeToggle:not\(\[hidden\]\)/);
        assert.match(
            toggle,
            /btn\.addEventListener\('click', cycle\);[\s\S]*?btn\.disabled\s*=\s*false/
        );
    });

    it('removes the collapsed inline TOC from the tab order', () => {
        const source = clientSource('toc.js');
        const tocTemplate = fs.readFileSync(
            path.join(__dirname, '../layout/_partial/components/toc.njk'),
            'utf8'
        );
        const tocCss = fs.readFileSync(
            path.join(__dirname, '../source/css/_src/toc.css'),
            'utf8'
        );
        assert.match(source, /body\.inert\s*=\s*!open/);
        assert.match(source, /toggleBtn\.disabled\s*=\s*false/);
        assert.match(tocTemplate, /id="tocInlineBody"[^>]*data-open="false"/);
        assert.match(tocTemplate, /class="toc-toggle"[^>]*\sdisabled(?:\s|>)/);
        assert.match(tocCss, /html\.js \.toc-inline \.toc-body/);
        assert.doesNotMatch(tocCss, /data-enhanced/);
        assert.doesNotMatch(source, /dataset\.enhanced/);
        assert.match(tocTemplate, /tocBody\.inert\s*=\s*true|getElementById\(['"]tocInlineBody['"]\)[\s\S]*inert/);
    });

    it('announces the current TOC location', () => {
        const source = clientSource('toc.js');
        assert.match(source, /setAttribute\(['"]aria-current['"],\s*['"]location['"]\)/);
        assert.match(source, /removeAttribute\(['"]aria-current['"]\)/);
    });

    it('keeps geometry-based TOC tracking active while scrolling', () => {
        const source = clientSource('toc.js');
        assert.match(
            source,
            /if \('IntersectionObserver' in window\)[\s\S]*?\n\s*}\n\s*window\.addEventListener\('scroll', scheduleGeometryUpdate/
        );
    });

    it('hides the inactive back-to-top button from keyboard focus', () => {
        assert.match(clientSource('back-to-top.js'), /backBtn\.hidden\s*=\s*!visible/);
    });

    it('prevents interaction with content hidden behind the font veil', () => {
        const preloader = clientSource('preloader.js');
        const components = fs.readFileSync(
            path.join(__dirname, '../source/css/_core/components.css'),
            'utf8'
        );
        assert.match(preloader, /classList\.add\(['"]shiro-preloader-dismissed['"]\)/);
        assert.match(components, /body > :not\(\.shiro-preloader\)[\s\S]*?visibility:\s*hidden/);
        assert.match(components, /\.shiro-preloader[\s\S]*?pointer-events:\s*auto/);
        // Fading veil must not steal clicks after dismiss begins.
        assert.match(components, /\.shiro-preloader\.is-loaded[\s\S]*?pointer-events:\s*none/);
        // CSS failsafe end state must also drop hit-testing (parity with .is-loaded).
        assert.match(
            components,
            /@keyframes shiro-preloader-failsafe[\s\S]*?to\s*\{[\s\S]*?pointer-events:\s*none/
        );
        assert.match(components, /shiro-preloader-content-failsafe/);
    });

    it('does not let an invisible copy control steal pointer hits', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '../source/css/_src/code.css'),
            'utf8'
        );
        assert.match(
            source,
            /\.highlight-wrapper > \.copy-btn \{[\s\S]*?pointer-events:\s*none/
        );
        assert.match(
            source,
            /\.highlight-wrapper:hover > \.copy-btn,[\s\S]*?pointer-events:\s*auto/
        );
        assert.match(
            source,
            /@media \(hover:\s*none\) \{[\s\S]*?\.highlight-wrapper > \.copy-btn \{[\s\S]*?pointer-events:\s*auto/
        );
    });

    it('enables the inline TOC toggle before the missing-heading early return', () => {
        const source = clientSource('toc.js');
        const toggleEnable = source.indexOf("toggleBtn.disabled = false");
        const spyGate = source.indexOf('if (!headingArr.length) return;');
        assert.ok(toggleEnable !== -1, 'expected toggle enable');
        assert.ok(spyGate !== -1, 'expected headingArr early return');
        assert.ok(
            toggleEnable < spyGate,
            'toggle must be enabled even when no heading ids match in the DOM'
        );
    });

    it('keeps LightGallery controls readable on its theme-independent dark stage', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '../source/css/_src/lightgallery.css'),
            'utf8'
        );
        const generated = fs.readFileSync(
            path.join(__dirname, '../source/css/lightgallery.min.css'),
            'utf8'
        );
        assert.doesNotMatch(source, /@layer\b/);
        assert.doesNotMatch(generated, /@layer\b/);
        assert.match(source, /\.lg-outer \.lg-toolbar \.lg-icon,/);
        assert.match(source, /\.lg-outer \.lg-next,/);
        assert.match(source, /\.lg-outer \.lg-prev \{/);
        assert.match(source, /\.lg-toolbar \.lg-icon,[\s\S]*?color:\s*#d4d0cc;/);
        assert.match(source, /\.lg-toolbar \.lg-icon:hover,[\s\S]*?color:\s*#e8e5e1;/);
        assert.doesNotMatch(source, /\.lg-toolbar[\s\S]*?var\(--color-text-(?:body|heading)/);
    });

    it('does not let LightGallery hijack images owned by other controls', () => {
        const bootstrap = clientSource('lightgallery-bootstrap.js');
        const components = fs.readFileSync(
            path.join(__dirname, '../source/css/_core/components.css'),
            'utf8'
        );
        assert.match(bootstrap, /!hasConflictingImageAction\(img\)/);
        assert.match(runtimeSource, /function hasConflictingImageAction\(img\)/);
        assert.match(
            components,
            /:where\(button,[\s\S]*?\) img \{[\s\S]*?cursor:\s*inherit;/
        );
    });

    it('falls back to the original image after a retryable gallery load failure', () => {
        const bootstrap = clientSource('lightgallery-bootstrap.js');
        assert.match(
            bootstrap,
            /fallbackPendingClick\(\);\s*console\.warn\('\[shiro-lightgallery\] load failed \(retryable\)'/
        );
    });

    it('advances idle work queues when their timeout expires', () => {
        assert.match(clientSource('clipboard.js'), /deadline\.didTimeout/);
        assert.match(lightgallerySource, /deadline\.didTimeout/);
    });

    it('clamps reading progress during negative elastic scrolling', () => {
        const bar = { style: {} };
        const document = {
            documentElement: { scrollHeight: 1200 },
            getElementById: () => bar
        };
        const window = {
            innerHeight: 600,
            scrollY: -120,
            addEventListener() {}
        };
        vm.runInNewContext(clientSource('progress.js'), {
            window,
            document,
            requestAnimationFrame: (callback) => callback()
        });
        assert.equal(bar.style.transform, 'scaleX(0)');
    });

    it('keeps cycling themes when localStorage is unavailable', () => {
        const listeners = {};
        const attributes = {};
        const resolved = [];
        const button = {
            dataset: { labelLight: 'Light', labelDark: 'Dark' },
            addEventListener(name, callback) {
                listeners[name] = callback;
            },
            setAttribute() {}
        };
        const html = {
            style: {},
            classList: { add() {}, remove() {} },
            getAttribute(name) {
                return attributes[name] || null;
            },
            setAttribute(name, value) {
                attributes[name] = String(value);
            }
        };
        const storage = {
            getItem() {
                throw new Error('blocked');
            },
            setItem() {
                throw new Error('blocked');
            }
        };
        const document = {
            documentElement: html,
            getElementById: () => button
        };
        const window = {
            __shiro: {
                themeDefault: 'light',
                applyResolvedTheme(dark) {
                    resolved.push(dark);
                }
            },
            matchMedia(query) {
                return { matches: query.includes('reduced-motion') };
            }
        };

        vm.runInNewContext(clientSource('theme-toggle.js'), {
            window,
            document,
            localStorage: storage,
            setTimeout
        });
        listeners.click();
        listeners.click();

        assert.equal(attributes['data-theme-state'], 'light');
        assert.deepEqual(resolved, [false, true, false]);
    });

    it('applies the initial theme when the early head helper is unavailable', () => {
        const attributes = {};
        const button = {
            dataset: {
                labelSystem: 'System',
                labelLight: 'Light',
                labelDark: 'Dark'
            },
            addEventListener() {},
            setAttribute() {}
        };
        const html = {
            style: {},
            classList: { add() {}, remove() {} },
            getAttribute(name) {
                return attributes[name] || null;
            },
            setAttribute(name, value) {
                attributes[name] = String(value);
            },
            removeAttribute(name) {
                delete attributes[name];
            }
        };
        const document = {
            documentElement: html,
            getElementById: () => button
        };
        const window = {
            __shiro: {},
            matchMedia(query) {
                return { matches: query.includes('prefers-color-scheme: dark') };
            }
        };

        vm.runInNewContext(clientSource('theme-toggle.js'), {
            window,
            document,
            localStorage: { getItem: () => null },
            setTimeout
        });

        assert.equal(attributes['data-theme-state'], 'system');
        assert.equal(attributes['data-theme'], 'dark');
        assert.equal(html.style.colorScheme, 'dark');
    });

    it('does not steal focus when a pointer click closes the mobile menu', () => {
        const buttonListeners = {};
        const documentListeners = {};
        const attributes = {};
        const focusable = {
            focus() {
                document.activeElement = focusable;
            }
        };
        const panel = {
            dataset: { open: 'false' },
            inert: false,
            querySelector: () => focusable,
            querySelectorAll: () => [focusable],
            contains: (target) => target === focusable
        };
        const button = {
            hidden: false,
            disabled: true,
            addEventListener(name, callback) {
                buttonListeners[name] = callback;
            },
            setAttribute(name, value) {
                attributes[name] = String(value);
            },
            focus() {
                document.activeElement = button;
            },
            contains: (target) => target === button
        };
        const chevron = { style: {} };
        const elements = {
            menuBtn: button,
            mobileMenu: panel,
            menuChevron: chevron
        };
        const document = {
            activeElement: null,
            getElementById: (id) => elements[id] || null,
            addEventListener(name, callback) {
                documentListeners[name] = callback;
            }
        };
        const window = {
            matchMedia: () => ({
                matches: false,
                addEventListener() {}
            })
        };

        vm.runInNewContext(clientSource('mobile-menu.js'), { window, document });
        assert.equal(button.disabled, false);
        buttonListeners.click({ stopPropagation() {} });
        assert.equal(panel.dataset.open, 'true');

        const outsideTarget = {};
        document.activeElement = outsideTarget;
        documentListeners.click({ target: outsideTarget });
        assert.equal(panel.dataset.open, 'false');
        assert.equal(document.activeElement, outsideTarget);
    });

    it('unobserves every clipboard batch coalesced before the feature is ready', () => {
        const blocks = Array.from({ length: 4 }, (_, index) => ({
            index,
            isConnected: true,
            classList: { contains: (name) => name === 'highlight' },
            closest: () => ({}),
            getBoundingClientRect: () => ({ top: 2000 })
        }));
        let cursor = 0;
        let observerCallback = null;
        const unobserved = [];
        const loadCallbacks = [];
        const shiro = {};
        const runtime = {
            get: () => '/js/clipboard.min.js',
            scheduleIdle() {},
            createFeatureLoader: () => ({
                load(callback) {
                    loadCallbacks.push(callback);
                }
            })
        };
        shiro.runtime = runtime;

        class FakeIntersectionObserver {
            constructor(callback) {
                observerCallback = callback;
            }

            observe() {}

            unobserve(target) {
                unobserved.push(target);
            }

            disconnect() {}
        }

        const document = {
            body: {},
            querySelector: () => ({}),
            createTreeWalker: () => ({
                nextNode() {
                    const block = blocks[cursor] || null;
                    cursor += 1;
                    return block;
                }
            })
        };
        const window = {
            __shiro: shiro,
            IntersectionObserver: FakeIntersectionObserver,
            innerHeight: 600
        };

        vm.runInNewContext(clientSource('clipboard-bootstrap.js'), {
            window,
            document,
            IntersectionObserver: FakeIntersectionObserver,
            NodeFilter: {
                SHOW_ELEMENT: 1,
                FILTER_ACCEPT: 1,
                FILTER_SKIP: 3
            },
            console
        });

        observerCallback([{ isIntersecting: true, target: blocks[0] }]);
        observerCallback([{ isIntersecting: true, target: blocks[1] }]);
        shiro.enhanceClipboard = () => {};
        loadCallbacks.forEach(callback => callback());

        assert.equal(unobserved.includes(blocks[0]), true);
        assert.equal(unobserved.includes(blocks[1]), true);
    });
});

describe('client runtime protocol', () => {
    let harness;

    beforeEach(() => {
        harness = createHarness();
    });

    it('exposes get on runtime only (not bag root)', () => {
        const { window, rt } = harness;
        assert.equal(typeof rt.get, 'function');
        assert.equal(window.__shiro.get, undefined);
        window.__shiro.clipboardScript = '/js/clipboard.min.js';
        assert.equal(rt.get('clipboardScript'), '/js/clipboard.min.js');
        assert.equal(rt.get('__clipboardScript'), undefined);
    });

    it('passes the idle deadline through to scheduled tasks', () => {
        const { window, rt } = harness;
        const deadline = { didTimeout: false, timeRemaining: () => 7 };
        let received = null;
        let timeout = 0;
        window.requestIdleCallback = (callback, options) => {
            timeout = options.timeout;
            callback(deadline);
        };

        rt.scheduleIdle((value) => {
            received = value;
        }, { timeout: 321 });

        assert.equal(received, deadline);
        assert.equal(timeout, 321);
    });

    it('dedupes concurrent loadAsset calls for the same selector', async () => {
        const { rt, elements } = harness;
        const a = rt.loadAsset('script', {
            src: '/a.js',
            'data-shiro-bootstrap': 'feat'
        }, 'script[data-shiro-bootstrap="feat"]');
        const b = rt.loadAsset('script', {
            src: '/a.js',
            'data-shiro-bootstrap': 'feat'
        }, 'script[data-shiro-bootstrap="feat"]');
        assert.equal(a, b);
        await a;
        assert.equal(elements.filter((el) => el.tagName === 'SCRIPT').length, 1);
    });

    it('createFeatureLoader waits for featureReady, not mere script load', async () => {
        const { rt, window, elements } = harness;
        let readyFired = false;
        let order = [];

        window.document.head.appendChild = (el) => {
            elements.push(el);
            queueMicrotask(() => {
                order.push('script-exec');
                rt.featureReady('demo');
                order.push('feature-ready');
                if (typeof el.onload === 'function') {
                    el.dataset.shiroLoaded = 'true';
                    el.onload();
                    order.push('onload');
                }
            });
        };

        const feature = rt.createFeatureLoader({
            id: 'demo',
            src: '/demo.js',
            onReady: () => {
                readyFired = true;
                order.push('loader-onReady');
            }
        });

        await new Promise((resolve, reject) => {
            feature.load(() => {
                order.push('load-callback');
                resolve();
            });
            setTimeout(() => reject(new Error('timeout')), 1000);
        });

        assert.equal(readyFired, true);
        assert.ok(order.indexOf('feature-ready') < order.indexOf('loader-onReady')
            || order.indexOf('onload') < order.indexOf('loader-onReady'));
        assert.ok(order.includes('load-callback'));
    });

    it('createFeatureLoader rejects when featureAbort is signaled', async () => {
        const { rt, window, elements } = harness;
        let errorSeen = null;

        window.document.head.appendChild = (el) => {
            elements.push(el);
            queueMicrotask(() => {
                rt.featureAbort('bad', new Error('missing config'));
                if (typeof el.onload === 'function') {
                    el.dataset.shiroLoaded = 'true';
                    el.onload();
                }
            });
        };

        const feature = rt.createFeatureLoader({
            id: 'bad',
            src: '/bad.js',
            onError: (err) => {
                errorSeen = err;
            }
        });

        await new Promise((resolve) => {
            feature.load(() => {
                resolve('unexpected-ready');
            });
            setTimeout(resolve, 50);
        });

        assert.ok(errorSeen);
        assert.match(String(errorSeen.message || errorSeen), /missing config/);
    });

    it('featureReady cannot resurrect an aborted channel', async () => {
        const { rt, window, elements } = harness;
        let errorSeen = null;

        window.document.head.appendChild = (el) => {
            elements.push(el);
            queueMicrotask(() => {
                rt.featureAbort('zombie', new Error('gone'));
                if (typeof el.onload === 'function') {
                    el.dataset.shiroLoaded = 'true';
                    el.onload();
                }
            });
        };

        const feature = rt.createFeatureLoader({
            id: 'zombie',
            src: '/zombie.js',
            onError: (err) => {
                errorSeen = err;
            }
        });

        await new Promise((resolve) => {
            feature.load();
            setTimeout(resolve, 40);
        });
        assert.ok(errorSeen);

        // Late ready must not clear permanent abort.
        rt.featureReady('zombie');

        let secondOk = false;
        await new Promise((resolve) => {
            feature.load(() => {
                secondOk = true;
            });
            setTimeout(resolve, 30);
        });
        assert.equal(secondOk, false);
    });

    it('exports escapeHtml / escapeAttr aligned with server semantics', () => {
        const { rt } = harness;
        assert.equal(rt.escapeHtml('<a "b" \'c\'>'), '&lt;a &quot;b&quot; &#39;c&#39;&gt;');
        assert.equal(rt.escapeAttr('x&y'), 'x&amp;y');
    });

    it('featureAbort is permanent — second load reports immediately', async () => {
        const { rt, window, elements } = harness;
        const errors = [];

        window.document.head.appendChild = (el) => {
            elements.push(el);
            queueMicrotask(() => {
                rt.featureAbort('perm', new Error('no config'));
                if (typeof el.onload === 'function') {
                    el.dataset.shiroLoaded = 'true';
                    el.onload();
                }
            });
        };

        const feature = rt.createFeatureLoader({
            id: 'perm',
            src: '/perm.js',
            onError: (err) => {
                errors.push(err);
            }
        });

        await new Promise((resolve) => {
            feature.load();
            setTimeout(resolve, 50);
        });
        assert.equal(errors.length, 1);

        const t0 = Date.now();
        let secondCallback = false;
        await new Promise((resolve) => {
            feature.load(() => {
                secondCallback = true;
            });
            setTimeout(resolve, 30);
        });
        const elapsed = Date.now() - t0;
        assert.equal(errors.length, 2);
        assert.equal(secondCallback, false, 'onReady callback must not run after permanent fail');
        assert.ok(elapsed < 500, 'second load must not wait for ready timeout');
        assert.match(String(errors[1].message || errors[1]), /no config/);
    });

    it('load() always fulfills so callers need no .catch', async () => {
        const { rt } = harness;
        const feature = rt.createFeatureLoader({
            id: 'nosrc',
            src: '',
            onError: () => {}
        });
        let rejected = false;
        await feature.load().catch(() => {
            rejected = true;
        });
        assert.equal(rejected, false);
    });

    it('isModifiedClick and safeNavigate allowlists navigation schemes', () => {
        const { rt, window } = harness;
        assert.equal(rt.isModifiedClick({ button: 0 }), false);
        assert.equal(rt.isModifiedClick({ button: 0, metaKey: true }), true);
        assert.equal(rt.isModifiedClick({ button: 1 }), true);

        let openCall = null;
        const fakeWin = { opener: { sentinel: true }, closed: false };
        window.open = (url, target, features) => {
            openCall = { url, target, features };
            // Real successful open (without noopener features) returns a Window.
            return fakeWin;
        };
        window.location.href = '';

        rt.safeNavigate('javascript:alert(1)');
        assert.equal(window.location.href, '');
        assert.equal(openCall, null);

        ['file:///tmp/image.png', 'ftp://example.com/image.png', 'custom:payload'].forEach((url) => {
            openCall = null;
            rt.safeNavigate(url);
            assert.equal(window.location.href, '');
            assert.equal(openCall, null);
        });

        openCall = null;
        fakeWin.opener = { sentinel: true };
        rt.safeNavigate('https://example.com/x');
        assert.equal(openCall && openCall.url, 'https://example.com/x');
        assert.equal(openCall && openCall.target, '_blank');
        // noopener-in-features makes browsers return null even on success — never use it.
        assert.ok(
            openCall.features == null
            || openCall.features === ''
            || !/noopener/i.test(String(openCall.features)),
            'must not pass noopener window features'
        );
        assert.equal(fakeWin.opener, null, 'must sever opener after a real Window is returned');
        assert.equal(window.location.href, '', 'successful window.open must not same-tab navigate');

        rt.safeNavigate('/local/path');
        assert.equal(window.location.href, '/local/path');

        rt.safeNavigate('mailto:hello@example.com');
        assert.equal(window.location.href, 'mailto:hello@example.com');

        rt.safeNavigate('blob:https://example.com/id');
        assert.equal(window.location.href, 'blob:https://example.com/id');
    });

    it('falls back to same-tab navigation only when window.open is truly blocked', () => {
        const { rt, window } = harness;
        // Genuine popup block returns null — not the historical noopener-success null.
        window.open = () => null;
        window.location.href = '';

        rt.safeNavigate('https://cdn.example/img.png');
        assert.equal(window.location.href, 'https://cdn.example/img.png');

        window.location.href = '';
        rt.safeNavigate('//cdn.example/proto.png');
        assert.equal(window.location.href, 'https://cdn.example/proto.png');
    });

    it('opens absolute urls without noopener features so success is not null', () => {
        // Modern browsers return null from window.open(..., 'noopener') even on
        // success — treating null as "blocked" would always same-tab navigate.
        assert.match(runtimeSource, /window\.open\(\s*absolute\s*,\s*['"]_blank['"]\s*\)/);
        assert.doesNotMatch(
            runtimeSource,
            /window\.open\([^;]*noopener/i,
            'safeNavigate must not pass noopener window features'
        );
        assert.match(runtimeSource, /opened\.opener\s*=\s*null/);
    });

    it('resolves imageSource from srcset when src is absent', () => {
        const { rt } = harness;
        const srcsetOnly = {
            getAttribute(name) {
                if (name === 'srcset') return '/small.png 640w, /large.png 1280w';
                return '';
            },
            currentSrc: ''
        };
        assert.equal(rt.imageSource(srcsetOnly), '/small.png');

        const withCurrent = {
            getAttribute(name) {
                if (name === 'srcset') return '/small.png 640w, /large.png 1280w';
                return '';
            },
            currentSrc: 'https://cdn.example/large.png'
        };
        assert.equal(rt.imageSource(withCurrent), 'https://cdn.example/large.png');

        const withSrc = {
            getAttribute(name) {
                if (name === 'src') return '/hero.png';
                if (name === 'srcset') return '/small.png 640w';
                return '';
            },
            currentSrc: ''
        };
        assert.equal(rt.imageSource(withSrc), '/hero.png');
    });

    it('identifies non-link controls that already own an image action', () => {
        const { rt } = harness;
        let selector = '';
        const control = {};
        const controlledImage = {
            closest(value) {
                selector = value;
                return control;
            }
        };
        assert.equal(rt.hasConflictingImageAction(controlledImage), true);
        assert.match(selector, /button/);
        assert.match(selector, /\[role="button"\]/);

        const plainImage = { closest: () => null };
        assert.equal(rt.hasConflictingImageAction(plainImage), false);
        assert.equal(rt.hasConflictingImageAction(null), false);
    });

    it('navigateFromImage prefers original href then src', () => {
        const { rt } = harness;
        const img = {
            closest(sel) {
                if (sel !== 'a') return null;
                return {
                    getAttribute(name) {
                        if (name === 'data-shiro-original-href') return 'https://example.com/page';
                        if (name === 'href') return '/img.png';
                        return null;
                    }
                };
            },
            getAttribute(name) {
                if (name === 'src') return '/img.png';
                return '';
            },
            currentSrc: ''
        };
        assert.equal(rt.imageNavigationHref(img), 'https://example.com/page');

        const bare = {
            closest() {
                return null;
            },
            getAttribute(name) {
                return name === 'src' ? '/only.png' : '';
            },
            currentSrc: ''
        };
        assert.equal(rt.imageNavigationHref(bare), '/only.png');
    });
});

describe('dispatchLiveOrStash / dispatchLiveOrWarm (LG handoff single source)', () => {
    let rt;

    beforeEach(() => {
        rt = createHarness().rt;
    });

    it('uses live open when feature already installed', () => {
        const opened = [];
        const loads = [];
        const path = rt.dispatchLiveOrStash({
            failed: false,
            live: (t) => {
                opened.push(t);
            },
            target: 'img2',
            stash: () => {},
            load: () => {
                loads.push(1);
            },
            navigate: () => {}
        });
        assert.equal(path, 'live');
        assert.deepEqual(opened, ['img2']);
        assert.equal(loads.length, 0);
    });

    it('navigates when live open returns false (aligns with stash drain)', () => {
        const nav = [];
        const loads = [];
        const path = rt.dispatchLiveOrStash({
            failed: false,
            live: () => false,
            target: 'img-refused',
            stash: () => {},
            load: () => {
                loads.push(1);
            },
            navigate: (t) => {
                nav.push(t);
            }
        });
        assert.equal(path, 'navigate');
        assert.deepEqual(nav, ['img-refused']);
        assert.equal(loads.length, 0);
    });

    it('treats live returning undefined/true as success (no navigate)', () => {
        const nav = [];
        assert.equal(rt.dispatchLiveOrStash({
            live: () => undefined,
            target: 'a',
            navigate: (t) => {
                nav.push(t);
            }
        }), 'live');
        assert.equal(rt.dispatchLiveOrStash({
            live: () => true,
            target: 'b',
            navigate: (t) => {
                nav.push(t);
            }
        }), 'live');
        assert.equal(nav.length, 0);
    });

    it('stashes autoOpen while feature is still loading', () => {
        const loads = [];
        let stashed = null;
        const path = rt.dispatchLiveOrStash({
            failed: false,
            live: undefined,
            target: 'img1',
            stash: (img) => {
                stashed = img;
            },
            load: () => {
                loads.push(1);
            },
            navigate: () => {}
        });
        assert.equal(path, 'stash');
        assert.equal(stashed, 'img1');
        assert.equal(loads.length, 1);
    });

    it('last-click stash wins when caller overwrites autoOpen', () => {
        // Mirrors lightgallery-bootstrap: always set autoOpen (last wins).
        const bag = { lightGalleryAutoOpen: null };
        const stashLast = (img) => {
            bag.lightGalleryAutoOpen = img;
        };
        rt.dispatchLiveOrStash({
            target: 'first',
            stash: stashLast,
            load: () => {}
        });
        rt.dispatchLiveOrStash({
            target: 'second',
            stash: stashLast,
            load: () => {}
        });
        assert.equal(bag.lightGalleryAutoOpen, 'second');
    });

    it('navigates when failed', () => {
        const nav = [];
        const path = rt.dispatchLiveOrStash({
            failed: true,
            target: 'img',
            live: () => {},
            stash: () => {},
            load: () => {},
            navigate: (t) => {
                nav.push(t);
            }
        });
        assert.equal(path, 'navigate');
        assert.deepEqual(nav, ['img']);
    });

    it('uses live warm when feature already installed', () => {
        const warms = [];
        const loads = [];
        const path = rt.dispatchLiveOrWarm({
            failed: false,
            done: false,
            live: () => {
                warms.push(1);
            },
            markPending: () => {},
            load: () => {
                loads.push(1);
            }
        });
        assert.equal(path, 'live');
        assert.equal(warms.length, 1);
        assert.equal(loads.length, 0);
    });

    it('skips warm when already done or failed', () => {
        assert.equal(rt.dispatchLiveOrWarm({
            failed: true,
            done: false,
            live: () => {},
            load: () => {}
        }), 'skip');
        assert.equal(rt.dispatchLiveOrWarm({
            failed: false,
            done: true,
            live: () => {},
            load: () => {}
        }), 'skip');
    });
});

describe('comments-bootstrap.js contract', () => {
    const commentsBootstrapSource = fs.readFileSync(
        path.join(__dirname, '../source/js/_src/comments-bootstrap.js'),
        'utf8'
    );

    it('installs runtime.comments without a redundant bag queue', () => {
        const harness = createHarness();
        const { window, rt } = harness;
        const calls = [];
        const shiro = window.__shiro;
        shiro.commentsCss = '';

        vm.runInNewContext(commentsBootstrapSource, {
            window,
            document: window.document,
            console
        });

        assert.ok(rt.comments);
        assert.equal(rt.comments.failed, false);
        rt.comments.whenReady(() => calls.push('c'));
        assert.equal(calls.join(','), 'c');
        assert.equal('commentsReadyQueue' in shiro, false);
        assert.equal('whenCommentsReady' in shiro, false);
    });

    it('aborts cleanly when runtime is missing', () => {
        const window = { __shiro: {} };
        window.window = window;

        vm.runInNewContext(commentsBootstrapSource, {
            window,
            document: {},
            console: { error() {}, warn() {} }
        });

        assert.equal('commentsReadyQueue' in window.__shiro, false);
        assert.equal('whenCommentsReady' in window.__shiro, false);
    });
});

describe('createFeatureLoader permanent vs retryable errors', () => {
    let harness;

    beforeEach(() => {
        harness = createHarness();
    });

    it('reports permanent:true for featureAbort and permanent:false for network-style failure', async () => {
        const { rt, window, elements } = harness;
        const metas = [];

        window.document.head.appendChild = (el) => {
            elements.push(el);
            queueMicrotask(() => {
                // Simulate network failure: error without featureReady/Abort.
                if (typeof el.onerror === 'function') {
                    el.dataset.shiroError = 'true';
                    el.onerror(new Error('network'));
                }
            });
        };

        const feature = rt.createFeatureLoader({
            id: 'net',
            src: '/net.js',
            onError: (err, meta) => {
                metas.push(meta || {});
            }
        });

        await new Promise((resolve) => {
            feature.load();
            setTimeout(resolve, 40);
        });
        assert.equal(metas.length, 1);
        assert.equal(metas[0].permanent, false);

        // Permanent abort path
        window.document.head.appendChild = (el) => {
            elements.push(el);
            queueMicrotask(() => {
                rt.featureAbort('perm2', new Error('nope'));
                if (typeof el.onload === 'function') {
                    el.dataset.shiroLoaded = 'true';
                    el.onload();
                }
            });
        };
        const feature2 = rt.createFeatureLoader({
            id: 'perm2',
            src: '/perm2.js',
            onError: (err, meta) => {
                metas.push(meta || {});
            }
        });
        await new Promise((resolve) => {
            feature2.load();
            setTimeout(resolve, 40);
        });
        assert.equal(metas[metas.length - 1].permanent, true);
    });
});
