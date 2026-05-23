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
    const code = fs.readFileSync(input, 'utf8');
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
        ['source/css/comments.css', 'source/css/comments.min.css'],
        ['source/css/giscus.css', 'source/css/giscus.min.css'],
        ['source/css/lightgallery.css', 'source/css/lightgallery.min.css'],
        ['source/css/search.css', 'source/css/search.min.css']
    ].forEach(([input, output]) => minifyCssFile(input, output));

    await minifyJs();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
