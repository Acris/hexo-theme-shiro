'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    pngSize,
    gifSize,
    imageSizeFromBuffer
} = require('../scripts/lib/image-meta');

/** Minimal SOI + SOF0 using standard layout (P@+2, Y@+3, X@+5). */
function standardSofJpeg(width, height) {
    const jpeg = Buffer.alloc(21);
    jpeg.set([0xff, 0xd8, 0xff, 0xc0], 0);
    jpeg.writeUInt16BE(17, 4);
    jpeg[6] = 8;
    jpeg.writeUInt16BE(height, 7);
    jpeg.writeUInt16BE(width, 9);
    return jpeg;
}

describe('scripts/lib/image-meta', () => {
    it('reads PNG IHDR dimensions', () => {
        // Minimal PNG signature + IHDR chunk with 32x16
        const buf = Buffer.alloc(24);
        buf.write('\x89PNG\r\n\x1a\n', 0, 'binary');
        buf.write('IHDR', 12);
        buf.writeUInt32BE(32, 16);
        buf.writeUInt32BE(16, 20);
        assert.deepEqual(pngSize(buf), { width: 32, height: 16 });
        assert.deepEqual(imageSizeFromBuffer(buf), { width: 32, height: 16 });
    });

    it('rejects incomplete PNG and GIF signatures', () => {
        const png = Buffer.alloc(24);
        png.write('xPNG', 0);
        png.writeUInt32BE(32, 16);
        png.writeUInt32BE(16, 20);
        assert.equal(pngSize(png), null);

        const gif = Buffer.alloc(10);
        gif.write('GIFxxx', 0);
        gif.writeUInt16LE(100, 6);
        gif.writeUInt16LE(50, 8);
        assert.equal(gifSize(gif), null);
    });

    it('reads GIF logical screen descriptor', () => {
        const buf = Buffer.alloc(10);
        buf.write('GIF89a', 0);
        buf.writeUInt16LE(100, 6);
        buf.writeUInt16LE(50, 8);
        assert.deepEqual(gifSize(buf), { width: 100, height: 50 });
    });

    it('reads signed WebP lossy and lossless frames', () => {
        const lossy = Buffer.alloc(30);
        lossy.write('RIFF', 0);
        lossy.write('WEBP', 8);
        lossy.write('VP8 ', 12);
        lossy.set([0x9d, 0x01, 0x2a], 23);
        lossy.writeUInt16LE(100, 26);
        lossy.writeUInt16LE(50, 28);
        assert.deepEqual(imageSizeFromBuffer(lossy), { width: 100, height: 50 });

        const lossless = Buffer.alloc(30);
        lossless.write('RIFF', 0);
        lossless.write('WEBP', 8);
        lossless.write('VP8L', 12);
        lossless[20] = 0x2f;
        assert.deepEqual(imageSizeFromBuffer(lossless), { width: 1, height: 1 });
    });

    it('rejects WebP payloads without a valid frame signature', () => {
        const lossy = Buffer.alloc(30);
        lossy.write('RIFF', 0);
        lossy.write('WEBP', 8);
        lossy.write('VP8 ', 12);
        lossy.writeUInt16LE(100, 26);
        lossy.writeUInt16LE(50, 28);
        assert.equal(imageSizeFromBuffer(lossy), null);

        const lossless = Buffer.alloc(30);
        lossless.write('RIFF', 0);
        lossless.write('WEBP', 8);
        lossless.write('VP8L', 12);
        assert.equal(imageSizeFromBuffer(lossless), null);
    });

    it('reads JPEG start-of-frame dimensions and rejects truncated segments', () => {
        // Standard SOF0: length@0, precision@2, height@3, width@5 (ITU T.81 / JFIF).
        const jpeg = Buffer.alloc(21);
        jpeg.set([0xff, 0xd8, 0xff, 0xc0], 0);
        jpeg.writeUInt16BE(17, 4);
        jpeg[6] = 8;
        jpeg.writeUInt16BE(360, 7); // height at lengthOffset+3
        jpeg.writeUInt16BE(640, 9); // width at lengthOffset+5
        assert.deepEqual(imageSizeFromBuffer(jpeg), { width: 640, height: 360 });
        assert.deepEqual(imageSizeFromBuffer(standardSofJpeg(140, 140)), { width: 140, height: 140 });
        assert.deepEqual(imageSizeFromBuffer(standardSofJpeg(800, 600)), { width: 800, height: 600 });

        // length=17 requires 21 bytes from SOI; a short buffer fails the segment bound check.
        assert.equal(imageSizeFromBuffer(jpeg.subarray(0, 12)), null);
    });

    it('reads AVIF ispe dimensions from nested BMFF boxes', () => {
        const avif = Buffer.alloc(68);
        avif.writeUInt32BE(20, 0);
        avif.write('ftyp', 4);
        avif.write('avif', 8);
        avif.write('avif', 16);

        avif.writeUInt32BE(48, 20);
        avif.write('meta', 24);
        avif.writeUInt32BE(36, 32);
        avif.write('iprp', 36);
        avif.writeUInt32BE(28, 40);
        avif.write('ipco', 44);
        avif.writeUInt32BE(20, 48);
        avif.write('ispe', 52);
        avif.writeUInt32BE(1200, 60);
        avif.writeUInt32BE(630, 64);

        assert.deepEqual(imageSizeFromBuffer(avif), { width: 1200, height: 630 });
        avif.write('mif1', 8);
        avif.write('mif1', 16);
        assert.equal(imageSizeFromBuffer(avif), null);
    });

    it('uses SVG root dimensions instead of child element attributes', () => {
        const buf = Buffer.from(
            '<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">'
            + '<rect width="10" height="10"/></svg>'
        );
        assert.deepEqual(imageSizeFromBuffer(buf), { width: 100, height: 50 });
    });

    it('finds an SVG root after a long valid preamble', () => {
        const preamble = '<?xml version="1.0"?><!--' + 'x'.repeat(3000) + '-->';
        const buf = Buffer.from(preamble + '<svg viewBox="0 0 120 60"></svg>');
        assert.deepEqual(imageSizeFromBuffer(buf), { width: 120, height: 60 });
    });

    it('infers a missing SVG dimension from the root viewBox ratio', () => {
        assert.deepEqual(
            imageSizeFromBuffer(Buffer.from('<svg width="200" viewBox="0 0 100 50"></svg>')),
            { width: 200, height: 100 }
        );
        assert.deepEqual(
            imageSizeFromBuffer(Buffer.from('<svg height="75" viewBox="0 0 100 50"></svg>')),
            { width: 150, height: 75 }
        );
    });

    it('returns null for empty or unknown buffers', () => {
        assert.equal(imageSizeFromBuffer(null), null);
        assert.equal(imageSizeFromBuffer(Buffer.from('not-an-image')), null);
    });
});
