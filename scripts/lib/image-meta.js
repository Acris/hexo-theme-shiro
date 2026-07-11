'use strict';

// Pure image header size parsers (no FS / Hexo). Used by scripts/images.js.

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
    if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
        return null;
    }
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

/**
 * Best-effort dimensions from a file header buffer.
 * @param {Buffer} buffer
 * @returns {{ width: number, height: number }|null}
 */
function imageSizeFromBuffer(buffer) {
    if (!buffer || !buffer.length) return null;
    return pngSize(buffer) || gifSize(buffer) || jpegSize(buffer) || webpSize(buffer) || svgSize(buffer);
}

module.exports = {
    pngSize,
    gifSize,
    jpegSize,
    svgSize,
    webpSize,
    imageSizeFromBuffer
};
