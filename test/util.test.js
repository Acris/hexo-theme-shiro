'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { truncateText } = require('../scripts/lib/util');

describe('scripts/lib/util', () => {
    describe('truncateText', () => {
        it('never splits emoji ZWJ grapheme clusters', () => {
            assert.equal(truncateText('👩‍💻developer', 1), '👩‍💻...');
            assert.equal(truncateText('👨‍👩‍👧‍👦family', 1), '👨‍👩‍👧‍👦...');
        });

        it('never splits combining-character grapheme clusters', () => {
            assert.equal(truncateText('e\u0301clair', 1), 'e\u0301...');
        });

        it('still prefers a word boundary within the grapheme limit', () => {
            assert.equal(truncateText('hello brave world', 11), 'hello...');
        });
    });
});