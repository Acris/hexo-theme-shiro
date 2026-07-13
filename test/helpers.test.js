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

    it('uses the resolved hierarchical category label in page titles', () => {
        const buildPageTitle = helpers.get('build_page_title');
        const parent = { _id: 'a', name: 'Parent', path: 'categories/parent/' };
        const child = {
            _id: 'b',
            parent: 'a',
            name: 'Child',
            path: 'categories/parent/child/'
        };
        const context = {
            site: { categories: [parent, child] },
            is_home: () => false,
            is_archive: () => false,
            is_tag: () => false,
            is_category: () => true,
            __: (key) => ({ 'nav.categories': 'Categories' }[key] || key)
        };

        assert.equal(
            buildPageTitle.call(
                context,
                { title: 'Child', category: 'Child', path: 'categories/parent/child/' },
                { title: 'Site' }
            ),
            'Categories: Parent / Child | Site'
        );
    });

    it('applies list-card image loading defaults without overriding authors', () => {
        const excerptForCard = helpers.get('excerpt_for_card');
        const context = { theme: {} };
        const post = {
            excerpt: '<img src="/cover.png">',
            content: '<img src="/cover.png"><p>Body</p>'
        };
        assert.match(excerptForCard.call(context, post, true).content, /loading="eager"/);
        assert.match(excerptForCard.call(context, post, false).content, /loading="lazy"/);

        post.excerpt = '<img src="/cover.png" loading="lazy">';
        assert.match(excerptForCard.call(context, post, true).content, /loading="lazy"/);
    });

    it('builds home card models and reading-image defaults', () => {
        const cardsFor = helpers.get('post_card_view_models');
        const defaultLoading = helpers.get('default_image_loading');
        const context = { theme: {} };
        const cards = cardsFor.call(context, [
            { excerpt: '<p>No image</p>', content: '' },
            { excerpt: '<img src="/hero.png">', content: '' }
        ]);

        assert.match(cards[1].excerpt.content, /loading="eager"/);
        assert.match(defaultLoading('<img src="/article.png">', 'eager'), /loading="eager"/);
    });

    it('uses the configured favicon for publisher structured data', () => {
        const structuredData = helpers.get('structured_data');
        const context = {
            theme: { site: { favicon: '/brand.png' } },
            config: { title: 'Site', url: 'https://example.com' },
            full_url_for: value => 'https://example.com' + value,
            url_for: value => value,
            og_image: () => '',
            clean_description: () => '',
            is_post: () => true,
            is_home: () => false
        };
        const nodes = structuredData.call(context, { title: 'Post' }, context.config);
        assert.equal(nodes[0].publisher.logo.url, 'https://example.com/brand.png');
        assert.equal('width' in nodes[0].publisher.logo, false);
    });

    it('falls back safely for an invalid publisher favicon URL', () => {
        const structuredData = helpers.get('structured_data');
        const context = {
            theme: { site: { favicon: 'javascript:alert(1)' } },
            config: { title: 'Site', url: 'https://example.com' },
            full_url_for: value => 'https://example.com' + value,
            url_for: value => value,
            og_image: () => '',
            clean_description: () => '',
            is_post: () => true,
            is_home: () => false
        };
        const nodes = structuredData.call(context, { title: 'Post' }, context.config);
        assert.equal(nodes[0].publisher.logo.url, 'https://example.com/favicon.svg');
        assert.equal(nodes[0].publisher.logo.width, 112);
    });
});
