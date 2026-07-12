'use strict';

const { after, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const themeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiro-helpers-'));
const sourceDir = path.join(themeDir, 'source');
fs.mkdirSync(sourceDir);
fs.writeFileSync(path.join(sourceDir, '..asset.js'), 'asset');

const helpers = new Map();
global.hexo = {
    theme_dir: themeDir,
    config: {},
    extend: {
        helper: {
            register(name, fn) {
                helpers.set(name, fn);
            }
        },
        generator: {
            register() {}
        }
    }
};

require('../scripts/helpers');

after(() => {
    fs.rmSync(themeDir, { recursive: true, force: true });
});

describe('scripts/helpers', () => {
    it('versions in-theme assets whose filenames begin with two dots', () => {
        const versionedUrl = helpers.get('versioned_url');
        const context = {
            url_for(value) {
                return '/' + String(value).replace(/^\/+/, '');
            }
        };

        assert.match(versionedUrl.call(context, '..asset.js'), /^\/\.\.asset\.js\?v=[a-f0-9]{8}$/);
        assert.equal(versionedUrl.call(context, '../outside.js'), '/../outside.js');
    });
});