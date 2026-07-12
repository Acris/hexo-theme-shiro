'use strict';

const { htmlTextContent } = require('./html-scanner');

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

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Attribute-safe escape (Hexo nunjucks autoescape is off by default).
function escapeAttr(value) {
    return escapeHtml(value);
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
    return decodeHtmlEntities(htmlTextContent(html, {
        skipElements: ['script', 'style', 'textarea', 'template']
    })
        .replace(/\s+/g, ' ')
        .trim());
}

function primaryLanguage(language) {
    const raw = Array.isArray(language) ? language[0] : language;
    return (raw || '').toString().trim().toLowerCase();
}

function pageLanguage(page, config) {
    const pageLang = page && (page.lang || page.language);
    if (pageLang) return pageLang;

    const language = config && config.language;
    return Array.isArray(language) ? language[0] : language;
}

function truncateText(text, length) {
    const limit = Math.max(0, Number(length) || 0);
    if (!limit) return text;

    let graphemes;
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        graphemes = Array.from(segmenter.segment(text), item => item.segment);
    } else {
        graphemes = Array.from(text);
    }
    if (graphemes.length <= limit) return text;

    const head = graphemes.slice(0, limit).join('');
    const boundary = head.lastIndexOf(' ');
    return (boundary > 0 ? head.slice(0, boundary) : head) + '...';
}

module.exports = {
    collectionToArray,
    scalarOrCollectionToArray,
    escapeRegExp,
    escapeHtml,
    escapeAttr,
    decodeHtmlEntities,
    normalizePlainText,
    plainHeadingText,
    primaryLanguage,
    pageLanguage,
    truncateText
};
