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
        buf.writeUInt32BE(32, 16);
        buf.writeUInt32BE(16, 20);
        // pngSize checks bytes 1-4 as 'PNG' (skips 0x89)
        assert.deepEqual(pngSize(buf), { width: 32, height: 16 });
        assert.deepEqual(imageSizeFromBuffer(buf), { width: 32, height: 16 });
    });

    it('reads GIF logical screen descriptor', () => {
        const buf = Buffer.alloc(10);
        buf.write('GIF89a', 0);
        buf.writeUInt16LE(100, 6);
        buf.writeUInt16LE(50, 8);
        assert.deepEqual(gifSize(buf), { width: 100, height: 50 });
    });

    it('returns null for empty or unknown buffers', () => {
        assert.equal(imageSizeFromBuffer(null), null);
        assert.equal(imageSizeFromBuffer(Buffer.from('not-an-image')), null);
    });
});
