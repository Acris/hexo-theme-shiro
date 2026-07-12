'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { markCodeBlocksNotProse } = require('../scripts/lib/code-blocks');

describe('scripts/lib/code-blocks', () => {
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

        it('does not rewrite code-like markup in opaque fallback containers', () => {
            const hidden = '<noscript><figure class="highlight">fallback</figure></noscript>'
                + '<iframe><div class="gist">frame fallback</div></iframe>';
            const out = markCodeBlocksNotProse(hidden + '<figure class="highlight">visible</figure>');
            assert.ok(out.startsWith(hidden));
            assert.equal((out.match(/not-prose/g) || []).length, 1);
        });

        it('handles single-quoted and unquoted class attributes', () => {
            const html = "<div class='highlight js'>a</div>"
                + '<div class=highlight>b</div>'
                + '<div class=gist>c</div>';
            const out = markCodeBlocksNotProse(html);
            assert.match(out, /class='not-prose highlight js'/);
            assert.match(out, /class="not-prose highlight"/);
            assert.match(out, /class="not-prose gist"/);
        });

        it('matches class tokens separated by character references', () => {
            const html = '<figure class="highlight&#32;js"><pre>x</pre></figure>';
            const out = markCodeBlocksNotProse(html);
            assert.match(out, /class="not-prose highlight&#32;js"/);
        });

        it('finds class attributes after quoted greater-than signs', () => {
            const html = '<figure title="a > b" class="highlight js"><pre>x</pre></figure>';
            const out = markCodeBlocksNotProse(html);
            assert.match(out, /title="a > b"/);
            assert.match(out, /class="not-prose highlight js"/);
        });
    });
});
