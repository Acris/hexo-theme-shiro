'use strict';

// Pure image HTML optimization (no Hexo / fs). Path candidates accept injected dirs.

const path = require('path');

const DEFAULT_IMAGE_SIZES = '(min-width: 768px) 672px, calc(100vw - 2rem)';
const OPTIMIZABLE_IMAGE_RE = /<!--[\s\S]*?-->|<(script|style|textarea|template|pre|code)\b[\s\S]*?(?:<\/\1\s*>|$)|<img\b([^>]*)>/gi;

// Lightweight HTML attribute parsing/rendering for <img> tags in rendered Hexo output.
function parseAttrs(source) {
    const attrs = [];
    source.replace(/([^\s=\/<>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g, (match, name, rawValue) => {
        let value = '';
        let quote = '"';
        if (rawValue) {
            if ((rawValue[0] === '"' && rawValue[rawValue.length - 1] === '"')
                || (rawValue[0] === "'" && rawValue[rawValue.length - 1] === "'")) {
                quote = rawValue[0];
                value = rawValue.slice(1, -1);
            } else {
                value = rawValue;
            }
        }
        attrs.push({ name, value, quote, boolean: !rawValue });
        return match;
    });
    return attrs;
}

function renderAttrs(attrs) {
    return attrs.map(attr => {
        if (attr.boolean) return attr.name;
        const quote = attr.quote || '"';
        return attr.name + '=' + quote + attr.value + quote;
    }).join(' ');
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
function escapeAttrValue(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function hasAttrName(rawAttrs, name) {
    return new RegExp('(?:^|\\s)' + name + '(?:\\s*=|\\s|/|$)', 'i').test(String(rawAttrs || ''));
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
    return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
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

    const urlPath = decodeUrlPath(cleanUrl(src));
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
    if (source) {
        const absolute = path.isAbsolute(source) ? source : path.join(sourceDir, source);
        postDir = path.dirname(absolute);
    }

    if (urlPath[0] === '/') {
        addCandidate(path.join(sourceDir, withoutRoot));
        if (postDir) addCandidate(path.join(postDir, path.basename(withoutRoot)));
    } else {
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
 *   getLocalSize?: function(string, object|undefined): ({width:number,height:number}|null)
 * }} [options]
 */
function optimizeImages(html, options) {
    const opts = options || {};
    const getLocalSize = typeof opts.getLocalSize === 'function'
        ? opts.getLocalSize
        : () => null;
    let imageIndex = 0;
    return String(html || '').replace(OPTIMIZABLE_IMAGE_RE, (match, skippedTag, rawAttrs) => {
        if (rawAttrs === undefined) return match;

        // Read with parseAttrs; write only missing attrs (preserve original quoting).
        const attrs = parseAttrs(rawAttrs);
        const lookup = attrLookup(attrs);
        const src = getAttr(attrs, lookup, 'src') || getAttr(attrs, lookup, 'data-src');
        if (!src) return match;

        const isFirstContentImage = opts.firstImageEager && imageIndex === 0;
        imageIndex += 1;

        let out = rawAttrs;
        const ensure = (name, value) => {
            if (hasAttrName(out, name)) return;
            out = appendAttr(out, name, value);
        };

        ensure('decoding', 'async');
        if (isFirstContentImage) {
            ensure('loading', 'eager');
            ensure('fetchpriority', 'high');
        } else {
            ensure('loading', 'lazy');
            ensure('fetchpriority', 'auto');
        }
        // `sizes` only influences resource selection when a `srcset` is present, so
        // skip it for plain Markdown images (no srcset) to avoid emitting dead markup.
        if (getAttr(attrs, lookup, 'srcset')) {
            ensure('sizes', DEFAULT_IMAGE_SIZES);
        }

        const hasWidth = hasAttrName(out, 'width') || !!getAttr(attrs, lookup, 'width');
        const hasHeight = hasAttrName(out, 'height') || !!getAttr(attrs, lookup, 'height');
        if ((!hasWidth || !hasHeight) && !isRemoteUrl(src)) {
            const size = getLocalSize(src, opts.post);
            if (size) {
                if (!hasWidth) ensure('width', String(size.width));
                if (!hasHeight) ensure('height', String(size.height));
            }
        }

        return '<img' + out + '>';
    });
}

module.exports = {
    DEFAULT_IMAGE_SIZES,
    parseAttrs,
    renderAttrs,
    attrLookup,
    getAttr,
    escapeAttrValue,
    hasAttrName,
    appendAttr,
    cleanUrl,
    isRemoteUrl,
    decodeUrlPath,
    normalizedRootPath,
    isWithinDir,
    localImageCandidates,
    optimizeImages
};
