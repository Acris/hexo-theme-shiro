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
const componentsCss = fs.readFileSync(path.join(root, 'source/css/_core/components.css'), 'utf8');
const darkCss = fs.readFileSync(path.join(root, 'source/css/_core/dark.css'), 'utf8');
const tokensCss = fs.readFileSync(path.join(root, 'source/css/_core/tokens.css'), 'utf8');
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

function relativeLuminance(hex) {
    const channels = hex.slice(1).match(/.{2}/g).map(value => parseInt(value, 16) / 255);
    const linear = channels.map(value => value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first, second) {
    const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
    const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
    return (lighter + 0.05) / (darker + 0.05);
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

    it('keeps code gutters and dark giscus secondary text at AA contrast', () => {
        const darkStart = giscusCss.indexOf('@media (prefers-color-scheme: dark)');
        const darkTheme = giscusCss.slice(darkStart);
        assert.ok(contrastRatio(
            cssHex(tokensCss, '--color-text-chrome'),
            cssHex(tokensCss, '--color-code-gutter')
        ) >= 4.5);
        assert.ok(contrastRatio(
            cssHex(darkTheme, '--color-fg-muted'),
            cssHex(darkTheme, '--color-canvas-default')
        ) >= 4.5);
        assert.ok(contrastRatio(
            cssHex(darkTheme, '--color-fg-subtle'),
            cssHex(darkTheme, '--color-canvas-default')
        ) >= 4.5);
    });

    it('uses the semantic on-seal token for inline seal text', () => {
        assert.match(uiMacros, /<text[^>]+fill="var\(--color-on-seal\)"/);
    });

    it('maps prose keyboard hints to theme-aware semantic colors', () => {
        assert.match(componentsCss, /--tw-prose-kbd:\s*var\(--color-text-heading\)/);
        assert.match(
            componentsCss,
            /--tw-prose-kbd-shadows:\s*color-mix\(in srgb, var\(--color-text-heading\) 12%, transparent\)/
        );
    });

    it('keeps semantic prose list markers out of decorative faint colors', () => {
        assert.match(componentsCss, /--tw-prose-bullets:\s*var\(--color-text-chrome\)/);
        assert.doesNotMatch(componentsCss, /--tw-prose-bullets:\s*var\(--color-text-faint\)/);
    });
});
