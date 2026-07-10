'use strict';

const {
    collectionToArray,
    escapeRegExp,
    escapeHtml,
    decodeHtmlEntities,
    truncateText
} = require('./util');
const { hasUrlControlChars } = require('./urls');

const DEFAULT_EXCERPT_LENGTH = 200;
const pageAnalysisCache = new Map();
const excerptCache = new WeakMap();

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

function hasClassToken(attrs, tokens) {
    const classValue = decodeHtmlEntities(imageAttrValue(attrs || '', 'class'));
    if (!classValue) return false;
    return classValue.split(/\s+/).some(token => tokens.has(token));
}

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

function skipBlock(source, start, openTag) {
    const close = new RegExp('</' + openTag + '\\s*>', 'i');
    const match = close.exec(source.slice(start));
    return match ? start + match.index + match[0].length : source.length;
}

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
    let firstImageInfoCache;
    let imageCountCache;
    let hasCodeCache;
    let headingCountsCache;

    function firstImageData() {
        if (firstImageInfoCache === undefined) firstImageInfoCache = firstImageInfo(html);
        return firstImageInfoCache;
    }

    Object.defineProperties(analysis, {
        firstImage: {
            enumerable: true,
            get() {
                return firstImageData().src;
            }
        },
        firstImageInfo: {
            enumerable: true,
            get() {
                return firstImageData();
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

function imageDimensionAttr(attrs, name) {
    const value = decodeHtmlEntities(imageAttrValue(attrs, name)).trim();
    if (!/^\d+$/.test(value)) return 0;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

function firstImageInfo(content) {
    const empty = { src: '', width: 0, height: 0 };
    if (!content) return empty;
    const source = String(content);
    const imgRe = HTML_IMAGE_RE;
    imgRe.lastIndex = 0;
    let img;
    while ((img = imgRe.exec(source))) {
        const attrs = img[2];
        if (attrs === undefined) continue;
        for (const name of ['src', 'data-src']) {
            const value = imageAttrValue(attrs, name);
            if (isUsableImageSrcCandidate(value)) {
                imgRe.lastIndex = 0;
                return {
                    src: String(value).trim(),
                    width: imageDimensionAttr(attrs, 'width'),
                    height: imageDimensionAttr(attrs, 'height')
                };
            }
        }
    }
    imgRe.lastIndex = 0;
    return empty;
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

function excerptFor(post, length) {
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
}

module.exports = {
    DEFAULT_EXCERPT_LENGTH,
    HTML_ID_RE,
    HTML_IMAGE_RE,
    TOC_HEADING_RE,
    pageAnalysis,
    analyzeHtml,
    hasCodeContent,
    htmlTextFromHtml,
    htmlWithoutCodeContent,
    pageHasCode,
    pageLooksLong,
    tocHeadingLevels,
    countTocHeadingsFromAnalysis,
    firstImageInfo,
    imageAttrValue,
    isUsableImageSrcCandidate,
    isLightboxImageSrcCandidate,
    excerptFor,
    excerptFallbackEnabled,
    excerptFallbackLength
};
