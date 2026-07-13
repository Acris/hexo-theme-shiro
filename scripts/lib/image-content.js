'use strict';

const { decodeHtmlEntities } = require('./util');
const { htmlAttributeValue } = require('./html-scanner');

function imageAttributeValue(attrs, name) {
    return htmlAttributeValue(attrs, name);
}

function imageDimensionAttribute(attrs, name) {
    const value = decodeHtmlEntities(imageAttributeValue(attrs, name)).trim();
    if (!/^\d+$/.test(value)) return 0;
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

function isDecorativeImageAttributes(attrs, dimensions) {
    const role = decodeHtmlEntities(imageAttributeValue(attrs, 'role')).trim().toLowerCase();
    if (role === 'presentation') return true;

    const classes = decodeHtmlEntities(imageAttributeValue(attrs, 'class')).split(/\s+/);
    if (classes.includes('emoji')) return true;

    const resolved = dimensions || {};
    const width = Number(resolved.width) || imageDimensionAttribute(attrs, 'width');
    const height = Number(resolved.height) || imageDimensionAttribute(attrs, 'height');
    return !!(width && height && width <= 3 && height <= 3);
}

module.exports = {
    imageAttributeValue,
    imageDimensionAttribute,
    isDecorativeImageAttributes
};
