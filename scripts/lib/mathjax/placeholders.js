'use strict';

const crypto = require('crypto');
const { escapeRegExp } = require('../util');

function makePlaceholderSalt() {
    return crypto.randomBytes(6).toString('hex');
}

function placeholderToken(salt, id) {
    return '@@SHIRO_MATH_' + salt + '_' + id + '@@';
}

function placeholderReplaceRe(salt) {
    return new RegExp('@@SHIRO_MATH_' + escapeRegExp(salt) + '_(\\d+)@@', 'g');
}

module.exports = {
    makePlaceholderSalt,
    placeholderToken,
    placeholderReplaceRe
};
