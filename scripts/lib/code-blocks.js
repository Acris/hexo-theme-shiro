'use strict';

// Pure HTML post-processing for code/highlight surfaces (no Hexo registration).

const {
    HTML_TOKEN_OPAQUE_ELEMENTS,
    nextHtmlToken,
    findElementClose,
    findHtmlAttribute,
    replaceHtmlAttributeValue
} = require('./html-scanner');

const CODE_SAMPLE_ELEMENTS = new Set([...HTML_TOKEN_OPAQUE_ELEMENTS, 'pre', 'code']);

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
    const source = String(html || '');
    const replacements = [];
    let position = 0;
    let token;

    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag' || token.closing) continue;

        const classAttr = findHtmlAttribute(token.attrs, 'class');
        if (classAttr && !classAttr.boolean) {
            const classes = classAttr.value;
            const tokens = String(classes || '').trim().split(/\s+/).filter(Boolean);
            const hasCode = tokens.some(value => value === 'highlight' || value === 'gist');
            if (hasCode && !tokens.includes('not-prose')) {
                const attrs = replaceHtmlAttributeValue(token.attrs, classAttr, 'not-prose ' + classes);
                replacements.push({
                    start: token.start,
                    end: token.end,
                    value: source.slice(token.start, token.attrsStart)
                        + attrs
                        + source.slice(token.attrsEnd, token.end)
                });
            }
        }

        if (CODE_SAMPLE_ELEMENTS.has(token.name)) {
            const close = findElementClose(source, token);
            position = close ? close.end : source.length;
        }
    }

    if (!replacements.length) return source;
    let output = '';
    let cursor = 0;
    replacements.forEach((replacement) => {
        output += source.slice(cursor, replacement.start) + replacement.value;
        cursor = replacement.end;
    });
    return output + source.slice(cursor);
}

module.exports = {
    markCodeBlocksNotProse
};
