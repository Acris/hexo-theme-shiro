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
    isFeatureEnabled,
    normalizeLangAttr,
    resolveAbsolutePageUrl,
    sriAttrsHtml,
    cspNonceAttrHtml,
    normalizeSriIntegrity,
    normalizeCspNonce
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

    describe('normalizedLinkTarget', () => {
        it('allowlists standard targets only', () => {
            assert.equal(normalizedLinkTarget('_blank'), '_blank');
            assert.equal(normalizedLinkTarget(' _blank '), '_blank');
            assert.equal(normalizedLinkTarget('_self'), '_self');
            assert.equal(normalizedLinkTarget('_parent'), '_parent');
            assert.equal(normalizedLinkTarget('_top'), '_top');
            assert.equal(normalizedLinkTarget('" onclick="alert(1)'), '');
            assert.equal(normalizedLinkTarget('javascript:x'), '');
            assert.equal(normalizedLinkTarget('x\u0000'), '');
            assert.equal(normalizedLinkTarget(''), '');
        });
    });

    describe('isFeatureEnabled / normalizeLangAttr', () => {
        it('uses strict true for default-off and not-false for default-on', () => {
            assert.equal(isFeatureEnabled(true, false), true);
            assert.equal(isFeatureEnabled(1, false), false);
            assert.equal(isFeatureEnabled(undefined, true), true);
            assert.equal(isFeatureEnabled(false, true), false);
        });

        it('accepts BCP47-like language tags only', () => {
            assert.equal(normalizeLangAttr('zh-CN'), 'zh-CN');
            assert.equal(normalizeLangAttr('en'), 'en');
            assert.equal(normalizeLangAttr('bad tag'), '');
            assert.equal(normalizeLangAttr('en"onmouseover=x'), '');
        });
    });

    describe('sriAttrsHtml / cspNonceAttrHtml', () => {
        it('emits integrity+crossorigin only for valid SRI digests', () => {
            const ok = 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC';
            assert.equal(normalizeSriIntegrity(ok), ok);
            assert.equal(
                sriAttrsHtml(ok),
                ' integrity="' + ok + '" crossorigin="anonymous"'
            );
            assert.equal(sriAttrsHtml(''), '');
            assert.equal(sriAttrsHtml('md5-notvalid'), '');
            assert.equal(sriAttrsHtml('sha256-abc def'), '');
            const warns = [];
            assert.equal(sriAttrsHtml('md5-notvalid', { warn: (m) => warns.push(m) }), '');
            assert.equal(warns.length, 1);
            assert.match(warns[0], /invalid SRI/);
        });

        it('emits nonce only for safe non-empty values', () => {
            assert.equal(normalizeCspNonce('abc123XYZ'), 'abc123XYZ');
            assert.equal(normalizeCspNonce('  token  '), 'token');
            assert.equal(normalizeCspNonce('bad quote"'), '');
            assert.equal(cspNonceAttrHtml('abc123XYZ'), ' nonce="abc123XYZ"');
            assert.equal(cspNonceAttrHtml('  token  '), ' nonce="token"');
            assert.equal(cspNonceAttrHtml(''), '');
            assert.equal(cspNonceAttrHtml('bad quote"'), '');
            assert.equal(cspNonceAttrHtml('has space'), '');
        });
    });
});
