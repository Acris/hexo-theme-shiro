'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { cjkFontForLanguage, googleFontUrls } = require('../scripts/lib/fonts');

const root = path.resolve(__dirname, '..');

describe('scripts/lib/fonts', () => {
    describe('cjkFontForLanguage', () => {
        it('picks locale-appropriate CJK faces from language tags', () => {
            assert.equal(cjkFontForLanguage('ja'), 'Noto Serif JP');
            assert.equal(cjkFontForLanguage('ja-JP'), 'Noto Serif JP');
            assert.equal(cjkFontForLanguage('zh-CN'), 'Noto Serif SC');
            assert.equal(cjkFontForLanguage('zh-Hans-TW'), 'Noto Serif SC');
            assert.equal(cjkFontForLanguage('zh_TW'), 'Noto Serif TC');
            assert.equal(cjkFontForLanguage('zh-Hant'), 'Noto Serif TC');
            assert.equal(cjkFontForLanguage('zh-HK'), 'Noto Serif TC');
            assert.equal(cjkFontForLanguage('en'), '');
        });
    });

    describe('googleFontUrls', () => {
        it('builds a display=swap bundle and optional CJK/code faces', () => {
            const urls = googleFontUrls(
                {},
                { language: 'zh-CN' },
                {},
                true,
                () => false,
                {}
            );
            assert.equal(urls.length, 1);
            assert.match(urls[0], /fonts\.googleapis\.com\/css2\?/);
            assert.match(urls[0], /display=swap/);
            assert.match(urls[0], /Noto\+Serif\+SC/);
            assert.match(urls[0], /Fira\+Code/);
        });

        it('requests the Traditional Chinese face for Traditional locales', () => {
            const urls = googleFontUrls(
                {},
                { language: 'zh-TW' },
                {},
                false,
                () => false,
                {}
            );
            assert.match(urls[0], /Noto\+Serif\+TC/);
            assert.doesNotMatch(urls[0], /Noto\+Serif\+SC/);
        });

        it('prioritizes the loaded Chinese face over Japanese fallbacks', () => {
            const base = fs.readFileSync(
                path.join(root, 'source/css/_core/base.css'),
                'utf8'
            );
            assert.match(
                base,
                /:lang\(ja\)[\s\S]*?--font-serif:\s*'Cardo', 'Noto Serif JP'/
            );
            assert.match(
                base,
                /:lang\(zh\)[\s\S]*?--font-serif:\s*'Cardo', 'Noto Serif SC'/
            );
            assert.match(
                base,
                /:lang\(zh-Hant\)[\s\S]*?--font-serif:\s*'Cardo', 'Noto Serif TC'/
            );
        });

        it('keeps Yuji Syuku first in every title font stack', () => {
            const styles = [
                'source/css/_core/tokens.css',
                'source/css/_core/base.css'
            ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
            const titleStacks = Array.from(
                styles.matchAll(/--font-title:\s*([^;]+);/g),
                match => match[1]
            );

            assert.equal(titleStacks.length, 4);
            titleStacks.forEach(stack => assert.match(stack, /^'Yuji Syuku',/));
        });

        it('keeps query separators literal in Google Fonts link attributes', () => {
            const styles = fs.readFileSync(
                path.join(root, 'layout/_partial/common/head-styles.njk'),
                'utf8'
            );
            const prefetch = fs.readFileSync(
                path.join(root, 'layout/_partial/common/head-prefetch.njk'),
                'utf8'
            );

            assert.match(styles, /href="\{\{\s*google_fonts_url\s*\}\}"/);
            assert.match(prefetch, /href="\{\{\s*google_fonts\[0\]\s*\}\}"/);
            assert.doesNotMatch(styles, /attr_url\(google_fonts_url\)/);
            assert.doesNotMatch(prefetch, /attr_url\(google_fonts\[0\]\)/);
        });

        it('keeps the code font gate independent from block-code assets', () => {
            const head = fs.readFileSync(
                path.join(root, 'layout/_partial/common/head.njk'),
                'utf8'
            );
            const styles = fs.readFileSync(
                path.join(root, 'layout/_partial/common/head-styles.njk'),
                'utf8'
            );
            const layout = fs.readFileSync(
                path.join(root, 'layout/_layout.njk'),
                'utf8'
            );

            assert.match(head, /google_font_urls\([^)]*gates\.needsCodeFont\)/);
            assert.match(styles, /\{% if gates\.needsCode %\}/);
            assert.match(
                layout,
                /\{% if gates\.needsLightgallery or gates\.needsClipboard %\}/
            );
            assert.match(layout, /\{% if gates\.needsClipboard %\}[\s\S]*?clipboardScript/);
        });

        it('avoids synthetic weights in theme-owned font contexts', () => {
            const layout = [
                'layout/_layout.njk',
                'layout/_macro/archive.njk',
                'layout/_partial/common/pagination.njk'
            ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
            const components = fs.readFileSync(
                path.join(root, 'source/css/_core/components.css'),
                'utf8'
            );
            const code = fs.readFileSync(path.join(root, 'source/css/_src/code.css'), 'utf8');
            const search = fs.readFileSync(path.join(root, 'source/css/_src/search.css'), 'utf8');
            const toc = fs.readFileSync(path.join(root, 'source/css/_src/toc.css'), 'utf8');

            assert.doesNotMatch(layout, /\bfont-(?:light|medium)\b/);
            assert.doesNotMatch(components, /\bfont-medium\b/);
            assert.doesNotMatch(code, /font-weight:\s*600\b/);
            assert.doesNotMatch(search, /font-weight:\s*600\b/);
            assert.doesNotMatch(toc, /font-weight:\s*500\b/);
        });
    });
});
