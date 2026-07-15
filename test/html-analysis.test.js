'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    hasCodeContent,
    pageHasCode,
    pageCodeFlags,
    pageLooksLong,
    excerptFor,
    excerptForCard,
    buildPostCardViewModels,
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

        it('returns font and block-code flags from one page analysis', () => {
            const inline = pageCodeFlags(
                { content: '<p>Use <code>npm test</code>.</p>' },
                {},
                { is_post: () => true }
            );
            const block = pageCodeFlags(
                { content: '<pre><code>npm test</code></pre>' },
                {},
                { is_post: () => true }
            );
            const highlighted = pageCodeFlags(
                { content: '<figure class="highlight js"><pre>npm test</pre></figure>' },
                {},
                { is_post: () => true }
            );

            assert.deepEqual(inline, {
                hasCode: true,
                hasCodeBlocks: false,
                hasClipboardTargets: false
            });
            assert.deepEqual(block, {
                hasCode: true,
                hasCodeBlocks: true,
                hasClipboardTargets: false
            });
            assert.deepEqual(highlighted, {
                hasCode: true,
                hasCodeBlocks: true,
                hasClipboardTargets: true
            });
        });

        it('pageHasCode uses analysis for reading pages', () => {
            const page = { content: '<pre>code</pre>' };
            assert.equal(pageHasCode(page, {}, { is_post: () => true }), true);
            assert.equal(pageHasCode({ content: '<p>hi</p>' }, {}, { is_post: () => true }), false);
        });

        it('ignores a manual excerpt that is not rendered on a reading page', () => {
            const flags = pageCodeFlags({
                content: '<p>Plain article body.</p>',
                excerpt: '<figure class="highlight"><pre>hidden excerpt code</pre></figure>'
            }, {}, { is_post: () => true });

            assert.deepEqual(flags, {
                hasCode: false,
                hasCodeBlocks: false,
                hasClipboardTargets: false
            });
        });

        it('checks rendered excerpts only on home post cards', () => {
            const page = {
                content: '<pre>collection metadata is not rendered</pre>',
                posts: [{ excerpt: '<pre>code</pre>', content: '<p>full</p>' }]
            };
            assert.equal(pageHasCode(page, {}, { is_home: () => true }), true);
            assert.equal(pageHasCode(page, {}, { is_tag: () => true }), false);
            assert.equal(pageHasCode(page, {}, { is_category: () => true }), false);
        });

        it('ignores hidden post bodies when card fallback is disabled', () => {
            const flags = pageCodeFlags(
                { posts: [{ content: '<figure class="highlight"><pre>code</pre></figure>' }] },
                { excerpt: { fallback: { enabled: false } } },
                { is_home: () => true }
            );

            assert.deepEqual(flags, {
                hasCode: false,
                hasCodeBlocks: false,
                hasClipboardTargets: false
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
            assert.deepEqual(pageCodeFlags(
                { content },
                {},
                { is_post: () => true }
            ), {
                hasCode: false,
                hasCodeBlocks: false,
                hasClipboardTargets: false
            });
        });
    });

    describe('firstImageInfo / pageAnalysis', () => {
        it('finds first usable image with dimensions', () => {
            const info = firstImageInfo('<p><img src="/a.png" width="100" height="50"></p>');
            assert.equal(info.src, '/a.png');
            assert.equal(info.width, 100);
            assert.equal(info.height, 50);
            assert.equal(info.alt, '');
        });

        it('handles greater-than signs inside quoted image attributes', () => {
            const info = firstImageInfo('<img title="a > b" src="/quoted.png" width="64" height="32">');
            assert.deepEqual(info, {
                src: '/quoted.png',
                width: 64,
                height: 32,
                alt: ''
            });
        });

        it('recognizes responsive images that rely on srcset only', () => {
            const content = '<img srcset="/small.png 640w, /large.png 1280w" width="640" height="360">';
            assert.deepEqual(firstImageInfo(content), {
                src: '/small.png',
                width: 640,
                height: 360,
                alt: ''
            });
            assert.equal(pageAnalysis({ content }).imageCount, 1);
        });

        it('still counts images after an unclosed code tag', () => {
            const content = '<p>Run <code>npm test</p><img src="/after.png" width="10" height="10">';
            assert.equal(pageAnalysis({ content }).imageCount, 1);
            assert.equal(firstImageInfo(content).src, '/after.png');
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
                height: 40,
                alt: ''
            });
            assert.equal(pageAnalysis({ content }).imageCount, 1);
        });

        it('does not select or count decorative images as content images', () => {
            const content = '<img src="/presentation.png" role="presentation">'
                + '<img src="/emoji.png" class="inline emoji">'
                + '<img src="/pixel.png" width="1" height="1">'
                + '<img src="/photo.png" width="800" height="600">';
            assert.equal(firstImageInfo(content).src, '/photo.png');
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

        it('returns empty + truncated when fallback length is 0 (never full post HTML)', () => {
            const content = '<p>' + 'word '.repeat(80) + '</p>';
            const result = excerptForCard(
                { content },
                { excerpt: { fallback: { enabled: true, length: 0 } } }
            );
            assert.equal(result.truncated, true);
            assert.equal(result.content, '');
        });

        it('uses default length when fallback length is invalid or negative', () => {
            const content = '<p>' + 'word '.repeat(80) + '</p>';
            for (const length of ['nope', null, false, -5, NaN, '', {}]) {
                const result = excerptForCard(
                    { content },
                    { excerpt: { fallback: { enabled: true, length } } }
                );
                assert.equal(result.truncated, true, 'length=' + String(length));
                assert.notEqual(result.content, content, 'length=' + String(length));
                assert.match(result.content, /^<p>/, 'length=' + String(length));
                assert.ok(result.content.length > 0, 'length=' + String(length));
            }
        });

        it('accepts numeric string fallback lengths', () => {
            const content = '<p>' + 'word '.repeat(80) + '</p>';
            const result = excerptForCard(
                { content },
                { excerpt: { fallback: { enabled: true, length: '40' } } }
            );
            assert.equal(result.truncated, true);
            assert.match(result.content, /^<p>/);
            assert.ok(result.content.length < content.length);
        });

        it('still uses manual excerpt when fallback is disabled', () => {
            const result = excerptForCard(
                { excerpt: '<p>manual</p>', content: '<p>full</p>' },
                { excerpt: { fallback: { enabled: false } } }
            );
            assert.equal(result.content, '<p>manual</p>');
            assert.equal(result.truncated, true);
        });

        it('prioritizes the first rendered content image across all cards', () => {
            const posts = [
                { excerpt: '<p>No image</p>', content: '<p>No image</p>' },
                {
                    excerpt: '<img class="emoji" src="/emoji.png"><img src="/hero.png">',
                    content: '<p>Body</p>'
                },
                { excerpt: '<img src="/later.png">', content: '<p>Later</p>' }
            ];
            const cards = buildPostCardViewModels({ toArray: () => posts }, {});

            assert.doesNotMatch(cards[0].excerpt.content, /loading=/);
            assert.doesNotMatch(cards[1].excerpt.content.match(/<img class="emoji"[^>]*>/)[0], /loading=/);
            assert.match(cards[1].excerpt.content, /hero\.png" loading="eager"/);
            assert.match(cards[2].excerpt.content, /later\.png" loading="lazy"/);
        });

        it('preserves an authored loading value on the first rendered image', () => {
            const cards = buildPostCardViewModels([
                { excerpt: '<img src="/hero.png" loading="lazy">', content: '' },
                { excerpt: '<img src="/later.png">', content: '' }
            ], {});
            assert.match(cards[0].excerpt.content, /loading="lazy"/);
            assert.match(cards[1].excerpt.content, /loading="lazy"/);
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

        it('ignores heading-like text in opaque and code containers', () => {
            const content = '<script><h2>one</h2><h2>two</h2></script>'
                + '<template><h2>three</h2></template>'
                + '<pre><h2>four</h2></pre><p>short</p>';
            assert.equal(pageLooksLong({ content }), false);
        });
    });
});
