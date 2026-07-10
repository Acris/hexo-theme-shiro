'use strict';

// Thin Hexo registrar — pure logic lives in scripts/lib/*.
// Keep this file as registration + I/O-bound helpers only.

const crypto = require('crypto');
const fs = require('fs');
const pathFn = require('path');

const {
    safeNavigationUrl,
    safeResourceUrl,
    safeScriptJson,
    resourceOrigin,
    normalizedLinkTarget,
    resolveAbsolutePageUrl
} = require('./lib/urls');
const {
    pageAnalysis,
    pageHasCode,
    pageLooksLong,
    excerptFor
} = require('./lib/html-analysis');
const { cachedToc } = require('./lib/toc');
const {
    cleanDescription,
    copyrightYear,
    structuredData,
    buildPageTitle,
    resolveOpenGraphImage,
    openGraphLocale,
    faviconSvg
} = require('./lib/seo');
const { googleFontUrls } = require('./lib/fonts');
const { SEAL_PATH_D } = require('./lib/seal');
const { pageLanguage } = require('./lib/util');

const assetHashCache = new Map();

hexo.extend.helper.register('should_render_toc', function (page, tocConfig) {
    return cachedToc(page, tocConfig).shouldRender;
});

hexo.extend.helper.register('build_toc', function (page, tocConfig) {
    return cachedToc(page, tocConfig);
});

hexo.extend.helper.register('google_font_urls', function (page, config, themeConfig, hasCode) {
    return googleFontUrls(page, config, themeConfig, hasCode, pageHasCode, this);
});

hexo.extend.helper.register('page_has_code', function (page, themeConfig) {
    return pageHasCode(page, themeConfig, this);
});

hexo.extend.helper.register('page_looks_long', function (page) {
    return pageLooksLong(page);
});

hexo.extend.helper.register('js_value', function (value) {
    return safeScriptJson(value);
});

hexo.extend.helper.register('url_query', function (value) {
    return encodeURIComponent(String(value || ''));
});

hexo.extend.helper.register('safe_url_for', function (value, fallback) {
    return safeNavigationUrl(value, this, fallback);
});

hexo.extend.helper.register('safe_resource_url_for', function (value, fallback, options) {
    return safeResourceUrl(value, this, fallback, options);
});

hexo.extend.helper.register('resource_origin_for', function (value, fallback) {
    return resourceOrigin(safeResourceUrl(value, this, fallback || ''));
});

hexo.extend.helper.register('link_target', function (value) {
    return normalizedLinkTarget(value);
});

hexo.extend.helper.register('is_blank_target', function (value) {
    return normalizedLinkTarget(value).toLowerCase() === '_blank';
});

// Yearly archive URL helper: honours Hexo's archive_dir instead of a hard-coded
// 'archives/' segment, so custom archive_dir sites link to the right page.
hexo.extend.helper.register('archive_url', function (year) {
    const configured = String((hexo.config && hexo.config.archive_dir) || 'archives').replace(/^\/+|\/+$/g, '');
    const archiveDir = configured || 'archives';
    return this.url_for(archiveDir + '/' + year) + '/';
});

// Cache-busting helper: appends ?v=<hash> to local asset URLs
hexo.extend.helper.register('versioned_url', function (assetPath) {
    const sourceDir = pathFn.join(hexo.theme_dir, 'source');
    const filePath = pathFn.join(sourceDir, assetPath);

    const url = this.url_for(assetPath);
    let versionedUrl = url;
    try {
        const stat = fs.statSync(filePath);
        const cached = assetHashCache.get(filePath);
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
            versionedUrl = cached.hash ? url + '?v=' + cached.hash : url;
        } else {
            const content = fs.readFileSync(filePath);
            const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
            assetHashCache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, hash });
            versionedUrl = url + '?v=' + hash;
        }
    } catch (_) {
        // File not found at theme level; fall back to plain url_for
        assetHashCache.set(filePath, { mtimeMs: 0, size: 0, hash: '' });
    }

    return versionedUrl;
});

hexo.extend.helper.register('has_images', function (page) {
    return pageAnalysis(page).imageCount > 0;
});

hexo.extend.helper.register('first_image', function (page) {
    return pageAnalysis(page).firstImage;
});

hexo.extend.helper.register('excerpt_for', function (post, length) {
    return excerptFor(post, length);
});

hexo.extend.helper.register('clean_description', function (page, config) {
    const isReadingPage = (typeof this.is_post === 'function' && this.is_post())
        || (typeof this.is_page === 'function' && this.is_page());
    const stripHtml = typeof this.strip_html === 'function'
        ? value => this.strip_html(value)
        : undefined;
    return cleanDescription(page, config, { isReadingPage, stripHtml });
});

hexo.extend.helper.register('copyright_year', function (since) {
    return copyrightYear(since);
});

hexo.extend.helper.register('build_page_title', function (page, config) {
    return buildPageTitle(page, config, {
        isHome: typeof this.is_home === 'function' && this.is_home(),
        isArchive: typeof this.is_archive === 'function' && this.is_archive(),
        isTag: typeof this.is_tag === 'function' && this.is_tag(),
        isCategory: typeof this.is_category === 'function' && this.is_category(),
        pageNumberLabel: (n) => this.__('page.number', n),
        t: (key) => this.__(key)
    });
});

// Shared seal path — exposed so the header macro can render the same shape as favicon.svg
hexo.extend.helper.register('seal_path_d', () => SEAL_PATH_D);

// Generate favicon.svg dynamically from seal_text config
hexo.extend.generator.register('favicon_svg', function () {
    const themeConfig = this.theme.config || this.config.theme_config || {};
    const text = (themeConfig.site && themeConfig.site.seal_text) || '白';
    return { path: 'favicon.svg', data: faviconSvg(text) };
});

hexo.extend.helper.register('og_image', function (page) {
    return resolveOpenGraphImage(this, page).url;
});

// og:image dimensions, reused from the width/height scripts/images.js injects into the
// rendered content <img>. Null unless both are known (skips remote/photo-sourced images).
hexo.extend.helper.register('og_image_size', function (page) {
    const resolved = resolveOpenGraphImage(this, page);
    if (!resolved.url || resolved.width <= 0 || resolved.height <= 0) return null;
    return { width: resolved.width, height: resolved.height };
});

hexo.extend.helper.register('og_locale', function (page, config) {
    return openGraphLocale(pageLanguage(page, config));
});

// Build schema.org JSON-LD nodes for the current page: BlogPosting for posts,
// WebSite for the home page. Returns an array so the template can emit a single
// <script type="application/ld+json"> only when there is something to describe.
// pageUrl is absolutized the same way as OG image URLs (full_url_for / permalink).
hexo.extend.helper.register('structured_data', function (page, config) {
    const cfg = config || this.config || {};
    return structuredData(page, cfg, {
        pageUrl: resolveAbsolutePageUrl(this, page, cfg.url || ''),
        description: typeof this.clean_description === 'function'
            ? this.clean_description(page, cfg)
            : '',
        image: typeof this.og_image === 'function' ? this.og_image(page) : '',
        isPost: typeof this.is_post === 'function' && this.is_post(),
        isHome: typeof this.is_home === 'function' && this.is_home(),
        fullUrlFor: typeof this.full_url_for === 'function'
            ? (path) => this.full_url_for(path)
            : null
    });
});

// Re-export pure modules for unit tests (Hexo loads this file for side effects).
module.exports = {
    urls: require('./lib/urls'),
    analysis: require('./lib/html-analysis'),
    toc: require('./lib/toc'),
    seo: require('./lib/seo'),
    fonts: require('./lib/fonts'),
    seal: require('./lib/seal'),
    util: require('./lib/util')
};
