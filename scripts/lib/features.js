'use strict';

// Shared feature-flag predicate for theme config keys.
// default-off (false): only explicit true enables.
// default-on (true): anything except explicit false enables.

function isFeatureEnabled(value, defaultOn) {
    if (defaultOn) return value !== false;
    return value === true;
}

module.exports = {
    isFeatureEnabled
};
