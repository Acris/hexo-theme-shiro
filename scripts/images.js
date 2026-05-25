'use strict';

const fs = require('fs');
const path = require('path');

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

function setMissingAttr(attrs, lookup, name, value) {
    const key = name.toLowerCase();
    if (lookup.has(key)) return;
    lookup.set(key, attrs.length);
    attrs.push({ name, value, quote: '"', boolean: false });
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
    const root = (hexo.config.root || '/').replace(/\/+$/, '/');
    const addCandidate = (filePath) => {
        if (filePath) candidates.add(filePath);
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

function readUInt24LE(buffer, offset) {
    return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function pngSize(buffer) {
    if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function gifSize(buffer) {
    if (buffer.length < 10 || buffer.toString('ascii', 0, 3) !== 'GIF') return null;
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function jpegSize(buffer) {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
    let offset = 2;
    while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) return null;
        const marker = buffer[offset + 1];
        offset += 2;
        if (marker === 0xd8 || marker === 0xd9) continue;
        if (offset + 2 > buffer.length) return null;
        const length = buffer.readUInt16BE(offset);
        if (length < 2 || offset + length > buffer.length) return null;
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)
            || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
            return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
        }
        offset += length;
    }
    return null;
}

function roundedPositiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function svgAttributeValue(match) {
    return match ? (match[1] || match[2] || match[3] || '') : '';
}

function svgDimension(value) {
    const match = String(value || '').trim().match(/^(\d+(?:\.\d+)?|\.\d+)(?:px)?$/i);
    return match ? roundedPositiveNumber(match[1]) : 0;
}

function svgSize(buffer) {
    const head = buffer.toString('utf8', 0, Math.min(buffer.length, 2048));
    if (!/<svg\b/i.test(head)) return null;
    const width = svgDimension(svgAttributeValue(head.match(/\bwidth\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i)));
    const height = svgDimension(svgAttributeValue(head.match(/\bheight\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i)));
    if (width && height) {
        return { width, height };
    }
    const viewBoxMatch = head.match(/\bviewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
    if (viewBoxMatch) {
        const viewBoxWidth = roundedPositiveNumber(viewBoxMatch[1]);
        const viewBoxHeight = roundedPositiveNumber(viewBoxMatch[2]);
        return viewBoxWidth && viewBoxHeight ? { width: viewBoxWidth, height: viewBoxHeight } : null;
    }
    return null;
}

function webpSize(buffer) {
    if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
    const type = buffer.toString('ascii', 12, 16);
    if (type === 'VP8 ' && buffer.length >= 30) {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (type === 'VP8L' && buffer.length >= 25) {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        return {
            width: 1 + (((b1 & 0x3f) << 8) | b0),
            height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
        };
    }
    if (type === 'VP8X' && buffer.length >= 30) {
        return { width: 1 + readUInt24LE(buffer, 24), height: 1 + readUInt24LE(buffer, 27) };
    }
    return null;
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

        const buffer = Buffer.allocUnsafe(length);
        const bytesRead = fs.readSync(fd, buffer, 0, length, 0);
        return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
    } finally {
        fs.closeSync(fd);
    }
}

function imageSizeFromFile(filePath) {
    const normalized = path.normalize(filePath);
    if (imageMetaCache.has(normalized)) return imageMetaCache.get(normalized);
    let size = null;
    try {
        const buffer = readFileHeader(normalized);
        size = pngSize(buffer) || gifSize(buffer) || jpegSize(buffer) || webpSize(buffer) || svgSize(buffer);
    } catch (_) {
        size = null;
    }
    imageMetaCache.set(normalized, size);
    return size;
}

function localImageSizeCacheKey(src, post) {
    const source = post && (post.full_source || post.source || '');
    return [hexo.source_dir, hexo.config.root || '/', source, cleanUrl(src)].join('|');
}

function localImageSize(src, post) {
    const cacheKey = localImageSizeCacheKey(src, post);
    if (localImageSizeCache.has(cacheKey)) return localImageSizeCache.get(cacheKey);

    const candidates = localImageCandidates(src, post);
    for (const candidate of candidates) {
        const filePath = path.normalize(candidate);
        if (!fileExists(filePath)) continue;
        const size = imageSizeFromFile(filePath);
        if (size && size.width && size.height) {
            localImageSizeCache.set(cacheKey, size);
            return size;
        }
    }

    localImageSizeCache.set(cacheKey, null);
    return null;
}

function optimizeImages(html, options) {
    const opts = options || {};
    let imageIndex = 0;
    return String(html || '').replace(/<img\b([^>]*)>/gi, (match, rawAttrs) => {
        const attrs = parseAttrs(rawAttrs);
        const lookup = attrLookup(attrs);
        const src = getAttr(attrs, lookup, 'src') || getAttr(attrs, lookup, 'data-src');
        if (!src) return match;

        const isFirstContentImage = opts.firstImageEager && imageIndex === 0;
        imageIndex += 1;

        setMissingAttr(attrs, lookup, 'decoding', 'async');
        if (isFirstContentImage) {
            setMissingAttr(attrs, lookup, 'loading', 'eager');
            setMissingAttr(attrs, lookup, 'fetchpriority', 'high');
        } else {
            setMissingAttr(attrs, lookup, 'loading', 'lazy');
            setMissingAttr(attrs, lookup, 'fetchpriority', 'auto');
        }
        setMissingAttr(attrs, lookup, 'sizes', DEFAULT_IMAGE_SIZES);

        const hasWidth = !!getAttr(attrs, lookup, 'width');
        const hasHeight = !!getAttr(attrs, lookup, 'height');
        if ((!hasWidth || !hasHeight) && !isRemoteUrl(src)) {
            const size = localImageSize(src, opts.post);
            if (size) {
                if (!hasWidth) setMissingAttr(attrs, lookup, 'width', String(size.width));
                if (!hasHeight) setMissingAttr(attrs, lookup, 'height', String(size.height));
            }
        }

        return '<img ' + renderAttrs(attrs) + '>';
    });
}

hexo.extend.filter.register('after_post_render', function (data) {
    if (!data) return data;
    data.content = optimizeImages(data.content, { post: data, firstImageEager: true });
    if (data.excerpt) data.excerpt = optimizeImages(data.excerpt, { post: data, firstImageEager: false });
    return data;
});
