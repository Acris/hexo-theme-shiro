'use strict';

const { pageLanguage, primaryLanguage } = require('./util');

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2';

function cjkFontForLanguage(language) {
    const lang = primaryLanguage(language);
    if (/^ja(?:[-_]|$)/.test(lang)) return 'Noto Serif JP';
    if (/^zh(?:[-_]|$)/.test(lang)) return 'Noto Serif SC';
    return '';
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

function googleFontUrls(page, config, themeConfig, hasCode, pageHasCode, context) {
    const fontFamilies = [
        { name: 'Cardo', weights: ['400', '700'] },
        { name: 'Yuji Syuku' },
        { name: 'Zen Old Mincho', weights: ['400', '600'] },
        { name: 'Cormorant Garamond', weights: ['400', '600'] }
    ];

    const cjkFamily = cjkFontForLanguage(pageLanguage(page, config));
    if (cjkFamily) {
        fontFamilies.push({ name: cjkFamily, weights: ['400', '600'] });
    }

    if ((typeof hasCode === 'boolean' ? hasCode : pageHasCode(page, themeConfig, context))) {
        fontFamilies.push({ name: 'Fira Code', weights: ['400', '500'] });
    }

    return [googleFontUrl(fontFamilies, 'swap')];
}

module.exports = {
    cjkFontForLanguage,
    googleFontUrls
};
