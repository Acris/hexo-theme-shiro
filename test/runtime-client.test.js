'use strict';

// Lightweight DOM + window mock to exercise client runtime protocol without a browser.
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Runtime is split under source/js/_src/runtime/*.js (explicit RUNTIME_PARTS order).
const {
    RUNTIME_PARTS,
    concatRuntimeSource,
    listRuntimeParts,
    assertRuntimeSource
} = require('../scripts/lib/runtime-source');
const runtimeSource = concatRuntimeSource();

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

    return { window, document, elements, rt: window.__shiroRuntime };
}

describe('runtime build contract', () => {
    it('manifest matches disk and concat is a single IIFE with required APIs', () => {
        const paths = listRuntimeParts();
        assert.equal(paths.length, RUNTIME_PARTS.length);
        paths.forEach((filePath, index) => {
            assert.ok(filePath.endsWith(RUNTIME_PARTS[index]));
        });
        assert.doesNotThrow(() => assertRuntimeSource(runtimeSource, paths));
        assert.match(runtimeSource, /;\(\(\)\s*=>\s*\{/);
        assert.match(runtimeSource, /\}\)\(\);\s*$/);
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
        assert.equal(rt.get('__clipboardScript'), '/js/clipboard.min.js');
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

    it('isModifiedClick and safeNavigate block dangerous schemes', () => {
        const { rt, window } = harness;
        assert.equal(rt.isModifiedClick({ button: 0 }), false);
        assert.equal(rt.isModifiedClick({ button: 0, metaKey: true }), true);
        assert.equal(rt.isModifiedClick({ button: 1 }), true);

        let opened = null;
        window.open = (url) => {
            opened = url;
        };
        window.location.href = '';

        rt.safeNavigate('javascript:alert(1)');
        assert.equal(window.location.href, '');
        assert.equal(opened, null);

        rt.safeNavigate('https://example.com/x');
        assert.equal(opened, 'https://example.com/x');

        rt.safeNavigate('/local/path');
        assert.equal(window.location.href, '/local/path');
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

describe('comments ready queue contract', () => {
    it('drains parse-time queue when whenCommentsReady is replaced', () => {
        const calls = [];
        const shiro = {
            commentsReadyQueue: [
                () => calls.push('a'),
                () => calls.push('b')
            ],
            whenCommentsReady: (fn) => {
                shiro.commentsReadyQueue.push(fn);
            }
        };

        function runCommentBoot(callback) {
            if (typeof callback === 'function') callback();
        }
        shiro.whenCommentsReady = (callback) => {
            runCommentBoot(callback);
        };
        const queued = Array.isArray(shiro.commentsReadyQueue)
            ? shiro.commentsReadyQueue.slice()
            : [];
        shiro.commentsReadyQueue = [];
        queued.forEach(runCommentBoot);
        shiro.whenCommentsReady(() => calls.push('c'));

        assert.deepEqual(calls, ['a', 'b', 'c']);
    });
});
