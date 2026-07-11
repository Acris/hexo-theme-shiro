'use strict';

// Pure page feature gates + CDN resource resolution (no Hexo registration).
// Layout consumes page_feature_gates() so Nunjucks only binds names, not policy.

const {
    isFeatureEnabled,
    normalizeLangAttr,
    normalizeSriIntegrity,
    normalizeCspNonce,
    resourceOrigin
} = require('./urls');
const { resolveCommentsState } = require('./comments');
const {
    resolveMathjaxConfig,
    pageWantsMathjax,
    DEFAULT_MATHJAX_SRC
} = require('./mathjax-protect');

// LightGallery CDN defaults — keep in sync with _config.yml lightGallery.* only.
// Client scripts must use template-injected window.__lightgallery* (no hardcoded fallback).
const DEFAULT_LIGHTGALLERY_JS = 'https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/lightgallery.min.js';
const DEFAULT_LIGHTGALLERY_CSS = 'https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/css/lightgallery.min.css';

function resolveDarkModeDefault(raw) {
    const text = String(raw == null ? 'light' : raw).trim();
    return text === 'system' || text === 'dark' ? text : 'light';
}

/**
 * Ordered theme-relative foot scripts (versioned in layout via versioned_url).
 * Comments scripts stay in comments/foot.njk (inline + provider).
 */
function buildFootScripts(flags) {
    const scripts = [];
    if (flags.needsRuntimeFoot) scripts.push('js/runtime.min.js');
    if (flags.searchEnabled) scripts.push('js/search-bootstrap.min.js');
    if (flags.needsLightgallery) scripts.push('js/lightgallery-bootstrap.min.js');
    if (flags.needsCode) scripts.push('js/clipboard-bootstrap.min.js');
    if (flags.needsToc) scripts.push('js/toc.min.js');
    if (flags.needsProgressBar) scripts.push('js/progress.min.js');
    if (flags.needsBackToTop) scripts.push('js/back-to-top.min.js');
    if (flags.darkModeToggle) scripts.push('js/theme-toggle.min.js');
    if (flags.needsMobileMenu) scripts.push('js/mobile-menu-bootstrap.min.js');
    return scripts;
}

/**
 * @param {object} input
 * @param {object} input.theme
 * @param {object} [input.page]
 * @param {object} [input.config]
 * @param {boolean} input.isPost
 * @param {boolean} input.isPage
 * @param {boolean} input.isHome
 * @param {boolean} input.hasCode
 * @param {boolean} input.hasImages
 * @param {boolean} input.looksLong
 * @param {boolean} input.shouldRenderToc
 * @param {number} input.menuLength
 * @param {function(string, string): string} input.resolveResourceUrl safeResourceUrl(value, fallback)
 * @param {string} [input.cspNonce]
 * @returns {object} gates bound by layout templates
 */
function resolveFeatureGates(input) {
    const theme = input.theme || {};
    const page = input.page || {};
    const config = input.config || {};
    const isPost = !!input.isPost;
    const isPage = !!input.isPage;
    const isHome = !!input.isHome;
    const reading = isPost || isPage;
    const resolveResourceUrl = typeof input.resolveResourceUrl === 'function'
        ? input.resolveResourceUrl
        : (value, fallback) => String(value || fallback || '');

    const site = theme.site || {};
    const lightGallery = theme.lightGallery || {};
    const toc = theme.toc || {};
    const search = theme.search || {};
    const darkMode = theme.dark_mode || {};
    const progressBar = theme.progress_bar || {};
    const backToTop = theme.back_to_top || {};

    const darkModeDefault = resolveDarkModeDefault(darkMode.default);
    const darkModeToggle = isFeatureEnabled(darkMode.toggle, true);
    const searchEnabled = isFeatureEnabled(search.enabled, false);
    const siteSealEnabled = isFeatureEnabled(site.seal, true);
    const siteFavicon = site.favicon != null && site.favicon !== ''
        ? site.favicon
        : '/favicon.svg';

    const configLang = Array.isArray(config.language) ? config.language[0] : config.language;
    const pageLangRaw = page.lang || page.language || configLang;
    const pageLang = normalizeLangAttr(pageLangRaw) || 'en';

    const needsCode = !!input.hasCode;
    const needsToc = isFeatureEnabled(toc.enabled, true) && reading && !!input.shouldRenderToc;

    const mathjaxOpts = resolveMathjaxConfig(theme);
    const needsMathjax = reading && pageWantsMathjax(page, mathjaxOpts);
    const mathjaxSrc = needsMathjax
        ? resolveResourceUrl(mathjaxOpts.src, DEFAULT_MATHJAX_SRC)
        : '';
    const mathjaxIntegrity = needsMathjax
        ? normalizeSriIntegrity(mathjaxOpts.integrity)
        : '';

    const needsLightgallery = isFeatureEnabled(lightGallery.enabled, true)
        && reading
        && !!input.hasImages;
    const lightgalleryJsUrl = needsLightgallery
        ? resolveResourceUrl(
            lightGallery.js != null && lightGallery.js !== ''
                ? lightGallery.js
                : DEFAULT_LIGHTGALLERY_JS,
            DEFAULT_LIGHTGALLERY_JS
        )
        : '';
    const lightgalleryCssUrl = needsLightgallery
        ? resolveResourceUrl(
            lightGallery.css != null && lightGallery.css !== ''
                ? lightGallery.css
                : DEFAULT_LIGHTGALLERY_CSS,
            DEFAULT_LIGHTGALLERY_CSS
        )
        : '';
    const lightgalleryJsIntegrity = needsLightgallery
        ? normalizeSriIntegrity(lightGallery.js_integrity)
        : '';
    const lightgalleryCssIntegrity = needsLightgallery
        ? normalizeSriIntegrity(lightGallery.css_integrity)
        : '';
    const lightgalleryPreconnectUrl = needsLightgallery
        ? resourceOrigin(lightgalleryJsUrl)
        : '';

    const needsProgressBar = isFeatureEnabled(progressBar.enabled, true) && isPost;
    // Home always; long reading pages (post or page) when content looks long.
    const needsBackToTop = isFeatureEnabled(backToTop.enabled, true)
        && (isHome || (reading && !!input.looksLong));
    const needsMobileMenu = Number(input.menuLength) > 0;

    const comments = resolveCommentsState(theme, page, { isPost, isPage });
    const needsComments = comments.shouldRender;

    const needsFeatureRuntime = searchEnabled
        || needsLightgallery
        || needsCode
        || needsMobileMenu;
    const needsRuntimeFoot = needsFeatureRuntime || needsComments;
    const shiroCspNonce = normalizeCspNonce(input.cspNonce);

    const footScripts = buildFootScripts({
        needsRuntimeFoot,
        searchEnabled,
        needsLightgallery,
        needsCode,
        needsToc,
        needsProgressBar,
        needsBackToTop,
        darkModeToggle,
        needsMobileMenu
    });

    return {
        siteConfig: site,
        searchConfig: search,
        menuItems: theme.menu || [],

        darkModeDefault,
        darkModeToggle,
        searchEnabled,
        siteSealEnabled,
        siteFavicon,
        pageLang,

        needsCode,
        needsToc,

        needsMathjax,
        mathjaxSrc,
        mathjaxInlineDollars: needsMathjax ? mathjaxOpts.inlineDollars : false,
        mathjaxProcessEnvironments: needsMathjax ? mathjaxOpts.processEnvironments : true,
        mathjaxProcessEscapes: needsMathjax ? mathjaxOpts.processEscapes : true,
        mathjaxTags: needsMathjax ? mathjaxOpts.tags : 'none',
        mathjaxIntegrity,

        needsLightgallery,
        lightgalleryJsUrl,
        lightgalleryCssUrl,
        lightgalleryJsIntegrity,
        lightgalleryCssIntegrity,
        lightgalleryPreconnectUrl,

        needsProgressBar,
        needsBackToTop,
        needsMobileMenu,

        shiroComments: comments,
        needsComments,

        needsFeatureRuntime,
        needsRuntimeFoot,
        footScripts,
        shiroCspNonce
    };
}

/**
 * Client payload for comment provider scripts (injected once via feature_var).
 * @param {object} theme
 * @param {object} page
 * @param {object} options isPost/isPage + pageUrl helpers
 */
function buildCommentsClientConfig(theme, page, options) {
    const opts = options || {};
    const state = resolveCommentsState(theme, page, {
        isPost: opts.isPost,
        isPage: opts.isPage
    });
    const comments = (theme && theme.comments) || {};
    const disqus = comments.disqus || {};
    const giscus = comments.giscus || {};

    return {
        provider: state.provider,
        disqusReady: state.disqusReady,
        giscusReady: state.giscusReady,
        disqus: {
            shortname: String(disqus.shortname || '').trim(),
            pageUrl: opts.pageUrl || '',
            pageIdentifier: opts.pageIdentifier || ''
        },
        giscus: {
            src: giscus.src || '',
            repo: giscus.repo || '',
            repo_id: giscus.repo_id || '',
            category: giscus.category || '',
            category_id: giscus.category_id || '',
            mapping: giscus.mapping || 'pathname',
            term: giscus.term || '',
            strict: giscus.strict != null ? giscus.strict : '0',
            reactions_enabled: giscus.reactions_enabled != null ? giscus.reactions_enabled : '1',
            emit_metadata: giscus.emit_metadata != null ? giscus.emit_metadata : '0',
            input_position: giscus.input_position || 'bottom',
            theme: giscus.theme || 'preferred_color_scheme',
            lang: giscus.lang || 'en',
            lazy_loading: !!giscus.lazy_loading
        }
    };
}

module.exports = {
    DEFAULT_LIGHTGALLERY_JS,
    DEFAULT_LIGHTGALLERY_CSS,
    DEFAULT_MATHJAX_SRC,
    resolveDarkModeDefault,
    resolveFeatureGates,
    buildFootScripts,
    buildCommentsClientConfig
};
