'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    pngSize,
    gifSize,
    imageSizeFromBuffer
} = require('../scripts/lib/image-meta');

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
