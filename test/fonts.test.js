'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { cjkFontForLanguage, googleFontUrls } = require('../scripts/lib/fonts');

const root = path.resolve(__dirname, '..');

describe('scripts/lib/fonts', () => {
    describe('cjkFontForLanguage', () => {
        it('picks JP/SC faces from language tags', () => {
            assert.equal(cjkFontForLanguage('ja'), 'Noto Serif JP');
            assert.equal(cjkFontForLanguage('ja-JP'), 'Noto Serif JP');
            assert.equal(cjkFontForLanguage('zh-CN'), 'Noto Serif SC');
            assert.equal(cjkFontForLanguage('zh_TW'), 'Noto Serif SC');
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
    });
});
