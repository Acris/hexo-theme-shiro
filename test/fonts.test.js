'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { cjkFontForLanguage, googleFontUrls } = require('../scripts/lib/fonts');

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
    });
});
