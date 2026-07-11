'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { groupPostsByYear } = require('../scripts/lib/archive');

describe('scripts/lib/archive', () => {
    describe('groupPostsByYear', () => {
        it('returns empty array for empty input', () => {
            assert.deepEqual(groupPostsByYear([]), []);
            assert.deepEqual(groupPostsByYear(null), []);
        });

        it('groups consecutive posts by year while preserving order', () => {
            // Use explicit local dates to avoid UTC parse timezone year shifts.
            const posts = [
                { title: 'a', date: new Date(2024, 5, 1) },
                { title: 'b', date: new Date(2024, 0, 1) },
                { title: 'c', date: new Date(2023, 11, 1) },
                { title: 'd', date: new Date(2023, 0, 1) }
            ];
            const groups = groupPostsByYear(posts);
            assert.equal(groups.length, 2);
            assert.equal(groups[0].year, '2024');
            assert.deepEqual(groups[0].posts.map((p) => p.title), ['a', 'b']);
            assert.equal(groups[1].year, '2023');
            assert.deepEqual(groups[1].posts.map((p) => p.title), ['c', 'd']);
        });

        it('accepts a custom year extractor', () => {
            const groups = groupPostsByYear(
                [{ id: 1 }, { id: 2 }, { id: 3 }],
                (post) => (post.id < 3 ? '2024' : '2023')
            );
            assert.equal(groups[0].year, '2024');
            assert.equal(groups[0].posts.length, 2);
            assert.equal(groups[1].year, '2023');
        });

        it('supports Hexo-like toArray collections', () => {
            const coll = {
                toArray() {
                    return [
                        { date: { year: () => 2025 } },
                        { date: { year: () => 2025 } }
                    ];
                }
            };
            const groups = groupPostsByYear(coll);
            assert.equal(groups.length, 1);
            assert.equal(groups[0].year, '2025');
            assert.equal(groups[0].posts.length, 2);
        });
    });
});
