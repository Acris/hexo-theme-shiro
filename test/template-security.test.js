'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('template security contracts', () => {
    it('escapes reusable UI macro class and id parameters', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '../layout/_macro/ui.njk'),
            'utf8'
        );
        assert.doesNotMatch(source, /\b(?:class|id)="[^"]*\{\{(?!\s*escape_attr\()/);
    });
});