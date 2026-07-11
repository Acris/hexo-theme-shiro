'use strict';

const { escapeHtml } = require('../util');
const {
    makePlaceholderSalt,
    placeholderToken,
    placeholderReplaceRe
} = require('./placeholders');
const {
    atLineStart,
    skipFenceBlock,
    skipIndentedCodeBlock,
    skipCodeSpan,
    skipHtmlNoise,
    scanMathAt,
    scanEscapedDollar,
    nextInterestingIndex
} = require('./scan');

function protectMarkdownMath(content, options) {
    const source = String(content || '');
    if (!source) return { content: source, segments: null, salt: null };

    const opts = options || {};
    const inlineDollars = opts.inlineDollars === true;
    // Shield \$ when single-dollar math is on, or when processEscapes is on so
    // Markdown does not strip the backslash before MathJax processEscapes.
    const protectEscapedDollar = inlineDollars || opts.processEscapes !== false;
    // Environments: always shield \begin{…}\end{…} from Markdown even when the
    // client has process_environments: false (asymmetric on purpose — MD must
    // not mangle TeX; client simply will not typeset bare envs).
    // Shared salt + startIndex let protectPostFields merge fields with unique ids.
    const salt = opts.salt ? String(opts.salt) : makePlaceholderSalt();
    const startIndex = Math.max(0, Number(opts.startIndex) || 0);
    const segments = [];
    let result = '';
    let cursor = 0;

    // Salted sequential ids. If a heading is rendered while placeholders are
    // still present, auto-generated anchor ids may include those tokens and can
    // shift when formulas are inserted earlier — acceptable for this theme.
    function placeholder(segment) {
        const id = startIndex + segments.length;
        segments.push(segment);
        return placeholderToken(salt, id);
    }

    const warnContext = {
        sourcePath: opts.sourcePath ? String(opts.sourcePath) : '',
        warn: typeof opts.warn === 'function' ? opts.warn : null
    };
    const scanOptions = { inlineDollars, warnContext };

    while (cursor < source.length) {
        if (atLineStart(source, cursor)) {
            const fenceEnd = skipFenceBlock(source, cursor);
            if (fenceEnd > cursor) {
                result += source.slice(cursor, fenceEnd);
                cursor = fenceEnd;
                continue;
            }

            const indentedEnd = skipIndentedCodeBlock(source, cursor);
            if (indentedEnd > cursor) {
                result += source.slice(cursor, indentedEnd);
                cursor = indentedEnd;
                continue;
            }
        }

        const ch = source[cursor];

        if (ch === '`') {
            const spanEnd = skipCodeSpan(source, cursor);
            if (spanEnd > cursor) {
                result += source.slice(cursor, spanEnd);
                cursor = spanEnd;
                continue;
            }
        }

        if (ch === '<') {
            const htmlEnd = skipHtmlNoise(source, cursor);
            if (htmlEnd > cursor) {
                result += source.slice(cursor, htmlEnd);
                cursor = htmlEnd;
                continue;
            }
        }

        if (ch === '\\' || ch === '$') {
            const math = scanMathAt(source, cursor, scanOptions);
            if (math) {
                result += placeholder(math);
                cursor += math.length;
                continue;
            }

            if (protectEscapedDollar && ch === '\\') {
                const escaped = scanEscapedDollar(source, cursor);
                if (escaped) {
                    result += placeholder(escaped);
                    cursor += escaped.length;
                    continue;
                }
            }
        }

        const next = nextInterestingIndex(source, cursor + 1);
        result += source.slice(cursor, next);
        cursor = next;
    }

    if (!segments.length) {
        return { content: source, segments: null, salt: null };
    }

    return {
        content: result,
        segments,
        salt
    };
}

/**
 * Restore protected TeX. Prefer { segments, salt } from protectMarkdownMath /
 * protectPostFields. Bare (content, segments, salt) remains supported.
 */
function restoreProtectedMath(content, segmentsOrStore, saltArg) {
    const source = String(content || '');
    let segments = segmentsOrStore;
    let salt = saltArg;

    if (segmentsOrStore && !Array.isArray(segmentsOrStore) && typeof segmentsOrStore === 'object') {
        segments = segmentsOrStore.segments;
        salt = segmentsOrStore.salt;
    }

    if (!segments || !segments.length || !salt) return source;

    return source.replace(placeholderReplaceRe(String(salt)), (match, id) => {
        const segment = segments[Number(id)];
        return segment === undefined ? match : escapeHtml(segment);
    });
}

module.exports = {
    protectMarkdownMath,
    restoreProtectedMath
};
