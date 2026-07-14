'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    resolveDarkModeDefault,
    resolveFeatureGates,
    buildCommentsClientConfig,
    DEFAULT_MATHJAX_SRC,
    DEFAULT_LIGHTGALLERY_JS,
    DEFAULT_GISCUS_SRC
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
            hasCodeBlocks: true,
            hasClipboardTargets: true,
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
            assert.equal(g.needsCodeFont, true);
            assert.equal(g.needsCode, true);
            assert.equal(g.needsClipboard, true);
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
            assert.equal(Object.hasOwn(g, 'mathjaxOpts'), false);
            assert.deepEqual(g.footScripts, [
                'js/runtime.min.js',
                'js/search-bootstrap.min.js',
                'js/lightgallery-bootstrap.min.js',
                'js/clipboard-bootstrap.min.js',
                'js/toc.min.js',
                'js/progress.min.js',
                'js/back-to-top.min.js',
                'js/theme-toggle.min.js',
                'js/mobile-menu.min.js'
            ]);
        });

        it('keeps the code font without loading block-code assets for inline code', () => {
            const g = resolveFeatureGates({
                ...base,
                theme: {
                    ...base.theme,
                    search: { enabled: false },
                    lightGallery: { enabled: false },
                    comments: { enabled: false },
                    menu: []
                },
                hasCode: true,
                hasCodeBlocks: false,
                hasClipboardTargets: false,
                hasImages: false,
                menuLength: 0
            });

            assert.equal(g.needsCodeFont, true);
            assert.equal(g.needsCode, false);
            assert.equal(g.needsClipboard, false);
            assert.equal(g.footScripts.includes('js/runtime.min.js'), false);
            assert.equal(g.footScripts.includes('js/clipboard-bootstrap.min.js'), false);
        });

        it('styles standalone pre blocks without loading clipboard assets', () => {
            const g = resolveFeatureGates({
                ...base,
                theme: {
                    ...base.theme,
                    search: { enabled: false },
                    lightGallery: { enabled: false },
                    comments: { enabled: false },
                    menu: []
                },
                hasCode: true,
                hasCodeBlocks: true,
                hasClipboardTargets: false,
                hasImages: false,
                menuLength: 0
            });

            assert.equal(g.needsCode, true);
            assert.equal(g.needsClipboard, false);
            assert.equal(g.footScripts.includes('js/runtime.min.js'), false);
            assert.equal(g.footScripts.includes('js/clipboard-bootstrap.min.js'), false);
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

        it('warns and drops invalid SRI digests for MathJax and LightGallery', () => {
            const warnings = [];
            const valid = 'sha256-' + Buffer.alloc(32, 1).toString('base64');
            const g = resolveFeatureGates({
                ...base,
                theme: {
                    ...base.theme,
                    mathjax: {
                        enabled: true,
                        every_page: true,
                        integrity: 'not-a-real-digest'
                    },
                    lightGallery: {
                        enabled: true,
                        js_integrity: 'sha256-abc',
                        css_integrity: valid
                    }
                },
                warn: (msg) => warnings.push(msg)
            });
            assert.equal(g.mathjaxIntegrity, '');
            assert.equal(g.lightgalleryJsIntegrity, '');
            assert.equal(g.lightgalleryCssIntegrity, valid);
            assert.equal(warnings.length, 2);
            assert.match(warnings[0], /mathjax/);
            assert.match(warnings[1], /lightGallery\.js/);
        });

        it('gates analytics and RSS only when explicitly enabled', () => {
            const off = resolveFeatureGates(base);
            assert.equal(off.needsGoogleAnalytics, false);
            assert.equal(off.needsRss, false);

            const on = resolveFeatureGates({
                ...base,
                theme: {
                    ...base.theme,
                    site: {
                        ...base.theme.site,
                        rss: { enabled: true, path: '/feed.xml' }
                    },
                    analytics: {
                        google: { enabled: true, id: 'G-TEST123' }
                    }
                }
            });
            assert.equal(on.needsGoogleAnalytics, true);
            assert.equal(on.googleAnalyticsId, 'G-TEST123');
            assert.equal(on.needsRss, true);
            assert.equal(on.rssPath, '/feed.xml');
        });

        it('needsToc follows shouldRenderToc input (single policy with build_toc)', () => {
            const noToc = resolveFeatureGates({ ...base, shouldRenderToc: false });
            assert.equal(noToc.needsToc, false);
            const yesToc = resolveFeatureGates({ ...base, shouldRenderToc: true });
            assert.equal(yesToc.needsToc, true);
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

        it('normalizes giscus src and rejects dangerous schemes', () => {
            const ok = buildCommentsClientConfig(
                {
                    comments: {
                        enabled: true,
                        provider: 'giscus',
                        giscus: {
                            src: '',
                            repo: 'a/b',
                            repo_id: '1',
                            category: 'c',
                            category_id: '2'
                        }
                    }
                },
                {},
                { isPost: true }
            );
            assert.equal(ok.giscus.src, DEFAULT_GISCUS_SRC);

            const bad = buildCommentsClientConfig(
                {
                    comments: {
                        enabled: true,
                        provider: 'giscus',
                        giscus: {
                            src: 'javascript:alert(1)',
                            repo: 'a/b',
                            repo_id: '1',
                            category: 'c',
                            category_id: '2'
                        }
                    }
                },
                {},
                { isPost: true }
            );
            assert.equal(bad.giscus.src, DEFAULT_GISCUS_SRC);
        });

        it('trims giscus identifiers before serializing client config', () => {
            const cfg = buildCommentsClientConfig(
                {
                    comments: {
                        enabled: true,
                        provider: 'giscus',
                        giscus: {
                            repo: ' owner/repo ',
                            repo_id: ' R_1 ',
                            category: ' General ',
                            category_id: ' DIC_1 ',
                            theme: ' preferred_color_scheme ',
                            lang: ' zh-CN '
                        }
                    }
                },
                {},
                { isPost: true }
            );
            assert.equal(cfg.giscus.repo, 'owner/repo');
            assert.equal(cfg.giscus.repo_id, 'R_1');
            assert.equal(cfg.giscus.category, 'General');
            assert.equal(cfg.giscus.category_id, 'DIC_1');
            assert.equal(cfg.giscus.theme, 'preferred_color_scheme');
            assert.equal(cfg.giscus.lang, 'zh-CN');
        });

        it('reuses pre-resolved state when provided', () => {
            const state = {
                provider: 'disqus',
                disqusReady: true,
                giscusReady: false
            };
            const cfg = buildCommentsClientConfig(
                { comments: { enabled: true, provider: 'giscus' } },
                {},
                { isPost: true, state }
            );
            assert.equal(cfg.provider, 'disqus');
            assert.equal(cfg.disqusReady, true);
        });
    });
});
