'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Component UI assets require Pagefind 1.5.0+.
const MIN_PAGEFIND_VERSION = '1.5.0';

function uniqueDirs(dirs) {
    return Array.from(new Set(dirs.filter(Boolean).map(dir => path.resolve(dir))));
}

function searchDirsFor(baseDir) {
    return uniqueDirs([baseDir, process.cwd(), path.join(__dirname, '..')]);
}

function readPackage(pkgPath) {
    try {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (error) {
        throw new Error('failed to read pagefind package at ' + pkgPath + ': ' + (error && error.message ? error.message : error));
    }
}

// Resolve from pagefind/package.json only (bin + version). Returns null if missing.
function commandFromPackage(pkgPath) {
    const pkg = readPackage(pkgPath);
    const binRel = typeof pkg.bin === 'string' ? pkg.bin : (pkg.bin && pkg.bin.pagefind);
    if (!binRel) throw new Error('pagefind bin not declared in ' + pkgPath);

    return {
        command: process.execPath,
        args: [path.join(path.dirname(pkgPath), binRel)],
        version: pkg.version || ''
    };
}

function resolveLocalPagefind(searchDirs) {
    for (const dir of searchDirs) {
        const pkgPath = path.join(dir, 'node_modules', 'pagefind', 'package.json');
        if (fs.existsSync(pkgPath)) return commandFromPackage(pkgPath);
    }

    try {
        const pkgPath = require.resolve('pagefind/package.json', { paths: searchDirs });
        return commandFromPackage(pkgPath);
    } catch (error) {
        if (error && error.code === 'MODULE_NOT_FOUND') return null;
        throw error;
    }
}

function versionParts(version) {
    const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function versionAtLeast(version, minimum) {
    const current = versionParts(version);
    const target = versionParts(minimum);
    if (!current || !target) return false;

    for (let i = 0; i < target.length; i += 1) {
        if (current[i] > target[i]) return true;
        if (current[i] < target[i]) return false;
    }
    return true;
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

function installHint() {
    return 'Install Pagefind ' + MIN_PAGEFIND_VERSION + '+ in your site root with `npm install pagefind --save-dev`, or set search.enabled: false.';
}

// after_generate runs before routes are written; hook before_exit after generate/deploy.
hexo.extend.filter.register('before_exit', function () {
    const hexoCmd = (hexo.env && hexo.env.cmd) || '';
    if (!/^(generate|g|deploy|d)$/.test(hexoCmd)) return;

    const themeCfg = (hexo.theme && hexo.theme.config) || {};
    const cfg = themeCfg.search || hexo.config.search || {};
    if (cfg.enabled !== true) return;

    const publicDir = path.resolve(hexo.base_dir, hexo.config.public_dir || 'public');
    if (!fs.existsSync(publicDir)) {
        throw new Error('[pagefind] public dir not found: ' + publicDir);
    }

    const searchDirs = searchDirsFor(hexo.base_dir);
    const command = resolveLocalPagefind(searchDirs);
    if (!command) {
        throw new Error('[pagefind] search.enabled is true but Pagefind was not found in: ' + searchDirs.join(', ') + '. ' + installHint());
    }
    if (!versionAtLeast(command.version, MIN_PAGEFIND_VERSION)) {
        throw new Error('[pagefind] Pagefind ' + (command.version || 'unknown') + ' is too old for Shiro search (need ' + MIN_PAGEFIND_VERSION + '+). ' + installHint());
    }

    const args = ['--site', publicDir];
    pushStringArg(args, '--root-selector', cfg.root_selector || 'body');
    pushStringArg(args, '--force-language', cfg.force_language);

    hexo.log.info('[pagefind] building search index with local Pagefind ' + command.version + '...');
    try {
        runPagefind(args, command);
        hexo.log.info('[pagefind] index ready at ' + path.join(publicDir, 'pagefind'));
    } catch (error) {
        hexo.log.error('[pagefind] failed: ' + error.message);
        hexo.log.error('[pagefind] ' + installHint());
        throw error;
    }
}, 20);

// Pure surface for unit tests (filter registration stays the side effect).
module.exports = {
    MIN_PAGEFIND_VERSION,
    versionParts,
    versionAtLeast,
    uniqueDirs,
    searchDirsFor,
    installHint
};
