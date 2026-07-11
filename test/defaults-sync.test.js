'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    DEFAULT_LIGHTGALLERY_JS,
    DEFAULT_LIGHTGALLERY_CSS,
    DEFAULT_GISCUS_SRC,
    DEFAULT_MATHJAX_SRC
} = require('../scripts/lib/feature-gates');

const root = path.resolve(__dirname, '..');
const configYml = fs.readFileSync(path.join(root, '_config.yml'), 'utf8');
const pkg = require('../package.json');

function configContainsUrl(url) {
    return configYml.indexOf(url) !== -1;
}

describe('CDN / package defaults stay in sync', () => {
    it('LightGallery code defaults appear in _config.yml', () => {
        assert.ok(configContainsUrl(DEFAULT_LIGHTGALLERY_JS), DEFAULT_LIGHTGALLERY_JS);
        assert.ok(configContainsUrl(DEFAULT_LIGHTGALLERY_CSS), DEFAULT_LIGHTGALLERY_CSS);
    });

    it('MathJax code default appears in _config.yml', () => {
        assert.ok(configContainsUrl(DEFAULT_MATHJAX_SRC), DEFAULT_MATHJAX_SRC);
    });

    it('giscus code default appears in _config.yml', () => {
        assert.ok(configContainsUrl(DEFAULT_GISCUS_SRC), DEFAULT_GISCUS_SRC);
    });

    it('giscus theme package version matches package.json', () => {
        const themeLine = /hexo-theme-shiro@([0-9]+\.[0-9]+\.[0-9]+)/.exec(configYml);
        assert.ok(themeLine, 'giscus theme URL embeds package version');
        assert.equal(themeLine[1], pkg.version);
    });
});
