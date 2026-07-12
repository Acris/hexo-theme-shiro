'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

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
    registerPagefindHooks
} = require('../scripts/pagefind.js');

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

    it('installHint mentions the minimum version', () => {
        assert.match(installHint(), /1\.5\.0/);
    });
});
