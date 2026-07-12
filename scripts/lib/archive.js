'use strict';

// Pure archive list grouping (year headers) for archive/tag/category detail pages.

const { collectionToArray } = require('./util');

function archivePeriod(page) {
    if (!page) return '';
    const year = Number(page.year);
    if (!Number.isInteger(year) || year < 1) return '';

    const parts = [String(year)];
    const month = Number(page.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) return parts[0];
    parts.push(String(month).padStart(2, '0'));

    const day = Number(page.day);
    if (Number.isInteger(day) && day >= 1 && day <= 31) {
        parts.push(String(day).padStart(2, '0'));
    }
    return parts.join('/');
}

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
    groupPostsByYear,
    archivePeriod
};
