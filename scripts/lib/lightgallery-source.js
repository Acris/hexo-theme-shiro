'use strict';

// Client lightgallery feature: ordered parts under source/js/_src/lightgallery/.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const PARTS_DIR = path.join(ROOT, 'source', 'js', '_src', 'lightgallery');
const LIGHTGALLERY_PARTS = [
    '01-prelude.js',
    '02-assets.js',
    '03-dom.js',
    '04-open.js'
];

function listLightgalleryParts() {
    if (!fs.existsSync(PARTS_DIR)) {
        throw new Error('Lightgallery parts directory missing: source/js/_src/lightgallery');
    }
    const onDisk = fs.readdirSync(PARTS_DIR)
        .filter((file) => file.endsWith('.js') && !file.endsWith('.min.js'))
        .sort();
    const expected = LIGHTGALLERY_PARTS.slice().sort();
    const missing = expected.filter((name) => onDisk.indexOf(name) === -1);
    const extra = onDisk.filter((name) => expected.indexOf(name) === -1);
    if (missing.length || extra.length) {
        throw new Error(
            'Lightgallery parts mismatch. expected=[' + LIGHTGALLERY_PARTS.join(', ')
            + '] disk=[' + onDisk.join(', ')
            + ']'
            + (missing.length ? ' missing=[' + missing.join(', ') + ']' : '')
            + (extra.length ? ' extra=[' + extra.join(', ') + ']' : '')
        );
    }
    return LIGHTGALLERY_PARTS.map((name) => path.join(PARTS_DIR, name));
}

function assertLightgallerySource(source, partPaths) {
    const paths = partPaths || listLightgalleryParts();
    const first = fs.readFileSync(paths[0], 'utf8').trimStart();
    const last = fs.readFileSync(paths[paths.length - 1], 'utf8').trimEnd();
    if (!/^;\(\(\)\s*=>\s*\{/.test(first)) {
        throw new Error('Lightgallery first part must open IIFE: ' + path.basename(paths[0]));
    }
    if (!/\}\)\(\);\s*$/.test(last)) {
        throw new Error('Lightgallery last part must close IIFE: ' + path.basename(paths[paths.length - 1]));
    }
    const openCount = (source.match(/;\(\(\)\s*=>\s*\{/g) || []).length;
    const closeCount = (source.match(/\}\)\(\);/g) || []).length;
    if (openCount !== 1 || closeCount !== 1) {
        throw new Error('Lightgallery concat must be a single IIFE (open=' + openCount + ' close=' + closeCount + ')');
    }
    ['lightGalleryOpen', 'ensureLightGalleryAssets', 'openFromElement'].forEach((token) => {
        if (source.indexOf(token) === -1) {
            throw new Error('Lightgallery concat missing required symbol: ' + token);
        }
    });
}

function concatLightgallerySource() {
    const partPaths = listLightgalleryParts();
    const source = partPaths.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
    assertLightgallerySource(source, partPaths);
    return source;
}

module.exports = { concatLightgallerySource };
