'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_IMAGE_SIZES = '(min-width: 768px) 672px, calc(100vw - 2rem)';
const imageMetaCache = new Map();

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

function attrIndex(attrs, name) {
    const target = name.toLowerCase();
    return attrs.findIndex(attr => attr.name.toLowerCase() === target);
}

function getAttr(attrs, name) {
    const index = attrIndex(attrs, name);
    return index >= 0 ? attrs[index].value : '';
}

function setAttr(attrs, name, value, options) {
    const opts = options || {};
    const index = attrIndex(attrs, name);
    if (index >= 0) {
        if (!opts.overwrite) return;
        attrs[index].value = value;
        attrs[index].quote = '"';
        attrs[index].boolean = false;
        return;
    }
    attrs.push({ name, value, quote: '"', boolean: false });
}

function cleanUrl(src) {
    return String(src || '').split('#')[0].split('?')[0];
}

function isRemoteUrl(src) {
    return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src) || /^(?:data|blob|mailto):/i.test(src);
}

function decodeUrlPath(value) {
    try {
        return decodeURIComponent(value);
    } catch (e) {
        return value;
    }
}

function sourceDirForPost(post) {
    const source = post && (post.full_source || post.source);
    if (!source) return '';
    const absolute = path.isAbsolute(source) ? source : path.join(hexo.source_dir, source);
    return path.dirname(absolute);
}

function localImageCandidates(src, post) {
    const urlPath = decodeUrlPath(cleanUrl(src));
    if (!urlPath || isRemoteUrl(urlPath)) return [];

    const candidates = [];
    const root = (hexo.config.root || '/').replace(/\/+$/, '/');
    let withoutRoot = urlPath.replace(/^\/+/, '');
    if (root !== '/' && urlPath.indexOf(root) === 0) {
        withoutRoot = urlPath.slice(root.length).replace(/^\/+/, '');
    }

    const postDir = sourceDirForPost(post);
    if (urlPath[0] === '/') {
        candidates.push(path.join(hexo.source_dir, withoutRoot));
        if (postDir) candidates.push(path.join(postDir, path.basename(withoutRoot)));
    } else {
        if (postDir) candidates.push(path.resolve(postDir, urlPath));
        candidates.push(path.join(hexo.source_dir, urlPath));
    }

    candidates.push(path.join(hexo.source_dir, withoutRoot));
    return Array.from(new Set(candidates));
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

function svgSize(buffer) {
    const head = buffer.toString('utf8', 0, Math.min(buffer.length, 2048));
    if (!/<svg\b/i.test(head)) return null;
    const widthMatch = head.match(/\bwidth\s*=\s*["']?([\d.]+)/i);
    const heightMatch = head.match(/\bheight\s*=\s*["']?([\d.]+)/i);
    if (widthMatch && heightMatch) {
        return { width: Math.round(Number(widthMatch[1])), height: Math.round(Number(heightMatch[1])) };
    }
    const viewBoxMatch = head.match(/\bviewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
    if (viewBoxMatch) {
        return { width: Math.round(Number(viewBoxMatch[1])), height: Math.round(Number(viewBoxMatch[2])) };
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

function imageSizeFromFile(filePath) {
    if (imageMetaCache.has(filePath)) return imageMetaCache.get(filePath);
    let size = null;
    try {
        const buffer = fs.readFileSync(filePath);
        size = pngSize(buffer) || gifSize(buffer) || jpegSize(buffer) || webpSize(buffer) || svgSize(buffer);
    } catch (e) {
        size = null;
    }
    imageMetaCache.set(filePath, size);
    return size;
}

function localImageSize(src, post) {
    const candidates = localImageCandidates(src, post);
    for (const filePath of candidates) {
        if (!fs.existsSync(filePath)) continue;
        const size = imageSizeFromFile(filePath);
        if (size && size.width && size.height) return size;
    }
    return null;
}

function optimizeImages(html, options) {
    const opts = options || {};
    let imageIndex = 0;
    return String(html || '').replace(/<img\b([^>]*)>/gi, (match, rawAttrs) => {
        const attrs = parseAttrs(rawAttrs);
        const src = getAttr(attrs, 'src') || getAttr(attrs, 'data-src');
        if (!src) return match;

        const isFirstContentImage = opts.firstImageEager && imageIndex === 0;
        imageIndex += 1;

        setAttr(attrs, 'decoding', 'async', { overwrite: false });
        if (isFirstContentImage) {
            setAttr(attrs, 'loading', 'eager', { overwrite: false });
            setAttr(attrs, 'fetchpriority', 'high', { overwrite: false });
        } else {
            setAttr(attrs, 'loading', 'lazy', { overwrite: false });
            setAttr(attrs, 'fetchpriority', 'auto', { overwrite: false });
        }
        setAttr(attrs, 'sizes', DEFAULT_IMAGE_SIZES, { overwrite: false });

        if (!getAttr(attrs, 'width') || !getAttr(attrs, 'height')) {
            const size = localImageSize(src, opts.post);
            if (size) {
                setAttr(attrs, 'width', String(size.width), { overwrite: false });
                setAttr(attrs, 'height', String(size.height), { overwrite: false });
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
