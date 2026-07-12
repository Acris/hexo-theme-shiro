'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

// Mock Hexo before loading the theme filter module (side-effect registration only).
const warnCalls = [];
const registeredFilters = { before_post_render: [], after_post_render: [] };
const registeredHelpers = {};

global.hexo = {
    env: { cmd: 'test' },
    log: {
        warn(...args) {
            warnCalls.push(args.join(' '));
        }
    },
    theme: {
        config: {
            mathjax: {
                enabled: true,
                every_page: false,
                protect: true,
                inline_dollars: true,
                process_environments: true,
                process_escapes: true
            }
        }
    },
    extend: {
        filter: {
            register(name, fn, priority) {
                if (registeredFilters[name]) {
                    registeredFilters[name].push({ fn, priority });
                }
            }
        },
        helper: {
            register(name, fn) {
                registeredHelpers[name] = fn;
            }
        }
    }
};

// Intermediate post field used by filters (not part of the public module API).
const PLACEHOLDER_PROP = '__shiroMathPlaceholders';

let protectMarkdownMath;
let restoreProtectedMath;
let scanMathAt;
let scanEscapedDollar;
let pageWantsMathjax;
let resolveMathjaxConfig;
let storeSegments;
let takeSegments;

before(() => {
    ({
        protectMarkdownMath,
        restoreProtectedMath,
        scanMathAt,
        scanEscapedDollar,
        pageWantsMathjax,
        resolveMathjaxConfig,
        storeSegments,
        takeSegments
    } = require('../scripts/mathjax.js'));
});

describe('scripts/mathjax.js', () => {
    describe('resolveMathjaxConfig', () => {
        it('defaults enabled/every_page/inline_dollars to false; protect/process_* to true', () => {
            const cfg = resolveMathjaxConfig({ mathjax: {} });
            assert.equal(cfg.enabled, false);
            assert.equal(cfg.everyPage, false);
            assert.equal(cfg.protect, true);
            assert.equal(cfg.inlineDollars, false);
            assert.equal(cfg.processEnvironments, true);
            assert.equal(cfg.processEscapes, true);
            assert.equal(cfg.tags, 'none');
            assert.match(cfg.src, /mathjax@4/);
            assert.equal(cfg.integrity, '');
        });

        it('normalizes tags and keeps custom src', () => {
            const cfg = resolveMathjaxConfig({
                mathjax: { tags: 'ams', src: 'https://example.com/mj.js', integrity: 'sha256-abc' }
            });
            assert.equal(cfg.tags, 'ams');
            assert.equal(cfg.src, 'https://example.com/mj.js');
            assert.equal(cfg.integrity, 'sha256-abc');
            assert.equal(resolveMathjaxConfig({ mathjax: { tags: 'bogus' } }).tags, 'none');
        });

        it('uses empty mathjax defaults when the mathjax key is missing on theme config', () => {
            const cfg = resolveMathjaxConfig({ site: { seal: true }, enabled: true });
            assert.equal(cfg.enabled, false);
            assert.equal(cfg.everyPage, false);
            assert.equal(cfg.protect, true);
        });

        it('honors explicit true/false flags', () => {
            const cfg = resolveMathjaxConfig({
                mathjax: {
                    enabled: false,
                    every_page: true,
                    protect: false,
                    inline_dollars: true,
                    process_environments: false,
                    process_escapes: false
                }
            });
            assert.equal(cfg.enabled, false);
            assert.equal(cfg.everyPage, true);
            assert.equal(cfg.protect, false);
            assert.equal(cfg.inlineDollars, true);
            assert.equal(cfg.processEnvironments, false);
            assert.equal(cfg.processEscapes, false);
        });
    });

    describe('scanMathAt', () => {
        it('protects single-dollar math when inlineDollars is enabled', () => {
            assert.equal(scanMathAt('$x$', 0, { inlineDollars: true }), '$x$');
        });

        it('ignores single-dollar math when inlineDollars is disabled or omitted', () => {
            assert.equal(scanMathAt('$x$', 0, { inlineDollars: false }), '');
            assert.equal(scanMathAt('$x$', 0), '');
            assert.equal(scanMathAt('$x$', 0, {}), '');
        });

        it('scans display $$ and LaTeX delimiters without needing inlineDollars', () => {
            assert.equal(scanMathAt('$$x$$', 0), '$$x$$');
            assert.equal(scanMathAt('\\(x\\)', 0), '\\(x\\)');
            assert.equal(scanMathAt('\\[x\\]', 0), '\\[x\\]');
        });

        it('accepts whitelisted bare environments and rejects document', () => {
            assert.match(scanMathAt('\\begin{align}a\\end{align}', 0), /align/);
            assert.equal(scanMathAt('\\begin{document}a\\end{document}', 0), '');
        });

        it('scans through nested environments with the same name', () => {
            const source = '\\begin{array}a\\begin{array}b\\end{array}c\\end{array}';
            assert.equal(scanMathAt(source, 0), source);
        });

        it('ignores environment boundaries inside TeX comments', () => {
            const source = '\\begin{align}a % \\end{align}\nb\\end{align}';
            assert.equal(scanMathAt(source, 0), source);
        });

        it('rejects currency-like lone dollars', () => {
            assert.equal(scanMathAt('$5', 0, { inlineDollars: true }), '');
            assert.equal(scanMathAt('costs $5 today', 6, { inlineDollars: true }), '');
        });
    });

    describe('scanEscapedDollar', () => {
        it('captures prose \\$ for processEscapes', () => {
            assert.equal(scanEscapedDollar('\\$5', 0), '\\$');
        });

        it('does not treat \\\\ as a currency escape opener', () => {
            assert.equal(scanEscapedDollar('\\\\$5', 0), '');
        });
    });

    describe('pageWantsMathjax', () => {
        it('never loads when enabled is false', () => {
            const cfg = resolveMathjaxConfig({ mathjax: { enabled: false, every_page: true } });
            assert.equal(pageWantsMathjax({ mathjax: true }, cfg), false);
            assert.equal(pageWantsMathjax({}, cfg), false);
        });

        it('with every_page false loads only mathjax: true', () => {
            const cfg = resolveMathjaxConfig({ mathjax: { enabled: true, every_page: false } });
            assert.equal(pageWantsMathjax({ mathjax: true }, cfg), true);
            assert.equal(pageWantsMathjax({}, cfg), false);
            assert.equal(pageWantsMathjax({ mathjax: false }, cfg), false);
        });

        it('with every_page true loads all pages except mathjax: false', () => {
            const cfg = resolveMathjaxConfig({ mathjax: { enabled: true, every_page: true } });
            assert.equal(pageWantsMathjax({}, cfg), true);
            assert.equal(pageWantsMathjax({ mathjax: true }, cfg), true);
            assert.equal(pageWantsMathjax({ mathjax: false }, cfg), false);
        });

        it('defaults to disabled when the key is omitted', () => {
            const cfg = resolveMathjaxConfig({ mathjax: { every_page: false } });
            assert.equal(cfg.enabled, false);
            assert.equal(pageWantsMathjax({ mathjax: true }, cfg), false);
        });
    });

    describe('protectMarkdownMath / restoreProtectedMath', () => {
        it('protects \\$, $...$, and \\(...\\) together when inlineDollars is on', () => {
            const protectedMath = protectMarkdownMath(
                'Price \\$5 and $E=mc^2$ and \\(a\\).',
                { inlineDollars: true }
            );
            assert.ok(protectedMath.segments);
            assert.equal(protectedMath.segments.length, 3);
            assert.equal(protectedMath.segments[0], '\\$');
            assert.equal(protectedMath.segments[1], '$E=mc^2$');
            assert.equal(protectedMath.segments[2], '\\(a\\)');

            const restored = restoreProtectedMath(protectedMath.content, protectedMath);
            assert.match(restored, /\\\$5/);
            assert.match(restored, /\$E=mc\^2\$/);
            assert.match(restored, /\\\(a\\\)/);
        });

        it('still protects \\$ when processEscapes is on and inlineDollars is off', () => {
            const protectedMath = protectMarkdownMath('Price \\$5 and $x$ and \\(y\\)', {
                inlineDollars: false,
                processEscapes: true
            });
            assert.ok(protectedMath.segments);
            assert.deepEqual(protectedMath.segments, ['\\$', '\\(y\\)']);
        });

        it('does not protect \\$ when both inlineDollars and processEscapes are off', () => {
            const protectedMath = protectMarkdownMath('Price \\$5 and $x$ and \\(y\\)', {
                inlineDollars: false,
                processEscapes: false
            });
            assert.ok(protectedMath.segments);
            assert.deepEqual(protectedMath.segments, ['\\(y\\)']);
            assert.match(protectedMath.content, /\\\$5/);
        });

        it('does not swallow unclosed display delimiters to EOF', () => {
            const source = '\\[ unclosed and more prose with *emphasis*';
            const protectedMath = protectMarkdownMath(source, { inlineDollars: false });
            assert.equal(protectedMath.segments, null);
            assert.equal(protectedMath.content, source);
        });

        it('does not swallow unclosed bare environments to EOF', () => {
            const source = '\\begin{align} a = b and more *prose*';
            const protectedMath = protectMarkdownMath(source, { inlineDollars: false });
            assert.equal(protectedMath.segments, null);
            assert.equal(protectedMath.content, source);
        });

        it('warns about unclosed delimiters via injected warn callback', () => {
            const source = '\\[ unclosed and more prose with *emphasis*';
            const calls = [];
            const warn = (msg) => calls.push(msg);

            // No warn option → silent (pure module has no Hexo binding).
            let protectedMath = protectMarkdownMath(source, { inlineDollars: false });
            assert.equal(protectedMath.segments, null);
            assert.equal(calls.length, 0);

            protectedMath = protectMarkdownMath(source, {
                inlineDollars: false,
                sourcePath: 'source/_posts/math.md',
                warn
            });
            assert.equal(protectedMath.segments, null);
            assert.equal(protectedMath.content, source);
            assert.equal(calls.length, 1);
            assert.match(calls[0], /\[mathjax\] unclosed \\\[ delimiter/);
            assert.match(calls[0], /in source\/_posts\/math\.md/);

            calls.length = 0;
            protectMarkdownMath('$$ also unclosed', { inlineDollars: false, warn });
            assert.equal(calls.length, 1);
            assert.match(calls[0], /\[mathjax\] unclosed \$\$ delimiter/);

            calls.length = 0;
            protectMarkdownMath('\\begin{align} missing end', {
                inlineDollars: false,
                sourcePath: 'source/_posts/env.md',
                warn
            });
            assert.equal(calls.length, 1);
            assert.match(calls[0], /\[mathjax\] unclosed \\begin\{align\} delimiter/);
            assert.match(calls[0], /in source\/_posts\/env\.md/);
        });

        it('filter warn path only logs during hexo generate', () => {
            const before = registeredFilters.before_post_render[0].fn;
            warnCalls.length = 0;
            hexo.env.cmd = 'server';
            before({
                content: '\\[ unclosed',
                mathjax: true,
                source: 'source/_posts/x.md'
            });
            assert.equal(warnCalls.length, 0);

            hexo.env.cmd = 'generate';
            before({
                content: '\\[ unclosed',
                mathjax: true,
                source: 'source/_posts/x.md'
            });
            assert.equal(warnCalls.length, 1);
            assert.match(warnCalls[0], /unclosed \\\[/);

            hexo.env.cmd = 'test';
            warnCalls.length = 0;
        });

        it('skips fenced code and still protects math after the fence', () => {
            const protectedMath = protectMarkdownMath('```\n$x$\n```\n$y$', { inlineDollars: true });
            assert.ok(protectedMath.segments);
            assert.equal(protectedMath.segments.length, 1);
            assert.equal(protectedMath.segments[0], '$y$');
        });

        it('does not treat escaped backticks as a code span', () => {
            const protectedMath = protectMarkdownMath('\\` $x$ \\`', { inlineDollars: true });
            assert.deepEqual(protectedMath.segments, ['$x$']);
        });

        it('requires complete backtick runs of equal length for code spans', () => {
            for (const source of ['`` $x$ `', '` $x$ ``']) {
                const protectedMath = protectMarkdownMath(source, { inlineDollars: true });
                assert.deepEqual(protectedMath.segments, ['$x$']);
            }
        });

        it('does not close a fenced block with a four-space-indented fence', () => {
            const source = '```\n$x$\n    ```\n$y$';
            const protectedMath = protectMarkdownMath(source, { inlineDollars: true });
            assert.equal(protectedMath.segments, null);
            assert.equal(protectedMath.content, source);
        });

        it('does not treat a quoted closing tag as the end of an HTML code block', () => {
            const source = '<code title="</code>">$x$</code>$y$';
            const protectedMath = protectMarkdownMath(source, { inlineDollars: true });
            assert.ok(protectedMath.segments);
            assert.deepEqual(protectedMath.segments, ['$y$']);
        });

        it('skips math-like text in opaque HTML fallback containers', () => {
            const source = '<noscript>\\(fallback\\)</noscript>'
                + '<iframe>$$frame$$</iframe>\\(visible\\)';
            const protectedMath = protectMarkdownMath(source, { inlineDollars: false });
            assert.ok(protectedMath.segments);
            assert.deepEqual(protectedMath.segments, ['\\(visible\\)']);
        });

        it('does not protect single $ when inlineDollars is off', () => {
            const protectedMath = protectMarkdownMath('$x$ and \\(y\\)', { inlineDollars: false });
            assert.ok(protectedMath.segments);
            assert.equal(protectedMath.segments.length, 1);
            assert.equal(protectedMath.segments[0], '\\(y\\)');
        });

        it('HTML-escapes restored TeX', () => {
            const salt = 'deadbeefcafe';
            const restored = restoreProtectedMath(
                'p @@SHIRO_MATH_' + salt + '_0@@ q',
                { segments: ['\\(a<b\\)'], salt }
            );
            assert.equal(restored, 'p \\(a&lt;b\\) q');
        });

        it('does not restore foreign @@SHIRO_MATH_N@@ prose tokens', () => {
            const protectedMath = protectMarkdownMath('literal @@SHIRO_MATH_0@@ and \\(a\\)', {
                inlineDollars: false
            });
            assert.ok(protectedMath.segments);
            assert.equal(protectedMath.segments.length, 1);
            assert.match(protectedMath.content, /literal @@SHIRO_MATH_0@@ and/);
            assert.match(protectedMath.content, new RegExp(
                '@@SHIRO_MATH_' + protectedMath.salt + '_0@@'
            ));
            const restored = restoreProtectedMath(protectedMath.content, protectedMath);
            assert.match(restored, /literal @@SHIRO_MATH_0@@ and/);
            assert.match(restored, /\\\(a\\\)/);
        });
    });

    describe('filters / helpers', () => {
        it('before/after filters protect, hide non-enumerably, restore, and clear placeholders', () => {
            assert.equal(registeredFilters.before_post_render.length, 1);
            assert.equal(registeredFilters.after_post_render.length, 1);
            assert.equal(registeredFilters.after_post_render[0].priority, 5);

            const before = registeredFilters.before_post_render[0].fn;
            const after = registeredFilters.after_post_render[0].fn;
            const data = {
                content: 'see \\(a<b\\) here',
                mathjax: true,
                source: 'source/_posts/eq.md',
                excerpt: 'preview \\(a<b\\) only',
                more: 'more \\(a<b\\)'
            };

            before(data);
            assert.match(data.content, /@@SHIRO_MATH_[0-9a-f]+_0@@/i);
            assert.match(data.excerpt, /@@SHIRO_MATH_[0-9a-f]+_1@@/i);
            assert.match(data.more, /@@SHIRO_MATH_[0-9a-f]+_2@@/i);
            // Segments live only in the module WeakMap (not on the post object).
            assert.equal(Object.prototype.hasOwnProperty.call(data, PLACEHOLDER_PROP), false);
            assert.equal(JSON.stringify(data).includes(PLACEHOLDER_PROP), false);

            after(data);
            assert.equal(data.content, 'see \\(a&lt;b\\) here');
            assert.equal(data.excerpt, 'preview \\(a&lt;b\\) only');
            assert.equal(data.more, 'more \\(a&lt;b\\)');
        });

        it('protects excerpt-only math when content has no formulas', () => {
            const before = registeredFilters.before_post_render[0].fn;
            const after = registeredFilters.after_post_render[0].fn;
            const data = {
                content: 'plain body with no math',
                excerpt: 'summary with \\(E=mc^2\\)',
                mathjax: true,
                source: 'source/_posts/excerpt-math.md'
            };

            before(data);
            assert.equal(data.content, 'plain body with no math');
            assert.match(data.excerpt, /@@SHIRO_MATH_[0-9a-f]+_0@@/i);

            after(data);
            assert.equal(data.excerpt, 'summary with \\(E=mc^2\\)');
        });

        it('after_post_render restores from WeakMap without requiring pageWantsMathjax', () => {
            const after = registeredFilters.after_post_render[0].fn;
            const salt = 'aabbccddeeff';
            const data = {
                content: 'x @@SHIRO_MATH_' + salt + '_0@@ y',
                mathjax: false
            };
            storeSegments(data, { segments: ['\\(z\\)'], salt });
            after(data);
            assert.equal(data.content, 'x \\(z\\) y');
            assert.equal(takeSegments(data), undefined);
        });

        it('registers mathjax_options helper with the same defaults as resolveMathjaxConfig', () => {
            assert.equal(typeof registeredHelpers.mathjax_options, 'function');
            const opts = registeredHelpers.mathjax_options.call({ theme: { mathjax: {} } });
            assert.equal(opts.enabled, false);
            assert.equal(opts.inlineDollars, false);
            assert.equal(opts.processEnvironments, true);
            assert.equal(opts.processEscapes, true);
            assert.equal(opts.protect, true);
        });

        it('page_wants_mathjax helper accepts pre-resolved options', () => {
            assert.equal(typeof registeredHelpers.page_wants_mathjax, 'function');
            const opts = resolveMathjaxConfig({ mathjax: { enabled: true, every_page: false } });
            const ctx = { theme: { mathjax: { enabled: false } } };
            // Pre-resolved opts win over this.theme (layout single-resolve path).
            assert.equal(registeredHelpers.page_wants_mathjax.call(ctx, { mathjax: true }, opts), true);
            assert.equal(registeredHelpers.page_wants_mathjax.call(ctx, { mathjax: true }), false);
        });
    });

    describe('MathJax demo regressions', () => {
        // Samples adapted from mathjax/MathJax-demos-web page/tex-chtml.html
        it('protects demo mix of $, \\(...\\), and $$', () => {
            const source = [
                'When $a \\ne 0$, there are two solutions to \\(ax^2 + bx + c = 0\\) and they are',
                '$$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}.$$'
            ].join('\n');
            const protectedMath = protectMarkdownMath(source, { inlineDollars: true });
            assert.ok(protectedMath.segments);
            assert.equal(protectedMath.segments.length, 3);
            assert.equal(protectedMath.segments[0], '$a \\ne 0$');
            assert.equal(protectedMath.segments[1], '\\(ax^2 + bx + c = 0\\)');
            assert.match(protectedMath.segments[2], /^\$\$x =/);
        });

        it('protects bare align environments from the demo', () => {
            const source = [
                '\\begin{align}',
                '  \\dot{x} & = \\sigma(y-x) \\\\',
                '  \\dot{y} & = \\rho x - y - xz \\\\',
                '  \\dot{z} & = -\\beta z + xy',
                '\\end{align}'
            ].join('\n');
            const protectedMath = protectMarkdownMath(source, { inlineDollars: true });
            assert.ok(protectedMath.segments);
            assert.equal(protectedMath.segments.length, 1);
            assert.match(protectedMath.segments[0], /^\\begin\{align\}/);
            assert.match(protectedMath.segments[0], /\\end\{align\}$/);
        });

        it('does not invent a math span for the classic currency false positive', () => {
            const source = 'the cost is $2.50 for the first one, and $2.00 for each additional one';
            const protectedMath = protectMarkdownMath(source, { inlineDollars: true });
            assert.equal(protectedMath.segments, null);
            assert.equal(protectedMath.content, source);
        });
    });
});
