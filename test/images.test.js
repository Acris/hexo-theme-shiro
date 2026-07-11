'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

// images.js registers a Hexo filter on load — stub the global first.
global.hexo = {
    source_dir: '/tmp/shiro-source-does-not-need-to-exist',
    config: { root: '/' },
    extend: {
        filter: {
            register() {}
        }
    }
};

const {
    optimizeImages,
    markCodeBlocksNotProse,
    parseAttrs,
    renderAttrs,
    isRemoteUrl,
    cleanUrl,
    getAttr,
    attrLookup
} = require('../scripts/images.js');
// markCodeBlocksNotProse is re-exported from scripts/lib/code-blocks for filter tests.

describe('scripts/images.js', () => {
    describe('parseAttrs / renderAttrs', () => {
        it('round-trips quoted and boolean attributes', () => {
            const attrs = parseAttrs('src="a.png" alt=\'x\' loading disabled');
            const lookup = attrLookup(attrs);
            assert.equal(getAttr(attrs, lookup, 'src'), 'a.png');
            assert.equal(getAttr(attrs, lookup, 'alt'), 'x');
            assert.ok(attrs.some(a => a.name === 'disabled' && a.boolean));
            assert.match(renderAttrs(attrs), /src="a\.png"/);
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
        it('adds decoding/loading/fetchpriority defaults', () => {
            const out = optimizeImages('<p><img src="https://cdn.example/a.png" alt="a"></p>', {
                firstImageEager: true
            });
            assert.match(out, /decoding="async"/);
            assert.match(out, /loading="eager"/);
            assert.match(out, /fetchpriority="high"/);
        });

        it('lazy-loads subsequent images', () => {
            const html = '<img src="https://cdn.example/1.png"><img src="https://cdn.example/2.png">';
            const out = optimizeImages(html, { firstImageEager: true });
            assert.match(out, /loading="eager"/);
            assert.match(out, /loading="lazy"/);
            assert.match(out, /fetchpriority="auto"/);
        });

        it('does not invent sizes without srcset', () => {
            const out = optimizeImages('<img src="https://cdn.example/a.png">', {});
            assert.equal(out.includes('sizes='), false);
        });

        it('adds sizes when srcset is present', () => {
            const out = optimizeImages(
                '<img src="https://cdn.example/a.png" srcset="https://cdn.example/a.png 1x">',
                {}
            );
            assert.match(out, /sizes="/);
        });

        it('does not override existing loading attributes', () => {
            const out = optimizeImages('<img src="https://cdn.example/a.png" loading="lazy">', {
                firstImageEager: true
            });
            assert.match(out, /loading="lazy"/);
            assert.equal((out.match(/loading=/g) || []).length, 1);
        });

        it('skips script/style/pre blocks', () => {
            const html = '<pre><img src="https://cdn.example/x.png"></pre><img src="https://cdn.example/y.png">';
            const out = optimizeImages(html, { firstImageEager: true });
            // Only the outside image should be optimized (pre contents preserved).
            assert.match(out, /<pre><img src="https:\/\/cdn\.example\/x\.png"><\/pre>/);
            assert.match(out, /cdn\.example\/y\.png"[^>]*decoding="async"/);
        });

        it('leaves tags without src untouched', () => {
            const html = '<img alt="no-src">';
            assert.equal(optimizeImages(html, {}), html);
        });
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
