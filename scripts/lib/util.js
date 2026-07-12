'use strict';

const { decodeHTML } = require('entities');
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

function decodeHtmlEntities(value) {
    const text = String(value);
    if (text.indexOf('&') === -1) return text;
    return decodeHTML(text);
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

function graphemesIn(text) {
    const value = String(text == null ? '' : text);
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        return Array.from(segmenter.segment(value), item => item.segment);
    }
    return Array.from(value);
}

function graphemeLength(text) {
    return graphemesIn(text).length;
}

function truncateText(text, length) {
    const limit = Math.max(0, Number(length) || 0);
    if (!limit) return text;

    const graphemes = graphemesIn(text);
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
    graphemeLength,
    truncateText
};
