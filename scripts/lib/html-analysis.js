'use strict';

const {
    collectionToArray,
    escapeHtml,
    decodeHtmlEntities,
    graphemeLength,
    truncateText
} = require('./util');
const { hasUrlControlChars } = require('./urls');
const { isFeatureEnabled } = require('./features');
const {
    HTML_VOID_ELEMENTS,
    HTML_TOKEN_OPAQUE_ELEMENTS,
    nextHtmlToken,
    findElementClose,
    htmlAttributeValue,
    htmlTextContent
} = require('./html-scanner');

const DEFAULT_EXCERPT_LENGTH = 200;
// WeakMap so hexo server / watch can drop analysis when page objects are GC'd.
const pageAnalysisCache = new WeakMap();
const excerptCache = new WeakMap();

const CODE_CLASS_TOKENS = new Set(['highlight', 'gist']);
const RAW_CONTENT_ELEMENTS = new Set(HTML_TOKEN_OPAQUE_ELEMENTS);
const ANALYSIS_SKIPPED_ELEMENTS = new Set([...HTML_TOKEN_OPAQUE_ELEMENTS, 'pre', 'code']);
const DESCRIPTION_SKIPPED_ELEMENTS = new Set([...HTML_TOKEN_OPAQUE_ELEMENTS, 'pre']);

function hasClassToken(attrs, tokens) {
    const classValue = decodeHtmlEntities(imageAttrValue(attrs || '', 'class'));
    if (!classValue) return false;
    return classValue.split(/\s+/).some(token => tokens.has(token));
}

function hasCodeContent(content) {
    if (!content) return false;
    const source = String(content);
    let position = 0;
    let token;
    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing) continue;
        if (RAW_CONTENT_ELEMENTS.has(token.name)) {
            const close = findElementClose(source, token);
            position = close ? close.end : source.length;
            continue;
        }
        if (token.name === 'pre' || token.name === 'code'
            || hasClassToken(token.attrs, CODE_CLASS_TOKENS)) return true;
    }
    return false;
}

function strippedHtml(content) {
    return stripElementBlocks(content, ANALYSIS_SKIPPED_ELEMENTS);
}

function htmlWithoutCodeContent(content) {
    const withoutRawBlocks = stripElementBlocks(content, DESCRIPTION_SKIPPED_ELEMENTS);

    return stripClassTokenBlocks(withoutRawBlocks, CODE_CLASS_TOKENS);
}

function stripElementBlocks(content, names) {
    const source = String(content || '');
    let output = '';
    let cursor = 0;
    let position = 0;
    let token;

    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        let remove = token.type === 'comment';
        let end = token.end;
        if (token.type === 'tag' && !token.closing && names.has(token.name)) {
            const close = findElementClose(source, token);
            end = close ? close.end : source.length;
            position = end;
            remove = true;
        }
        if (!remove) continue;
        output += source.slice(cursor, token.start) + ' ';
        cursor = end;
    }

    return output + source.slice(cursor);
}

function stripClassTokenBlocks(content, tokens) {
    const source = String(content || '');
    let result = '';
    let cursor = 0;
    let position = 0;
    let token;

    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing) continue;
        if (RAW_CONTENT_ELEMENTS.has(token.name)) {
            const close = findElementClose(source, token);
            position = close ? close.end : source.length;
            continue;
        }
        if (!hasClassToken(token.attrs, tokens)) continue;

        const start = token.start;
        if (start < cursor) continue;

        result += source.slice(cursor, start) + ' ';
        const close = findElementClose(source, token);
        cursor = token.selfClosing || HTML_VOID_ELEMENTS.has(token.name)
            ? token.end
            : (close ? close.end : source.length);
        position = cursor;
    }

    return result + source.slice(cursor);
}

function htmlTextFromHtml(content) {
    const text = htmlTextContent(content, {
        skipElements: RAW_CONTENT_ELEMENTS
    });
    return decodeHtmlEntities(text).replace(/\s+/g, ' ').trim();
}

function htmlTextReachesLength(content, length) {
    const limit = Math.max(0, Number(length) || 0);
    return limit > 0 && graphemeLength(htmlTextFromHtml(content)) >= limit;
}

function cachedStrippedHtml(html) {
    let cache;
    return () => {
        if (cache === undefined) cache = strippedHtml(html);
        return cache;
    };
}

function countImagesInHtml(html) {
    const source = String(html || '');
    let count = 0;
    let position = 0;
    let token;
    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing) continue;
        if (ANALYSIS_SKIPPED_ELEMENTS.has(token.name)) {
            const close = findElementClose(source, token);
            position = close ? close.end : source.length;
            continue;
        }
        if (token.name === 'img' && imageHasLightboxSource(token.attrs)) count += 1;
    }
    return count;
}

function countHeadingsInHtml(html) {
    const counts = new Map();
    const source = String(html || '');
    let position = 0;
    let token;
    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing || !/^h[2-6]$/.test(token.name)) continue;
        const level = Number(token.name[1]);
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
    // Default-on: missing fallback key or enabled !== false (same as isFeatureEnabled(*, true)).
    if (!fallback) return true;
    return isFeatureEnabled(fallback.enabled, true);
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
        if (limit > 0 && graphemeLength(htmlTextFromHtml(post.content)) > limit) return false;
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

    const rendersPostCards = context && ['is_home', 'is_tag', 'is_category'].some((name) => (
        typeof context[name] === 'function' && context[name]()
    ));
    if (rendersPostCards) {
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
    let position = 0;
    let token;
    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing) continue;
        if (ANALYSIS_SKIPPED_ELEMENTS.has(token.name)) {
            const close = findElementClose(source, token);
            position = close ? close.end : source.length;
            continue;
        }
        if (token.name !== 'img') continue;
        const attrs = token.attrs;
        for (const name of ['src', 'data-src']) {
            const value = imageAttrValue(attrs, name);
            if (isUsableImageSrcCandidate(value)) {
                return {
                    src: String(value).trim(),
                    width: imageDimensionAttr(attrs, 'width'),
                    height: imageDimensionAttr(attrs, 'height')
                };
            }
        }
    }
    return empty;
}

function imageAttrValue(attrs, name) {
    return htmlAttributeValue(attrs, name);
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

/**
 * Home / list card excerpt using theme.excerpt.fallback policy.
 * Manual <!-- more --> excerpts always win. When fallback is off and there is no
 * manual excerpt, return empty + truncated (read-more) — never dump full post HTML.
 */
function excerptForCard(post, themeConfig) {
    if (!post) return { content: '', truncated: false };
    if (post.excerpt) return excerptFor(post, 0);
    if (!excerptFallbackEnabled(themeConfig)) {
        return { content: '', truncated: true };
    }
    const fallback = themeConfig && themeConfig.excerpt && themeConfig.excerpt.fallback;
    return excerptFor(post, excerptFallbackLength(fallback));
}

function excerptFor(post, length) {
    if (!post) return { content: '', truncated: false };

    const limit = Math.max(0, Number(length) || 0);
    const source = post.excerpt || post.content || '';
    const fullSource = post.excerpt ? String(post.content || '') : '';
    const cacheKey = limit + '|' + (post.excerpt ? 'manual' : 'fallback');
    const postCache = excerptCache.get(post);
    const cached = postCache && postCache.get(cacheKey);
    if (cached && cached.source === source && cached.fullSource === fullSource) return cached.result;

    let result;
    if (post.excerpt) {
        // Manual excerpt: "Read more" only when excerpt is not the full body.
        const manual = String(post.excerpt);
        result = { content: post.excerpt, truncated: !fullSource || manual !== fullSource };
    } else if (limit > 0) {
        const plain = htmlTextFromHtml(post.content);
        if (graphemeLength(plain) > limit) {
            result = { content: '<p>' + escapeHtml(truncateText(plain, limit)) + '</p>', truncated: true };
        } else {
            result = { content: post.content || '', truncated: false };
        }
    } else {
        result = { content: post.content || '', truncated: false };
    }

    const nextPostCache = postCache || new Map();
    nextPostCache.set(cacheKey, { source, fullSource, result });
    if (!postCache) excerptCache.set(post, nextPostCache);
    return result;
}

module.exports = {
    pageAnalysis,
    hasCodeContent,
    htmlTextFromHtml,
    htmlWithoutCodeContent,
    pageHasCode,
    pageLooksLong,
    tocHeadingLevels,
    firstImageInfo,
    excerptFor,
    excerptForCard
};
