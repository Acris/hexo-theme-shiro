'use strict';

// Word count & reading time display (optional site plugin: hexo-word-counter).
// Counting lives in the site plugin; this module only formats values for meta.
//
// Theme config (hexo.theme.config.word_count), defaults match _config.yml:
//   enabled — master switch (default false; also requires the site plugin)
//
// Sub-toggles (count vs time) belong to the site plugin's symbols_count_time
// (symbols / time). When the plugin is missing, wordCountMeta returns null.

const { isFeatureEnabled } = require('./lib/features');

/**
 * @param {object} ctx Hexo helper context (`this` inside a helper).
 * @param {object|null|undefined} post Post or page object.
 * @param {object} [options]
 * @param {string} [options.timeSuffix] Localized minutes label for symbolsTime.
 * @param {string} [options.countLabel] Localized "Words" label for title/tooltip.
 * @param {string} [options.timeLabel] Localized "Reading time" label for title/tooltip.
 * @returns {{ count?: string|number, time?: string, title?: string }|null}
 */
function wordCountMeta(ctx, post, options) {
    if (!post || !ctx) return null;

    // Hexo helpers expose theme config as this.theme (not a Theme instance).
    const wc = (ctx.theme && ctx.theme.word_count) || {};
    if (!isFeatureEnabled(wc.enabled, false)) return null;

    const opts = options || {};
    const out = {};
    const site = (ctx.config && ctx.config.symbols_count_time) || {};
    const showCount = isFeatureEnabled(site.symbols, true);
    const showTime = isFeatureEnabled(site.time, true);

    if (showCount && typeof ctx.symbolsCount === 'function') {
        const count = ctx.symbolsCount(post);
        if (count != null) out.count = count;
    }

    if (showTime && typeof ctx.symbolsTime === 'function') {
        // Only override suffix (i18n). Leave awl/wpm undefined so the plugin
        // uses its own symbols_count_time.wpm / defaults (see hexo-word-counter).
        const suffix = opts.timeSuffix || site.suffix || 'mins.';
        const time = ctx.symbolsTime(post, undefined, undefined, suffix);
        if (time != null) out.time = time;
    }

    if (out.count == null && out.time == null) return null;

    // Tooltip hierarchy matches on-page chip: "Words / Reading time".
    const titleParts = [];
    if (out.count != null && opts.countLabel) titleParts.push(opts.countLabel);
    if (out.time != null && opts.timeLabel) titleParts.push(opts.timeLabel);
    if (titleParts.length) out.title = titleParts.join(' / ');

    return out;
}

hexo.extend.helper.register('word_count_meta', function (post, options) {
    return wordCountMeta(this, post, options);
});

module.exports = { wordCountMeta };
