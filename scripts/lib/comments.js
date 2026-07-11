'use strict';

// Pure comments provider readiness (no Hexo registration).
// Used by helpers + templates so container / scripts / runtime gates stay aligned.

const { isFeatureEnabled } = require('./features');

/**
 * Resolve which comment provider (if any) is fully configured for rendering.
 *
 * @param {object|null|undefined} themeConfig theme config object (this.theme in helpers)
 * @param {object|null|undefined} [page] current page (for front-matter comments gate)
 * @param {object} [options]
 * @param {boolean} [options.isPost]
 * @param {boolean} [options.isPage]
 * @returns {{
 *   enabled: boolean,
 *   pageAllows: boolean,
 *   pageWants: boolean,
 *   provider: string,
 *   disqusReady: boolean,
 *   giscusReady: boolean,
 *   providerReady: boolean,
 *   shouldRender: boolean
 * }}
 */
function resolveCommentsState(themeConfig, page, options) {
    const opts = options || {};
    const comments = (themeConfig && themeConfig.comments) || {};
    const enabled = isFeatureEnabled(comments.enabled, false);
    const provider = String(comments.provider || '').trim().toLowerCase();

    const pageComments = page && page.comments;
    // Posts: on by default when theme enabled; pages: require comments: true; either may set false.
    const isPost = !!opts.isPost;
    const isPage = !!opts.isPage;
    const pageAllows = pageComments !== false;
    const pageWants = isPost
        || (isPage && pageComments === true);
    const pageGate = enabled && pageAllows && pageWants;

    const disqus = comments.disqus || {};
    const giscus = comments.giscus || {};
    // Match client embed validation (Disqus shortname charset).
    const shortname = String(disqus.shortname || '').trim();
    const disqusReady = enabled
        && provider === 'disqus'
        && /^[a-z0-9-]+$/i.test(shortname);

    const mapping = giscus.mapping || 'pathname';
    const mappingReady = (mapping === 'specific' || mapping === 'number')
        ? !!giscus.term
        : true;
    const giscusReady = enabled
        && provider === 'giscus'
        && !!giscus.repo
        && !!giscus.repo_id
        && !!giscus.category
        && !!giscus.category_id
        && mappingReady;

    const providerReady = disqusReady || giscusReady;
    // shouldRender: page wants comments and a provider is fully configured.
    const shouldRender = pageGate && providerReady;

    return {
        enabled,
        pageAllows,
        pageWants,
        provider,
        disqusReady,
        giscusReady,
        providerReady,
        shouldRender
    };
}

module.exports = {
    resolveCommentsState
};
