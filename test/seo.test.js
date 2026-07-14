'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    cleanDescription,
    copyrightYear,
    structuredData,
    buildPageTitle,
    resolveOpenGraphImage,
    openGraphLocale,
    faviconSvg,
    isoDateString
} = require('../scripts/lib/seo');

describe('scripts/lib/seo', () => {
    describe('cleanDescription', () => {
        it('prefers page.description then excerpt then content on reading pages', () => {
            assert.equal(
                cleanDescription({ description: '  Hello   world  ' }, {}),
                'Hello world'
            );
            assert.equal(
                cleanDescription({ excerpt: '<p>From <strong>excerpt</strong></p>' }, {}),
                'From excerpt'
            );
            assert.equal(
                cleanDescription(
                    { content: '<p>Body text with <code>code</code> only</p>' },
                    {},
                    { isReadingPage: true }
                ),
                'Body text with code only'
            );
            assert.equal(
                cleanDescription({}, { description: 'Site desc' }),
                'Site desc'
            );
        });

        it('falls through candidates that contain no readable text', () => {
            assert.equal(
                cleanDescription(
                    {
                        description: '   ',
                        excerpt: '<img src="cover.jpg" alt="">',
                        content: '<pre>code only</pre><p>Readable body</p>'
                    },
                    { description: 'Site desc' },
                    { isReadingPage: true }
                ),
                'Readable body'
            );
            assert.equal(
                cleanDescription(
                    { description: '\t', excerpt: '<p>Readable excerpt</p>' },
                    { description: 'Site desc' }
                ),
                'Readable excerpt'
            );
            assert.equal(
                cleanDescription(
                    { excerpt: '<img src="cover.jpg" alt="">' },
                    { description: 'Site desc' }
                ),
                'Site desc'
            );
        });

        it('truncates long descriptions', () => {
            const long = 'x'.repeat(250);
            const out = cleanDescription({ description: long }, {});
            assert.equal(out.length, 203);
            assert.ok(out.endsWith('...'));
        });
    });

    describe('copyrightYear', () => {
        it('returns range when since differs from current year', () => {
            assert.equal(copyrightYear(2020, 2026), '2020\u20132026');
            assert.equal(copyrightYear(2026, 2026), '2026');
            assert.equal(copyrightYear(null, 2026), '2026');
            assert.equal(copyrightYear('<img src=x onerror=alert(1)>', 2026), '2026');
            assert.equal(copyrightYear(2027, 2026), '2026');
        });
    });

    describe('buildPageTitle', () => {
        it('builds home, post, and taxonomy titles', () => {
            const config = { title: 'Site' };
            assert.equal(
                buildPageTitle({ current: 1 }, config, { isHome: true }),
                'Site'
            );
            assert.equal(
                buildPageTitle({ current: 2 }, config, {
                    isHome: true,
                    pageNumberLabel: (n) => 'Page ' + n
                }),
                'Page 2 | Site'
            );
            assert.equal(
                buildPageTitle({ title: 'Hello' }, config, {}),
                'Hello | Site'
            );
            assert.equal(
                buildPageTitle({ year: 2024, current: 1 }, config, {
                    isArchive: true,
                    t: (k) => (k === 'nav.archives' ? 'Archives' : k)
                }),
                'Archives: 2024 | Site'
            );
            assert.equal(
                buildPageTitle({ category: 'Child' }, config, {
                    isCategory: true,
                    categoryLabel: 'Parent / Child',
                    t: (k) => (k === 'nav.categories' ? 'Categories' : k)
                }),
                'Categories: Parent / Child | Site'
            );
            assert.equal(
                buildPageTitle({ tag: 'notes', title: 'notes' }, config, {
                    isTag: true,
                    t: (k) => (k === 'nav.tags' ? 'Tags' : k)
                }),
                'Tags: notes | Site'
            );
            assert.equal(
                buildPageTitle({ year: 2024, title: '2024', current: 2 }, config, {
                    isArchive: true,
                    pageNumberLabel: (n) => 'Page ' + n,
                    t: (k) => (k === 'nav.archives' ? 'Archives' : k)
                }),
                'Archives: 2024 - Page 2 | Site'
            );
        });
    });

    describe('structuredData', () => {
        it('returns BlogPosting for posts and WebSite for home', () => {
            const config = { title: 'Site', url: 'https://example.com', author: 'Ada' };
            const post = {
                title: 'Post',
                permalink: 'https://example.com/p/',
                date: new Date('2024-01-02T00:00:00.000Z'),
                tags: { toArray: () => [{ name: 'a' }, { name: 'b' }] }
            };
            const nodes = structuredData(post, config, {
                isPost: true,
                pageUrl: 'https://example.com/p/',
                description: 'Desc',
                image: 'https://example.com/img.png',
                publisherLogo: {
                    url: 'https://cdn.example/brand.png'
                }
            });
            assert.equal(nodes.length, 1);
            assert.equal(nodes[0]['@type'], 'BlogPosting');
            assert.equal(nodes[0].headline, 'Post');
            assert.equal(nodes[0].author.name, 'Ada');
            assert.equal(nodes[0].keywords, 'a, b');
            assert.equal(nodes[0].mainEntityOfPage['@id'], 'https://example.com/p/');
            assert.equal(nodes[0].publisher.logo.url, 'https://cdn.example/brand.png');
            assert.equal('width' in nodes[0].publisher.logo, false);

            const home = structuredData({}, config, {
                isHome: true,
                description: 'Home desc'
            });
            assert.equal(home[0]['@type'], 'WebSite');
            assert.equal(home[0].url, 'https://example.com');
        });

        it('returns empty array for unrelated pages', () => {
            assert.deepEqual(structuredData({ title: 'X' }, {}, {}), []);
            assert.deepEqual(structuredData(null, {}, {}), []);
        });
    });

    describe('resolveOpenGraphImage', () => {
        it('prefers page.photos then first content image', () => {
            const context = {
                url_for: (v) => v,
                full_url_for: (v) => 'https://example.com' + v,
                config: { url: 'https://example.com' }
            };
            const fromPhoto = resolveOpenGraphImage(context, {
                photos: ['https://cdn.example/p.jpg'],
                content: '<img src="/ignored.png" width="10" height="10">'
            });
            assert.equal(fromPhoto.url, 'https://cdn.example/p.jpg');
            assert.equal(fromPhoto.width, 0);
            assert.equal(fromPhoto.alt, '');

            const fromContent = resolveOpenGraphImage(context, {
                content: '<p><img src="/pic.png" width="640" height="360" alt="A quiet lake &amp; trees"></p>'
            });
            assert.equal(fromContent.url, 'https://example.com/pic.png');
            assert.equal(fromContent.width, 640);
            assert.equal(fromContent.height, 360);
            assert.equal(fromContent.alt, 'A quiet lake & trees');
        });

        it('skips decorative images before resolving the social image', () => {
            const context = {
                url_for: (v) => v,
                full_url_for: (v) => 'https://example.com' + v,
                config: { url: 'https://example.com' }
            };
            const image = resolveOpenGraphImage(context, {
                content: '<img class="emoji" src="/emoji.png">'
                    + '<img role="presentation" src="/presentation.png">'
                    + '<img width="1" height="1" src="/pixel.png">'
                    + '<img src="/cover.png" width="1200" height="630">'
            });
            assert.equal(image.url, 'https://example.com/cover.png');
            assert.equal(image.width, 1200);
        });
    });

    describe('openGraphLocale / isoDateString / faviconSvg', () => {
        it('normalizes locale tags', () => {
            assert.equal(openGraphLocale('zh-CN'), 'zh_CN');
            assert.equal(openGraphLocale('en'), 'en_US');
            assert.equal(openGraphLocale('fr'), 'fr_FR');
            assert.equal(openGraphLocale('ja'), 'ja_JP');
            assert.equal(openGraphLocale('zh-Hant'), 'zh_TW');
            assert.equal(openGraphLocale('ja_JP'), 'ja_JP');
            assert.equal(openGraphLocale('bad tag'), '');
        });

        it('formats dates as ISO strings', () => {
            assert.equal(isoDateString(new Date('2024-06-01T12:00:00.000Z')), '2024-06-01T12:00:00.000Z');
            assert.equal(isoDateString('not-a-date'), '');
        });

        it('builds favicon svg with escaped seal text', () => {
            const svg = faviconSvg('<x>');
            assert.match(svg, /&lt;x&gt;/);
            assert.match(svg, /seal-roughness/);
            assert.match(svg, /fill="rgba\(255,255,255,0\.95\)"/);
        });
    });
});
