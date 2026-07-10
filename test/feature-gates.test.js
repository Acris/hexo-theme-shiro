'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    resolveDarkModeDefault,
    resolveFeatureGates,
    buildCommentsClientConfig,
    DEFAULT_MATHJAX_SRC,
    DEFAULT_LIGHTGALLERY_JS
} = require('../scripts/lib/feature-gates');

describe('scripts/lib/feature-gates', () => {
    describe('resolveDarkModeDefault', () => {
        it('allows system and dark; otherwise light', () => {
            assert.equal(resolveDarkModeDefault('system'), 'system');
            assert.equal(resolveDarkModeDefault('dark'), 'dark');
            assert.equal(resolveDarkModeDefault('light'), 'light');
            assert.equal(resolveDarkModeDefault('nope'), 'light');
        });
    });

    describe('resolveFeatureGates', () => {
        const base = {
            theme: {
                site: { seal: true, favicon: '/f.svg' },
                search: { enabled: true },
                toc: { enabled: true },
                lightGallery: { enabled: true },
                progress_bar: { enabled: true },
                back_to_top: { enabled: true },
                dark_mode: { default: 'system', toggle: true },
                mathjax: { enabled: true, every_page: true },
                comments: {
                    enabled: true,
                    provider: 'disqus',
                    disqus: { shortname: 'blog' }
                },
                menu: [{ name: 'Home', url: '/' }],
                security: { csp_nonce: 'abc' }
            },
            page: {},
            config: { language: 'en' },
            isPost: true,
            isPage: false,
            isHome: false,
            hasCode: true,
            hasImages: true,
            looksLong: true,
            shouldRenderToc: true,
            menuLength: 1,
            resolveResourceUrl: (value, fallback) => value || fallback,
            cspNonce: 'abc'
        };

        it('enables post features and comments when configured', () => {
            const g = resolveFeatureGates(base);
            assert.equal(g.searchEnabled, true);
            assert.equal(g.needsCode, true);
            assert.equal(g.needsToc, true);
            assert.equal(g.needsMathjax, true);
            assert.equal(g.mathjaxSrc, DEFAULT_MATHJAX_SRC);
            assert.equal(g.needsLightgallery, true);
            assert.equal(g.lightgalleryJsUrl, DEFAULT_LIGHTGALLERY_JS);
            assert.equal(g.needsProgressBar, true);
            assert.equal(g.needsBackToTop, true);
            assert.equal(g.needsMobileMenu, true);
            assert.equal(g.needsComments, true);
            assert.equal(g.needsRuntimeFoot, true);
            assert.equal(g.shiroCspNonce, 'abc');
            assert.equal(g.pageLang, 'en');
        });

        it('keeps pages comment-free unless front-matter opts in', () => {
            const g = resolveFeatureGates({
                ...base,
                isPost: false,
                isPage: true,
                page: {}
            });
            assert.equal(g.needsComments, false);

            const opted = resolveFeatureGates({
                ...base,
                isPost: false,
                isPage: true,
                page: { comments: true }
            });
            assert.equal(opted.needsComments, true);
        });

        it('skips lightgallery when no images', () => {
            const g = resolveFeatureGates({ ...base, hasImages: false });
            assert.equal(g.needsLightgallery, false);
            assert.equal(g.lightgalleryJsUrl, '');
        });
    });

    describe('buildCommentsClientConfig', () => {
        it('serializes disqus fields for the client', () => {
            const cfg = buildCommentsClientConfig(
                {
                    comments: {
                        enabled: true,
                        provider: 'disqus',
                        disqus: { shortname: 'my-blog' }
                    }
                },
                {},
                {
                    isPost: true,
                    pageUrl: 'https://example.com/p/',
                    pageIdentifier: 'p/index.html'
                }
            );
            assert.equal(cfg.disqusReady, true);
            assert.equal(cfg.disqus.shortname, 'my-blog');
            assert.equal(cfg.disqus.pageUrl, 'https://example.com/p/');
            assert.equal(cfg.disqus.pageIdentifier, 'p/index.html');
        });
    });
});
