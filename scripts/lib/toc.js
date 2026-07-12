'use strict';

const { escapeHtml, decodeHtmlEntities, plainHeadingText } = require('./util');
const { isFeatureEnabled } = require('./features');
const { pageAnalysis, tocHeadingLevels } = require('./html-analysis');
const {
    HTML_TOKEN_OPAQUE_ELEMENTS,
    nextHtmlToken,
    findElementClose,
    htmlAttributeValue
} = require('./html-scanner');

const TOC_SKIPPED_ELEMENTS = new Set([...HTML_TOKEN_OPAQUE_ELEMENTS, 'pre', 'code']);

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
    return decodeHtmlEntities(htmlAttributeValue(attrs, 'id'));
}

function tocCacheKey(tocConfig) {
    if (!tocConfig || !isFeatureEnabled(tocConfig.enabled, true)) return 'disabled';
    return [
        'depth=' + (Math.min(6, Math.max(2, Number(tocConfig.depth) || 3))),
        'min=' + (Math.max(1, Number(tocConfig.min_headings) || 3))
    ].join('|');
}

function collectExistingIds(source) {
    const ids = new Set();
    let position = 0;
    let token;
    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing) continue;
        const id = headingId(token.attrs);
        if (id) ids.add(id);
        if (HTML_TOKEN_OPAQUE_ELEMENTS.has(token.name)) {
            const close = findElementClose(source, token);
            position = close ? close.end : source.length;
        }
    }
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
    const replacements = [];
    let minLevel = 6;
    let position = 0;
    let token;

    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing) continue;
        if (TOC_SKIPPED_ELEMENTS.has(token.name)) {
            const skippedClose = findElementClose(source, token);
            position = skippedClose ? skippedClose.end : source.length;
            continue;
        }
        if (!/^h[2-6]$/.test(token.name)) continue;
        const close = findElementClose(source, token);
        if (!close) continue;
        position = close.end;

        const level = Number(token.name[1]);
        if (!levels.has(level)) continue;

        const inner = source.slice(token.end, close.start);
        const title = plainHeadingText(inner);
        if (!title) continue;

        let id = headingId(token.attrs);
        if (!id) {
            id = uniqueHeadingId(title, existingIds);
            replacements.push({
                start: token.start,
                end: token.end,
                value: source.slice(token.start, token.attrsEnd)
                    + ' id="' + escapeHtml(id) + '"'
                    + source.slice(token.attrsEnd, token.end)
            });
        }

        if (level < minLevel) minLevel = level;
        headings.push({ id, level, title });
    }

    let content = '';
    let cursor = 0;
    replacements.forEach((replacement) => {
        content += source.slice(cursor, replacement.start) + replacement.value;
        cursor = replacement.end;
    });
    content += source.slice(cursor);

    return { content, headings, minLevel };
}

function renderTocList(headings, minLevel) {
    const root = { level: minLevel - 1, children: [] };
    const stack = [root];

    headings.forEach((heading) => {
        while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
            stack.pop();
        }
        const node = { level: heading.level, heading, children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
    });

    function renderNodes(nodes, depth) {
        const className = depth > 0 ? 'toc-list toc-list-nested' : 'toc-list';
        const items = nodes.map((node) => {
            const heading = node.heading;
            const children = node.children.length ? renderNodes(node.children, depth + 1) : '';
            return '<li class="toc-item" data-level="' + depth + '">'
                + '<a class="toc-link" href="' + escapeHtml(fragmentHref(heading.id)) + '" data-target="' + escapeHtml(heading.id) + '">'
                + escapeHtml(heading.title)
                + '</a>' + children + '</li>';
        }).join('');
        return '<ul class="' + className + '">' + items + '</ul>';
    }

    return renderNodes(root.children, 0);
}

function buildToc(content, tocConfig) {
    const source = String(content || '');
    if (!tocConfig || !isFeatureEnabled(tocConfig.enabled, true) || !source) {
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
