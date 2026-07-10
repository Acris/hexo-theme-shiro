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
    extend: {
        filter: {
            register() {}
        }
    }
};

const {
    MIN_PAGEFIND_VERSION,
    versionParts,
    versionAtLeast,
    uniqueDirs,
    installHint
} = require('../scripts/pagefind.js');

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
            assert.equal(versionAtLeast('1.5.0-beta', '1.5.0'), true);
            assert.equal(versionAtLeast('not-a-version', '1.5.0'), false);
            assert.equal(versionParts('1.2.3')[0], 1);
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
