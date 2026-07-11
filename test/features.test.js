'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { isFeatureEnabled } = require('../scripts/lib/features');

describe('scripts/lib/features', () => {
    describe('isFeatureEnabled', () => {
        it('default-off requires explicit true', () => {
            assert.equal(isFeatureEnabled(true, false), true);
            assert.equal(isFeatureEnabled(false, false), false);
            assert.equal(isFeatureEnabled(undefined, false), false);
            assert.equal(isFeatureEnabled(null, false), false);
            assert.equal(isFeatureEnabled(1, false), false);
            assert.equal(isFeatureEnabled('true', false), false);
        });

        it('default-on is on unless explicitly false', () => {
            assert.equal(isFeatureEnabled(undefined, true), true);
            assert.equal(isFeatureEnabled(null, true), true);
            assert.equal(isFeatureEnabled(true, true), true);
            assert.equal(isFeatureEnabled(0, true), true);
            assert.equal(isFeatureEnabled(false, true), false);
        });
    });
});
