'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

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
    if (cfg.force_language) args.push('--force-language', cfg.force_language);

    const quoted = args.map(a => `"${a}"`).join(' ');

    // Resolve the pagefind binary via its package.json `bin` field rather than
    // hard-coding `lib/runner/bin.cjs` — this stays correct even if Pagefind
    // moves the entry file in a future release.
    let cmd;
    try {
        const pkgPath = require.resolve('pagefind/package.json');
        const pkg = require(pkgPath);
        const binRel = typeof pkg.bin === 'string' ? pkg.bin : (pkg.bin && pkg.bin.pagefind);
        if (!binRel) throw new Error('pagefind bin not declared');
        const bin = path.join(path.dirname(pkgPath), binRel);
        cmd = `node "${bin}" ${quoted}`;
    } catch (_) {
        cmd = `npx --yes pagefind ${quoted}`;
    }

    hexo.log.info('[pagefind] building search index...');
    try {
        execSync(cmd, { stdio: 'inherit' });
        hexo.log.info('[pagefind] index ready at ' + path.join(publicDir, 'pagefind'));
    } catch (e) {
        hexo.log.error('[pagefind] failed: ' + e.message);
        hexo.log.error('[pagefind] try `npm i pagefind -D` in your site root, or set search.enabled: false');
    }
}, 20);
