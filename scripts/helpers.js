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
    normalizedLinkTarget,
    normalizeLangAttr,
    normalizeOpenGraphImageUrl,
    resolveAbsolutePageUrl,
    sriAttrsHtml,
    cspNonceAttrHtml
} = require('./lib/urls');
const { isFeatureEnabled } = require('./lib/features');
const {
    pageAnalysis,
    pageHasCode,
    pageCodeFlags,
    pageLooksLong,
    excerptFor,
    excerptForCard,
    buildPostCardViewModels
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
const { pageLanguage, escapeHtml, escapeAttr } = require('./lib/util');
const { resolveCommentsState } = require('./lib/comments');
const {
    resolveFeatureGates,
    buildCommentsClientConfig
} = require('./lib/feature-gates');
const {
    DEFAULT_PREVIEW_LIMIT,
    buildCategoryIndexCards,
    categoryPathLabel,
    primaryPostCategory,
    postCategoryPaths,
    postMetaCategorySummary,
    resolveCategoryForPage
} = require('./lib/categories');
const { groupPostsByYear, archivePeriod } = require('./lib/archive');
const { defaultFirstImageLoading } = require('./lib/image-optimize');

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

hexo.extend.helper.register('page_code_flags', function (page, themeConfig) {
    return pageCodeFlags(page, themeConfig, this);
});

hexo.extend.helper.register('page_looks_long', function (page) {
    return pageLooksLong(page);
});

hexo.extend.helper.register('js_value', function (value) {
    return safeScriptJson(value);
});

// Canonical bag key for window.__shiro (bare names only).
hexo.extend.helper.register('shiro_bag_key', function (key) {
    return String(key == null ? '' : key);
});

// HTML text / attribute escaping (hexo-renderer-nunjucks sets autoescape: false).
hexo.extend.helper.register('escape_html', function (value) {
    return escapeHtml(value);
});

hexo.extend.helper.register('escape_attr', function (value) {
    return escapeAttr(value);
});

// Attribute-context URL helpers (prefer these over raw url_for / versioned_url in href/src).
hexo.extend.helper.register('attr_url', function (value) {
    return escapeAttr(value == null ? '' : value);
});

hexo.extend.helper.register('href_for', function (path) {
    return escapeAttr(this.url_for(path));
});

// Optional SRI attribute string for CDN tags (integrity + crossorigin), or "".
// Non-empty invalid digests are ignored and warned once per generate.
hexo.extend.helper.register('sri_attrs', function (integrity) {
    return sriAttrsHtml(integrity, {
        warn: (msg) => {
            if (hexo.log && typeof hexo.log.warn === 'function') hexo.log.warn(msg);
        }
    });
});

// Optional CSP nonce attribute. Prefer gates.shiroCspNonce (single normalize per page).
// With no arg: falls back to theme.security.csp_nonce (child themes / head before gates).
hexo.extend.helper.register('csp_nonce_attr', function (nonce) {
    if (arguments.length >= 1) {
        return cspNonceAttrHtml(nonce);
    }
    const security = (this.theme && this.theme.security) || {};
    return cspNonceAttrHtml(security.csp_nonce);
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

hexo.extend.helper.register('link_target', function (value) {
    return normalizedLinkTarget(value);
});

hexo.extend.helper.register('is_blank_target', function (value) {
    return normalizedLinkTarget(value).toLowerCase() === '_blank';
});

// defaultOn true → enabled unless false; defaultOn false → enabled only when true.
hexo.extend.helper.register('feature_enabled', function (value, defaultOn) {
    return isFeatureEnabled(value, defaultOn === true || defaultOn === 'true');
});

// comments_state: thin alias for child themes / tests. Layout should prefer
// page_feature_gates().shiroComments (same resolveCommentsState under the hood).
hexo.extend.helper.register('comments_state', function (page) {
    return resolveCommentsState(this.theme, page, {
        isPost: typeof this.is_post === 'function' && this.is_post(),
        isPage: typeof this.is_page === 'function' && this.is_page()
    });
});

// Page feature gates + CDN URLs for layout (pure policy lives in feature-gates.js).
// Layout templates must bind gates once here — do not re-implement feature policy.
hexo.extend.helper.register('page_feature_gates', function () {
    const page = this.page || {};
    const theme = this.theme || {};
    const security = theme.security || {};
    const isPost = typeof this.is_post === 'function' && this.is_post();
    const isPage = typeof this.is_page === 'function' && this.is_page();
    const isHome = typeof this.is_home === 'function' && this.is_home();
    const tocConfig = theme.toc || {};
    const menu = theme.menu || [];

    // One TOC build per page (cachedToc); gates + article share this result.
    const toc = this.build_toc(page, tocConfig);
    const codeFlags = this.page_code_flags(page, theme);

    const gates = resolveFeatureGates({
        theme,
        page,
        config: this.config || {},
        isPost,
        isPage,
        isHome,
        hasCode: codeFlags.hasCode,
        hasCodeBlocks: codeFlags.hasCodeBlocks,
        hasClipboardTargets: codeFlags.hasClipboardTargets,
        hasImages: this.has_images(page),
        looksLong: this.page_looks_long(page),
        shouldRenderToc: !!toc.shouldRender,
        menuLength: menu.length,
        resolveResourceUrl: (value, fallback) => safeResourceUrl(value, this, fallback),
        cspNonce: security.csp_nonce,
        warn: (msg) => {
            if (hexo.log && typeof hexo.log.warn === 'function') hexo.log.warn(msg);
        }
    });

    gates.toc = toc;

    // Single comments resolve: client bag reuses gates.shiroComments.
    gates.commentsClientConfig = buildCommentsClientConfig(theme, page, {
        isPost,
        isPage,
        pageUrl: page.permalink || this.url || '',
        pageIdentifier: page.path || this.path || page.permalink || this.url || '',
        state: gates.shiroComments
    });

    return gates;
});

// Thin alias for child themes / tests. Layout prefers gates.commentsClientConfig.
hexo.extend.helper.register('comments_client_config', function (page) {
    const p = page || this.page || {};
    return buildCommentsClientConfig(this.theme, p, {
        isPost: typeof this.is_post === 'function' && this.is_post(),
        isPage: typeof this.is_page === 'function' && this.is_page(),
        pageUrl: p.permalink || this.url || '',
        pageIdentifier: p.path || this.path || p.permalink || this.url || ''
    });
});

hexo.extend.helper.register('lang_attr', function (value) {
    return normalizeLangAttr(value);
});

// Full path label for tooltips / detail titles (e.g. "A / B / C").
hexo.extend.helper.register('category_path_label', function (category) {
    return categoryPathLabel(category, this.site && this.site.categories);
});

// Deepest post category for compact meta (home cards).
hexo.extend.helper.register('post_primary_category', function (post) {
    const cats = post && post.categories;
    const list = cats && typeof cats.toArray === 'function' ? cats.toArray() : cats;
    return primaryPostCategory(list, this.site && this.site.categories);
});

// Full article meta: one root → leaf chain per independent category assignment.
hexo.extend.helper.register('post_category_paths', function (post) {
    const cats = post && post.categories;
    const list = cats && typeof cats.toArray === 'function' ? cats.toArray() : cats;
    return postCategoryPaths(list, this.site && this.site.categories);
});

// Home meta: deepest primary + parallel moreCount + hover title of all topic paths.
hexo.extend.helper.register('post_meta_category', function (post) {
    const cats = post && post.categories;
    const list = cats && typeof cats.toArray === 'function' ? cats.toArray() : cats;
    return postMetaCategorySummary(list, this.site && this.site.categories);
});

// Categories index: one view-model per node (exclusive count/preview).
// Count tooltip copy is assembled in the template via categories.count_hint (i18n).
hexo.extend.helper.register('category_index_cards', function () {
    const cfg = (this.theme && this.theme.category_index) || {};
    let limit = Number(cfg.preview_limit);
    if (!Number.isFinite(limit) || limit < 0) limit = DEFAULT_PREVIEW_LIMIT;
    return buildCategoryIndexCards(this.site && this.site.categories, {
        previewLimit: limit
    });
});

hexo.extend.helper.register('category_for_page', function (page) {
    return resolveCategoryForPage(page || this.page, this.site && this.site.categories);
});

// Yearly archive URL helper: honours Hexo's archive_dir instead of a hard-coded
// 'archives/' segment, so custom archive_dir sites link to the right page.
hexo.extend.helper.register('archive_url', function (year) {
    const configured = String((this.config && this.config.archive_dir)
        || (hexo.config && hexo.config.archive_dir)
        || 'archives').replace(/^\/+|\/+$/g, '');
    const archiveDir = configured || 'archives';
    const path = String(this.url_for(archiveDir + '/' + year) || '').replace(/\/+$/, '');
    return path + '/';
});

hexo.extend.helper.register('archive_period', function (page) {
    return archivePeriod(page);
});

// Year → posts groups for archive/tag/category list templates (no open/close div state in Nunjucks).
hexo.extend.helper.register('posts_by_year', function (posts) {
    return groupPostsByYear(posts, (post) => {
        if (!post || post.date == null) return '';
        if (typeof this.date === 'function') return String(this.date(post.date, 'YYYY') || '');
        const d = post.date;
        if (typeof d.year === 'function') return String(d.year());
        if (typeof d.format === 'function') return String(d.format('YYYY'));
        const date = d instanceof Date ? d : new Date(d);
        return Number.isFinite(date.getTime()) ? String(date.getFullYear()) : '';
    });
});

// Cache-busting helper: appends ?v=<hash> to local asset URLs
hexo.extend.helper.register('versioned_url', function (assetPath) {
    const rel = String(assetPath || '').replace(/^\/+/, '');
    // Reject absolute paths and parent segments (theme-controlled paths only).
    if (!rel || pathFn.isAbsolute(String(assetPath || '')) || /(^|[\\/])\.\.([\\/]|$)/.test(rel)) {
        return this.url_for(assetPath);
    }

    const sourceDir = pathFn.join(hexo.theme_dir, 'source');
    const filePath = pathFn.join(sourceDir, rel);
    const relative = pathFn.relative(sourceDir, filePath);
    const outside = relative === '..' || relative.startsWith('..' + pathFn.sep);
    if (!relative || outside || pathFn.isAbsolute(relative)) {
        return this.url_for(assetPath);
    }

    const url = this.url_for(rel);
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

hexo.extend.helper.register('excerpt_for', function (post, length) {
    return excerptFor(post, length);
});

// Home cards: applies theme.excerpt.fallback and the per-page image loading default.
hexo.extend.helper.register('excerpt_for_card', function (post, firstCard) {
    const excerpt = excerptForCard(post, this.theme || {});
    return {
        ...excerpt,
        content: defaultFirstImageLoading(excerpt.content, firstCard ? 'eager' : 'lazy')
    };
});

hexo.extend.helper.register('post_card_view_models', function (posts) {
    return buildPostCardViewModels(posts, this.theme || {});
});

hexo.extend.helper.register('default_image_loading', function (html, value) {
    return defaultFirstImageLoading(html, value);
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
    const isCategory = typeof this.is_category === 'function' && this.is_category();
    const category = isCategory
        ? resolveCategoryForPage(page, this.site && this.site.categories)
        : null;
    return buildPageTitle(page, config, {
        isHome: typeof this.is_home === 'function' && this.is_home(),
        isArchive: typeof this.is_archive === 'function' && this.is_archive(),
        isTag: typeof this.is_tag === 'function' && this.is_tag(),
        isCategory,
        categoryLabel: category
            ? categoryPathLabel(category, this.site && this.site.categories)
            : '',
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

hexo.extend.helper.register('og_image_alt', function (page) {
    return resolveOpenGraphImage(this, page).alt;
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
    const themeSite = (this.theme && this.theme.site) || {};
    const favicon = String(themeSite.favicon || '/favicon.svg').trim();
    const defaultPublisherLogo = normalizeOpenGraphImageUrl('/favicon.svg', this, null);
    const configuredPublisherLogo = normalizeOpenGraphImageUrl(favicon, this, null);
    const publisherLogoUrl = configuredPublisherLogo
        || (/^data:image\//i.test(favicon) ? '' : defaultPublisherLogo);
    return structuredData(page, cfg, {
        pageUrl: resolveAbsolutePageUrl(this, page, cfg.url || ''),
        description: this.clean_description(page, cfg),
        image: this.og_image(page),
        isPost: typeof this.is_post === 'function' && this.is_post(),
        isHome: typeof this.is_home === 'function' && this.is_home(),
        publisherLogo: publisherLogoUrl
            ? {
                url: publisherLogoUrl,
                width: publisherLogoUrl === defaultPublisherLogo ? 112 : 0,
                height: publisherLogoUrl === defaultPublisherLogo ? 112 : 0
            }
            : null
    });
});
