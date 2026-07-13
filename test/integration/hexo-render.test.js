'use strict';

const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Hexo = require('hexo');

const projectRoot = path.resolve(__dirname, '../..');
let siteDir;

function write(relativePath, content) {
    const filePath = path.join(siteDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

function publicHtml(relativePath) {
    return fs.readFileSync(path.join(siteDir, 'public', relativePath), 'utf8');
}

describe('real Hexo + Nunjucks rendering', () => {
    before(async () => {
        siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiro-hexo-'));
        fs.mkdirSync(path.join(siteDir, 'themes'), { recursive: true });
        fs.symlinkSync(projectRoot, path.join(siteDir, 'themes/shiro'), process.platform === 'win32' ? 'junction' : 'dir');
        fs.symlinkSync(path.join(projectRoot, 'node_modules'), path.join(siteDir, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');

        write('package.json', JSON.stringify({
            private: true,
            dependencies: {
                hexo: '^8.1.2',
                'hexo-generator-archive': '^2.0.0',
                'hexo-generator-category': '^2.0.0',
                'hexo-generator-index': '^4.0.0',
                'hexo-generator-tag': '^2.0.0',
                'hexo-renderer-marked': '^7.0.1',
                'hexo-renderer-nunjucks': '^2.0.0'
            }
        }));
        write('_config.yml', [
            'title: Shiro Integration',
            'author: Test Author',
            'language: en',
            'url: https://example.com',
            'root: /',
            'permalink: :year/:month/:day/:title/',
            'theme: shiro',
            'archive_dir: archives',
            'category_dir: categories',
            'tag_dir: tags',
            ''
        ].join('\n'));
        write('_config.shiro.yml', [
            'site:',
            '  favicon: /brand.png',
            'mathjax:',
            '  enabled: true',
            '  every_page: true',
            '  protect: true',
            'toc:',
            '  enabled: true',
            '  min_headings: 3',
            ''
        ].join('\n'));
        write('source/brand.png', Buffer.from('89504e470d0a1a0a', 'hex'));
        write('source/_posts/integration.md', [
            '---',
            'title: Integration Post',
            'date: 2026-01-02 03:04:05',
            'categories:',
            '  - Testing',
            'tags:',
            '  - Smoke',
            'mathjax: true',
            '---',
            '<img class="emoji" src="/emoji.png" alt="emoji">',
            '<picture><source srcset="/hero.webp" type="image/webp"><img src="/hero.png" alt="Hero"></picture>',
            '',
            '## First heading',
            '',
            '## Second heading',
            '',
            '## Third heading',
            '',
            '\\(x^2 + y^2\\)',
            ''
        ].join('\n'));
        write('source/about/index.md', [
            '---',
            'title: About',
            'layout: page',
            '---',
            'About the integration fixture.',
            ''
        ].join('\n'));
        write('source/tags/index.md', '---\ntitle: Tags\nlayout: tag\n---\n');
        write('source/categories/index.md', '---\ntitle: Categories\nlayout: category\n---\n');

        const hexo = new Hexo(siteDir, { _: ['generate'], silent: true });
        hexo.env.init = true;
        await hexo.init();
        try {
            await hexo.call('generate', { bail: true });
        } finally {
            await hexo.exit();
        }
    });

    after(() => {
        if (siteDir) fs.rmSync(siteDir, { recursive: true, force: true });
    });

    it('renders post and home views through the real theme pipeline', () => {
        const post = publicHtml('2026/01/02/integration/index.html');
        const home = publicHtml('index.html');

        assert.match(post, /<title>Integration Post \| Shiro Integration<\/title>/);
        assert.match(post, /<picture><source[^>]+><img[^>]+loading="eager"[^>]*><\/picture>/);
        assert.doesNotMatch(post.match(/<img class="emoji"[^>]*>/)[0], /loading=/);
        assert.match(post, /<h2 id="[^"]*first-heading[^"]*">/i);
        assert.match(post, /mathjax@4\.1\.3\/tex-chtml\.js/);
        assert.match(post, /"logo":\{"@type":"ImageObject","url":"https:\/\/example\.com\/brand\.png"\}/);

        assert.match(home, /Integration Post/);
        assert.match(home, /hero\.png[^>]+loading="eager"/);
        assert.doesNotMatch(home, /\{[%{]/);
    });

    it('renders page, archive, category, tag, favicon, and generated assets', () => {
        const routes = [
            'about/index.html',
            'archives/index.html',
            'categories/index.html',
            'categories/Testing/index.html',
            'tags/index.html',
            'tags/Smoke/index.html'
        ];
        routes.forEach((route) => {
            const html = publicHtml(route);
            assert.match(html, /<!DOCTYPE html>/i, route);
            assert.doesNotMatch(html, /\{[%{]/, route);
        });

        assert.equal(fs.existsSync(path.join(siteDir, 'public/favicon.svg')), true);
        assert.equal(fs.existsSync(path.join(siteDir, 'public/css/style.min.css')), true);
        assert.equal(fs.existsSync(path.join(siteDir, 'public/js/runtime.min.js')), true);
    });
});
