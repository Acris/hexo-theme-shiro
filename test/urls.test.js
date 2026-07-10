'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    safeNavigationUrl,
    safeResourceUrl,
    safeScriptJson,
    resourceOrigin,
    hasUrlControlChars,
    normalizedLinkTarget,
    resolveAbsolutePageUrl
} = require('../scripts/lib/urls');

function ctx(map) {
    return {
        url_for(path) {
            if (map && Object.prototype.hasOwnProperty.call(map, path)) return map[path];
            return '/' + String(path || '').replace(/^\//, '');
        }
    };
}

describe('scripts/lib/urls', () => {
    describe('safeNavigationUrl', () => {
        it('blocks javascript: and other dangerous schemes', () => {
            assert.equal(safeNavigationUrl('javascript:alert(1)', ctx(), '/'), '/');
            assert.equal(safeNavigationUrl('data:text/html,hi', ctx(), '/'), '/');
            assert.equal(safeNavigationUrl('vbscript:msg', ctx(), '/home'), '/home');
        });

        it('allows http(s), protocol-relative, mailto, tel, and fragments', () => {
            assert.equal(safeNavigationUrl('https://example.com/a', ctx()), 'https://example.com/a');
            assert.equal(safeNavigationUrl('//cdn.example/x', ctx()), '//cdn.example/x');
            assert.equal(safeNavigationUrl('mailto:a@b.c', ctx()), 'mailto:a@b.c');
            assert.equal(safeNavigationUrl('tel:+123', ctx()), 'tel:+123');
            assert.equal(safeNavigationUrl('#section', ctx()), '#section');
        });

        it('resolves relative paths via url_for', () => {
            assert.equal(safeNavigationUrl('/about', ctx()), '/about');
            assert.equal(safeNavigationUrl('posts/hi', ctx({ 'posts/hi': '/blog/posts/hi/' })), '/blog/posts/hi/');
        });

        it('rejects control characters and falls back', () => {
            assert.equal(safeNavigationUrl('https://ex.com/\u0000evil', ctx(), '/'), '/');
            assert.equal(hasUrlControlChars('a\nb'), true);
        });

        it('defaults fallback to # when neither value nor fallback resolve', () => {
            assert.equal(safeNavigationUrl('javascript:x', { url_for: () => '' }, 'javascript:y'), '#');
        });
    });

    describe('safeResourceUrl', () => {
        it('blocks non-http schemes unless allowDataImage is set', () => {
            assert.equal(safeResourceUrl('javascript:x', ctx(), '/favicon.svg'), '/favicon.svg');
            assert.equal(
                safeResourceUrl('data:image/png;base64,abc', ctx(), '/f.svg', true),
                'data:image/png;base64,abc'
            );
            assert.equal(
                safeResourceUrl('data:text/html,x', ctx(), '/f.svg', true),
                '/f.svg'
            );
        });

        it('allows remote CDN urls', () => {
            const cdn = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js';
            assert.equal(safeResourceUrl(cdn, ctx(), ''), cdn);
        });
    });

    describe('safeScriptJson', () => {
        it('escapes HTML-sensitive characters for inline script embedding', () => {
            const json = safeScriptJson({ a: '</script><script>alert(1)' });
            assert.equal(json.includes('</'), false);
            assert.match(json, /\\u003C/);
            assert.deepEqual(JSON.parse(json.replace(/\\u003C/g, '<').replace(/\\u003E/g, '>').replace(/\\u0026/g, '&')), {
                a: '</script><script>alert(1)'
            });
        });
    });

    describe('resourceOrigin', () => {
        it('returns origin for absolute http(s) urls', () => {
            assert.equal(resourceOrigin('https://cdn.example.com/path/a.js'), 'https://cdn.example.com');
            assert.equal(resourceOrigin('//cdn.example.com/a.js'), 'https://cdn.example.com');
            assert.equal(resourceOrigin('/local.js'), '');
        });
    });

    describe('normalizedLinkTarget', () => {
        it('trims and rejects control characters', () => {
            assert.equal(normalizedLinkTarget(' _blank '), '_blank');
            assert.equal(normalizedLinkTarget('x\u0000'), '');
        });
    });

    describe('resolveAbsolutePageUrl', () => {
        it('prefers an absolute permalink', () => {
            assert.equal(
                resolveAbsolutePageUrl({}, { permalink: 'https://example.com/p/' }, 'https://other.com'),
                'https://example.com/p/'
            );
        });

        it('uses full_url_for(page.path) when permalink is relative or missing', () => {
            const context = {
                full_url_for: (path) => 'https://example.com/' + String(path).replace(/^\//, ''),
                config: { url: 'https://example.com' }
            };
            assert.equal(
                resolveAbsolutePageUrl(context, { path: 'posts/hi/' }, 'https://example.com'),
                'https://example.com/posts/hi/'
            );
        });

        it('uses absolute context.url when available', () => {
            assert.equal(
                resolveAbsolutePageUrl(
                    { url: 'https://example.com/now/' },
                    { path: '' },
                    'https://example.com'
                ),
                'https://example.com/now/'
            );
        });

        it('falls back to site base via absoluteUrlForLocalPath', () => {
            const context = {
                url_for: (v) => '/' + String(v).replace(/^\//, ''),
                config: { url: 'https://example.com' }
            };
            assert.equal(
                resolveAbsolutePageUrl(context, { path: 'about/index.html' }, 'https://example.com'),
                'https://example.com/about/index.html'
            );
        });

        it('returns site base when page is empty', () => {
            assert.equal(
                resolveAbsolutePageUrl({}, null, 'https://example.com/'),
                'https://example.com'
            );
        });
    });
});
