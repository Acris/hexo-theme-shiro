'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    DEFAULT_PREVIEW_LIMIT,
    buildCategoryIndexCards,
    categoryPathLabel,
    categoryDomId,
    primaryPostCategory,
    postCategoryPaths,
    postMetaCategorySummary,
    materializeCategoryPosts,
    materializeExclusiveCategoryPosts,
    resolveCategoryForPage
} = require('../scripts/lib/categories');

describe('scripts/lib/categories', () => {
    const cats = [
        { _id: '1', name: 'B', parent: null, path: 'categories/B/', slug: 'B' },
        { _id: '2', name: 'A', parent: null, path: 'categories/A/', slug: 'A' },
        { _id: '3', name: 'B', parent: '2', path: 'categories/A/B/', slug: 'A/B' },
        { _id: '4', name: 'C', parent: '3', path: 'categories/A/B/C/', slug: 'A/B/C' }
    ];

    function withPosts(base, list) {
        return {
            ...base,
            posts: {
                sort() { return this; },
                toArray() { return list.slice(); }
            }
        };
    }

    it('labels full hierarchical paths', () => {
        assert.equal(categoryPathLabel(cats[0], cats), 'B');
        assert.equal(categoryPathLabel(cats[2], cats), 'A / B');
        assert.equal(categoryPathLabel(cats[3], cats), 'A / B / C');
        assert.equal(categoryPathLabel(cats[2], cats, ' › '), 'A › B');
        assert.equal(categoryPathLabel(null, cats), '');
    });

    it('groups parallel article categories separately from hierarchical paths', () => {
        const essay = {
            _id: 'essay',
            name: 'Essay',
            parent: null,
            path: 'categories/Essay/'
        };
        const paths = postCategoryPaths(
            [essay, cats[1], cats[2], cats[3]],
            cats.concat([essay])
        );

        assert.deepEqual(
            paths.map((chain) => chain.map((cat) => cat.name)),
            [['Essay'], ['A', 'B', 'C']]
        );
        assert.equal(categoryPathLabel(paths[1][2], cats), 'A / B / C');
    });

    it('handles empty and duplicate article category assignments', () => {
        assert.deepEqual(postCategoryPaths(null, cats), []);
        assert.deepEqual(
            postCategoryPaths([cats[3], cats[3]], cats)
                .map((chain) => chain.map((cat) => cat.name)),
            [['A', 'B', 'C']]
        );
    });

    it('picks deepest post category by parent chain (not array order alone)', () => {
        // Intentionally reverse array order; depth should still prefer C.
        const assigned = [cats[3], cats[1], cats[2]];
        const primary = primaryPostCategory(assigned, cats);
        assert.equal(primary && primary._id, '4');
        assert.equal(primaryPostCategory([], cats), null);
        assert.equal(primaryPostCategory(null, cats), null);
        // Without site tree, falls back to last entry.
        assert.equal(primaryPostCategory(assigned).name, 'B');
    });

    it('summarizes home meta as primary + parallel overflow only', () => {
        // Single hierarchy A/B/C: moreCount 0, title is full path only.
        const chainOnly = postMetaCategorySummary([cats[1], cats[2], cats[3]], cats);
        assert.equal(chainOnly.primary._id, '4');
        assert.equal(chainOnly.moreCount, 0);
        assert.equal(chainOnly.title, 'A / B / C');

        // Parallel root + deep leaf: C primary, Database as +1.
        const database = { _id: 'd', name: 'Database', parent: null, path: 'categories/Database/' };
        const mixed = postMetaCategorySummary([database, cats[1], cats[2], cats[3]], cats.concat([database]));
        assert.equal(mixed.primary._id, '4');
        assert.equal(mixed.moreCount, 1);
        assert.equal(mixed.title, 'A / B / C · Database');

        // Two flat peers: later equal-depth entry wins as primary, other is overflow.
        const foo = { _id: 'f', name: 'Foo', parent: null, path: 'categories/Foo/' };
        const bar = { _id: 'b', name: 'Bar', parent: null, path: 'categories/Bar/' };
        const peers = postMetaCategorySummary([foo, bar], [foo, bar]);
        assert.equal(peers.primary._id, 'b');
        assert.equal(peers.moreCount, 1);
        assert.equal(peers.title, 'Bar · Foo');

        const duplicated = postMetaCategorySummary([foo, foo, bar], [foo, bar]);
        assert.equal(duplicated.primary._id, 'b');
        assert.equal(duplicated.moreCount, 1);
        assert.equal(duplicated.title, 'Bar · Foo');

        // Numeric vs string ids still collapse lineage (no false +N on parents).
        const numSite = [
            { _id: 10, name: 'Root', parent: null, path: 'categories/Root/' },
            { _id: 11, name: 'Leaf', parent: 10, path: 'categories/Root/Leaf/' }
        ];
        const numSum = postMetaCategorySummary(numSite, numSite);
        assert.equal(numSum.primary._id, 11);
        assert.equal(numSum.moreCount, 0);
        assert.equal(numSum.title, 'Root / Leaf');
    });

    it('resolves category pages by path (disambiguates leaf name B)', () => {
        const nested = resolveCategoryForPage({ path: 'categories/A/B/index.html', category: 'B' }, cats);
        assert.equal(nested && nested._id, '3');
        assert.equal(categoryPathLabel(nested, cats), 'A / B');

        const top = resolveCategoryForPage({ path: 'categories/B/', category: 'B' }, cats);
        assert.equal(top && top._id, '1');
    });

    it('dedupes published posts for materialize', () => {
        const posts = [
            { _id: 'p1', path: 'a/', date: 3 },
            { _id: 'p1', path: 'a/', date: 3 },
            { _id: 'p2', path: 'b/', date: 2 },
            { _id: 'p3', path: 'c/', date: 1, published: false },
            { _id: 'p4', path: 'd/', date: 0 }
        ];
        const category = withPosts({ _id: 'x', length: 99 }, posts);
        const all = materializeCategoryPosts(category);
        assert.equal(all.length, 3);
        assert.deepEqual(all.map((p) => p._id), ['p1', 'p2', 'p4']);
    });

    it('always sorts by date after materialize (even with no-op Query sort)', () => {
        const posts = [
            { _id: 'old', path: 'old/', date: '2020-01-01' },
            { _id: 'new', path: 'new/', date: '2024-01-01' }
        ];
        const noSort = {
            _id: 'x',
            posts: {
                toArray() { return posts.slice(); }
            }
        };
        assert.deepEqual(
            materializeCategoryPosts(noSort).map((p) => p._id),
            ['new', 'old']
        );

        // No-op sort() must not skip local ordering.
        const noopSort = {
            _id: 'y',
            posts: {
                sort() { return this; },
                toArray() { return posts.slice(); }
            }
        };
        assert.deepEqual(
            materializeCategoryPosts(noopSort).map((p) => p._id),
            ['new', 'old']
        );
    });

    it('lists exclusive posts on branches via descendant membership', () => {
        const onlyA = { _id: 'only-a', path: 'only-a/', date: 3 };
        const onlyAB = { _id: 'only-ab', path: 'only-ab/', date: 2 };
        const deep = { _id: 'deep', path: 'deep/', date: 1 };

        const tree = [
            withPosts(cats[1], [onlyA, onlyAB, deep]), // A
            withPosts(cats[2], [onlyAB, deep]), // A/B
            withPosts(cats[3], [deep]) // A/B/C
        ];

        assert.deepEqual(
            materializeExclusiveCategoryPosts(tree[0], tree).map((p) => p._id),
            ['only-a']
        );
        assert.deepEqual(
            materializeExclusiveCategoryPosts(tree[1], tree).map((p) => p._id),
            ['only-ab']
        );
        assert.deepEqual(
            materializeExclusiveCategoryPosts(tree[2], tree).map((p) => p._id),
            ['deep']
        );
    });

    it('buildCategoryIndexCards is sorted and uses exclusive totals', () => {
        const onlyA = { _id: 'only-a', path: 'only-a/', date: 3 };
        const onlyAB = { _id: 'only-ab', path: 'only-ab/', date: 2 };
        const deep = { _id: 'deep', path: 'deep/', date: 1 };
        const extra = { _id: 'e2', path: 'e2/', date: 0 };
        const deep2 = { _id: 'deep2', path: 'deep2/', date: -1 };

        const tree = [
            withPosts(cats[0], [{ _id: 'solo-b', path: 'solo-b/', date: 1 }]),
            withPosts(cats[1], [onlyA, onlyAB, deep, deep2]),
            withPosts(cats[2], [onlyAB, deep, deep2]),
            withPosts(cats[3], [deep, deep2, extra])
        ];

        const cards = buildCategoryIndexCards(tree, { previewLimit: 2 });
        assert.equal(DEFAULT_PREVIEW_LIMIT, 5);
        assert.deepEqual(
            cards.map((c) => c.fullLabel),
            ['A', 'A / B', 'A / B / C', 'B']
        );

        const byLabel = Object.fromEntries(cards.map((c) => [c.fullLabel, c]));
        assert.equal(byLabel.A.showPosts, true);
        assert.equal(byLabel.A.total, 1);
        assert.equal(byLabel.A.posts[0]._id, 'only-a');
        assert.equal(byLabel.A.remaining, 0);

        assert.equal(byLabel['A / B'].total, 1);
        assert.equal(byLabel['A / B / C'].total, 3);
        assert.equal(byLabel['A / B / C'].remaining, 1);
        assert.equal(byLabel['A / B / C'].posts.length, 2);

        assert.equal(byLabel.B.total, 1);
        assert.equal(byLabel.B.depth, 0);
        assert.equal(byLabel['A / B / C'].depth, 2);
    });

    it('defaults preview limit when invalid', () => {
        const leaf = withPosts(cats[0], [
            { _id: '1', path: '1/', date: 5 },
            { _id: '2', path: '2/', date: 4 },
            { _id: '3', path: '3/', date: 3 },
            { _id: '4', path: '4/', date: 2 },
            { _id: '5', path: '5/', date: 1 },
            { _id: '6', path: '6/', date: 0 }
        ]);
        const cards = buildCategoryIndexCards([leaf], { previewLimit: -1 });
        assert.equal(cards[0].posts.length, DEFAULT_PREVIEW_LIMIT);
        assert.equal(cards[0].remaining, 1);
    });

    it('keeps exclusive total ≤ full assignment total on every card', () => {
        const onlyA = { _id: 'only-a', path: 'only-a/', date: 3 };
        const deep = { _id: 'deep', path: 'deep/', date: 1 };
        const tree = [
            withPosts(cats[1], [onlyA, deep]),
            withPosts(cats[2], [deep]),
            withPosts(cats[3], [deep])
        ];
        const cards = buildCategoryIndexCards(tree, { previewLimit: 5 });
        for (const card of cards) {
            assert.ok(
                card.total <= card.detailFullTotal,
                card.fullLabel + ': exclusive ' + card.total + ' > full ' + card.detailFullTotal
            );
        }
        const byLabel = Object.fromEntries(cards.map((c) => [c.fullLabel, c]));
        assert.equal(byLabel.A.total, 1);
        assert.equal(byLabel.A.detailFullTotal, 2);
        // countTitle is attached in the Hexo helper (i18n), not pure buildCategoryIndexCards.
        assert.equal(byLabel.A.countTitle, undefined);
        assert.equal(byLabel['A / B / C'].detailFullTotal, 1);
    });

    it('uses stable DOM ids when slug is missing', () => {
        assert.equal(categoryDomId({ slug: 'A/B', path: 'categories/A/B/', _id: '3' }), 'A-B');
        assert.equal(categoryDomId({ slug: '', path: 'categories/A/B/', _id: '3' }), 'categories-A-B');
        assert.equal(categoryDomId({ slug: '  ', path: '', _id: 'xyz' }), 'xyz');
        assert.equal(categoryDomId({}), 'unknown');

        const noSlug = withPosts({
            _id: '9',
            name: 'Z',
            parent: null,
            path: 'categories/Z/',
            slug: ''
        }, [{ _id: 'p', path: 'p/', date: 1 }]);
        const cards = buildCategoryIndexCards([noSlug], { previewLimit: 5 });
        assert.equal(cards[0].id, 'categories-Z');
    });
});

