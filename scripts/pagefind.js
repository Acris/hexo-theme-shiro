'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { isFeatureEnabled } = require('./lib/features');

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

function parseVersion(version) {
    const match = String(version || '').match(
        /^(?:v)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
    );
    if (!match) return null;
    const prerelease = match[4] ? match[4].split('.') : [];
    if (prerelease.some(identifier => /^\d+$/.test(identifier)
        && identifier.length > 1 && identifier[0] === '0')) return null;
    return {
        numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
        prerelease
    };
}

function comparePrerelease(current, target) {
    if (!current.length && !target.length) return 0;
    if (!current.length) return 1;
    if (!target.length) return -1;

    const length = Math.max(current.length, target.length);
    for (let i = 0; i < length; i += 1) {
        if (current[i] === undefined) return -1;
        if (target[i] === undefined) return 1;
        if (current[i] === target[i]) continue;

        const currentNumeric = /^\d+$/.test(current[i]);
        const targetNumeric = /^\d+$/.test(target[i]);
        if (currentNumeric && targetNumeric) {
            if (current[i].length !== target[i].length) {
                return current[i].length > target[i].length ? 1 : -1;
            }
            return current[i] > target[i] ? 1 : -1;
        }
        if (currentNumeric !== targetNumeric) return currentNumeric ? -1 : 1;
        return current[i] > target[i] ? 1 : -1;
    }
    return 0;
}

function versionAtLeast(version, minimum) {
    const current = parseVersion(version);
    const target = parseVersion(minimum);
    if (!current || !target) return false;

    for (let i = 0; i < target.numbers.length; i += 1) {
        if (current.numbers[i] > target.numbers[i]) return true;
        if (current.numbers[i] < target.numbers[i]) return false;
    }
    return comparePrerelease(current.prerelease, target.prerelease) >= 0;
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

function buildPagefindIndex(context) {
    // Theme search only (same gate as layout page_feature_gates / UI).
    const themeCfg = (context.theme && context.theme.config) || {};
    const cfg = themeCfg.search || {};
    if (!isFeatureEnabled(cfg.enabled, false)) return;

    const publicDir = path.resolve(context.base_dir, context.config.public_dir || 'public');
    if (!fs.existsSync(publicDir)) {
        throw new Error('[pagefind] public dir not found: ' + publicDir);
    }

    const searchDirs = searchDirsFor(context.base_dir);
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

    context.log.info('[pagefind] building search index with local Pagefind ' + command.version + '...');
    try {
        runPagefind(args, command);
        context.log.info('[pagefind] index ready at ' + path.join(publicDir, 'pagefind'));
    } catch (error) {
        context.log.error('[pagefind] failed: ' + error.message);
        context.log.error('[pagefind] ' + installHint());
        throw error;
    }
}

function registerPagefindHooks(context, indexer) {
    const buildIndex = typeof indexer === 'function'
        ? indexer
        : () => buildPagefindIndex(context);
    let indexed = false;

    function buildOnce() {
        if (indexed) return;
        const result = buildIndex();
        indexed = true;
        return result;
    }

    // Deploy hooks run after optional generation but before the deployer reads public/.
    context.on('deployBefore', buildOnce);
    // Standalone generate has no deploy hook; routes are fully written by before_exit.
    context.extend.filter.register('before_exit', function () {
        const command = (context.env && context.env.cmd) || '';
        if (/^(generate|g)$/.test(command)) return buildOnce();
    }, 20);
}

registerPagefindHooks(hexo);

// Testable surface (filter registration stays the side effect).
module.exports = {
    MIN_PAGEFIND_VERSION,
    versionAtLeast,
    uniqueDirs,
    installHint,
    resolveLocalPagefind,
    runPagefind,
    buildPagefindIndex,
    registerPagefindHooks
};
