'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { buildToc, slugifyHeading, cachedToc } = require('../scripts/lib/toc');

describe('scripts/lib/toc', () => {
    describe('slugifyHeading', () => {
        it('slugifies latin and keeps CJK', () => {
            assert.equal(slugifyHeading('Hello World'), 'hello-world');
            assert.equal(slugifyHeading('白夜書簡'), '白夜書簡');
            assert.equal(slugifyHeading('  '), 'heading');
        });
    });

    describe('buildToc', () => {
        it('returns shouldRender false when disabled or empty', () => {
            assert.equal(buildToc('<h2>A</h2>', { enabled: false }).shouldRender, false);
            assert.equal(buildToc('', { depth: 3, min_headings: 1 }).shouldRender, false);
        });

        it('requires min_headings before rendering', () => {
            const html = '<h2>One</h2><h2>Two</h2>';
            const low = buildToc(html, { depth: 3, min_headings: 3 });
            assert.equal(low.shouldRender, false);
            assert.equal(low.content, html);

            const ok = buildToc(html + '<h2>Three</h2>', { depth: 3, min_headings: 3 });
            assert.equal(ok.shouldRender, true);
            assert.match(ok.html, /toc-list/);
            assert.equal((ok.html.match(/toc-link/g) || []).length, 3);
        });

        it('injects unique ids when headings lack them', () => {
            const src = '<h2>Same</h2><h2>Same</h2><h2>Other</h2>';
            const result = buildToc(src, { depth: 3, min_headings: 3 });
            assert.equal(result.shouldRender, true);
            assert.match(result.content, /id="same"/);
            assert.match(result.content, /id="same-1"/);
            assert.match(result.html, /data-target="same"/);
            assert.match(result.html, /data-target="same-1"/);
        });

        it('avoids ids already used by skipped containers', () => {
            const src = '<pre id="same"><code>sample</code></pre>'
                + '<h2>Same</h2><h2>Two</h2><h2>Three</h2>';
            const result = buildToc(src, { depth: 3, min_headings: 3 });
            assert.equal(result.shouldRender, true);
            assert.match(result.content, /<h2 id="same-1">Same<\/h2>/);
            assert.match(result.html, /data-target="same-1"/);
        });

        it('avoids ids on real elements nested inside code blocks', () => {
            const src = '<pre><code><span id="same">sample</span></code></pre>'
                + '<h2>Same</h2><h2>Two</h2><h2>Three</h2>';
            const result = buildToc(src, { depth: 3, min_headings: 3 });
            assert.equal(result.shouldRender, true);
            assert.match(result.content, /<h2 id="same-1">Same<\/h2>/);
            assert.match(result.html, /data-target="same-1"/);
        });

        it('preserves existing ids and skips headings deeper than depth', () => {
            const src = '<h2 id="keep">A</h2><h3>B</h3><h4>C</h4><h2>D</h2>';
            const result = buildToc(src, { depth: 3, min_headings: 2 });
            assert.equal(result.shouldRender, true);
            assert.match(result.content, /id="keep"/);
            assert.match(result.html, /data-target="keep"/);
            assert.match(result.html, /data-target="b"/);
            assert.equal(result.html.includes('data-target="c"'), false);
        });

        it('ignores headings inside pre/code/script blocks', () => {
            const src = [
                '<pre><h2>Code heading</h2></pre>',
                '<h2>Real one</h2>',
                '<h2>Real two</h2>',
                '<h2>Real three</h2>'
            ].join('');
            const result = buildToc(src, { depth: 3, min_headings: 3 });
            assert.equal(result.shouldRender, true);
            assert.equal((result.html.match(/toc-link/g) || []).length, 3);
            assert.equal(result.html.includes('Code heading'), false);
        });

        it('ignores headings inside opaque fallback containers', () => {
            const src = '<noscript><h2>No-script heading</h2></noscript>'
                + '<iframe><h2>Frame heading</h2></iframe>'
                + '<h2>Real one</h2><h2>Real two</h2><h2>Real three</h2>';
            const result = buildToc(src, { depth: 3, min_headings: 3 });
            assert.equal(result.shouldRender, true);
            assert.equal((result.html.match(/toc-link/g) || []).length, 3);
            assert.equal(result.html.includes('No-script heading'), false);
            assert.equal(result.html.includes('Frame heading'), false);
        });

        it('excludes opaque fallback text from heading labels', () => {
            const src = '<h2><noscript>Fallback</noscript>Visible</h2>'
                + '<h2>Two</h2><h2>Three</h2>';
            const result = buildToc(src, { depth: 3, min_headings: 3 });
            assert.equal(result.shouldRender, true);
            assert.match(result.content, /id="visible"/);
            assert.match(result.html, />Visible<\/a>/);
            assert.equal(result.html.includes('Fallback'), false);
        });

        it('escapes titles in toc html', () => {
            const src = '<h2>A &amp; B &lt;C&gt;</h2><h2>Two</h2><h2>Three</h2>';
            const result = buildToc(src, { depth: 3, min_headings: 3 });
            assert.match(result.html, /A &amp; B &lt;C&gt;/);
            assert.equal(result.html.includes('<C>'), false);
        });

        it('preserves headings with greater-than signs in quoted attributes', () => {
            const src = '<h2 title="a > b" id="kept">One</h2>'
                + '<h2 data-label=">">Two</h2>'
                + '<h2>Three</h2>';
            const result = buildToc(src, { depth: 3, min_headings: 3 });
            assert.equal(result.shouldRender, true);
            assert.equal(result.content, src.replace('<h2 data-label=">">', '<h2 data-label=">" id="two">')
                .replace('<h2>Three</h2>', '<h2 id="three">Three</h2>'));
            assert.match(result.html, /data-target="kept"[^>]*>One</);
            assert.equal(result.html.includes('b&quot; id='), false);
        });
    });

    describe('cachedToc', () => {
        it('caches by page content and toc config', () => {
            const page = { content: '<h2>A</h2><h2>B</h2><h2>C</h2>' };
            const cfg = { depth: 3, min_headings: 3 };
            const a = cachedToc(page, cfg);
            const b = cachedToc(page, cfg);
            assert.equal(a, b);
            assert.equal(a.shouldRender, true);
        });
    });
});
