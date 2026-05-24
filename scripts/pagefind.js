'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

function pagefindCommand() {
    try {
        const pkgPath = require.resolve('pagefind/package.json');
        const pkg = require(pkgPath);
        const binRel = typeof pkg.bin === 'string' ? pkg.bin : (pkg.bin && pkg.bin.pagefind);
        if (!binRel) throw new Error('pagefind bin not declared');

        return {
            command: process.execPath,
            args: [path.join(path.dirname(pkgPath), binRel)],
            source: 'local'
        };
    } catch (_) {
        return {
            command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
            args: ['--yes', 'pagefind'],
            source: 'npx'
        };
    }
}

function runPagefind(args, command) {
    const result = spawnSync(command.command, command.args.concat(args), { stdio: 'inherit' });

    if (result.error) throw result.error;
    if (result.signal) throw new Error('terminated by signal ' + result.signal);
    if (result.status !== 0) throw new Error('exited with code ' + result.status);
}

function pushStringArg(args, flag, value) {
    const text = String(value || '').trim();
    if (text) args.push(flag, text);
}

// Run Pagefind after Hexo has finished writing files to `public/`.
// `after_generate` filter fires *before* the generate console writes routes to
// disk, so we hook `before_exit` (which Hexo runs after the console command
// completes) and limit it to commands that actually produce `public/`.
hexo.extend.filter.register('before_exit', function () {
    const hexoCmd = (hexo.env && hexo.env.cmd) || '';
    if (!/^(generate|g|deploy|d)$/.test(hexoCmd)) return;

    const themeCfg = (hexo.theme && hexo.theme.config) || {};
    const cfg = themeCfg.search || hexo.config.search || {};
    if (cfg.enabled !== true) return;

    const publicDir = path.resolve(hexo.base_dir, hexo.config.public_dir || 'public');
    if (!fs.existsSync(publicDir)) {
        hexo.log.warn('[pagefind] public dir not found, skip: ' + publicDir);
        return;
    }

    const args = ['--site', publicDir];
    pushStringArg(args, '--root-selector', cfg.root_selector || 'body');
    pushStringArg(args, '--force-language', cfg.force_language);

    const command = pagefindCommand();
    if (command.source === 'npx') {
        hexo.log.warn('[pagefind] local package not found; falling back to `npx --yes pagefind`, which may download and slow this build. Install it in your site root with `npm install pagefind --save-dev`.');
    }

    hexo.log.info('[pagefind] building search index...');
    try {
        runPagefind(args, command);
        hexo.log.info('[pagefind] index ready at ' + path.join(publicDir, 'pagefind'));
    } catch (error) {
        hexo.log.error('[pagefind] failed: ' + error.message);
        hexo.log.error('[pagefind] install Pagefind in your site root with `npm install pagefind --save-dev`, or set search.enabled: false');
    }
}, 20);
