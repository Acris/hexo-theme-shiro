#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { transform } = require('lightningcss');
const terser = require('terser');

const root = path.resolve(__dirname, '..');
const binExt = process.platform === 'win32' ? '.cmd' : '';
const tailwindBin = path.join(root, 'node_modules', '.bin', 'tailwindcss' + binExt);
const optionalCssFiles = [
    ['source/css/_src/code.css', 'source/css/code.min.css'],
    ['source/css/_src/comments.css', 'source/css/comments.min.css'],
    ['source/css/_src/giscus.css', 'source/css/giscus.min.css'],
    ['source/css/_src/toc.css', 'source/css/toc.min.css'],
    ['source/css/_src/lightgallery.css', 'source/css/lightgallery.min.css'],
    ['source/css/_src/search.css', 'source/css/search.min.css']
];

function runTailwind() {
    execFileSync(tailwindBin, [
        '-i', './source/css/_tailwind.css',
        '-o', './source/css/style.min.css',
        '--minify'
    ], { cwd: root, stdio: 'inherit' });
}

function writeFileIfChanged(filePath, content) {
    const next = Buffer.from(content);
    try {
        if (fs.readFileSync(filePath).equals(next)) return;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    fs.writeFileSync(filePath, content);
}

function relativePath(filePath) {
    return path.relative(root, filePath).replace(/\\/g, '/');
}

function removeStaleGeneratedFiles(dirRel, expectedRelFiles, suffix) {
    const dir = path.join(root, dirRel);
    const expected = new Set(expectedRelFiles.map(file => path.normalize(file)));

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(suffix)) continue;

        const filePath = path.join(dir, entry.name);
        const rel = path.normalize(relativePath(filePath));
        if (expected.has(rel)) continue;

        fs.unlinkSync(filePath);
        console.log('Removed stale generated asset: ' + relativePath(filePath));
    }
}

// Feature CSS is not Tailwind-processed. Target pre-nesting engines so any
// nested rules (or future nesting) flatten to long selectors in *.min.css.
// Chrome/Safari/Firefox versions below native CSS nesting support.
const FEATURE_CSS_TARGETS = {
    chrome: 90 << 16,
    edge: 90 << 16,
    firefox: 90 << 16,
    safari: (14 << 16)
};

function minifyCssFile(inputRel, outputRel) {
    const input = path.join(root, inputRel);
    const output = path.join(root, outputRel);
    if (!fs.existsSync(input)) throw new Error('CSS source not found: ' + inputRel);

    const result = transform({
        filename: input,
        code: fs.readFileSync(input),
        minify: true,
        targets: FEATURE_CSS_TARGETS
    });
    writeFileIfChanged(output, result.code);
}

async function minifyJsCode(code, outputRel) {
    const output = path.join(root, outputRel);
    const result = await terser.minify(code, {
        compress: true,
        mangle: true,
        format: { comments: false }
    });

    if (result.error) throw result.error;
    writeFileIfChanged(output, result.code + '\n');
}

async function minifyJsFile(inputRel, outputRel) {
    const input = path.join(root, inputRel);
    await minifyJsCode(fs.readFileSync(input, 'utf8'), outputRel);
}

// runtime.min.js is built from ordered parts (single IIFE, shared scope).
// Explicit manifest — do not rely on bare readdir sort for contract.
const RUNTIME_PARTS_DIR = path.join(root, 'source', 'js', '_src', 'runtime');
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
    // Manifest order (not sorted) defines concat order.
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

async function minifyJs() {
    const jsDir = path.join(root, 'source', 'js', '_src');
    const files = fs.readdirSync(jsDir)
        .filter((file) => file.endsWith('.js') && !file.endsWith('.min.js'))
        .sort();
    const outputs = [];

    for (const file of files) {
        // Monolith runtime.js removed; use runtime/ parts only.
        if (file === 'runtime.js') {
            console.warn('Ignoring stale source/js/_src/runtime.js (use runtime/*.js parts)');
            continue;
        }
        const base = file.slice(0, -3);
        const output = 'source/js/' + base + '.min.js';
        outputs.push(output);
        await minifyJsFile('source/js/_src/' + file, output);
    }

    const runtimeOutput = 'source/js/runtime.min.js';
    outputs.push(runtimeOutput);
    await minifyJsCode(concatRuntimeSource(), runtimeOutput);

    removeStaleGeneratedFiles('source/js', outputs, '.min.js');
}

// Export for unit tests that need unminified runtime source.
module.exports = {
    RUNTIME_PARTS,
    concatRuntimeSource,
    listRuntimeParts,
    assertRuntimeSource
};

async function main() {
    runTailwind();

    optionalCssFiles.forEach(([input, output]) => minifyCssFile(input, output));
    removeStaleGeneratedFiles(
        'source/css',
        ['source/css/style.min.css'].concat(optionalCssFiles.map(([, output]) => output)),
        '.min.css'
    );

    await minifyJs();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
