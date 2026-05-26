'use strict';

const crypto = require('crypto');
const fs = require('fs');
const pathFn = require('path');

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2';
const DEFAULT_EXCERPT_LENGTH = 200;
const META_DESCRIPTION_LENGTH = 200;
const assetHashCache = new Map();
const assetUrlCache = new Map();
const excerptCache = new WeakMap();
const cleanDescriptionCache = new WeakMap();
const pageAnalysisCache = new WeakMap();

// Shared seal SVG geometry — used by the header macro (via seal_path_d helper)
// and the favicon generator below. Defined once to avoid drift.
const SEAL_PATH_D = 'M15,12 Q50,5 85,12 Q95,50 88,88 Q50,95 12,88 Q5,50 15,12 Z';
const SEAL_FILTER_DEFS = '<defs>'
    + '<filter id="seal-roughness" x="-20%" y="-20%" width="140%" height="140%">'
    + '<feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="noise"/>'
    + '<feDisplacementMap in="SourceGraphic" in2="noise" scale="3"/></filter>'
    + '<filter id="text-erosion">'
    + '<feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="1" result="noise"/>'
    + '<feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5"/></filter>'
    + '</defs>';
const HTML_SKIPPED_CONTENT_RE = /<!--[\s\S]*?-->|<(script|style|textarea|template|pre|code)\b[\s\S]*?(?:<\/\1\s*>|$)/gi;
const HTML_ID_RE = /<!--[\s\S]*?-->|<(script|style|textarea|template|pre|code)\b[\s\S]*?(?:<\/\1\s*>|$)|\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const HTML_IMAGE_RE = /<!--[\s\S]*?-->|<(script|style|textarea|template|pre|code)\b[\s\S]*?(?:<\/\1\s*>|$)|<img\b([^>]*)>/gi;
const TOC_HEADING_RE = /<!--[\s\S]*?-->|<(script|style|textarea|template|pre|code)\b[\s\S]*?(?:<\/\1\s*>|$)|<h([2-6])\b([^>]*)>([\s\S]*?)<\/h\2>/gi;
const CODE_CONTENT_RE = /<!--[\s\S]*?-->|<(script|style|textarea|template)\b[\s\S]*?(?:<\/\1\s*>|$)|<([a-z][\w:-]*)\b([^>]*)>/gi;
const CODE_CLASS_TOKENS = new Set(['highlight', 'gist']);
const HTML_VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
    'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

function collectionToArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value.toArray === 'function') return value.toArray();
    return [];
}

function scalarOrCollectionToArray(value) {
    if (typeof value === 'string') return value ? [value] : [];
    return collectionToArray(value);
}

function hasClassToken(attrs, tokens) {
    const classValue = decodeHtmlEntities(imageAttrValue(attrs || '', 'class'));
    if (!classValue) return false;
    return classValue.split(/\s+/).some(token => tokens.has(token));
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

// -----------------------------------------------------------------------------
// HTML analysis and text extraction
// -----------------------------------------------------------------------------

function hasCodeContent(content) {
    if (!content) return false;
    const re = CODE_CONTENT_RE;
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(String(content)))) {
        const tagName = match[2] && match[2].toLowerCase();
        if (tagName === 'pre' || tagName === 'code' || hasClassToken(match[3], CODE_CLASS_TOKENS)) {
            re.lastIndex = 0;
            return true;
        }
    }
    re.lastIndex = 0;
    return false;
}

function strippedHtml(content) {
    return String(content || '').replace(HTML_SKIPPED_CONTENT_RE, '');
}

function htmlWithoutCodeContent(content) {
    const withoutRawBlocks = String(content || '')
        .replace(/<!--[\s\S]*?-->|<(script|style|textarea|template)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ')
        .replace(/<pre\b[\s\S]*?(?:<\/\s*pre>|$)/gi, ' ');

    return stripClassTokenBlocks(withoutRawBlocks, CODE_CLASS_TOKENS);
}

function stripClassTokenBlocks(content, tokens) {
    const source = String(content || '');
    const tagRe = /<([a-z][\w:-]*)\b([^>]*)>/gi;
    let result = '';
    let cursor = 0;
    let match;

    while ((match = tagRe.exec(source))) {
        if (!hasClassToken(match[2], tokens)) continue;

        const start = match.index;
        if (start < cursor) continue;

        result += source.slice(cursor, start) + ' ';
        cursor = shouldSkipOnlyOpeningTag(match[0], match[1])
            ? tagRe.lastIndex
            : skipElementBlock(source, tagRe.lastIndex, match[1]);
        tagRe.lastIndex = cursor;
    }

    return result + source.slice(cursor);
}

function shouldSkipOnlyOpeningTag(openingTag, tagName) {
    return HTML_VOID_TAGS.has(String(tagName || '').toLowerCase()) || /\/\s*>$/.test(openingTag);
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Skip from a tag position (or just after its opening tag) to the next close tag.
function skipBlock(source, start, openTag) {
    const close = new RegExp('</' + openTag + '\\s*>', 'i');
    const match = close.exec(source.slice(start));
    return match ? start + match.index + match[0].length : source.length;
}

// Skip a whole element block, accounting for nested elements with the same tag.
function skipElementBlock(source, start, openTag) {
    const tag = escapeRegExp(openTag);
    const tagRe = new RegExp('</?' + tag + '\\b[^>]*>', 'gi');
    let depth = 1;
    let match;
    tagRe.lastIndex = start;

    while ((match = tagRe.exec(source))) {
        const text = match[0];
        if (/^<\//.test(text)) {
            depth -= 1;
            if (depth === 0) return tagRe.lastIndex;
        } else if (!/\/\s*>$/.test(text)) {
            depth += 1;
        }
    }

    return source.length;
}

function htmlTextFromHtml(content, length) {
    const limit = Math.max(0, Number(length) || 0);
    const source = String(content || '');
    const targetLength = limit > 0 ? limit + 40 : 0;

    let text = '';
    let i = 0;

    while (i < source.length) {
        // Cheap upper-bound check: text.length is always ≥ condensed length, so this
        // short-circuits long documents without repeatedly normalizing the buffer.
        if (targetLength && text.length > targetLength * 3) break;

        const ch = source[i];

        if (ch !== '<') {
            const nextTag = source.indexOf('<', i);
            const end = nextTag === -1 ? source.length : nextTag;
            text += source.slice(i, end);
            i = end;
            continue;
        }

        // HTML comment
        if (source.startsWith('<!--', i)) {
            const end = source.indexOf('-->', i + 4);
            i = end === -1 ? source.length : end + 3;
            continue;
        }

        // Skip entire block contents.
        const blockTag = /^<(script|style|textarea|template)\b/i.exec(source.slice(i, i + 11));
        if (blockTag) {
            i = skipBlock(source, i, blockTag[1]);
            text += ' ';
            continue;
        }

        // Any other tag
        const tagEnd = source.indexOf('>', i + 1);
        i = tagEnd === -1 ? source.length : tagEnd + 1;
        text += ' ';
    }

    return decodeHtmlEntities(text).replace(/\s+/g, ' ').trim();
}

function htmlTextReachesLength(content, length) {
    const limit = Math.max(0, Number(length) || 0);
    return limit > 0 && htmlTextFromHtml(content, limit).length >= limit;
}

function cachedStrippedHtml(html) {
    let cache;
    return () => {
        if (cache === undefined) cache = strippedHtml(html);
        return cache;
    };
}

function countImagesInHtml(html) {
    const re = HTML_IMAGE_RE;
    re.lastIndex = 0;
    let count = 0;
    let match;
    while ((match = re.exec(html))) {
        if (match[2] === undefined) continue;
        if (imageHasLightboxSource(match[2])) count += 1;
    }
    re.lastIndex = 0;
    return count;
}

function countHeadingsInHtml(html) {
    const counts = new Map();
    const matches = html.matchAll(/<h([2-6])\b[^>]*>/gi);
    for (const match of matches) {
        const level = Number(match[1]);
        counts.set(level, (counts.get(level) || 0) + 1);
    }
    return counts;
}

function defineAnalysisGetters(analysis, html, textHtml) {
    let firstImageCache;
    let imageCountCache;
    let hasCodeCache;
    let headingCountsCache;

    Object.defineProperties(analysis, {
        firstImage: {
            enumerable: true,
            get() {
                if (firstImageCache === undefined) firstImageCache = firstImageSrc(html);
                return firstImageCache;
            }
        },
        imageCount: {
            enumerable: true,
            get() {
                if (imageCountCache === undefined) imageCountCache = countImagesInHtml(html);
                return imageCountCache;
            }
        },
        hasCode: {
            enumerable: true,
            get() {
                if (hasCodeCache === undefined) {
                    hasCodeCache = hasCodeContent(html) || hasCodeContent(analysis.excerpt);
                }
                return hasCodeCache;
            }
        },
        headingCounts: {
            enumerable: true,
            get() {
                if (!headingCountsCache) headingCountsCache = countHeadingsInHtml(textHtml());
                return headingCountsCache;
            }
        }
    });
}

function analyzeHtml(content) {
    const html = String(content || '');
    const textHtml = cachedStrippedHtml(html);
    const analysis = {
        html,
        excerpt: '',
        tocCache: new Map()
    };

    defineAnalysisGetters(analysis, html, textHtml);
    return analysis;
}

function pageAnalysis(page) {
    if (!page || typeof page !== 'object') return analyzeHtml('');

    const html = String(page.content || '');
    const excerpt = String(page.excerpt || '');
    const cached = pageAnalysisCache.get(page);
    if (cached && cached.html === html && cached.excerpt === excerpt) return cached;

    const analysis = analyzeHtml(html);
    analysis.excerpt = excerpt;
    pageAnalysisCache.set(page, analysis);
    return analysis;
}

function excerptFallbackEnabled(themeConfig) {
    const fallback = themeConfig && themeConfig.excerpt && themeConfig.excerpt.fallback;
    return !fallback || fallback.enabled !== false;
}

function excerptFallbackLength(fallbackConfig) {
    if (fallbackConfig && fallbackConfig.length !== undefined) {
        return Math.max(0, Number(fallbackConfig.length) || 0);
    }
    return DEFAULT_EXCERPT_LENGTH;
}

function renderedPostCardHasCode(post, themeConfig) {
    if (!post) return false;
    if (post.excerpt) return hasCodeContent(post.excerpt);

    if (excerptFallbackEnabled(themeConfig)) {
        const fallback = themeConfig && themeConfig.excerpt && themeConfig.excerpt.fallback;
        const limit = excerptFallbackLength(fallback);
        if (limit > 0 && htmlTextFromHtml(post.content, limit).length > limit) return false;
    }

    return hasCodeContent(post.content);
}

function pageHasCode(page, themeConfig, context) {
    if (!page) return false;

    const isReadingPage = context && (
        (typeof context.is_post === 'function' && context.is_post())
        || (typeof context.is_page === 'function' && context.is_page())
    );
    if (isReadingPage || !page.posts) return pageAnalysis(page).hasCode;

    if (context && typeof context.is_home === 'function' && context.is_home()) {
        return collectionToArray(page.posts).some(post => renderedPostCardHasCode(post, themeConfig));
    }

    return pageAnalysis(page).hasCode;
}

function pageLooksLong(page) {
    if (!page || !page.content) return false;
    const analysis = pageAnalysis(page);
    const headingCount = countTocHeadingsFromAnalysis(analysis, { depth: 6 });

    return headingCount >= 4 || analysis.imageCount >= 3 || htmlTextReachesLength(analysis.html, 1600);
}

function tocHeadingLevels(tocConfig) {
    const maxDepth = Math.min(6, Math.max(2, Number(tocConfig && tocConfig.depth) || 3));
    const levels = [];
    for (let i = 2; i <= maxDepth; i++) levels.push(i);
    return levels;
}

function countTocHeadingsFromAnalysis(analysis, tocConfig) {
    const levels = tocHeadingLevels(tocConfig);
    return levels.reduce((count, level) => count + (analysis.headingCounts.get(level) || 0), 0);
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeScriptJson(value) {
    let json;
    try {
        json = JSON.stringify(value === undefined ? null : value);
    } catch (_) {
        json = JSON.stringify(String(value));
    }
    return (json === undefined ? 'null' : json)
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

function hasUrlControlChars(value) {
    return /[\u0000-\u001F\u007F]/.test(value);
}

function normalizedUrlText(value) {
    const text = String(value || '').trim();
    return text && !hasUrlControlChars(text) ? text : '';
}

function resolveNavigationUrl(text, context) {
    if (!text) return '';
    if (text[0] === '#') return text;
    if (/^(?:https?:)?\/\//i.test(text)) return text;
    if (/^(?:mailto|tel):/i.test(text)) return text;
    if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return '';
    return context.url_for(text);
}

function isSafeDataImageUrl(text) {
    return /^data:image\/(?:avif|bmp|gif|ico|jpeg|jpg|png|svg\+xml|vnd\.microsoft\.icon|webp|x-icon)(?:;[^,]*)?,/i.test(text);
}

function resourceUrlOptions(options) {
    if (options === true) return { allowDataImage: true };
    return options && typeof options === 'object' ? options : {};
}

function resolveResourceUrl(text, context, options) {
    const opts = resourceUrlOptions(options);
    if (!text) return '';
    if (/^(?:https?:)?\/\//i.test(text)) return text;
    if (opts.allowDataImage && isSafeDataImageUrl(text)) return text;
    if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return '';
    return context.url_for(text);
}

function safeNavigationUrl(value, context, fallback) {
    const safeFallback = resolveNavigationUrl(normalizedUrlText(fallback), context) || '#';
    return resolveNavigationUrl(normalizedUrlText(value), context) || safeFallback;
}

function safeResourceUrl(value, context, fallback, options) {
    const text = String(value || '').trim();
    const safeFallback = resolveResourceUrl(normalizedUrlText(fallback), context, options);
    return resolveResourceUrl(normalizedUrlText(text), context, options) || safeFallback;
}

function normalizedLinkTarget(value) {
    return normalizedUrlText(value);
}

function htmlCodePoint(match, code, radix) {
    const value = parseInt(code, radix);
    if (!Number.isFinite(value)) return match;
    try {
        return String.fromCodePoint(value);
    } catch (_) {
        return match;
    }
}

function decodeHtmlEntities(value) {
    const text = String(value);
    if (text.indexOf('&') === -1) return text;
    return text
        .replace(/&#(\d+);/g, (match, code) => htmlCodePoint(match, code, 10))
        .replace(/&#x([\da-f]+);/gi, (match, code) => htmlCodePoint(match, code, 16))
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function normalizePlainText(value) {
    return decodeHtmlEntities(String(value || '')).replace(/\s+/g, ' ').trim();
}

function plainHeadingText(html) {
    return decodeHtmlEntities(String(html)
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[\s\S]*?<\/style>/gi, '')
        .replace(/<textarea\b[\s\S]*?<\/textarea>/gi, '')
        .replace(/<template\b[\s\S]*?<\/template>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim());
}

function slugifyHeading(text) {
    return String(text).trim()
        .toLowerCase()
        .replace(/[\s]+/g, '-')
        .replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\uAC00-\uD7AF-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        || 'heading';
}

function headingId(attrs) {
    const match = String(attrs).match(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    return match ? decodeHtmlEntities(match[1] || match[2] || match[3] || '') : '';
}

function tocCacheKey(tocConfig) {
    if (!tocConfig || tocConfig.enabled === false) return 'disabled';
    return [
        'depth=' + (Math.min(6, Math.max(2, Number(tocConfig.depth) || 3))),
        'min=' + (Math.max(1, Number(tocConfig.min_headings) || 3))
    ].join('|');
}

function collectExistingIds(source) {
    const ids = new Set();
    source.replace(HTML_ID_RE, (match, skippedTag, doubleQuoted, singleQuoted, unquoted) => {
        if (doubleQuoted === undefined && singleQuoted === undefined && unquoted === undefined) return match;
        const id = decodeHtmlEntities(doubleQuoted || singleQuoted || unquoted || '');
        if (id) ids.add(id);
        return match;
    });
    return ids;
}

function fragmentHref(id) {
    return '#' + encodeURIComponent(String(id || ''));
}

function uniqueHeadingId(title, existingIds) {
    const base = slugifyHeading(title);
    let id = base;
    let counter = 1;
    while (existingIds.has(id)) id = base + '-' + counter++;
    existingIds.add(id);
    return id;
}

function rewriteTocHeadings(source, levels) {
    const existingIds = collectExistingIds(source);
    const headings = [];
    let minLevel = 6;

    const content = source.replace(TOC_HEADING_RE, (match, skippedTag, levelRaw, attrs, inner) => {
        if (!levelRaw) return match;
        const level = Number(levelRaw);
        if (!levels.has(level)) return match;

        const title = plainHeadingText(inner);
        if (!title) return match;

        let id = headingId(attrs);
        let nextAttrs = attrs;
        if (!id) {
            id = uniqueHeadingId(title, existingIds);
            nextAttrs = attrs + ' id="' + escapeHtml(id) + '"';
        }

        if (level < minLevel) minLevel = level;
        headings.push({ id, level, title });
        return '<h' + levelRaw + nextAttrs + '>' + inner + '</h' + levelRaw + '>';
    });

    return { content, headings, minLevel };
}

function renderTocList(headings, minLevel) {
    const items = headings.map(heading => {
        const indent = Math.max(0, heading.level - minLevel);
        return '<li class="toc-item" data-level="' + indent + '">'
            + '<a class="toc-link" href="' + escapeHtml(fragmentHref(heading.id)) + '" data-target="' + escapeHtml(heading.id) + '">'
            + escapeHtml(heading.title)
            + '</a></li>';
    }).join('');
    return '<ul class="toc-list">' + items + '</ul>';
}

function buildToc(content, tocConfig) {
    const source = String(content || '');
    if (!tocConfig || tocConfig.enabled === false || !source) {
        return { shouldRender: false, content: source, html: '' };
    }

    const levels = new Set(tocHeadingLevels(tocConfig));
    const minHeadings = Math.max(1, Number(tocConfig.min_headings) || 3);
    const result = rewriteTocHeadings(source, levels);

    if (result.headings.length < minHeadings) {
        return { shouldRender: false, content: source, html: '' };
    }

    return {
        shouldRender: true,
        content: result.content,
        html: renderTocList(result.headings, result.minLevel)
    };
}

function cachedToc(page, tocConfig) {
    const analysis = pageAnalysis(page);
    const key = tocCacheKey(tocConfig);
    const cached = analysis.tocCache.get(key);
    if (cached) return cached;

    const result = buildToc(analysis.html, tocConfig);
    analysis.tocCache.set(key, result);
    return result;
}

hexo.extend.helper.register('should_render_toc', function (page, tocConfig) {
    return cachedToc(page, tocConfig).shouldRender;
});

hexo.extend.helper.register('build_toc', function (page, tocConfig) {
    return cachedToc(page, tocConfig);
});

function firstImageSrc(content) {
    if (!content) return '';
    const source = String(content);
    const imgRe = HTML_IMAGE_RE;
    imgRe.lastIndex = 0;
    let img;
    while ((img = imgRe.exec(source))) {
        const attrs = img[2];
        if (attrs === undefined) continue;
        const src = imageAttrValue(attrs, 'src');
        if (isUsableImageSrcCandidate(src)) {
            imgRe.lastIndex = 0;
            return String(src).trim();
        }
        const dataSrc = imageAttrValue(attrs, 'data-src');
        if (isUsableImageSrcCandidate(dataSrc)) {
            imgRe.lastIndex = 0;
            return String(dataSrc).trim();
        }
    }
    imgRe.lastIndex = 0;
    return '';
}

function imageAttrValue(attrs, name) {
    const valuePattern = '(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'=<>`]+))';
    const re = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*' + valuePattern, 'i');
    const match = re.exec(attrs);
    return match ? (match[1] || match[2] || match[3] || '') : '';
}

function imageHasLightboxSource(attrs) {
    return isLightboxImageSrcCandidate(imageAttrValue(attrs, 'src'))
        || isLightboxImageSrcCandidate(imageAttrValue(attrs, 'data-src'));
}

function isUsableImageSrcCandidate(value) {
    const text = String(value || '').trim();
    const decoded = decodeHtmlEntities(text).trim();
    if (!decoded || decoded[0] === '#') return false;
    if (hasUrlControlChars(decoded)) return false;
    return !/^[a-z][a-z0-9+.-]*:/i.test(decoded) || /^https?:\/\//i.test(decoded);
}

function isLightboxImageSrcCandidate(value) {
    const text = String(value || '').trim();
    const decoded = decodeHtmlEntities(text).trim();
    if (!decoded || decoded[0] === '#') return false;
    if (hasUrlControlChars(decoded)) return false;
    if (/^https?:\/\//i.test(decoded) || decoded.indexOf('//') === 0 || /^blob:/i.test(decoded)) return true;
    if (/^data:image\/(?:avif|bmp|gif|jpe?g|png|webp);/i.test(decoded)) return true;
    return !/^[a-z][a-z0-9+.-]*:/i.test(decoded);
}

function normalizeOpenGraphImageUrl(src, context) {
    const value = decodeHtmlEntities(String(src || '')).trim();
    if (!value || value[0] === '#') return '';
    if (hasUrlControlChars(value)) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.indexOf('//') === 0) return 'https:' + value;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';

    const assetUrl = context.url_for(value);
    if (/^https?:\/\//i.test(assetUrl)) return assetUrl;

    const base = String((context.config && context.config.url) || '').replace(/\/$/, '');
    if (!base) return assetUrl;

    try {
        const parsed = new URL(base);
        const basePath = parsed.pathname.replace(/\/$/, '');
        if (basePath && (assetUrl === basePath || assetUrl.startsWith(basePath + '/'))) {
            return parsed.origin + assetUrl;
        }
    } catch (_) {}

    return base + (assetUrl[0] === '/' ? assetUrl : '/' + assetUrl);
}

function cachedCleanDescriptionText(owner, field, source, producer) {
    const raw = String(source || '');
    if (!owner || typeof owner !== 'object') return producer(raw);

    let cache = cleanDescriptionCache.get(owner);
    if (!cache) {
        cache = new Map();
        cleanDescriptionCache.set(owner, cache);
    }

    const cached = cache.get(field);
    if (cached && cached.source === raw) return cached.text;

    const text = producer(raw);
    cache.set(field, { source: raw, text });
    return text;
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

hexo.extend.helper.register('google_font_urls', function (page, config, themeConfig, hasCode) {
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

    if ((typeof hasCode === 'boolean' ? hasCode : pageHasCode(page, themeConfig, this))) {
        urls.push(googleFontUrl([{ name: 'Fira Code', weights: ['400', '500'] }], 'optional'));
    }

    return urls;
});

hexo.extend.helper.register('page_has_code', function (page, themeConfig) {
    return pageHasCode(page, themeConfig, this);
});

hexo.extend.helper.register('page_looks_long', function (page) {
    return pageLooksLong(page);
});

hexo.extend.helper.register('html_attr', function (value) {
    return escapeHtml(value);
});

hexo.extend.helper.register('js_value', function (value) {
    return safeScriptJson(value);
});

hexo.extend.helper.register('url_query', function (value) {
    return encodeURIComponent(String(value || ''));
});

hexo.extend.helper.register('safe_url_for', function (value, fallback) {
    return safeNavigationUrl(value, this, fallback);
});

hexo.extend.helper.register('safe_resource_url_for', function (value, fallback, options) {
    return safeResourceUrl(value, this, fallback, options);
});

hexo.extend.helper.register('link_target', function (value) {
    return normalizedLinkTarget(value);
});

hexo.extend.helper.register('is_blank_target', function (value) {
    return normalizedLinkTarget(value).toLowerCase() === '_blank';
});

function cacheVersionedUrlsForCommand() {
    const cmd = (hexo.env && hexo.env.cmd) || '';
    return /^(generate|g|deploy|d)$/.test(cmd);
}

// Cache-busting helper: appends ?v=<hash> to local asset URLs
hexo.extend.helper.register('versioned_url', function (assetPath) {
    const sourceDir = pathFn.join(hexo.theme_dir, 'source');
    const filePath = pathFn.join(sourceDir, assetPath);
    const cacheKey = pathFn.normalize(filePath) + '|' + (hexo.config.root || '/');
    const useUrlCache = cacheVersionedUrlsForCommand();

    if (useUrlCache && assetUrlCache.has(cacheKey)) return assetUrlCache.get(cacheKey);

    const url = this.url_for(assetPath);
    let versionedUrl = url;
    try {
        const stat = fs.statSync(filePath);
        const cached = assetHashCache.get(filePath);
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
            versionedUrl = cached.hash ? url + '?v=' + cached.hash : url;
        } else {
            const content = fs.readFileSync(filePath);
            const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
            assetHashCache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, hash });
            versionedUrl = url + '?v=' + hash;
        }
    } catch (_) {
        // File not found at theme level; fall back to plain url_for
        assetHashCache.set(filePath, { mtimeMs: 0, size: 0, hash: '' });
    }

    if (useUrlCache) assetUrlCache.set(cacheKey, versionedUrl);
    return versionedUrl;
});

hexo.extend.helper.register('has_images', function (page) {
    return pageAnalysis(page).imageCount > 0;
});

hexo.extend.helper.register('first_image', function (page) {
    return pageAnalysis(page).firstImage;
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
    } else if (limit > 0) {
        const plain = htmlTextFromHtml(post.content, limit);
        if (plain.length > limit) {
            result = { content: '<p>' + escapeHtml(truncateText(plain, limit)) + '</p>', truncated: true };
        } else {
            result = { content: post.content || '', truncated: false };
        }
    } else {
        result = { content: post.content || '', truncated: false };
    }

    const nextPostCache = postCache || new Map();
    nextPostCache.set(cacheKey, { source, result });
    if (!postCache) excerptCache.set(post, nextPostCache);
    return result;
});

hexo.extend.helper.register('clean_description', function (page, config) {
    const isReadingPage = (typeof this.is_post === 'function' && this.is_post())
        || (typeof this.is_page === 'function' && this.is_page());
    const stripHtml = typeof this.strip_html === 'function'
        ? value => this.strip_html(value)
        : value => htmlTextFromHtml(value, META_DESCRIPTION_LENGTH);
    const textFromDescription = value => normalizePlainText(stripHtml(value));
    const textFromHtmlSource = value => htmlTextFromHtml(htmlWithoutCodeContent(value), META_DESCRIPTION_LENGTH);
    let owner = page;
    let raw = '';
    let cacheField = 'cleanDescription';
    let producer = textFromDescription;

    if (page && page.description) {
        raw = page.description;
        cacheField = 'cleanDescription:description';
    } else if (page && page.excerpt) {
        raw = page.excerpt;
        cacheField = 'cleanDescription:excerpt';
        producer = textFromHtmlSource;
    } else if (isReadingPage && page && page.content) {
        raw = page.content;
        cacheField = 'cleanDescription:content';
        producer = textFromHtmlSource;
    } else {
        owner = config;
        raw = config && config.description;
        cacheField = 'cleanDescription:config';
    }

    const text = cachedCleanDescriptionText(owner, cacheField, raw, producer);
    if (!text) return '';
    return text.length > META_DESCRIPTION_LENGTH
        ? text.substring(0, META_DESCRIPTION_LENGTH) + '...'
        : text;
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

// Shared seal path — exposed so the header macro can render the same shape as favicon.svg
hexo.extend.helper.register('seal_path_d', () => SEAL_PATH_D);

// Generate favicon.svg dynamically from seal_text config
hexo.extend.generator.register('favicon_svg', function () {
    const themeConfig = this.theme.config || this.config.theme_config || {};
    const text = (themeConfig.site && themeConfig.site.seal_text) || '白';
    const svg = '<svg width="52" height="52" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
        + SEAL_FILTER_DEFS
        + '<path d="' + SEAL_PATH_D + '" fill="#b0171a" filter="url(#seal-roughness)" opacity="0.92"/>'
        + '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" '
        + 'font-family="\'Yuji Syuku\',\'Zen Old Mincho\',\'Noto Serif JP\',serif" font-size="42" '
        + 'fill="rgba(255,255,255,0.92)" filter="url(#text-erosion)" style="user-select:none">'
        + escapeHtml(text)
        + '</text></svg>';
    return { path: 'favicon.svg', data: svg };
});

hexo.extend.helper.register('og_image', function (page) {
    if (!page) return '';
    const photos = scalarOrCollectionToArray(page.photos);
    for (const photo of photos) {
        const src = normalizeOpenGraphImageUrl(photo, this);
        if (src) return src;
    }
    return normalizeOpenGraphImageUrl(this.first_image(page), this);
});
