'use strict';

// Pure HTML post-processing for code/highlight surfaces (no Hexo registration).

/**
 * Opt highlight/gist blocks out of Typography (`not-prose`) so feature code CSS
 * owns tables/pre without fighting prose styles.
 * Only rewrites real open tags (not samples inside <pre>/<code> text).
 * Token match is exact so "gist-file" is not treated as "gist".
 *
 * @param {string} html
 * @returns {string}
 */
function markCodeBlocksNotProse(html) {
    return String(html || '').replace(
        /<([a-z][\w:-]*)(\s[^>]*?\s|\s)class\s*=\s*(["'])([^"']*)\3([^>]*)>/gi,
        (match, tag, pre, quote, classes, post) => {
            const tokens = classes.trim().split(/\s+/).filter(Boolean);
            const hasCode = tokens.some((t) => t === 'highlight' || t === 'gist');
            if (!hasCode || tokens.includes('not-prose')) return match;
            return '<' + tag + pre + 'class=' + quote + 'not-prose ' + classes + quote + post + '>';
        }
    );
}

module.exports = {
    markCodeBlocksNotProse
};
