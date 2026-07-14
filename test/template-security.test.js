'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('template security contracts', () => {
    it('escapes reusable UI macro class and id parameters', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '../layout/_macro/ui.njk'),
            'utf8'
        );
        assert.doesNotMatch(source, /\b(?:class|id)="[^"]*\{\{(?!\s*escape_attr\()/);
    });

    it('escapes the normalized footer year before rendering it', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '../layout/_partial/common/footer.njk'),
            'utf8'
        );
        assert.match(source, /\{\{\s*escape_html\(copyright_year\(/);
    });

    it('uses image descriptions for social alt text and omits name-only article authors', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '../layout/_partial/common/head-seo.njk'),
            'utf8'
        );
        assert.match(source, /og:image:alt[^\n]*og_img_alt/);
        assert.match(source, /twitter:image:alt[^\n]*og_img_alt/);
        assert.doesNotMatch(source, /property="article:author"/);
    });

    it('escapes paginator i18n labels (Hexo injects them as HTML)', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '../layout/_partial/common/pagination.njk'),
            'utf8'
        );
        assert.match(source, /prev_text:\s*escape_html\(__\(['"]page\.prev['"]\)\)/);
        assert.match(source, /next_text:\s*escape_html\(__\(['"]page\.next['"]\)\)/);
    });

    it('uses root-absolute pagefindBase for client asset loads', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '../layout/_layout.njk'),
            'utf8'
        );
        assert.match(
            source,
            /feature_var\(\s*['"]pagefindBase['"]\s*,\s*url_for\(\s*['"]\/pagefind\/['"]\s*,\s*\{\s*relative:\s*false\s*\}\s*\)\s*\)/
        );
    });

    it('prefetches Pagefind component assets with root-absolute URLs', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '../layout/_partial/common/head-prefetch.njk'),
            'utf8'
        );
        assert.match(
            source,
            /url_for\(\s*['"]\/pagefind\/pagefind-component-ui\.css['"]\s*,\s*\{\s*relative:\s*false\s*\}\s*\)/
        );
        assert.match(
            source,
            /url_for\(\s*['"]\/pagefind\/pagefind-component-ui\.js['"]\s*,\s*\{\s*relative:\s*false\s*\}\s*\)/
        );
    });
});
