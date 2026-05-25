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
    }
};

function countOccurrences(source, needle) {
    return source.split(needle).length - 1;
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

function minifyCssFile(inputRel, outputRel) {
    const input = path.join(root, inputRel);
    const output = path.join(root, outputRel);
    if (!fs.existsSync(input)) return;

    const result = transform({
        filename: input,
        code: fs.readFileSync(input),
        minify: true
    });
    fs.writeFileSync(output, result.code);
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
    fs.writeFileSync(output, result.code + '\n');
}

async function minifyJs() {
    const jsDir = path.join(root, 'source', 'js');
    const files = fs.readdirSync(jsDir)
        .filter(file => file.endsWith('.js') && !file.endsWith('.min.js'))
        .sort();

    for (const file of files) {
        const base = file.slice(0, -3);
        await minifyJsFile('source/js/' + file, 'source/js/' + base + '.min.js');
    }
}

async function main() {
    runTailwind();

    [
        ['source/css/code.css', 'source/css/code.min.css'],
        ['source/css/comments.css', 'source/css/comments.min.css'],
        ['source/css/giscus.css', 'source/css/giscus.min.css'],
        ['source/css/toc.css', 'source/css/toc.min.css'],
        ['source/css/lightgallery.css', 'source/css/lightgallery.min.css'],
        ['source/css/search.css', 'source/css/search.min.css']
    ].forEach(([input, output]) => minifyCssFile(input, output));

    await minifyJs();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
