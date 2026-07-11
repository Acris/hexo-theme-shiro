'use strict';

const fs = require('fs');
const path = require('path');
const { imageSizeFromBuffer } = require('./lib/image-meta');
const { markCodeBlocksNotProse } = require('./lib/code-blocks');

const DEFAULT_IMAGE_SIZES = '(min-width: 768px) 672px, calc(100vw - 2rem)';
const DEFAULT_HEADER_BYTES = 64 * 1024;
const JPEG_HEADER_BYTES = 512 * 1024;
const SVG_HEADER_BYTES = 16 * 1024;
const imageMetaCache = new Map();
const localImageSizeCache = new Map();
const existingFileCache = new Set();
const missingFileCache = new Set();
const existingDirCache = new Set();
const missingDirCache = new Set();
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

function sourceDirForPost(post) {
    const source = post && (post.full_source || post.source);
    if (!source) return '';
    const absolute = path.isAbsolute(source) ? source : path.join(hexo.source_dir, source);
    return path.dirname(absolute);
}

function directoryExists(dirPath) {
    const normalized = path.normalize(dirPath);
    if (existingDirCache.has(normalized)) return true;
    if (missingDirCache.has(normalized)) return false;

    try {
        if (fs.statSync(normalized).isDirectory()) {
            existingDirCache.add(normalized);
            return true;
        }
    } catch (_) {}

    missingDirCache.add(normalized);
    return false;
}

function fileExists(filePath) {
    const normalized = path.normalize(filePath);
    if (existingFileCache.has(normalized)) return true;
    if (missingFileCache.has(normalized)) return false;

    if (!directoryExists(path.dirname(normalized))) {
        missingFileCache.add(normalized);
        return false;
    }

    try {
        if (fs.statSync(normalized).isFile()) {
            existingFileCache.add(normalized);
            return true;
        }
    } catch (_) {}

    missingFileCache.add(normalized);
    return false;
}

function localImageCandidates(src, post) {
    const urlPath = decodeUrlPath(cleanUrl(src));
    if (!urlPath || isRemoteUrl(urlPath)) return [];

    const candidates = new Set();
    const root = normalizedRootPath(hexo.config.root);
    const addCandidate = (filePath) => {
        if (filePath && isWithinDir(hexo.source_dir, filePath)) candidates.add(filePath);
    };

    let withoutRoot = urlPath.replace(/^\/+/, '');
    if (root !== '/' && urlPath.indexOf(root) === 0) {
        withoutRoot = urlPath.slice(root.length).replace(/^\/+/, '');
    }

    const postDir = sourceDirForPost(post);
    if (urlPath[0] === '/') {
        addCandidate(path.join(hexo.source_dir, withoutRoot));
        if (postDir) addCandidate(path.join(postDir, path.basename(withoutRoot)));
    } else {
        if (postDir) addCandidate(path.resolve(postDir, urlPath));
        addCandidate(path.join(hexo.source_dir, urlPath));
        if (withoutRoot !== urlPath) addCandidate(path.join(hexo.source_dir, withoutRoot));
    }

    return Array.from(candidates);
}

function imageHeaderLimit(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return JPEG_HEADER_BYTES;
    if (ext === '.svg') return SVG_HEADER_BYTES;
    return DEFAULT_HEADER_BYTES;
}

function readFileHeader(filePath) {
    const fd = fs.openSync(filePath, 'r');
    try {
        const stat = fs.fstatSync(fd);
        const length = Math.min(stat.size, imageHeaderLimit(filePath));
        if (!length) return Buffer.alloc(0);

        const buffer = Buffer.alloc(length);
        const bytesRead = fs.readSync(fd, buffer, 0, length, 0);
        return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
    } finally {
        fs.closeSync(fd);
    }
}

function fileStatKey(filePath) {
    try {
        const stat = fs.statSync(filePath);
        return stat.mtimeMs + ':' + stat.size;
    } catch (_) {
        return '0:0';
    }
}

function imageSizeFromFile(filePath) {
    const normalized = path.normalize(filePath);
    const stamp = fileStatKey(normalized);
    const cached = imageMetaCache.get(normalized);
    if (cached && cached.stamp === stamp) return cached.size;
    let size = null;
    try {
        size = imageSizeFromBuffer(readFileHeader(normalized));
    } catch (_) {
        size = null;
    }
    imageMetaCache.set(normalized, { stamp, size });
    return size;
}

function localImageSizeCacheKey(src, post) {
    const source = post && (post.full_source || post.source || '');
    return [hexo.source_dir, hexo.config.root || '/', source, cleanUrl(src)].join('|');
}

function localImageSize(src, post) {
    const cacheKey = localImageSizeCacheKey(src, post);
    const cached = localImageSizeCache.get(cacheKey);
    if (cached) {
        // Re-validate via mtime when the resolved file path is known.
        if (!cached.filePath) return cached.size;
        if (fileStatKey(cached.filePath) === cached.stamp) return cached.size;
    }

    const candidates = localImageCandidates(src, post);
    for (const candidate of candidates) {
        const filePath = path.normalize(candidate);
        if (!fileExists(filePath)) continue;
        const size = imageSizeFromFile(filePath);
        if (size && size.width && size.height) {
            localImageSizeCache.set(cacheKey, {
                size,
                filePath,
                stamp: fileStatKey(filePath)
            });
            return size;
        }
    }

    localImageSizeCache.set(cacheKey, { size: null, filePath: '', stamp: '' });
    return null;
}

function optimizeImages(html, options) {
    const opts = options || {};
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
            const size = localImageSize(src, opts.post);
            if (size) {
                if (!hasWidth) ensure('width', String(size.width));
                if (!hasHeight) ensure('height', String(size.height));
            }
        }

        return '<img' + out + '>';
    });
}

hexo.extend.filter.register('after_post_render', function (data) {
    if (!data) return data;
    data.content = markCodeBlocksNotProse(
        optimizeImages(data.content, { post: data, firstImageEager: true })
    );
    if (data.excerpt) {
        data.excerpt = markCodeBlocksNotProse(
            optimizeImages(data.excerpt, { post: data, firstImageEager: false })
        );
    }
    return data;
});

// Pure surface for unit tests (filter registration stays the side effect of this file).
module.exports = {
    optimizeImages,
    markCodeBlocksNotProse,
    parseAttrs,
    renderAttrs,
    isRemoteUrl,
    cleanUrl,
    escapeAttrValue,
    hasAttrName,
    appendAttr,
    getAttr,
    attrLookup
};
