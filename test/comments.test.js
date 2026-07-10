'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { resolveCommentsState } = require('../scripts/lib/comments');

describe('scripts/lib/comments', () => {
    describe('resolveCommentsState', () => {
        it('is off when theme comments are disabled', () => {
            const state = resolveCommentsState(
                { comments: { enabled: false, provider: 'giscus', giscus: { repo: 'a/b', repo_id: '1', category: 'c', category_id: '2' } } },
                {},
                { isPost: true }
            );
            assert.equal(state.enabled, false);
            assert.equal(state.shouldRender, false);
            assert.equal(state.providerReady, false);
        });

        it('requires full giscus config', () => {
            const base = {
                comments: {
                    enabled: true,
                    provider: 'giscus',
                    giscus: {
                        repo: 'owner/repo',
                        repo_id: 'R_1',
                        category: 'Announcements',
                        category_id: 'DIC_1'
                    }
                }
            };
            const ready = resolveCommentsState(base, {}, { isPost: true });
            assert.equal(ready.giscusReady, true);
            assert.equal(ready.shouldRender, true);

            const incomplete = resolveCommentsState(
                { comments: { enabled: true, provider: 'giscus', giscus: { repo: 'owner/repo' } } },
                {},
                { isPost: true }
            );
            assert.equal(incomplete.giscusReady, false);
            assert.equal(incomplete.shouldRender, false);
        });

        it('requires shortname for disqus', () => {
            assert.equal(
                resolveCommentsState(
                    { comments: { enabled: true, provider: 'disqus', disqus: { shortname: 'blog' } } },
                    {},
                    { isPost: true }
                ).disqusReady,
                true
            );
            assert.equal(
                resolveCommentsState(
                    { comments: { enabled: true, provider: 'disqus', disqus: { shortname: '' } } },
                    {},
                    { isPost: true }
                ).disqusReady,
                false
            );
        });

        it('gates pages to comments: true and honors comments: false on posts', () => {
            const theme = {
                comments: {
                    enabled: true,
                    provider: 'disqus',
                    disqus: { shortname: 'blog' }
                }
            };
            assert.equal(
                resolveCommentsState(theme, {}, { isPage: true }).shouldRender,
                false
            );
            assert.equal(
                resolveCommentsState(theme, { comments: true }, { isPage: true }).shouldRender,
                true
            );
            assert.equal(
                resolveCommentsState(theme, { comments: false }, { isPost: true }).shouldRender,
                false
            );
            assert.equal(
                resolveCommentsState(theme, {}, { isPost: true }).shouldRender,
                true
            );
        });

        it('requires term when giscus mapping is specific or number', () => {
            const theme = {
                comments: {
                    enabled: true,
                    provider: 'giscus',
                    giscus: {
                        repo: 'o/r',
                        repo_id: '1',
                        category: 'c',
                        category_id: '2',
                        mapping: 'specific'
                    }
                }
            };
            assert.equal(resolveCommentsState(theme, {}, { isPost: true }).giscusReady, false);
            theme.comments.giscus.term = 'hello';
            assert.equal(resolveCommentsState(theme, {}, { isPost: true }).giscusReady, true);
        });
    });
});
