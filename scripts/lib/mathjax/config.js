'use strict';

// Theme mathjax config (defaults match _config.yml).
// enabled: false → never; true → every_page / front-matter.
// every_page: false → only mathjax: true; true → all posts/pages except mathjax: false.
// CDN default: keep in sync with _config.yml mathjax.src (single export for feature-gates).
const DEFAULT_MATHJAX_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js';

function resolveMathjaxTags(value) {
    const text = String(value == null ? 'none' : value).trim().toLowerCase();
    return text === 'ams' || text === 'all' ? text : 'none';
}

function resolveMathjaxConfig(themeConfig) {
    // Prefer themeConfig.mathjax; never fall back to the whole theme object
    // (avoids reading unrelated root keys if mathjax is missing).
    const root = themeConfig || {};
    const cfg = (root.mathjax != null && typeof root.mathjax === 'object')
        ? root.mathjax
        : {};
    const src = String(cfg.src == null ? '' : cfg.src).trim();
    return {
        // Default off: must set enabled: true, then every_page and/or front-matter.
        enabled: cfg.enabled === true,
        everyPage: cfg.every_page === true,
        // Default on: shield marked from eating TeX. Set false when using
        // pandoc --mathjax or a server-side math plugin that already handles this.
        protect: cfg.protect !== false,
        // Default off: same as MathJax v4 (only \(...\) unless opted in).
        inlineDollars: cfg.inline_dollars === true,
        // MathJax tex.processEnvironments (client). Default true matches v4.
        processEnvironments: cfg.process_environments !== false,
        // MathJax tex.processEscapes (client). Default true matches v3+/v4.
        processEscapes: cfg.process_escapes !== false,
        // Client equation numbering: none | ams | all.
        tags: resolveMathjaxTags(cfg.tags),
        // CDN / self-hosted script URL (layout still runs safe_resource_url_for).
        src: src || DEFAULT_MATHJAX_SRC,
        // Optional SRI digest for mathjax.src (empty = omit integrity).
        integrity: String(cfg.integrity == null ? '' : cfg.integrity).trim()
    };
}

// Whether this post/page should load MathJax and (if protect) run the shield.
// Load and protect intentionally share this predicate so the two never diverge.
// With every_page: true that means every post/page (except mathjax: false) is
// scanned by protect even when the page has no formulas — acceptable cost.
// Layout still ANDs (is_post() || is_page()). Filters only see post/page documents.
//
// Callers must pass resolved config (no Hexo global in this pure module).
//
//   enabled false                              → never
//   mathjax: true                              → yes
//   every_page true and mathjax not false      → yes
//   otherwise                                  → no
function pageWantsMathjax(data, mathjaxConfig) {
    if (!data) return false;
    const cfg = mathjaxConfig || resolveMathjaxConfig({});
    if (!cfg.enabled) return false;
    if (data.mathjax === true) return true;
    if (cfg.everyPage && data.mathjax !== false) return true;
    return false;
}

module.exports = {
    DEFAULT_MATHJAX_SRC,
    resolveMathjaxTags,
    resolveMathjaxConfig,
    pageWantsMathjax
};
