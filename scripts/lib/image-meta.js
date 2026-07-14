'use strict';

// Pure image header size parsers (no FS / Hexo). Used by scripts/images.js.

const { nextHtmlToken, htmlAttributeValue } = require('./html-scanner');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SVG_SCAN_BYTES = 16 * 1024;

function readUInt24LE(buffer, offset) {
    return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function pngSize(buffer) {
    if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)
        || buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function gifSize(buffer) {
    const signature = buffer.toString('ascii', 0, 6);
    if (buffer.length < 10 || (signature !== 'GIF87a' && signature !== 'GIF89a')) return null;
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function jpegSize(buffer) {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
    let offset = 2;
    while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) return null;
        while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
        if (offset >= buffer.length) return null;
        const marker = buffer[offset];
        offset += 1;
        if (marker === 0xd8 || marker === 0xd9 || marker === 0x01
            || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (marker === 0xda || marker === 0x00) return null;
        if (offset + 2 > buffer.length) return null;
        const length = buffer.readUInt16BE(offset);
        if (length < 2 || offset + length > buffer.length) return null;
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)
            || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
            // SOF segment (length includes these 2 bytes): P@+2, height@+3, width@+5.
            if (length < 8) return null;
            return {
                width: buffer.readUInt16BE(offset + 5),
                height: buffer.readUInt16BE(offset + 3)
            };
        }
        offset += length;
    }
    return null;
}

function roundedPositiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function svgDimension(value) {
    const match = String(value || '').trim().match(/^(\d+(?:\.\d+)?|\.\d+)(?:px)?$/i);
    return match ? roundedPositiveNumber(match[1]) : 0;
}

function svgSize(buffer) {
    const head = buffer.toString('utf8', 0, Math.min(buffer.length, SVG_SCAN_BYTES));
    let position = 0;
    let root;
    let token;
    while ((token = nextHtmlToken(head, position))) {
        position = token.end;
        if (token.type === 'tag' && !token.closing && token.name === 'svg') {
            root = token;
            break;
        }
    }
    if (!root) return null;

    const width = svgDimension(htmlAttributeValue(root.attrs, 'width'));
    const height = svgDimension(htmlAttributeValue(root.attrs, 'height'));
    if (width && height) {
        return { width, height };
    }
    const viewBoxValue = htmlAttributeValue(root.attrs, 'viewBox');
    const viewBox = viewBoxValue.trim().split(/[\s,]+/).map(Number);
    if (viewBox.length === 4 && viewBox.every(Number.isFinite)) {
        if (viewBox[2] <= 0 || viewBox[3] <= 0) return null;
        if (width) {
            const inferredHeight = roundedPositiveNumber(width * viewBox[3] / viewBox[2]);
            return inferredHeight ? { width, height: inferredHeight } : null;
        }
        if (height) {
            const inferredWidth = roundedPositiveNumber(height * viewBox[2] / viewBox[3]);
            return inferredWidth ? { width: inferredWidth, height } : null;
        }
        const viewBoxWidth = roundedPositiveNumber(viewBox[2]);
        const viewBoxHeight = roundedPositiveNumber(viewBox[3]);
        if (!viewBoxWidth || !viewBoxHeight) return null;
        return { width: viewBoxWidth, height: viewBoxHeight };
    }
    return null;
}

function webpSize(buffer) {
    if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
        return null;
    }
    const type = buffer.toString('ascii', 12, 16);
    if (type === 'VP8 ' && buffer.length >= 30) {
        if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (type === 'VP8L' && buffer.length >= 25) {
        if (buffer[20] !== 0x2f) return null;
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

function bmffBox(buffer, offset, end) {
    if (offset + 8 > end) return null;
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;
    if (size === 1) {
        if (offset + 16 > end) return null;
        const largeSize = buffer.readBigUInt64BE(offset + 8);
        if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) return null;
        size = Number(largeSize);
        headerSize = 16;
    } else if (size === 0) {
        size = end - offset;
    }
    if (size < headerSize || offset + size > end) return null;
    return { type, offset, size, headerSize, end: offset + size };
}

function findIspeSize(buffer, start, end) {
    const containers = new Set(['meta', 'iprp', 'ipco']);
    let offset = start;
    while (offset < end) {
        const box = bmffBox(buffer, offset, end);
        if (!box) return null;
        const payload = box.offset + box.headerSize;
        if (box.type === 'ispe' && payload + 12 <= box.end) {
            const width = buffer.readUInt32BE(payload + 4);
            const height = buffer.readUInt32BE(payload + 8);
            if (width && height) return { width, height };
        }
        if (containers.has(box.type)) {
            const childStart = payload + (box.type === 'meta' ? 4 : 0);
            const size = childStart <= box.end ? findIspeSize(buffer, childStart, box.end) : null;
            if (size) return size;
        }
        offset = box.end;
    }
    return null;
}

function avifSize(buffer) {
    let offset = 0;
    let isAvif = false;
    while (offset < buffer.length) {
        const box = bmffBox(buffer, offset, buffer.length);
        if (!box) break;
        if (box.type === 'ftyp') {
            const payload = box.offset + box.headerSize;
            for (let position = payload; position + 4 <= box.end; position += 4) {
                const brand = buffer.toString('ascii', position, position + 4);
                if (brand === 'avif' || brand === 'avis') isAvif = true;
            }
        }
        offset = box.end;
    }
    return isAvif ? findIspeSize(buffer, 0, buffer.length) : null;
}

/**
 * Best-effort dimensions from a file header buffer.
 * @param {Buffer} buffer
 * @returns {{ width: number, height: number }|null}
 */
function imageSizeFromBuffer(buffer) {
    if (!buffer || !buffer.length) return null;
    return pngSize(buffer) || gifSize(buffer) || jpegSize(buffer) || webpSize(buffer)
        || avifSize(buffer) || svgSize(buffer);
}

module.exports = {
    pngSize,
    gifSize,
    imageSizeFromBuffer
};
