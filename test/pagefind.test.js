'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Mock Hexo before loading the side-effect registrar.
global.hexo = {
    env: { cmd: 'test' },
    base_dir: process.cwd(),
    config: { public_dir: 'public' },
    theme: { config: { search: { enabled: false } } },
    log: { info() {}, error() {} },
    on() {},
    extend: {
        filter: {
            register() {}
        }
    }
};

const {
    MIN_PAGEFIND_VERSION,
    versionAtLeast,
    uniqueDirs,
    installHint,
    resolveLocalPagefind,
    runPagefind,
    buildPagefindIndex,
    registerPagefindHooks
} = require('../scripts/pagefind.js');

function fakePagefind(version, script) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shiro-pagefind-'));
    const packageDir = path.join(root, 'node_modules/pagefind');
    fs.mkdirSync(packageDir, { recursive: true });
    fs.mkdirSync(path.join(root, 'public'));
    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({
        version,
        bin: 'bin.cjs'
    }));
    fs.writeFileSync(path.join(packageDir, 'bin.cjs'), script || 'process.exit(0);');
    return root;
}

function lifecycleHarness(cmd) {
    const events = {};
    const filters = {};
    let builds = 0;
    const context = {
        env: { cmd },
        on(name, handler) {
            events[name] = handler;
        },
        extend: {
            filter: {
                register(name, handler) {
                    filters[name] = handler;
                }
            }
        }
    };
    registerPagefindHooks(context, () => {
        builds += 1;
    });
    return { context, events, filters, builds: () => builds };
}

describe('scripts/pagefind.js', () => {
    it('exposes minimum version constant', () => {
        assert.equal(MIN_PAGEFIND_VERSION, '1.5.0');
    });

    describe('versionAtLeast', () => {
        it('compares semver major.minor.patch prefixes', () => {
            assert.equal(versionAtLeast('1.5.0', '1.5.0'), true);
            assert.equal(versionAtLeast('1.5.1', '1.5.0'), true);
            assert.equal(versionAtLeast('1.6.0', '1.5.0'), true);
            assert.equal(versionAtLeast('2.0.0', '1.5.0'), true);
            assert.equal(versionAtLeast('1.4.9', '1.5.0'), false);
            assert.equal(versionAtLeast('1.5.0-beta', '1.5.0'), false);
            assert.equal(versionAtLeast('1.5.0-beta.2', '1.5.0-beta.1'), true);
            assert.equal(versionAtLeast('1.5.0+build.2', '1.5.0'), true);
            assert.equal(versionAtLeast('1.5.0-beta.01', '1.5.0-beta.1'), false);
            assert.equal(versionAtLeast('not-a-version', '1.5.0'), false);
        });
    });

    describe('registerPagefindHooks', () => {
        it('builds at exit for a standalone generate', () => {
            const harness = lifecycleHarness('generate');
            harness.filters.before_exit();
            assert.equal(harness.builds(), 1);
        });

        it('builds before deployment and dedupes generate --deploy', () => {
            const harness = lifecycleHarness('generate');
            harness.events.deployBefore();
            harness.filters.before_exit();
            assert.equal(harness.builds(), 1);
        });

        it('builds before deployment for deploy --generate and plain deploy', () => {
            for (const command of ['deploy', 'd']) {
                const harness = lifecycleHarness(command);
                harness.events.deployBefore();
                harness.filters.before_exit();
                assert.equal(harness.builds(), 1);
            }
        });

        it('does not build on exit for unrelated commands', () => {
            const harness = lifecycleHarness('server');
            harness.filters.before_exit();
            assert.equal(harness.builds(), 0);
        });
    });

    describe('uniqueDirs', () => {
        it('dedupes and resolves paths', () => {
            const dirs = uniqueDirs([process.cwd(), process.cwd() + '/.', null, '']);
            assert.equal(dirs.length, 1);
        });
    });

    describe('local command and index build', () => {
        it('resolves and executes a site-local Pagefind package', () => {
            const root = fakePagefind('1.5.0');
            try {
                const command = resolveLocalPagefind([root]);
                assert.equal(command.command, process.execPath);
                assert.equal(command.version, '1.5.0');
                assert.ok(command.args[0].endsWith('pagefind/bin.cjs'));
                assert.doesNotThrow(() => runPagefind(['--site', path.join(root, 'public')], command));
            } finally {
                fs.rmSync(root, { recursive: true, force: true });
            }
        });

        it('runs the full enabled index path and rejects old Pagefind versions', () => {
            const root = fakePagefind('1.5.0');
            const logs = [];
            const context = {
                base_dir: root,
                config: { public_dir: 'public' },
                theme: { config: { search: { enabled: true, force_language: 'en' } } },
                log: {
                    info: message => logs.push(message),
                    error: message => logs.push(message)
                }
            };
            try {
                assert.doesNotThrow(() => buildPagefindIndex(context));
                assert.ok(logs.some(message => /index ready/.test(message)));

                const pkgPath = path.join(root, 'node_modules/pagefind/package.json');
                fs.writeFileSync(pkgPath, JSON.stringify({ version: '1.4.9', bin: 'bin.cjs' }));
                assert.throws(() => buildPagefindIndex(context), /too old/);
            } finally {
                fs.rmSync(root, { recursive: true, force: true });
            }
        });

        it('reports subprocess failures and missing public output', () => {
            const root = fakePagefind('1.5.0', 'process.exit(3);');
            try {
                const command = resolveLocalPagefind([root]);
                assert.throws(() => runPagefind([], command), /exited with code 3/);
                fs.rmSync(path.join(root, 'public'), { recursive: true, force: true });
                assert.throws(() => buildPagefindIndex({
                    base_dir: root,
                    config: { public_dir: 'public' },
                    theme: { config: { search: { enabled: true } } },
                    log: { info() {}, error() {} }
                }), /public dir not found/);
            } finally {
                fs.rmSync(root, { recursive: true, force: true });
            }
        });
    });

    it('installHint mentions the minimum version', () => {
        assert.match(installHint(), /1\.5\.0/);
    });
});
