'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const registeredFilters = new Map();

// images.js registers a Hexo filter on load — stub the global first.
global.hexo = {
    source_dir: '/tmp/shiro-source-does-not-need-to-exist',
    config: { root: '/' },
    extend: {
        filter: {
            register(name, fn) {
                registeredFilters.set(name, fn);
            }
        }
    }
};

const {
    optimizeImages,
    markCodeBlocksNotProse,
    localImageSize,
    localImageCandidates
} = require('../scripts/images.js');
const {
    optimizeImages: pureOptimize,
    defaultFirstImageLoading,
    parseAttrs,
    isRemoteUrl,
    cleanUrl,
    getAttr,
    attrLookup,
    localImageCandidates: pureCandidates
} = require('../scripts/lib/image-optimize');
const { buildPostCardViewModels } = require('../scripts/lib/html-analysis');

describe('scripts/lib/image-optimize', () => {
    describe('parseAttrs', () => {
        it('parses quoted and boolean attributes', () => {
            const attrs = parseAttrs('src="a.png" alt=\'x\' loading disabled');
            const lookup = attrLookup(attrs);
            assert.equal(getAttr(attrs, lookup, 'src'), 'a.png');
            assert.equal(getAttr(attrs, lookup, 'alt'), 'x');
            assert.ok(attrs.some(a => a.name === 'disabled' && a.boolean));
        });
    });

    describe('cleanUrl / isRemoteUrl', () => {
        it('strips query and hash', () => {
            assert.equal(cleanUrl('/a.png?v=1#x'), '/a.png');
            assert.equal(cleanUrl('b.jpg'), 'b.jpg');
        });

        it('detects remote and data urls', () => {
            assert.equal(isRemoteUrl('https://ex.com/a.png'), true);
            assert.equal(isRemoteUrl('//cdn/a.png'), true);
            assert.equal(isRemoteUrl('data:image/png;base64,xx'), true);
            assert.equal(isRemoteUrl('/local.png'), false);
            assert.equal(isRemoteUrl('relative.png'), false);
        });
    });

    describe('optimizeImages', () => {
        it('adds decoding/loading defaults without forcing fetch priority', () => {
            const out = pureOptimize('<p><img src="https://cdn.example/a.png" alt="a"></p>', {
                firstImageEager: true
            });
            assert.match(out, /decoding="async"/);
            assert.match(out, /loading="eager"/);
            assert.doesNotMatch(out, /fetchpriority=/);
        });

        it('preserves original attribute quoting when injecting', () => {
            const out = pureOptimize("<img src='https://cdn.example/a.png' alt='x'>", {
                firstImageEager: true
            });
            assert.match(out, /src='https:\/\/cdn\.example\/a\.png'/);
            assert.match(out, /alt='x'/);
            assert.match(out, /decoding="async"/);
        });

        it('lazy-loads subsequent images', () => {
            const html = '<img src="https://cdn.example/1.png"><img src="https://cdn.example/2.png">';
            const out = pureOptimize(html, { firstImageEager: true });
            assert.match(out, /loading="eager"/);
            assert.match(out, /loading="lazy"/);
            assert.doesNotMatch(out, /fetchpriority=/);
        });

        it('defers only the first image loading policy for list cards', () => {
            const html = '<img src="https://cdn.example/1.png"><img src="https://cdn.example/2.png">';
            const out = pureOptimize(html, { deferFirstImageLoading: true });
            assert.doesNotMatch(out.split('>')[0], /loading=/);
            assert.match(out, /2\.png"[^>]*loading="lazy"/);
        });

        it('defaults the first card image without overriding authored loading', () => {
            const html = '<p><img src="/first.png"></p><img src="/second.png">';
            assert.match(defaultFirstImageLoading(html, 'eager'), /first\.png" loading="eager"/);
            assert.match(defaultFirstImageLoading(html, 'lazy'), /first\.png" loading="lazy"/);
            assert.match(
                defaultFirstImageLoading('<img src="/first.png" loading="lazy">', 'eager'),
                /loading="lazy"/
            );
        });

        it('does not invent sizes without srcset', () => {
            const out = pureOptimize('<img src="https://cdn.example/a.png">', {});
            assert.equal(out.includes('sizes='), false);
        });

        it('adds sizes when srcset is present', () => {
            const out = pureOptimize(
                '<img src="https://cdn.example/a.png" srcset="https://cdn.example/a.png 640w, https://cdn.example/a-large.png 1280w">',
                {}
            );
            assert.match(out, /sizes="/);
        });

        it('optimizes responsive images that rely on srcset only', () => {
            const out = pureOptimize(
                '<img srcset="https://cdn.example/a.png 640w, https://cdn.example/a-large.png 1280w" alt="a">',
                { firstImageEager: true }
            );
            assert.match(out, /decoding="async"/);
            assert.match(out, /loading="eager"/);
            assert.match(out, /sizes="/);
        });

        it('does not add sizes to density-descriptor srcset', () => {
            const out = pureOptimize(
                '<img src="https://cdn.example/a.png" srcset="https://cdn.example/a.png 1x, https://cdn.example/a-2x.png 2x">',
                {}
            );
            assert.equal(out.includes('sizes='), false);
        });

        it('does not override existing loading attributes', () => {
            const out = pureOptimize('<img src="https://cdn.example/a.png" loading="lazy">', {
                firstImageEager: true
            });
            assert.match(out, /loading="lazy"/);
            assert.equal((out.match(/loading=/g) || []).length, 1);
        });

        it('skips script/style/pre blocks', () => {
            const html = '<pre><img src="https://cdn.example/x.png"></pre><img src="https://cdn.example/y.png">';
            const out = pureOptimize(html, { firstImageEager: true });
            assert.match(out, /<pre><img src="https:\/\/cdn\.example\/x\.png"><\/pre>/);
            assert.match(out, /cdn\.example\/y\.png"[^>]*decoding="async"/);
        });

        it('still optimizes images after an unclosed code tag', () => {
            const html = '<p>Use <code>npm test</p>'
                + '<img src="https://cdn.example/after.png">';
            const out = pureOptimize(html, { firstImageEager: true });
            assert.match(out, /cdn\.example\/after\.png"[^>]*decoding="async"/);
            assert.match(out, /loading="eager"/);
        });

        it('skips fallback images and keeps the first visible image eager', () => {
            const hidden = '<noscript><img src="https://cdn.example/fallback.png"></noscript>'
                + '<iframe><img src="https://cdn.example/frame.png"></iframe>';
            const out = pureOptimize(hidden + '<img src="https://cdn.example/visible.png">', {
                firstImageEager: true
            });
            assert.ok(out.startsWith(hidden));
            assert.match(out, /visible\.png"[^>]*loading="eager"/);
        });

        it('does not let decorative images consume content-image priority', () => {
            const html = '<img class="emoji" src="/emoji.png">'
                + '<img src="/pixel.png">'
                + '<img src="https://cdn.example/hero.png">';
            const out = pureOptimize(html, {
                firstImageEager: true,
                getLocalSize: src => src === '/pixel.png' ? { width: 1, height: 1 } : null
            });
            const images = out.match(/<img[^>]*>/g);
            assert.doesNotMatch(images[0], /loading=/);
            assert.doesNotMatch(images[1], /loading=/);
            assert.match(images[2], /loading="eager"/);
        });

        it('leaves tags without src untouched', () => {
            const html = '<img alt="no-src">';
            assert.equal(pureOptimize(html, {}), html);
        });

        it('accepts injected getLocalSize dimensions', () => {
            const out = pureOptimize('<img src="/a.png">', {
                firstImageEager: true,
                getLocalSize: () => ({ width: 12, height: 8 })
            });
            assert.match(out, /width="12"/);
            assert.match(out, /height="8"/);
        });

        it('preserves the intrinsic ratio when one dimension already exists', () => {
            const getLocalSize = () => ({ width: 12, height: 8 });
            const widthOnly = pureOptimize('<img src="/a.png" width="6">', { getLocalSize });
            const heightOnly = pureOptimize('<img src="/a.png" height="4">', { getLocalSize });

            assert.match(widthOnly, /width="6"/);
            assert.match(widthOnly, /height="4"/);
            assert.match(heightOnly, /width="6"/);
            assert.match(heightOnly, /height="4"/);
        });

        it('does not treat class tokens as existing loading/width attrs', () => {
            const out = pureOptimize(
                '<img class="loading decoding" src="https://cdn.example/a.png">',
                { firstImageEager: true }
            );
            assert.match(out, /class="loading decoding"/);
            assert.match(out, /loading="eager"/);
            assert.match(out, /decoding="async"/);
        });

        it('keeps quoted greater-than signs inside image attributes', () => {
            const out = pureOptimize(
                '<img title="a > b" src="https://cdn.example/a.png" alt="x > y">',
                { firstImageEager: true }
            );
            assert.match(out, /^<img title="a > b" src="https:\/\/cdn\.example\/a\.png" alt="x > y"/);
            assert.match(out, /decoding="async"/);
            assert.match(out, /loading="eager"/);
            assert.equal((out.match(/<img/g) || []).length, 1);
        });
    });

    describe('localImageCandidates (pure path resolution)', () => {
        it('resolves site-root and post-relative paths under sourceDir', () => {
            const sourceDir = '/site/source';
            const post = { full_source: '/site/source/_posts/hello.md' };
            const abs = pureCandidates('/images/a.png', post, { sourceDir, root: '/' });
            assert.ok(abs.some((p) => p.includes('source/images/a.png')));

            const rel = pureCandidates('pic.png', post, { sourceDir, root: '/' });
            assert.ok(rel.some((p) => p.includes('_posts') && p.endsWith('pic.png')));
        });

        it('strips configured root prefix', () => {
            const sourceDir = '/site/source';
            const list = pureCandidates('/blog/img/x.png', null, {
                sourceDir,
                root: '/blog/'
            });
            assert.ok(list.some((p) => p.includes('source/img/x.png')));
        });

        it('decodes HTML entities in rendered local image paths', () => {
            const sourceDir = '/site/source';
            const list = pureCandidates('/images/rock&amp;roll.png', null, {
                sourceDir,
                root: '/'
            });
            assert.ok(list.some((p) => p.endsWith('images/rock&roll.png')));
        });

        it('allows local filenames that begin with two dots', () => {
            const sourceDir = '/site/source';
            const list = pureCandidates('/..cover.png', null, {
                sourceDir,
                root: '/'
            });
            assert.ok(list.some((p) => p.endsWith('/source/..cover.png')));
        });

        it('ignores remote urls', () => {
            assert.deepEqual(
                pureCandidates('https://cdn.example/a.png', null, {
                    sourceDir: '/site/source',
                    root: '/'
                }),
                []
            );
        });
    });
});

describe('scripts/images.js (orchestrator)', () => {
    it('optimizeImages delegates to pure path with getLocalSize', () => {
        const out = optimizeImages('<img src="https://cdn.example/a.png">', {
            firstImageEager: true
        });
        assert.match(out, /decoding="async"/);
    });

    it('exposes localImageCandidates for path resolution', () => {
        assert.equal(typeof localImageCandidates, 'function');
    });

    it('defers the first content-image loading policy to the rendered view', () => {
        const filter = registeredFilters.get('after_post_render');
        const data = filter({
            content: '<img class="emoji" src="/emoji.png"><img src="/hero.png"><img src="/later.png">',
            excerpt: ''
        });
        const images = data.content.match(/<img[^>]*>/g);
        assert.doesNotMatch(images[0], /loading=/);
        assert.doesNotMatch(images[1], /loading=/);
        assert.match(images[2], /loading="lazy"/);
    });

    it('keeps fallback excerpts consistent across filter and home-card stages', () => {
        const filter = registeredFilters.get('after_post_render');
        const posts = [
            filter({ content: '<p>No image</p>', excerpt: '' }),
            filter({ content: '<p>Short</p><img src="/hero.png">', excerpt: '' }),
            filter({ content: '<p>Later</p><img src="/later.png">', excerpt: '' })
        ];
        const cards = buildPostCardViewModels(posts, {
            excerpt: { fallback: { enabled: true, length: 1000 } }
        });

        assert.match(cards[1].excerpt.content, /hero\.png"[^>]*loading="eager"/);
        assert.match(cards[2].excerpt.content, /later\.png"[^>]*loading="lazy"/);
    });

    it('discovers an image created after an earlier missing lookup', () => {
        const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiro-images-'));
        const imageDir = path.join(sourceDir, 'images');
        const imagePath = path.join(imageDir, 'late.png');
        const previousSourceDir = global.hexo.source_dir;
        global.hexo.source_dir = sourceDir;

        try {
            assert.equal(localImageSize('/images/late.png'), null);
            fs.mkdirSync(imageDir);

            const pngHeader = Buffer.alloc(24);
            Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').copy(pngHeader);
            pngHeader.writeUInt32BE(32, 16);
            pngHeader.writeUInt32BE(18, 20);
            fs.writeFileSync(imagePath, pngHeader);

            assert.deepEqual(localImageSize('/images/late.png'), { width: 32, height: 18 });
        } finally {
            global.hexo.source_dir = previousSourceDir;
            fs.rmSync(sourceDir, { recursive: true, force: true });
        }
    });

    describe('markCodeBlocksNotProse', () => {
        it('adds not-prose to highlight and gist class lists once', () => {
            const html = '<div class="highlight javascript"><pre></pre></div>'
                + '<div class="gist"><div class="gist-file"></div></div>'
                + '<div class="not-prose highlight">x</div>';
            const out = markCodeBlocksNotProse(html);
            assert.match(out, /class="not-prose highlight javascript"/);
            assert.match(out, /class="not-prose gist"/);
            assert.equal((out.match(/not-prose/g) || []).length, 3);
        });

        it('does not rewrite class= samples inside pre/code text', () => {
            const html = '<pre><code>&lt;div class="highlight x"&gt;</code></pre>'
                + '<p>see class="highlight" in prose</p>'
                + '<figure class="highlight plain"><table></table></figure>';
            const out = markCodeBlocksNotProse(html);
            assert.match(out, /&lt;div class="highlight x"&gt;/);
            assert.match(out, /see class="highlight" in prose/);
            assert.match(out, /class="not-prose highlight plain"/);
            assert.equal((out.match(/not-prose/g) || []).length, 1);
        });

        it('handles class before other attributes on the open tag', () => {
            const html = '<div class="highlight js" id="c1" data-x="1">';
            const out = markCodeBlocksNotProse(html);
            assert.match(out, /class="not-prose highlight js"/);
            assert.match(out, /id="c1"/);
            assert.match(out, /data-x="1"/);
        });
    });
});
