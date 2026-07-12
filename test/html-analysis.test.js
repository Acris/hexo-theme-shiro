'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    hasCodeContent,
    pageHasCode,
    pageLooksLong,
    excerptFor,
    excerptForCard,
    pageAnalysis,
    firstImageInfo,
    htmlTextFromHtml
} = require('../scripts/lib/html-analysis');

describe('scripts/lib/html-analysis', () => {
    describe('hasCodeContent / pageHasCode', () => {
        it('detects pre, code, highlight, and gist', () => {
            assert.equal(hasCodeContent('<pre>x</pre>'), true);
            assert.equal(hasCodeContent('<code>x</code>'), true);
            assert.equal(hasCodeContent('<figure class="highlight js">x</figure>'), true);
            assert.equal(hasCodeContent('<div class="gist">x</div>'), true);
            assert.equal(hasCodeContent('<p>plain</p>'), false);
        });

        it('pageHasCode uses analysis for reading pages', () => {
            const page = { content: '<pre>code</pre>' };
            assert.equal(pageHasCode(page, {}, { is_post: () => true }), true);
            assert.equal(pageHasCode({ content: '<p>hi</p>' }, {}, { is_post: () => true }), false);
        });

        it('checks rendered excerpts on home, tag, and category post lists', () => {
            const page = {
                posts: [{ excerpt: '<pre>code</pre>', content: '<p>full</p>' }]
            };
            const contexts = [
                { is_home: () => true },
                { is_tag: () => true },
                { is_category: () => true }
            ];
            contexts.forEach((context) => {
                assert.equal(pageHasCode(page, {}, context), true);
            });
        });

        it('does not inspect post bodies for archive-only lists', () => {
            const page = {
                posts: [{ excerpt: '<pre>code</pre>', content: '<pre>full code</pre>' }]
            };
            assert.equal(pageHasCode(page, {}, { is_archive: () => true }), false);
        });

        it('ignores code-like markup in opaque fallback containers', () => {
            const content = '<noscript><figure class="highlight">fallback</figure></noscript>'
                + '<iframe><code>frame fallback</code></iframe>';
            assert.equal(hasCodeContent(content), false);
        });
    });

    describe('firstImageInfo / pageAnalysis', () => {
        it('finds first usable image with dimensions', () => {
            const info = firstImageInfo('<p><img src="/a.png" width="100" height="50"></p>');
            assert.equal(info.src, '/a.png');
            assert.equal(info.width, 100);
            assert.equal(info.height, 50);
        });

        it('handles greater-than signs inside quoted image attributes', () => {
            const info = firstImageInfo('<img title="a > b" src="/quoted.png" width="64" height="32">');
            assert.deepEqual(info, {
                src: '/quoted.png',
                width: 64,
                height: 32
            });
        });

        it('does not leak quoted tag attributes into extracted text', () => {
            assert.equal(
                htmlTextFromHtml('<p title="not > text">Visible text</p>', 200),
                'Visible text'
            );
        });

        it('caches analysis per page object', () => {
            const page = { content: '<h2>A</h2><img src="/x.png">' };
            const a = pageAnalysis(page);
            const b = pageAnalysis(page);
            assert.equal(a, b);
            assert.equal(a.imageCount, 1);
        });

        it('ignores fallback images when selecting and counting content images', () => {
            const content = '<noscript><img src="/noscript.png"></noscript>'
                + '<iframe><img src="/frame.png"></iframe>'
                + '<img src="/visible.png" width="80" height="40">';
            assert.deepEqual(firstImageInfo(content), {
                src: '/visible.png',
                width: 80,
                height: 40
            });
            assert.equal(pageAnalysis({ content }).imageCount, 1);
        });
    });

    describe('excerptFor', () => {
        it('uses manual excerpt when present', () => {
            const result = excerptFor({ excerpt: '<p>manual</p>', content: '<p>full</p>' }, 200);
            assert.equal(result.content, '<p>manual</p>');
            assert.equal(result.truncated, true);
        });

        it('marks manual excerpt as not truncated when it equals full content', () => {
            const html = '<p>same</p>';
            const result = excerptFor({ excerpt: html, content: html }, 200);
            assert.equal(result.truncated, false);
        });

        it('invalidates manual excerpt cache when full content changes', () => {
            const post = { excerpt: '<p>same</p>', content: '<p>same</p>' };
            assert.equal(excerptFor(post, 200).truncated, false);

            post.content = '<p>same</p><p>new body</p>';
            assert.equal(excerptFor(post, 200).truncated, true);
        });

        it('auto-truncates long content', () => {
            const content = '<p>' + 'word '.repeat(80) + '</p>';
            const result = excerptFor({ content }, 40);
            assert.equal(result.truncated, true);
            assert.match(result.content, /^<p>/);
            assert.ok(result.content.length < content.length);
        });

        it('returns full content when under the limit', () => {
            const content = '<p>short</p>';
            const result = excerptFor({ content }, 200);
            assert.equal(result.truncated, false);
            assert.equal(result.content, content);
        });
    });

    describe('excerptForCard', () => {
        it('applies theme fallback length when enabled', () => {
            const content = '<p>' + 'word '.repeat(80) + '</p>';
            const result = excerptForCard(
                { content },
                { excerpt: { fallback: { enabled: true, length: 40 } } }
            );
            assert.equal(result.truncated, true);
        });

        it('returns empty + truncated when fallback disabled and no manual excerpt', () => {
            const content = '<p>' + 'word '.repeat(80) + '</p>';
            const result = excerptForCard(
                { content },
                { excerpt: { fallback: { enabled: false } } }
            );
            assert.equal(result.truncated, true);
            assert.equal(result.content, '');
        });

        it('still uses manual excerpt when fallback is disabled', () => {
            const result = excerptForCard(
                { excerpt: '<p>manual</p>', content: '<p>full</p>' },
                { excerpt: { fallback: { enabled: false } } }
            );
            assert.equal(result.content, '<p>manual</p>');
            assert.equal(result.truncated, true);
        });
    });

    describe('pageLooksLong', () => {
        it('detects long pages by headings, images, or text length', () => {
            const headings = {
                content: '<h2>1</h2><h2>2</h2><h2>3</h2><h2>4</h2>'
            };
            assert.equal(pageLooksLong(headings), true);

            const images = {
                content: '<img src="/a.png"><img src="/b.png"><img src="/c.png">'
            };
            assert.equal(pageLooksLong(images), true);

            assert.equal(pageLooksLong({ content: '<p>short</p>' }), false);
        });
    });
});
