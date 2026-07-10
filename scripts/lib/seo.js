'use strict';

const {
    collectionToArray,
    scalarOrCollectionToArray,
    normalizePlainText,
    primaryLanguage,
    pageLanguage,
    escapeHtml,
    truncateText
} = require('./util');
const { normalizeOpenGraphImageUrl } = require('./urls');
const {
    pageAnalysis,
    htmlTextFromHtml,
    htmlWithoutCodeContent
} = require('./html-analysis');
const { SEAL_PATH_D, SEAL_FILTER_DEFS } = require('./seal');

const META_DESCRIPTION_LENGTH = 200;
const cleanDescriptionCache = new WeakMap();

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

function resolveOpenGraphImage(context, page) {
    if (!page) return { url: '', width: 0, height: 0 };
    const photos = scalarOrCollectionToArray(page.photos);
    for (const photo of photos) {
        const url = normalizeOpenGraphImageUrl(photo, context, page);
        if (url) return { url, width: 0, height: 0 };
    }
    const info = pageAnalysis(page).firstImageInfo;
    const url = normalizeOpenGraphImageUrl(info.src, context, page);
    return url ? { url, width: info.width, height: info.height } : { url: '', width: 0, height: 0 };
}

function isoDateString(value) {
    if (!value) return '';
    if (typeof value.toISOString === 'function') {
        try {
            return value.toISOString();
        } catch (_) {
            return '';
        }
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function openGraphLocale(language) {
    const normalized = primaryLanguage(language).replace(/-/g, '_');
    const segments = normalized.split('_').filter(Boolean);
    if (!segments.length) return '';
    if (segments.length === 1) return segments[0];
    return segments[0] + '_' + segments.slice(1).join('_').toUpperCase();
}

function cleanDescription(page, config, options) {
    const opts = options || {};
    const isReadingPage = !!opts.isReadingPage;
    const stripHtml = typeof opts.stripHtml === 'function'
        ? opts.stripHtml
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
    return truncateText(text, META_DESCRIPTION_LENGTH);
}

function copyrightYear(since, currentYear) {
    const current = String(currentYear != null ? currentYear : new Date().getFullYear());
    return (since && since.toString() !== current) ? since + '\u2013' + current : current;
}

function structuredData(page, config, options) {
    if (!page) return [];
    const opts = options || {};
    const cfg = config || {};
    const siteName = cfg.title || '';
    const siteUrl = String(cfg.url || '').replace(/\/$/, '');
    const pageUrl = opts.pageUrl || page.permalink || siteUrl;
    const description = opts.description || '';
    const image = opts.image || '';
    const isPost = !!opts.isPost;
    const isHome = !!opts.isHome;
    const fullUrlFor = typeof opts.fullUrlFor === 'function' ? opts.fullUrlFor : null;

    if (isPost) {
        const node = {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: page.title || siteName
        };
        if (pageUrl) node.mainEntityOfPage = { '@type': 'WebPage', '@id': pageUrl };
        if (description) node.description = description;
        if (image) node.image = [image];

        const published = isoDateString(page.date);
        const modified = isoDateString(page.updated || page.date);
        if (published) node.datePublished = published;
        if (modified) node.dateModified = modified;

        const author = page.author || cfg.author || '';
        if (author) node.author = { '@type': 'Person', name: author };

        if (siteName) {
            const publisher = { '@type': 'Organization', name: siteName };
            const logo = fullUrlFor ? fullUrlFor('/favicon.svg') : '';
            if (logo) publisher.logo = { '@type': 'ImageObject', url: logo };
            node.publisher = publisher;
        }

        const tags = collectionToArray(page.tags)
            .map(tag => tag && tag.name)
            .filter(Boolean);
        if (tags.length) node.keywords = tags.join(', ');

        return [node];
    }

    if (isHome) {
        const node = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteName,
            url: siteUrl || pageUrl
        };
        if (description) node.description = description;
        return [node];
    }

    return [];
}

function buildPageTitle(page, config, options) {
    const opts = options || {};
    const site = (config && config.title) || '';
    const current = Number(page && page.current) || 0;
    const pageLabel = current > 1 && typeof opts.pageNumberLabel === 'function'
        ? opts.pageNumberLabel(current)
        : '';
    const suffix = pageLabel ? ' - ' + pageLabel : '';
    const t = (key) => (typeof opts.t === 'function' ? opts.t(key) : key);

    if (opts.isHome) return pageLabel ? pageLabel + ' | ' + site : site;
    if (page && page.title) return page.title + ' | ' + site;
    if (opts.isArchive) return t('nav.archives') + (page && page.year ? ': ' + page.year : '') + suffix + ' | ' + site;
    if (opts.isTag) return t('nav.tags') + (page && page.tag ? ': ' + page.tag : '') + suffix + ' | ' + site;
    if (opts.isCategory) return t('nav.categories') + (page && page.category ? ': ' + page.category : '') + suffix + ' | ' + site;
    return site;
}

function faviconSvg(sealText) {
    const text = sealText || '白';
    return '<svg width="52" height="52" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
        + SEAL_FILTER_DEFS
        + '<path d="' + SEAL_PATH_D + '" fill="#b0171a" filter="url(#seal-roughness)" opacity="0.92"/>'
        + '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" '
        + 'font-family="\'Yuji Syuku\',\'Zen Old Mincho\',\'Noto Serif JP\',serif" font-size="42" '
        + 'fill="rgba(255,255,255,0.92)" filter="url(#text-erosion)" style="user-select:none">'
        + escapeHtml(text)
        + '</text></svg>';
}

module.exports = {
    META_DESCRIPTION_LENGTH,
    cleanDescription,
    copyrightYear,
    structuredData,
    buildPageTitle,
    resolveOpenGraphImage,
    openGraphLocale,
    isoDateString,
    faviconSvg
};
