'use strict';

// Pure image HTML optimization (no Hexo / fs). Path candidates accept injected dirs.

const path = require('path');
const { decodeHtmlEntities } = require('./util');
const {
    HTML_TOKEN_OPAQUE_ELEMENTS,
    nextHtmlToken,
    findElementClose,
    parseHtmlAttributes
} = require('./html-scanner');
const { isDecorativeImageAttributes } = require('./image-content');

const DEFAULT_IMAGE_SIZES = '(min-width: 768px) 672px, calc(100vw - 2rem)';
const IMAGE_SKIPPED_ELEMENTS = new Set([...HTML_TOKEN_OPAQUE_ELEMENTS, 'pre', 'code']);

// Lightweight HTML attribute parsing for <img> tags in rendered Hexo output.
function parseAttrs(source) {
    return parseHtmlAttributes(source);
}

function attrLookup(attrs) {
    const lookup = new Map();
    attrs.forEach((attr, index) => {
        const name = attr.name.toLowerCase();
        if (!lookup.has(name)) lookup.set(name, index);
    });
    return lookup;
}

function getAttr(attrs, lookup, name) {
    const index = lookup.get(name.toLowerCase());
    return index === undefined ? '' : attrs[index].value;
}

// Escape only values we inject (surgical attr append; do not re-serialize the tag).
// Align with util.escapeHtml for quotes/angle brackets (injected values are theme-controlled).
function escapeAttrValue(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function appendAttr(rawAttrs, name, value) {
    return String(rawAttrs || '') + ' ' + name + '="' + escapeAttrValue(value) + '"';
}

function cleanUrl(src) {
    const value = String(src || '');
    const hashIndex = value.indexOf('#');
    const queryIndex = value.indexOf('?');
    let end = value.length;
    if (hashIndex >= 0) end = hashIndex;
    if (queryIndex >= 0 && queryIndex < end) end = queryIndex;
    return end === value.length ? value : value.slice(0, end);
}

function isRemoteUrl(src) {
    return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src) || /^(?:data|blob|mailto):/i.test(src);
}

function hasWidthDescriptor(srcset) {
    return /[\t\n\f\r ]+[1-9]\d*w(?=[\t\n\f\r ]*(?:,|$))/.test(
        decodeHtmlEntities(srcset)
    );
}

function positiveDimension(value) {
    const text = decodeHtmlEntities(String(value || '')).trim();
    if (!/^\d+$/.test(text)) return 0;
    const number = Number(text);
    return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

function scaledDimension(rendered, intrinsic, opposite) {
    if (!rendered || !intrinsic || !opposite) return 0;
    const scaled = Math.round(rendered * opposite / intrinsic);
    return Number.isSafeInteger(scaled) && scaled > 0 ? scaled : 0;
}

function decodeUrlPath(value) {
    try {
        return decodeURIComponent(value);
    } catch (_) {
        return value;
    }
}

function normalizedRootPath(root) {
    const value = String(root || '/').trim();
    const pathRoot = '/' + value.replace(/^\/+|\/+$/g, '');
    return pathRoot === '/' ? '/' : pathRoot + '/';
}

function isWithinDir(baseDir, filePath) {
    const base = path.resolve(baseDir);
    const target = path.resolve(filePath);
    const relative = path.relative(base, target);
    const outside = relative === '..' || relative.startsWith('..' + path.sep);
    return relative === '' || (!!relative && !outside && !path.isAbsolute(relative));
}

/**
 * Resolve candidate local file paths for a post image src.
 * @param {string} src
 * @param {object|null} post
 * @param {{ sourceDir: string, root?: string }} ctx
 * @returns {string[]}
 */
function localImageCandidates(src, post, ctx) {
    const sourceDir = ctx && ctx.sourceDir;
    if (!sourceDir) return [];

    const urlPath = decodeUrlPath(cleanUrl(decodeHtmlEntities(src)));
    if (!urlPath || isRemoteUrl(urlPath)) return [];

    const candidates = new Set();
    const root = normalizedRootPath(ctx.root);
    const addCandidate = (filePath) => {
        if (filePath && isWithinDir(sourceDir, filePath)) candidates.add(filePath);
    };

    let withoutRoot = urlPath.replace(/^\/+/, '');
    if (root !== '/' && urlPath.indexOf(root) === 0) {
        withoutRoot = urlPath.slice(root.length).replace(/^\/+/, '');
    }

    const source = post && (post.full_source || post.source);
    let postDir = '';
    const assetDirs = [];
    const configuredAssetDir = post && post.asset_dir;
    if (configuredAssetDir) {
        assetDirs.push(path.isAbsolute(configuredAssetDir)
            ? configuredAssetDir
            : path.join(sourceDir, configuredAssetDir));
    }
    if (source) {
        const absolute = path.isAbsolute(source) ? source : path.join(sourceDir, source);
        postDir = path.dirname(absolute);
        const extension = path.extname(absolute);
        if (extension) assetDirs.push(path.join(postDir, path.basename(absolute, extension)));
    }

    if (urlPath[0] === '/') {
        addCandidate(path.join(sourceDir, withoutRoot));
        assetDirs.forEach(dir => addCandidate(path.join(dir, path.basename(withoutRoot))));
        if (postDir) addCandidate(path.join(postDir, path.basename(withoutRoot)));
    } else {
        assetDirs.forEach(dir => addCandidate(path.resolve(dir, urlPath)));
        if (postDir) addCandidate(path.resolve(postDir, urlPath));
        addCandidate(path.join(sourceDir, urlPath));
        if (withoutRoot !== urlPath) addCandidate(path.join(sourceDir, withoutRoot));
    }

    return Array.from(candidates);
}

/**
 * @param {string} html
 * @param {{
 *   post?: object,
 *   firstImageEager?: boolean,
 *   deferFirstImageLoading?: boolean,
 *   getLocalSize?: function(string, object|undefined): ({width:number,height:number}|null)
 * }} [options]
 */
function optimizeImages(html, options) {
    const opts = options || {};
    const getLocalSize = typeof opts.getLocalSize === 'function'
        ? opts.getLocalSize
        : () => null;
    const source = String(html || '');
    let contentImageIndex = 0;
    let cursor = 0;
    let position = 0;
    let output = '';
    let token;

    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing) continue;
        if (IMAGE_SKIPPED_ELEMENTS.has(token.name)) {
            const close = findElementClose(source, token);
            position = close ? close.end : source.length;
            continue;
        }
        if (token.name !== 'img') continue;

        // Presence only via parseAttrs map — never raw-string regex (class tokens
        // like "loading" must not suppress real loading/width attributes).
        const rawAttrs = token.attrs;
        const attrs = parseAttrs(rawAttrs);
        const lookup = attrLookup(attrs);
        const src = getAttr(attrs, lookup, 'src') || getAttr(attrs, lookup, 'data-src');
        const srcset = getAttr(attrs, lookup, 'srcset');
        if (!src && !srcset) continue;

        let out = rawAttrs;
        const present = new Set(lookup.keys());
        const ensure = (name, value) => {
            const key = name.toLowerCase();
            if (present.has(key)) return;
            present.add(key);
            out = appendAttr(out, name, value);
        };

        const hasWidth = present.has('width');
        const hasHeight = present.has('height');
        const authoredWidth = hasWidth ? positiveDimension(getAttr(attrs, lookup, 'width')) : 0;
        const authoredHeight = hasHeight ? positiveDimension(getAttr(attrs, lookup, 'height')) : 0;
        let width = authoredWidth;
        let height = authoredHeight;
        if (src && (!hasWidth || !hasHeight) && !isRemoteUrl(src)) {
            const size = getLocalSize(src, opts.post);
            if (size) {
                width = hasHeight
                    ? scaledDimension(authoredHeight, size.height, size.width)
                    : size.width;
                height = hasWidth
                    ? scaledDimension(authoredWidth, size.width, size.height)
                    : size.height;
            }
        }

        const isContentImage = !isDecorativeImageAttributes(rawAttrs, { width, height });
        const isFirstContentImage = isContentImage && contentImageIndex === 0;
        if (isContentImage) contentImageIndex += 1;

        ensure('decoding', 'async');
        if (isContentImage) {
            if (opts.firstImageEager && isFirstContentImage) {
                ensure('loading', 'eager');
            } else if (!(opts.deferFirstImageLoading && isFirstContentImage)) {
                ensure('loading', 'lazy');
            }
        }
        // The HTML standard permits `sizes` only with width (`w`) descriptors.
        if (hasWidthDescriptor(srcset)) ensure('sizes', DEFAULT_IMAGE_SIZES);
        if (!hasWidth && width) ensure('width', String(width));
        if (!hasHeight && height) ensure('height', String(height));

        const replacement = source.slice(token.start, token.attrsStart)
            + out
            + source.slice(token.attrsEnd, token.end);
        output += source.slice(cursor, token.start) + replacement;
        cursor = token.end;
    }

    return output + source.slice(cursor);
}

function defaultFirstImageLoading(html, value) {
    const loading = value === 'eager' ? 'eager' : 'lazy';
    const source = String(html || '');
    let position = 0;
    let token;
    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing) continue;
        if (IMAGE_SKIPPED_ELEMENTS.has(token.name)) {
            const close = findElementClose(source, token);
            position = close ? close.end : source.length;
            continue;
        }
        if (token.name !== 'img') continue;

        const attrs = parseAttrs(token.attrs);
        const lookup = attrLookup(attrs);
        const src = getAttr(attrs, lookup, 'src') || getAttr(attrs, lookup, 'data-src');
        const srcset = getAttr(attrs, lookup, 'srcset');
        if (!src && !srcset) continue;
        if (isDecorativeImageAttributes(token.attrs)) continue;
        if (lookup.has('loading')) return source;

        const nextAttrs = appendAttr(token.attrs, 'loading', loading);
        return source.slice(0, token.attrsStart)
            + nextAttrs
            + source.slice(token.attrsEnd);
    }
    return source;
}

module.exports = {
    parseAttrs,
    attrLookup,
    getAttr,
    cleanUrl,
    isRemoteUrl,
    localImageCandidates,
    defaultFirstImageLoading,
    optimizeImages
};
