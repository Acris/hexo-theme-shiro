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

const snippetDir = path.join(root, 'tools', 'snippets');
const snippetCache = new Map();
const snippetMarkers = {
    assetLoader: {
        start: '    // <shiro-asset-loader>',
        end: '    // </shiro-asset-loader>',
        file: 'asset-loader.js',
        requires: /\bloadAsset\s*\(/
    },
    scriptLoader: {
        start: '    // <shiro-script-loader>',
        end: '    // </shiro-script-loader>',
        file: 'script-loader.js',
        requires: /\bloadBootstrapScript\s*\(/
    },
    imageSafety: {
        start: '    // <shiro-image-safety>',
        end: '    // </shiro-image-safety>',
        file: 'image-safety.js',
        requires: /\bisSafeImageUrl\s*\(|\bisDecorativeImg\s*\(|\bimageSource\s*\(/
    },
    connectionWarm: {
        start: '    // <shiro-connection-warm>',
        end: '    // </shiro-connection-warm>',
        file: 'connection-warm.js',
        requires: /\bconnectionAllowsWarm\s*\(|\bscheduleIdleWarm\s*\(/
    }
};

function countOccurrences(source, needle) {
    if (!needle) return 0;
    let count = 0;
    let index = source.indexOf(needle);
    while (index !== -1) {
        count += 1;
        index = source.indexOf(needle, index + needle.length);
    }
    return count;
}

function readSnippet(file) {
    if (!snippetCache.has(file)) {
        snippetCache.set(file, fs.readFileSync(path.join(snippetDir, file), 'utf8').replace(/\s+$/, ''));
    }
    return snippetCache.get(file);
}

function applySnippet(code, name, config, sourceFile) {
    const startCount = countOccurrences(code, config.start);
    const endCount = countOccurrences(code, config.end);
    if (startCount !== endCount) {
        throw new Error(sourceFile + ': ' + name + ' snippet marker mismatch: ' + startCount + ' start marker(s), ' + endCount + ' end marker(s)');
    }
    if (!startCount) {
        if (config.requires.test(code)) {
            throw new Error(sourceFile + ': ' + name + ' snippet marker missing in file that references its API');
        }
        return code;
    }
    if (startCount > 1) {
        throw new Error(sourceFile + ': ' + name + ' snippet marker must appear at most once per file');
    }

    const start = code.indexOf(config.start);
    const end = code.indexOf(config.end, start);
    if (end < start) throw new Error(sourceFile + ': ' + name + ' snippet end marker appears before start marker');

    const snippet = readSnippet(config.file);
    return code.slice(0, start)
        + config.start + '\n'
        + snippet + '\n'
        + config.end
        + code.slice(end + config.end.length);
}

function applySharedSnippets(code, sourceFile) {
    return Object.entries(snippetMarkers).reduce(
        (nextCode, [name, config]) => applySnippet(nextCode, name, config, sourceFile),
        code
    );
}

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

function minifyCssFile(inputRel, outputRel) {
    const input = path.join(root, inputRel);
    const output = path.join(root, outputRel);
    if (!fs.existsSync(input)) throw new Error('CSS source not found: ' + inputRel);

    const result = transform({
        filename: input,
        code: fs.readFileSync(input),
        minify: true
    });
    writeFileIfChanged(output, result.code);
}

async function minifyJsFile(inputRel, outputRel) {
    const input = path.join(root, inputRel);
    const output = path.join(root, outputRel);
    const code = applySharedSnippets(fs.readFileSync(input, 'utf8'), inputRel);
    const result = await terser.minify(code, {
        compress: true,
        mangle: true,
        format: { comments: false }
    });

    if (result.error) throw result.error;
    writeFileIfChanged(output, result.code + '\n');
}

async function minifyJs() {
    const jsDir = path.join(root, 'source', 'js', '_src');
    const files = fs.readdirSync(jsDir)
        .filter(file => file.endsWith('.js') && !file.endsWith('.min.js'))
        .sort();
    const outputs = [];

    for (const file of files) {
        const base = file.slice(0, -3);
        const output = 'source/js/' + base + '.min.js';
        outputs.push(output);
        await minifyJsFile('source/js/_src/' + file, output);
    }

    removeStaleGeneratedFiles('source/js', outputs, '.min.js');
}

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

main().catch(error => {
    console.error(error);
    process.exit(1);
});
