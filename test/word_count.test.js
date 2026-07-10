'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

// Mock Hexo before loading the theme module (side-effect registration only).
global.hexo = {
    theme: { config: { word_count: { enabled: false } } },
    extend: {
        helper: {
            register() { /* no-op for pure export tests */ }
        }
    }
};

let wordCountMeta;

before(() => {
    ({ wordCountMeta } = require('../scripts/word_count.js'));
});

function ctx(overrides = {}) {
    return {
        theme: { word_count: { enabled: true } },
        config: { symbols_count_time: { wpm: 275, suffix: 'mins.' } },
        symbolsCount: (post) => post.length,
        symbolsTime: (post, _awl, wpm, suffix) => {
            const minutes = Math.max(1, Math.round((post.length || 0) / (wpm || 275)));
            return minutes + ' ' + suffix;
        },
        ...overrides
    };
}

const labels = {
    timeSuffix: 'mins',
    countLabel: 'Words',
    timeLabel: 'Reading time'
};

describe('scripts/word_count.js', () => {
    describe('wordCountMeta', () => {
        it('returns null when post is missing', () => {
            assert.equal(wordCountMeta(ctx(), null), null);
            assert.equal(wordCountMeta(ctx(), undefined), null);
        });

        it('returns null when theme word_count.enabled is not true', () => {
            const post = { length: 500 };
            assert.equal(wordCountMeta(ctx({ theme: {} }), post), null);
            assert.equal(wordCountMeta(ctx({ theme: { word_count: {} } }), post), null);
            assert.equal(wordCountMeta(ctx({ theme: { word_count: { enabled: false } } }), post), null);
        });

        it('returns null when enabled but plugin helpers are missing', () => {
            const result = wordCountMeta(ctx({
                symbolsCount: undefined,
                symbolsTime: undefined
            }), { length: 500 });
            assert.equal(result, null);
        });

        it('returns count and time when enabled and helpers exist', () => {
            const result = wordCountMeta(ctx(), { length: 550 }, labels);
            assert.deepEqual(result, {
                count: 550,
                time: '2 mins',
                title: 'Words / Reading time'
            });
        });

        it('returns only count when symbolsTime is unavailable', () => {
            const result = wordCountMeta(ctx({ symbolsTime: undefined }), { length: 100 }, labels);
            assert.deepEqual(result, { count: 100, title: 'Words' });
        });

        it('returns only time when symbolsCount is unavailable', () => {
            const result = wordCountMeta(ctx({ symbolsCount: undefined }), { length: 275 }, {
                timeSuffix: '分钟',
                countLabel: '字数',
                timeLabel: '阅读时长'
            });
            assert.deepEqual(result, { time: '1 分钟', title: '阅读时长' });
        });

        it('preserves zero count from the plugin', () => {
            const result = wordCountMeta(ctx({
                symbolsTime: undefined,
                symbolsCount: () => 0
            }), { length: 0 }, labels);
            assert.deepEqual(result, { count: 0, title: 'Words' });
        });

        it('omits title when labels are not provided', () => {
            const result = wordCountMeta(ctx(), { length: 100 }, { timeSuffix: 'mins' });
            assert.equal(result.count, 100);
            assert.equal(result.time, '1 mins');
            assert.equal(result.title, undefined);
        });

        it('leaves awl/wpm undefined so the plugin applies its own defaults', () => {
            let seen;
            const result = wordCountMeta(ctx({
                symbolsCount: undefined,
                config: { symbols_count_time: { wpm: 100, suffix: 'mins.' } },
                symbolsTime: (post, awl, wpm, suffix) => {
                    seen = { wpm, suffix, awl };
                    return '3 mins.';
                }
            }), { length: 300 });
            assert.equal(result.time, '3 mins.');
            assert.equal(seen.awl, undefined);
            assert.equal(seen.wpm, undefined);
            assert.equal(seen.suffix, 'mins.');
        });

        it('prefers the localized timeSuffix option over site.suffix', () => {
            let seenSuffix;
            wordCountMeta(ctx({
                symbolsCount: undefined,
                symbolsTime: (_p, _a, _w, suffix) => {
                    seenSuffix = suffix;
                    return '1 分';
                }
            }), { length: 10 }, { timeSuffix: '分' });
            assert.equal(seenSuffix, '分');
        });
    });
});
