'use strict';

// Hierarchical categories: index cards, path labels, post meta primary pick.
//
// Index semantics (category list page):
//   count + preview = exclusive posts at this node (assigned here, not also in
//   a descendant). Avoids repeating the same A/B/C posts under every ancestor.
// Detail page (Hexo category generator) still lists all posts assigned to the
// category (superset of exclusive). "查看全部" opens that full list.

const { collectionToArray } = require('./util');

const DEFAULT_PREVIEW_LIMIT = 5;

function categoriesToArray(categories) {
    return collectionToArray(categories);
}

function postKey(post) {
    if (!post) return '';
    if (post._id != null) return 'id:' + String(post._id);
    if (post.path != null) return 'path:' + String(post.path);
    if (post.slug != null) return 'slug:' + String(post.slug);
    return '';
}

function postDateValue(post) {
    if (!post || post.date == null) return 0;
    const value = Number(new Date(post.date));
    return Number.isFinite(value) ? value : 0;
}

function buildCategoryIdIndex(list) {
    const byId = new Map();
    for (let i = 0; i < list.length; i += 1) {
        const cat = list[i];
        if (!cat || cat._id == null) continue;
        byId.set(String(cat._id), cat);
    }
    return byId;
}

function buildChildrenByParent(list) {
    const map = new Map();
    for (let i = 0; i < list.length; i += 1) {
        const cat = list[i];
        if (!cat || cat._id == null || cat.parent == null || cat.parent === '') continue;
        const parentId = String(cat.parent);
        let bucket = map.get(parentId);
        if (!bucket) {
            bucket = [];
            map.set(parentId, bucket);
        }
        bucket.push(String(cat._id));
    }
    return map;
}

/**
 * Stable DOM id fragment for a category (slug → path → _id).
 */
function categoryDomId(category) {
    if (!category) return 'unknown';

    const slug = category.slug != null ? String(category.slug).trim() : '';
    if (slug) return slug.replace(/[^\w.-]+/g, '-');

    const path = category.path != null ? String(category.path).trim() : '';
    if (path) {
        return path
            .replace(/\\/g, '/')
            .replace(/^\/+|\/+$/g, '')
            .replace(/[^\w.-]+/g, '-')
            || 'unknown';
    }

    if (category._id != null) return String(category._id);
    return 'unknown';
}

function categoryChainWithIndex(category, byId) {
    if (!category) return [];

    const nodes = [];
    const seen = new Set();
    let current = category;

    while (current && current._id != null && !seen.has(String(current._id))) {
        seen.add(String(current._id));
        const name = current.name != null ? String(current.name).trim() : '';
        if (name) {
            nodes.unshift({
                name,
                path: current.path != null ? String(current.path) : '',
                _id: String(current._id)
            });
        }
        if (current.parent == null || current.parent === '') break;
        current = byId.get(String(current.parent)) || null;
    }

    if (!nodes.length && category.name != null) {
        const fallback = String(category.name).trim();
        if (fallback) {
            nodes.push({
                name: fallback,
                path: category.path != null ? String(category.path) : '',
                _id: category._id != null ? String(category._id) : ''
            });
        }
    }

    return nodes;
}

/**
 * Root → leaf name path label (e.g. "A / B / C").
 */
function categoryPathLabel(category, categories, separator) {
    const list = categoriesToArray(categories);
    const chain = categoryChainWithIndex(category, buildCategoryIdIndex(list));
    const sep = separator == null ? ' / ' : String(separator);
    return chain.map((node) => node.name).join(sep);
}

/**
 * Most specific category for compact post meta.
 * Prefers max depth via parent chain when site categories are available;
 * otherwise last entry (Hexo hierarchical order is parent → child).
 */
function primaryPostCategory(postCategories, allCategories) {
    const assigned = collectionToArray(postCategories);
    if (!assigned.length) return null;

    if (allCategories == null) {
        return assigned[assigned.length - 1] || null;
    }

    const byId = buildCategoryIdIndex(categoriesToArray(allCategories));
    let best = assigned[0];
    let bestDepth = categoryChainWithIndex(best, byId).length;

    for (let i = 1; i < assigned.length; i += 1) {
        const depth = categoryChainWithIndex(assigned[i], byId).length;
        if (depth >= bestDepth) {
            best = assigned[i];
            bestDepth = depth;
        }
    }
    return best || null;
}

/**
 * Whether ancestorId appears on the root→node chain of category.
 */
function isOnAncestorChain(ancestorId, category, byId) {
    if (ancestorId == null || ancestorId === '' || !category) return false;
    const want = String(ancestorId);
    const chain = categoryChainWithIndex(category, byId);
    for (let i = 0; i < chain.length; i += 1) {
        if (chain[i]._id != null && String(chain[i]._id) === want) return true;
    }
    return false;
}

/**
 * Home-card category chip: deepest primary + parallel overflow count.
 * moreCount only counts categories not on the primary lineage (not parent/child
 * of primary). title lists primary path then each parallel path.
 *
 * @returns {{ primary: object, moreCount: number, title: string }|null}
 */
function postMetaCategorySummary(postCategories, allCategories) {
    const assigned = collectionToArray(postCategories);
    if (!assigned.length) return null;

    const siteList = allCategories == null ? null : categoriesToArray(allCategories);
    const primary = primaryPostCategory(assigned, siteList);
    if (!primary) return null;

    const primaryLabel = siteList
        ? categoryPathLabel(primary, siteList)
        : String(primary.name || '').trim();
    const titleParts = primaryLabel ? [primaryLabel] : [];
    let moreCount = 0;

    if (!siteList || primary._id == null) {
        // No site tree: treat every extra assignment as parallel overflow.
        moreCount = Math.max(0, assigned.length - 1);
        for (let i = 0; i < assigned.length; i += 1) {
            const cat = assigned[i];
            if (cat === primary || (cat._id != null && primary._id != null
                && String(cat._id) === String(primary._id))) {
                continue;
            }
            const name = cat && cat.name != null ? String(cat.name).trim() : '';
            if (name && titleParts.indexOf(name) === -1) titleParts.push(name);
        }
        return {
            primary,
            moreCount,
            title: titleParts.join(' · ')
        };
    }

    const byId = buildCategoryIdIndex(siteList);
    const primaryId = String(primary._id);

    for (let i = 0; i < assigned.length; i += 1) {
        const cat = assigned[i];
        if (!cat || cat._id == null) continue;
        const catId = String(cat._id);
        if (catId === primaryId) continue;

        // Same hierarchical line as primary (parent or child) — not a parallel topic.
        if (isOnAncestorChain(catId, primary, byId)) continue;
        if (isOnAncestorChain(primaryId, cat, byId)) continue;

        moreCount += 1;
        const label = categoryPathLabel(cat, siteList);
        if (label && titleParts.indexOf(label) === -1) titleParts.push(label);
    }

    return {
        primary,
        moreCount,
        title: titleParts.join(' · ')
    };
}

function isCategoryLeafWithIndex(category, childrenByParent) {
    if (!category || category._id == null) return true;
    const kids = childrenByParent.get(String(category._id));
    return !kids || kids.length === 0;
}

function descendantCategoryIdsWithIndex(category, childrenByParent) {
    const out = new Set();
    if (!category || category._id == null) return out;

    const queue = (childrenByParent.get(String(category._id)) || []).slice();
    while (queue.length) {
        const id = queue.shift();
        if (!id || out.has(id)) continue;
        out.add(id);
        const kids = childrenByParent.get(id);
        if (kids) {
            for (let i = 0; i < kids.length; i += 1) queue.push(kids[i]);
        }
    }
    return out;
}

/**
 * Unique published posts on a category (same association as the category page).
 * Newest first. Always sort locally after materialize so order is deterministic
 * even when Query.sort is a no-op mock or uses an unsupported signature.
 */
function materializeCategoryPosts(category) {
    if (!category || !category.posts) return [];

    let data = category.posts;
    // Optional pre-order for real Hexo Queries; result is re-sorted below.
    if (typeof data.sort === 'function') {
        try {
            data = data.sort('date', -1);
        } catch (_) {
            /* ignore */
        }
    }

    if (typeof data.toArray === 'function') {
        data = data.toArray();
    } else {
        data = collectionToArray(data);
    }

    const seen = new Set();
    const out = [];
    for (let i = 0; i < data.length; i += 1) {
        const post = data[i];
        if (!post || post.published === false) continue;
        const key = postKey(post);
        if (key) {
            if (seen.has(key)) continue;
            seen.add(key);
        }
        out.push(post);
    }

    out.sort((a, b) => postDateValue(b) - postDateValue(a));
    return out;
}

/**
 * Build Map(catId → materializeCategoryPosts(cat)) once per index build.
 */
function buildPostsByCategoryId(list) {
    const postsByCatId = new Map();
    for (let i = 0; i < list.length; i += 1) {
        const cat = list[i];
        if (!cat || cat._id == null) continue;
        postsByCatId.set(String(cat._id), materializeCategoryPosts(cat));
    }
    return postsByCatId;
}

/**
 * Exclusive posts using a precomputed posts map (no repeated materialize).
 */
function exclusivePostsWithIndex(category, childrenByParent, postsByCatId) {
    const catId = category && category._id != null ? String(category._id) : '';
    const all = (catId && postsByCatId.get(catId)) || materializeCategoryPosts(category);
    if (!all.length) return all;
    if (isCategoryLeafWithIndex(category, childrenByParent)) return all;

    const descendantIds = descendantCategoryIdsWithIndex(category, childrenByParent);
    if (!descendantIds.size) return all;

    const inDescendant = new Set();
    descendantIds.forEach((id) => {
        const posts = postsByCatId.get(id);
        if (!posts) return;
        for (let i = 0; i < posts.length; i += 1) {
            const key = postKey(posts[i]);
            if (key) inDescendant.add(key);
        }
    });

    if (!inDescendant.size) return all;

    return all.filter((post) => {
        const key = postKey(post);
        return !(key && inDescendant.has(key));
    });
}

/**
 * Posts at this node for the index: not also listed under any descendant.
 */
function materializeExclusiveCategoryPosts(category, categories) {
    const list = categoriesToArray(categories);
    const childrenByParent = buildChildrenByParent(list);
    const postsByCatId = buildPostsByCategoryId(list);

    if (category && category._id != null && !postsByCatId.has(String(category._id))) {
        postsByCatId.set(String(category._id), materializeCategoryPosts(category));
    }

    return exclusivePostsWithIndex(category, childrenByParent, postsByCatId);
}

/**
 * Single view-model for the categories index template.
 * @param {object|Array} categories site.categories
 * @param {{ previewLimit?: number }} [options]
 * @returns {object[]}
 */
function buildCategoryIndexCards(categories, options) {
    const opts = options || {};
    let previewLimit = Number(opts.previewLimit);
    if (!Number.isFinite(previewLimit) || previewLimit < 0) {
        previewLimit = DEFAULT_PREVIEW_LIMIT;
    }

    const list = categoriesToArray(categories);
    const byId = buildCategoryIdIndex(list);
    const childrenByParent = buildChildrenByParent(list);
    // Materialize each category's posts once — exclusive filtering reuses this map.
    const postsByCatId = buildPostsByCategoryId(list);

    const prepared = list.map((cat) => {
        const chain = categoryChainWithIndex(cat, byId);
        return {
            cat,
            chain,
            sortKey: chain.map((node) => node.name).join('\0')
        };
    });

    prepared.sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, {
        sensitivity: 'base',
        numeric: true
    }));

    return prepared.map(({ cat, chain }) => {
        const exclusive = exclusivePostsWithIndex(cat, childrenByParent, postsByCatId);
        const full = (cat._id != null && postsByCatId.get(String(cat._id))) || [];
        const total = exclusive.length;
        const showPosts = total > 0;
        const remaining = previewLimit > 0 ? Math.max(0, total - previewLimit) : 0;
        const posts = previewLimit > 0 ? exclusive.slice(0, previewLimit) : exclusive;
        const fullLabel = chain.map((node) => node.name).join(' / ');
        // Index total is exclusive; detailFullTotal is Hexo full assignment (superset).
        // UI copy for the mismatch is assembled in the helper/template via i18n.
        const detailFullTotal = full.length;

        return {
            id: categoryDomId(cat),
            name: cat.name != null ? String(cat.name) : '',
            path: cat.path != null ? String(cat.path) : '',
            depth: Math.max(0, chain.length - 1),
            fullLabel,
            total,
            detailFullTotal,
            remaining,
            posts,
            showPosts
        };
    });
}

/**
 * Resolve category document for a Hexo category page (leaf name alone is ambiguous).
 */
function resolveCategoryForPage(page, categories) {
    const list = categoriesToArray(categories);
    if (!page || !list.length) return null;

    const normalize = (value) => String(value || '')
        .replace(/\\/g, '/')
        .replace(/^\//, '')
        .replace(/\/index\.html?$/i, '')
        .replace(/\/$/, '');

    const pagePath = normalize(page.path || page.permalink || '');
    if (pagePath) {
        let best = null;
        let bestLen = -1;
        for (let i = 0; i < list.length; i += 1) {
            const cat = list[i];
            const catPath = normalize(cat.path);
            if (!catPath) continue;
            if (pagePath === catPath || pagePath.startsWith(catPath + '/')) {
                if (catPath.length > bestLen) {
                    best = cat;
                    bestLen = catPath.length;
                }
            }
        }
        if (best) return best;
    }

    const leaf = page.category != null ? String(page.category).trim() : '';
    if (!leaf) return null;
    const matches = list.filter((cat) => String(cat.name || '').trim() === leaf);
    return matches.length === 1 ? matches[0] : null;
}

module.exports = {
    DEFAULT_PREVIEW_LIMIT,
    buildCategoryIndexCards,
    categoryPathLabel,
    categoryDomId,
    primaryPostCategory,
    postMetaCategorySummary,
    materializeCategoryPosts,
    materializeExclusiveCategoryPosts,
    resolveCategoryForPage
};
