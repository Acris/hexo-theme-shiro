'use strict';

const crypto = require('crypto');
const fs = require('fs');
const pathFn = require('path');

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2';
const assetHashCache = new Map();
const excerptCache = new WeakMap();

function collectionToArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value.toArray === 'function') return value.toArray();
    return [];
}

function primaryLanguage(language) {
    const raw = Array.isArray(language) ? language[0] : language;
    return (raw || '').toString().trim().toLowerCase();
}

function cjkFontForLanguage(language) {
    const lang = primaryLanguage(language);
    if (/^ja(?:[-_]|$)/.test(lang)) return 'Noto Serif JP';
    if (/^zh(?:[-_]|$)/.test(lang)) return 'Noto Serif SC';
    return '';
}

function hasCodeContent(content) {
    if (!content) return false;
    return /<(pre|code)\b|class=["'][^"']*\b(highlight|gist)\b/i.test(String(content));
}

function pageHasCode(page) {
    if (!page) return false;
    if (hasCodeContent(page.content) || hasCodeContent(page.excerpt)) return true;

    return collectionToArray(page.posts).some(post => {
        if (hasCodeContent(post.excerpt)) return true;
        return !post.excerpt && hasCodeContent(post.content);
    });
}

function tocHeadingLevels(tocConfig) {
    const maxDepth = Math.max(1, Number(tocConfig && tocConfig.depth) || 3);
    const levels = [];
    for (let i = 1; i <= maxDepth; i++) levels.push(i + 1);
    return levels;
}

function countTocHeadings(content, tocConfig) {
    if (!content) return 0;
    const levels = new Set(tocHeadingLevels(tocConfig));
    const html = String(content)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[\s\S]*?<\/style>/gi, '');
    const matches = html.matchAll(/<h([2-6])\b[^>]*>/gi);
    let count = 0;
    for (const match of matches) {
        if (levels.has(Number(match[1]))) count++;
    }
    return count;
}

hexo.extend.helper.register('should_render_toc', function (content, tocConfig) {
    if (!tocConfig || tocConfig.enabled === false) return false;
    const minHeadings = Math.max(1, Number(tocConfig.min_headings) || 3);
    return countTocHeadings(content, tocConfig) >= minHeadings;
});

function firstImageSrc(content) {
    if (!content) return '';
    const match = String(content).match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
    return match ? match[1] : '';
}

function truncateText(text, length) {
    const limit = Math.max(0, Number(length) || 0);
    if (!limit || text.length <= limit) return text;

    const head = text.substring(0, limit);
    const boundary = head.lastIndexOf(' ');
    return (boundary > 0 ? head.substring(0, boundary) : head) + '...';
}

function fontFamilyParam(name, weights) {
    const family = name.trim().replace(/\s+/g, '+');
    return 'family=' + family + (weights && weights.length ? ':wght@' + weights.join(';') : '');
}

function googleFontUrl(families, display) {
    const params = families.map(item => fontFamilyParam(item.name, item.weights));
    params.push('display=' + display);
    return GOOGLE_FONTS_BASE + '?' + params.join('&');
}

hexo.extend.helper.register('google_font_urls', function (page, config) {
    const criticalFamilies = [
        { name: 'Cardo', weights: ['400', '700'] },
        { name: 'Yuji Syuku' },
        { name: 'Zen Old Mincho', weights: ['400', '600'] }
    ];

    const cjkFamily = cjkFontForLanguage(config && config.language);
    if (cjkFamily) {
        criticalFamilies.push({ name: cjkFamily, weights: ['400', '600'] });
    }

    const urls = [
        googleFontUrl(criticalFamilies, 'swap'),
        googleFontUrl([{ name: 'Cormorant Garamond', weights: ['400', '600'] }], 'optional')
    ];

    if (pageHasCode(page)) {
        urls.push(googleFontUrl([{ name: 'Fira Code', weights: ['400', '500'] }], 'swap'));
    }

    return urls;
});

hexo.extend.helper.register('page_has_code', function (page) {
    return pageHasCode(page);
});

// Cache-busting helper: appends ?v=<hash> to local asset URLs
hexo.extend.helper.register('versioned_url', function (assetPath) {
    const url = this.url_for(assetPath);
    const sourceDir = pathFn.join(hexo.theme_dir, 'source');
    const filePath = pathFn.join(sourceDir, assetPath);

    try {
        const stat = fs.statSync(filePath);
        const cached = assetHashCache.get(filePath);
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
            return cached.hash ? url + '?v=' + cached.hash : url;
        }

        const content = fs.readFileSync(filePath);
        const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
        assetHashCache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, hash });
        return url + '?v=' + hash;
    } catch (e) {
        // File not found at theme level; fall back to plain url_for
        assetHashCache.set(filePath, { mtimeMs: 0, size: 0, hash: '' });
        return url;
    }
});

hexo.extend.helper.register('has_images', function (content) {
    return !!firstImageSrc(content);
});

hexo.extend.helper.register('first_image', function (content) {
    return firstImageSrc(content);
});


hexo.extend.helper.register('excerpt_for', function (post, length) {
    if (!post) return { content: '', truncated: false };

    const limit = Math.max(0, Number(length) || 0);
    const source = post.excerpt || post.content || '';
    const cacheKey = limit + '|' + (post.excerpt ? 'manual' : 'fallback');
    const postCache = excerptCache.get(post);
    const cached = postCache && postCache.get(cacheKey);
    if (cached && cached.source === source) return cached.result;

    let result;
    if (post.excerpt) {
        result = { content: post.excerpt, truncated: true };
    } else {
        const plain = this.strip_html(post.content || '').replace(/\s+/g, ' ').trim();
        if (limit > 0 && plain.length > limit) {
            result = { content: '<p>' + truncateText(plain, limit) + '</p>', truncated: true };
        } else {
            result = { content: post.content || '', truncated: false };
        }
    }

    const nextPostCache = postCache || new Map();
    nextPostCache.set(cacheKey, { source, result });
    if (!postCache) excerptCache.set(post, nextPostCache);
    return result;
});

hexo.extend.helper.register('clean_description', function (page, config) {
    const raw = page.description || page.excerpt || config.description || '';
    const text = this.strip_html(raw).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
});

hexo.extend.helper.register('copyright_year', function (since) {
    const current = new Date().getFullYear().toString();
    return (since && since.toString() !== current) ? since + '\u2013' + current : current;
});

hexo.extend.helper.register('build_page_title', function (page, config) {
    const site = config.title || '';
    if (this.is_home()) return site;
    if (page.title) return page.title + ' | ' + site;
    if (this.is_archive()) return this.__('nav.archives') + (page.year ? ': ' + page.year : '') + ' | ' + site;
    if (this.is_tag()) return this.__('nav.tags') + (page.tag ? ': ' + page.tag : '') + ' | ' + site;
    if (this.is_category()) return this.__('nav.categories') + (page.category ? ': ' + page.category : '') + ' | ' + site;
    return site;
});

// Generate favicon.svg dynamically from seal_text config
hexo.extend.generator.register('favicon_svg', function (locals) {
    const themeConfig = this.theme.config || this.config.theme_config || {};
    const text = (themeConfig.site && themeConfig.site.seal_text) || '白';
    const color = '#b0171a';
    const svg = '<svg width="52" height="52" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
        + '<defs>'
        + '<filter id="seal-roughness" x="-20%" y="-20%" width="140%" height="140%">'
        + '<feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="noise"/>'
        + '<feDisplacementMap in="SourceGraphic" in2="noise" scale="3"/></filter>'
        + '<filter id="text-erosion">'
        + '<feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="1" result="noise"/>'
        + '<feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5"/></filter>'
        + '</defs>'
        + '<path d="M15,12 Q50,5 85,12 Q95,50 88,88 Q50,95 12,88 Q5,50 15,12 Z" fill="' + color + '" filter="url(#seal-roughness)" opacity="0.92"/>'
        + '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" '
        + 'font-family="\'Yuji Syuku\',\'Zen Old Mincho\',\'Noto Serif JP\',serif" font-size="42" '
        + 'fill="rgba(255,255,255,0.92)" filter="url(#text-erosion)" style="user-select:none">'
        + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        + '</text></svg>';
    return { path: 'favicon.svg', data: svg };
});

hexo.extend.helper.register('og_image', function (page) {
    let src = '';
    if (page.photos && page.photos.length) src = page.photos[0];
    else src = this.first_image(page.content);
    if (!src) return '';
    // Ensure absolute URL for Open Graph
    if (src.indexOf('//') === 0) return 'https:' + src;
    if (!/^https?:\/\//.test(src)) {
        const base = this.config.url.replace(/\/$/, '');
        return base + this.url_for(src);
    }
    return src;
});
