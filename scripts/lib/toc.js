'use strict';

const { escapeHtml, decodeHtmlEntities, plainHeadingText } = require('./util');
const { pageAnalysis, tocHeadingLevels, HTML_ID_RE, TOC_HEADING_RE } = require('./html-analysis');

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

module.exports = {
    slugifyHeading,
    buildToc,
    cachedToc
};
