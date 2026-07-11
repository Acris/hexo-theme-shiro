'use strict';

// Client runtime source: ordered parts under source/js/_src/runtime/.
// Used by tools/build-assets.js and unit tests.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const RUNTIME_PARTS_DIR = path.join(ROOT, 'source', 'js', '_src', 'runtime');
const RUNTIME_PARTS = [
    '01-prelude.js',
    '02-config.js',
    '03-assets.js',
    '04-feature-loader.js',
    '05-handoff.js',
    '06-image-nav.js',
    '07-schedule-export.js'
];

function listRuntimeParts() {
    if (!fs.existsSync(RUNTIME_PARTS_DIR)) {
        throw new Error('Runtime parts directory missing: source/js/_src/runtime');
    }
    const onDisk = fs.readdirSync(RUNTIME_PARTS_DIR)
        .filter((file) => file.endsWith('.js') && !file.endsWith('.min.js'))
        .sort();
    const expected = RUNTIME_PARTS.slice().sort();
    const missing = expected.filter((name) => onDisk.indexOf(name) === -1);
    const extra = onDisk.filter((name) => expected.indexOf(name) === -1);
    if (missing.length || extra.length) {
        throw new Error(
            'Runtime parts mismatch. expected=[' + RUNTIME_PARTS.join(', ')
            + '] disk=[' + onDisk.join(', ')
            + ']'
            + (missing.length ? ' missing=[' + missing.join(', ') + ']' : '')
            + (extra.length ? ' extra=[' + extra.join(', ') + ']' : '')
        );
    }
    return RUNTIME_PARTS.map((name) => path.join(RUNTIME_PARTS_DIR, name));
}

function assertRuntimeSource(source, partPaths) {
    const paths = partPaths || listRuntimeParts();
    const first = fs.readFileSync(paths[0], 'utf8').trimStart();
    const last = fs.readFileSync(paths[paths.length - 1], 'utf8').trimEnd();
    if (!/^;\(\(\)\s*=>\s*\{/.test(first)) {
        throw new Error(
            'Runtime first part must open the IIFE (;(() => {): ' + path.basename(paths[0])
        );
    }
    if (!/\}\)\(\);\s*$/.test(last)) {
        throw new Error(
            'Runtime last part must close the IIFE (})();): ' + path.basename(paths[paths.length - 1])
        );
    }

    const openCount = (source.match(/;\(\(\)\s*=>\s*\{/g) || []).length;
    const closeCount = (source.match(/\}\)\(\);/g) || []).length;
    if (openCount !== 1 || closeCount !== 1) {
        throw new Error(
            'Runtime concat must be a single IIFE (open=' + openCount
            + ' close=' + closeCount + ')'
        );
    }
    ['featureReady', 'createFeatureLoader', 'loadAsset', 'dispatchLiveOrStash'].forEach((token) => {
        if (source.indexOf(token) === -1) {
            throw new Error('Runtime concat missing required symbol: ' + token);
        }
    });
}

function concatRuntimeSource() {
    const partPaths = listRuntimeParts();
    const source = partPaths
        .map((filePath) => fs.readFileSync(filePath, 'utf8'))
        .join('\n');
    assertRuntimeSource(source, partPaths);
    return source;
}

module.exports = {
    ROOT,
    RUNTIME_PARTS,
    RUNTIME_PARTS_DIR,
    listRuntimeParts,
    assertRuntimeSource,
    concatRuntimeSource
};
