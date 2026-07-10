'use strict';

// Hexo MathJax filters/helpers — pure logic lives in scripts/lib/mathjax-protect.js.
//
// Theme config (hexo.theme.config.mathjax), defaults match _config.yml:
//   enabled, every_page, inline_dollars, process_environments, process_escapes,
//   protect, src, tags
//
// Markdown shield protects TeX from the Markdown renderer, then restores after
// render. Browser-side MathJax remains the authority for typesetting.

const {
    PLACEHOLDER_PROP,
    protectMarkdownMath,
    restoreProtectedMath,
    scanMathAt,
    scanEscapedDollar,
    resolveMathjaxConfig,
    pageWantsMathjax
} = require('./lib/mathjax-protect');

function themeConfigFromHelperContext(ctx) {
    // Hexo helpers expose theme config as this.theme (not a Theme instance).
    return (ctx && ctx.theme) || (hexo.theme && hexo.theme.config) || {};
}

// Bound to the Hexo script entrypoint (bare `hexo` is available here, not in pure lib/).
function themeMathjaxConfig() {
    return resolveMathjaxConfig((hexo.theme && hexo.theme.config) || {});
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

// Non-enumerable so intermediate placeholder lists do not show up in
// Object.keys / JSON.stringify of the post between protect and restore.
function setHiddenPostValue(data, key, value) {
    try {
        Object.defineProperty(data, key, {
            configurable: true,
            enumerable: false,
            writable: true,
            value
        });
    } catch (_) {
        data[key] = value;
    }
}

hexo.extend.filter.register('before_post_render', function (data) {
    const cfg = themeMathjaxConfig();
    if (!pageWantsMathjax(data, cfg) || typeof data.content !== 'string' || !data.content) {
        return data;
    }
    if (!cfg.protect) return data;

    const protectedMath = protectMarkdownMath(data.content, {
        inlineDollars: cfg.inlineDollars,
        sourcePath: data.source || data.path || ''
    });
    if (!protectedMath.segments) return data;

    data.content = protectedMath.content;
    setHiddenPostValue(data, PLACEHOLDER_PROP, protectedMath.segments);
    return data;
});

// Priority 5: restore before scripts/images.js (default 10).
// Key off segments only — if protect ran, always restore (no second gate resolve).
hexo.extend.filter.register('after_post_render', function (data) {
    const segments = data[PLACEHOLDER_PROP];
    if (!segments) return data;

    data.content = restoreProtectedMath(data.content, segments);
    if (typeof data.excerpt === 'string' && data.excerpt) {
        data.excerpt = restoreProtectedMath(data.excerpt, segments);
    }
    if (typeof data.more === 'string' && data.more) {
        data.more = restoreProtectedMath(data.more, segments);
    }
    delete data[PLACEHOLDER_PROP];
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
    themeMathjaxConfig
};
