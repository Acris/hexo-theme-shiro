'use strict';

// Pure HTML post-processing for code/highlight surfaces (no Hexo registration).

/**
 * Opt highlight/gist blocks out of Typography (`not-prose`) so feature code CSS
 * owns tables/pre without fighting prose styles.
 * Only rewrites real open tags (not samples inside <pre>/<code> text).
 * Token match is exact so "gist-file" is not treated as "gist".
 * Supports double-quoted, single-quoted, and unquoted class attributes.
 *
 * @param {string} html
 * @returns {string}
 */
function markCodeBlocksNotProse(html) {
    return String(html || '').replace(
        /<([a-z][\w:-]*)(\s[^>]*?\s|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))([^>]*)>/gi,
        (match, tag, pre, doubleQuoted, singleQuoted, unquoted, post) => {
            const classes = doubleQuoted != null
                ? doubleQuoted
                : (singleQuoted != null ? singleQuoted : unquoted);
            const tokens = String(classes || '').trim().split(/\s+/).filter(Boolean);
            const hasCode = tokens.some((t) => t === 'highlight' || t === 'gist');
            if (!hasCode || tokens.includes('not-prose')) return match;

            const next = 'not-prose ' + classes;
            if (doubleQuoted != null) {
                return '<' + tag + pre + 'class="' + next + '"' + post + '>';
            }
            if (singleQuoted != null) {
                return '<' + tag + pre + "class='" + next + "'" + post + '>';
            }
            // Unquoted class lists are uncommon; normalize to double quotes.
            return '<' + tag + pre + 'class="' + next + '"' + post + '>';
        }
    );
}

module.exports = {
    markCodeBlocksNotProse
};
