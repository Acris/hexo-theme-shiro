'use strict';

// Hexo filter orchestrator: local fs size lookup + pure optimizeImages / not-prose.

const fs = require('fs');
const path = require('path');
const { imageSizeFromBuffer } = require('./lib/image-meta');
const { markCodeBlocksNotProse } = require('./lib/code-blocks');
const {
    optimizeImages: optimizeImagesPure,
    localImageCandidates,
    cleanUrl,
    parseAttrs,
    renderAttrs,
    isRemoteUrl,
    escapeAttrValue,
    hasAttrName,
    appendAttr,
    getAttr,
    attrLookup
} = require('./lib/image-optimize');

const DEFAULT_HEADER_BYTES = 64 * 1024;
const JPEG_HEADER_BYTES = 512 * 1024;
const SVG_HEADER_BYTES = 16 * 1024;
const imageMetaCache = new Map();
const localImageSizeCache = new Map();
const existingFileCache = new Set();
const missingFileCache = new Set();
const existingDirCache = new Set();
const missingDirCache = new Set();

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

function pathContext() {
    return {
        sourceDir: hexo.source_dir,
        root: (hexo.config && hexo.config.root) || '/'
    };
}

function localImageSizeCacheKey(src, post) {
    const source = post && (post.full_source || post.source || '');
    const ctx = pathContext();
    return [ctx.sourceDir, ctx.root, source, cleanUrl(src)].join('|');
}

function localImageSize(src, post) {
    const cacheKey = localImageSizeCacheKey(src, post);
    const cached = localImageSizeCache.get(cacheKey);
    if (cached) {
        // Re-validate via mtime when the resolved file path is known.
        if (!cached.filePath) return cached.size;
        if (fileStatKey(cached.filePath) === cached.stamp) return cached.size;
    }

    const candidates = localImageCandidates(src, post, pathContext());
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
    return optimizeImagesPure(html, {
        post: opts.post,
        firstImageEager: opts.firstImageEager,
        getLocalSize: (src, post) => localImageSize(src, post)
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

// Orchestrator surface only. Pure HTML helpers live in lib/image-optimize.js.
module.exports = {
    optimizeImages,
    markCodeBlocksNotProse,
    localImageSize,
    localImageCandidates
};
