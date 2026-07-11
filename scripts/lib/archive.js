'use strict';

// Pure archive list grouping (year headers) for archive/tag/category detail pages.

const { collectionToArray } = require('./util');

/**
 * Group posts by calendar year (descending post order preserved within each year).
 * Expects posts already sorted (typically date desc).
 *
 * @param {Array|object} posts Hexo Query, array, or value with toArray()
 * @param {(post: object) => string} [yearOf] year extractor (default: post.date year)
 * @returns {{ year: string, posts: object[] }[]}
 */
function groupPostsByYear(posts, yearOf) {
    const list = collectionToArray(posts);
    if (!list.length) return [];

    const getYear = typeof yearOf === 'function'
        ? yearOf
        : (post) => {
            if (!post || post.date == null) return '';
            // Hexo Moment / dayjs / Date
            const d = post.date;
            if (typeof d.year === 'function') return String(d.year());
            if (typeof d.format === 'function') return String(d.format('YYYY'));
            const date = d instanceof Date ? d : new Date(d);
            return Number.isFinite(date.getTime()) ? String(date.getFullYear()) : '';
        };

    const groups = [];
    let current = null;

    for (let i = 0; i < list.length; i += 1) {
        const post = list[i];
        const year = getYear(post) || '';
        if (!current || current.year !== year) {
            current = { year, posts: [] };
            groups.push(current);
        }
        current.posts.push(post);
    }

    return groups;
}

module.exports = {
    groupPostsByYear
};
