'use strict';

const { decodeHtmlEntities } = require('./util');
const { isFeatureEnabled } = require('./features');

function hasUrlControlChars(value) {
    return /[\u0000-\u001F\u007F]/.test(value);
}

function normalizedUrlText(value) {
    const text = String(value || '').trim();
    return text && !hasUrlControlChars(text) ? text : '';
}

function resolveNavigationUrl(text, context) {
    if (!text) return '';
    if (text[0] === '#') return text;
    if (/^(?:https?:)?\/\//i.test(text)) return text;
    if (/^(?:mailto|tel):/i.test(text)) return text;
    if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return '';
    return context.url_for(text);
}

function isSafeDataImageUrl(text) {
    return /^data:image\/(?:avif|bmp|gif|ico|jpeg|jpg|png|svg\+xml|vnd\.microsoft\.icon|webp|x-icon)(?:;[^,]*)?,/i.test(text);
}

function resourceUrlOptions(options) {
    if (options === true) return { allowDataImage: true };
    return options && typeof options === 'object' ? options : {};
}

function resolveResourceUrl(text, context, options) {
    const opts = resourceUrlOptions(options);
    if (!text) return '';
    if (/^(?:https?:)?\/\//i.test(text)) return text;
    if (opts.allowDataImage && isSafeDataImageUrl(text)) return text;
    if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return '';
    return context.url_for(text);
}

function safeNavigationUrl(value, context, fallback) {
    const safeFallback = resolveNavigationUrl(normalizedUrlText(fallback), context) || '#';
    return resolveNavigationUrl(normalizedUrlText(value), context) || safeFallback;
}

function safeResourceUrl(value, context, fallback, options) {
    const safeFallback = resolveResourceUrl(normalizedUrlText(fallback), context, options);
    return resolveResourceUrl(normalizedUrlText(value), context, options) || safeFallback;
}

/**
 * Scheme-safe resource URL without Hexo url_for (CDN / absolute / site-relative).
 * Blocks control chars and non-http schemes (except protocol-relative //).
 */
function normalizedResourceUrlValue(value) {
    const text = normalizedUrlText(value);
    if (!text) return '';
    if (/^(?:https?:)?\/\//i.test(text)) return text;
    if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return '';
    return text;
}

function normalizeAbsoluteResourceUrl(value, fallback) {
    return normalizedResourceUrlValue(value) || normalizedResourceUrlValue(fallback);
}

// HTML target attribute allowlist only. Empty / unknown → "" (omit the attribute).
function normalizedLinkTarget(value) {
    const text = normalizedUrlText(value);
    if (!text) return '';
    return /^(?:_self|_blank|_parent|_top)$/i.test(text) ? text : '';
}

// Canonical BCP 47 language tag for lang= attributes (page / force_language).
function normalizeLangAttr(value) {
    const text = String(value == null ? '' : value).trim();
    if (!text || /[\s"'<>`]/.test(text)) return '';
    try {
        return Intl.getCanonicalLocales(text.replace(/_/g, '-'))[0] || '';
    } catch (_) {
        return '';
    }
}

function safeScriptJson(value) {
    let json;
    try {
        json = JSON.stringify(value === undefined ? null : value);
    } catch (_) {
        json = JSON.stringify(String(value));
    }
    return (json === undefined ? 'null' : json)
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

function resourceOrigin(value) {
    const text = normalizedUrlText(value);
    if (!text || !/^(?:https?:)?\/\//i.test(text)) return '';
    try {
        return new URL(text.indexOf('//') === 0 ? 'https:' + text : text).origin;
    } catch (_) {
        return '';
    }
}

function absoluteUrlForLocalPath(value, context) {
    if (context && typeof context.full_url_for === 'function') {
        const fullUrl = context.full_url_for(value);
        if (/^https?:\/\//i.test(fullUrl)) return fullUrl;
    }

    const assetUrl = context && typeof context.url_for === 'function'
        ? context.url_for(value, { relative: false })
        : value;
    if (/^https?:\/\//i.test(assetUrl)) return assetUrl;

    const base = String((context && context.config && context.config.url) || '').replace(/\/$/, '');
    if (!base) return assetUrl;

    try {
        const parsed = new URL(base);
        const basePath = parsed.pathname.replace(/\/$/, '');
        if (basePath && (assetUrl === basePath || assetUrl.startsWith(basePath + '/'))) {
            return parsed.origin + assetUrl;
        }
    } catch (_) {}

    return base + (assetUrl[0] === '/' ? assetUrl : '/' + assetUrl);
}

function pageRelativeImageUrl(value, page) {
    if (!page || !page.permalink || value[0] === '/') return '';

    try {
        const resolved = new URL(value, page.permalink).href;
        return /^https?:\/\//i.test(resolved) ? resolved : '';
    } catch (_) {
        return '';
    }
}

function normalizeOpenGraphImageUrl(src, context, page) {
    const value = decodeHtmlEntities(String(src || '')).trim();
    if (!value || value[0] === '#') return '';
    if (hasUrlControlChars(value)) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.indexOf('//') === 0) return 'https:' + value;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';

    return pageRelativeImageUrl(value, page) || absoluteUrlForLocalPath(value, context);
}

function isAbsoluteHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || ''));
}

// Accept only standard SRI digests (sha256|384|512-base64). Empty / invalid → no attrs.
function normalizeSriIntegrity(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = /^(sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$/.exec(text);
    if (!match) return '';

    const expectedBytes = { sha256: 32, sha384: 48, sha512: 64 }[match[1]];
    const decoded = Buffer.from(match[2], 'base64');
    const canonical = decoded.toString('base64').replace(/=+$/, '');
    const supplied = match[2].replace(/=+$/, '');
    return decoded.length === expectedBytes && canonical === supplied ? text : '';
}

/**
 * HTML attribute string for Subresource Integrity, or empty when unused/invalid.
 * Always pairs integrity with crossorigin=anonymous (required for SRI on CDN).
 * @param {string} integrity
 * @param {{ warn?: function(string): void }} [options] optional warn when non-empty value is rejected
 */
function sriAttrsHtml(integrity, options) {
    const raw = String(integrity == null ? '' : integrity).trim();
    const hash = normalizeSriIntegrity(raw);
    if (!hash) {
        if (raw && options && typeof options.warn === 'function') {
            options.warn('[shiro] invalid SRI integrity ignored (expected sha256|384|512-… base64)');
        }
        return '';
    }
    return ' integrity="' + hash + '" crossorigin="anonymous"';
}

// Safe CSP nonce value only (no controls, whitespace, or quotes). Empty when invalid.
function normalizeCspNonce(nonce) {
    const text = String(nonce == null ? '' : nonce).trim();
    if (!text || hasUrlControlChars(text) || /[\s"'<>`]/.test(text)) return '';
    return text;
}

/**
 * HTML nonce="…" attribute when a host CSP nonce is configured.
 * Rejects values with control, whitespace, or quote characters.
 */
function cspNonceAttrHtml(nonce) {
    const text = normalizeCspNonce(nonce);
    if (!text) return '';
    return ' nonce="' + text + '"';
}


/**
 * Absolute page URL for JSON-LD / SEO (same absoluteization path as OG images).
 * Prefer permalink → full_url_for(path) → absolute context.url → site base + path.
 *
 * @param {object} context Hexo helper context (`this`)
 * @param {object|null|undefined} page
 * @param {string} [siteUrl] config.url
 * @returns {string}
 */
function resolveAbsolutePageUrl(context, page, siteUrl) {
    if (page && page.permalink && isAbsoluteHttpUrl(page.permalink)) {
        return String(page.permalink);
    }

    if (context && typeof context.full_url_for === 'function' && page && page.path) {
        const full = context.full_url_for(page.path);
        if (isAbsoluteHttpUrl(full)) return full;
    }

    if (context && typeof context.url === 'string' && isAbsoluteHttpUrl(context.url)) {
        return context.url;
    }

    if (page && page.path) {
        const resolved = absoluteUrlForLocalPath(page.path, context);
        if (isAbsoluteHttpUrl(resolved)) return resolved;
    }

    if (page && page.permalink) {
        const permalink = String(page.permalink);
        if (isAbsoluteHttpUrl(permalink)) return permalink;
        const resolved = absoluteUrlForLocalPath(permalink, context);
        if (isAbsoluteHttpUrl(resolved)) return resolved;
    }

    const base = String(siteUrl || (context && context.config && context.config.url) || '').replace(/\/$/, '');
    return base;
}

module.exports = {
    hasUrlControlChars,
    safeNavigationUrl,
    safeResourceUrl,
    normalizeAbsoluteResourceUrl,
    normalizedLinkTarget,
    isFeatureEnabled,
    normalizeLangAttr,
    safeScriptJson,
    resourceOrigin,
    normalizeOpenGraphImageUrl,
    resolveAbsolutePageUrl,
    normalizeSriIntegrity,
    sriAttrsHtml,
    normalizeCspNonce,
    cspNonceAttrHtml
};
