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
const darkCss = fs.readFileSync(path.join(root, 'source/css/_core/dark.css'), 'utf8');
const giscusCss = fs.readFileSync(path.join(root, 'source/css/_src/giscus.css'), 'utf8');
const uiMacros = fs.readFileSync(path.join(root, 'layout/_macro/ui.njk'), 'utf8');
const pkg = require('../package.json');

function configContainsUrl(url) {
    return configYml.indexOf(url) !== -1;
}

function cssHex(css, property) {
    const match = new RegExp(property + ':\\s*(#[0-9a-f]{6})', 'i').exec(css);
    return match && match[1].toLowerCase();
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

    it('giscus dark accents match the site dark seal tokens', () => {
        const darkStart = giscusCss.indexOf('@media (prefers-color-scheme: dark)');
        assert.ok(darkStart >= 0, 'giscus dark theme exists');
        const darkTheme = giscusCss.slice(darkStart);
        const seal = cssHex(darkCss, '--color-seal');
        const sealFill = cssHex(darkCss, '--color-seal-fill');
        assert.ok(seal, 'dark seal token exists');
        assert.ok(sealFill, 'dark seal fill token exists');
        assert.equal(cssHex(darkTheme, '--color-accent-fg'), seal);
        assert.equal(cssHex(darkTheme, '--color-accent-emphasis'), sealFill);
        assert.equal(cssHex(darkTheme, '--color-btn-primary-bg'), sealFill);
    });

    it('uses the semantic on-seal token for inline seal text', () => {
        assert.match(uiMacros, /<text[^>]+fill="var\(--color-on-seal\)"/);
    });
});
