'use strict';

// Hexo MathJax filters/helpers — pure logic lives in scripts/lib/mathjax-protect.js.
//
// Theme config (hexo.theme.config.mathjax), defaults match _config.yml:
//   enabled, every_page, inline_dollars, process_environments, process_escapes,
//   protect, src, tags, integrity
//
// Markdown shield protects TeX from the Markdown renderer, then restores after
// render. Browser-side MathJax remains the authority for typesetting.

const {
    protectMarkdownMath,
    restoreProtectedMath,
    scanMathAt,
    scanEscapedDollar,
    resolveMathjaxConfig,
    pageWantsMathjax
} = require('./lib/mathjax-protect');

// Segment store keyed by the same post object Hexo threads through filters.
// WeakMap only: avoids enumerable pollution and does not rely on defineProperty.
const placeholderMap = new WeakMap();

// Fields shieldable before Markdown render (and restored after).
const PROTECT_FIELDS = ['content', 'excerpt', 'more'];

function themeConfigFromHelperContext(ctx) {
    // Hexo helpers expose theme config as this.theme (not a Theme instance).
    return (ctx && ctx.theme) || (hexo.theme && hexo.theme.config) || {};
}

// Bound to the Hexo script entrypoint (bare `hexo` is available here, not in pure lib/).
function themeMathjaxConfig() {
    return resolveMathjaxConfig((hexo.theme && hexo.theme.config) || {});
}

function mathjaxGenerateWarn(msg) {
    const cmd = (hexo.env && hexo.env.cmd) || '';
    if (cmd !== 'generate' && cmd !== 'g') return;
    if (hexo.log && typeof hexo.log.warn === 'function') hexo.log.warn(msg);
}

// Optional second arg: pre-resolved options from mathjax_options() so layout
// can call resolveMathjaxConfig once per post/page.
hexo.extend.helper.register('page_wants_mathjax', function (page, mathjaxConfig) {
    const cfg = mathjaxConfig || resolveMathjaxConfig(themeConfigFromHelperContext(this));
    return pageWantsMathjax(page, cfg);
});

// Single source for client + gate flags (layout should prefer this over ad-hoc theme.mathjax reads).
hexo.extend.helper.register('mathjax_options', function () {
    return resolveMathjaxConfig(themeConfigFromHelperContext(this));
});

function storeSegments(data, segments) {
    placeholderMap.set(data, segments);
}

function takeSegments(data) {
    const segments = placeholderMap.get(data);
    placeholderMap.delete(data);
    return segments;
}

/**
 * Protect every string field that may hold TeX (content / excerpt / more).
 * Segments are merged with globally unique placeholder ids so restore can
 * rewrite all fields with one segment list.
 *
 * @returns {{ segments: string[]|null }}
 */
function protectPostFields(data, protectOpts) {
    const allSegments = [];

    for (let i = 0; i < PROTECT_FIELDS.length; i += 1) {
        const field = PROTECT_FIELDS[i];
        const raw = data[field];
        if (typeof raw !== 'string' || !raw) continue;

        const protectedField = protectMarkdownMath(raw, protectOpts);
        if (!protectedField.segments) continue;

        const base = allSegments.length;
        const remapped = protectedField.content.replace(
            /@@SHIRO_MATH_(\d+)@@/g,
            (match, id) => '@@SHIRO_MATH_' + (base + Number(id)) + '@@'
        );
        allSegments.push.apply(allSegments, protectedField.segments);
        data[field] = remapped;
    }

    return { segments: allSegments.length ? allSegments : null };
}

function restorePostFields(data, segments) {
    for (let i = 0; i < PROTECT_FIELDS.length; i += 1) {
        const field = PROTECT_FIELDS[i];
        if (typeof data[field] === 'string' && data[field]) {
            data[field] = restoreProtectedMath(data[field], segments);
        }
    }
}

function hasDanglingPlaceholders(data) {
    for (let i = 0; i < PROTECT_FIELDS.length; i += 1) {
        const raw = data && data[PROTECT_FIELDS[i]];
        if (typeof raw === 'string' && /@@SHIRO_MATH_\d+@@/.test(raw)) return true;
    }
    return false;
}

hexo.extend.filter.register('before_post_render', function (data) {
    const cfg = themeMathjaxConfig();
    if (!pageWantsMathjax(data, cfg) || !data) {
        return data;
    }
    if (!cfg.protect) return data;

    const protectOpts = {
        inlineDollars: cfg.inlineDollars,
        processEscapes: cfg.processEscapes,
        sourcePath: data.source || data.path || '',
        warn: mathjaxGenerateWarn
    };

    const { segments } = protectPostFields(data, protectOpts);
    if (!segments) return data;

    storeSegments(data, segments);
    return data;
});

// Priority 5: restore before scripts/images.js (default 10).
// Key off segments only — if protect ran, always restore (no second gate resolve).
hexo.extend.filter.register('after_post_render', function (data) {
    const segments = takeSegments(data);
    if (!segments) {
        if (hasDanglingPlaceholders(data)) {
            mathjaxGenerateWarn(
                '[mathjax] placeholders remain but segments are missing'
                + (data && (data.source || data.path) ? ' in ' + (data.source || data.path) : '')
            );
        }
        return data;
    }

    restorePostFields(data, segments);
    return data;
}, 5);

// Public surface for unit tests: pure protect/restore + gate helpers.
// Registration side effects stay in this file.
module.exports = {
    protectMarkdownMath,
    restoreProtectedMath,
    scanMathAt,
    scanEscapedDollar,
    resolveMathjaxConfig,
    pageWantsMathjax,
    themeMathjaxConfig,
    PROTECT_FIELDS,
    protectPostFields,
    restorePostFields,
    storeSegments,
    takeSegments
};
