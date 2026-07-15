'use strict';

const { escapeRegExp } = require('../util');
const {
    HTML_TOKEN_OPAQUE_ELEMENTS,
    nextHtmlToken,
    findElementClose
} = require('../html-scanner');

// Longest names first so the open-pattern prefers alignedat over aligned over align.
const MATH_ENV_NAMES = [
    'alignedat', 'aligned', 'alignat', 'align',
    'Bmatrix', 'bmatrix', 'Vmatrix', 'vmatrix',
    'smallmatrix', 'pmatrix', 'matrix',
    'eqnarray', 'equation', 'flalign', 'gathered', 'gather',
    'multline', 'dcases', 'drcases', 'rcases', 'cases',
    'subarray', 'array', 'split', 'CD'
];

const MATH_ENV_OPEN_RE = new RegExp(
    '^\\\\begin\\s*\\{((?:' + MATH_ENV_NAMES.join('|') + ')\\*?)\\}'
);

// Hexo's before_post_render backtick filter wraps fences in this private tag
// (lowercased by the HTML token reader). Treat it as opaque so MathJax protect
// does not rewrite TeX-looking tokens already captured inside code fences.
const HTML_SKIP_ELEMENTS = new Set([
    ...HTML_TOKEN_OPAQUE_ELEMENTS,
    'pre',
    'code',
    'hexopostrendercodeblock'
]);

function isEscaped(source, index) {
    let slashes = 0;
    for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) {
        slashes += 1;
    }
    return slashes % 2 === 1;
}

function isInTexComment(source, index) {
    const lineStart = Math.max(
        source.lastIndexOf('\n', index - 1),
        source.lastIndexOf('\r', index - 1)
    ) + 1;
    for (let cursor = lineStart; cursor < index; cursor += 1) {
        if (source[cursor] === '%' && !isEscaped(source, cursor)) return true;
    }
    return false;
}

function atLineStart(source, index) {
    return index === 0 || source[index - 1] === '\n';
}

function lineEndIndex(source, start) {
    const end = source.indexOf('\n', start);
    return end === -1 ? source.length : end;
}

function startsBlankLine(source, index) {
    for (let cursor = index + 1; cursor < source.length; cursor += 1) {
        const ch = source[cursor];
        if (ch === '\n') return true;
        if (ch !== ' ' && ch !== '\t' && ch !== '\r') return false;
    }
    return true;
}

function closingFenceLine(line, marker, minLength) {
    // lineEndIndex stops at \n, so CRLF lines still carry a trailing \r.
    const text = String(line || '').replace(/\r$/, '');
    let cursor = 0;
    let spaces = 0;
    while (text[cursor] === ' ' && spaces < 3) {
        cursor += 1;
        spaces += 1;
    }

    let count = 0;
    while (text[cursor + count] === marker) count += 1;
    return count >= minLength && /^[ \t]*$/.test(text.slice(cursor + count));
}

function skipFenceBlock(source, start) {
    if (!atLineStart(source, start)) return start;

    const firstLineEnd = lineEndIndex(source, start);
    const firstLine = source.slice(start, firstLineEnd);
    const match = /^( {0,3})(`{3,}|~{3,})/.exec(firstLine);
    if (!match) return start;

    const marker = match[2][0];
    if (marker === '`' && firstLine.slice(match[0].length).includes('`')) return start;
    const minLength = match[2].length;
    let cursor = firstLineEnd === source.length ? source.length : firstLineEnd + 1;

    while (cursor < source.length) {
        const end = lineEndIndex(source, cursor);
        const line = source.slice(cursor, end);
        cursor = end === source.length ? source.length : end + 1;
        if (closingFenceLine(line, marker, minLength)) return cursor;
    }

    return source.length;
}

function skipIndentedCodeBlock(source, start) {
    if (!atLineStart(source, start) || !/^(?: {4}|\t)/.test(source.slice(start, start + 4))) {
        return start;
    }

    let cursor = start;
    while (cursor < source.length) {
        const end = lineEndIndex(source, cursor);
        const line = source.slice(cursor, end);
        if (line.trim() && !/^(?: {4}|\t)/.test(line)) break;
        cursor = end === source.length ? source.length : end + 1;
    }

    return cursor;
}

function skipCodeSpan(source, start) {
    if (source[start] !== '`' || source[start - 1] === '`' || isEscaped(source, start)) return start;

    let length = 1;
    while (source[start + length] === '`') length += 1;

    const marker = '`'.repeat(length);
    let searchFrom = start + length;
    let end;
    while ((end = source.indexOf(marker, searchFrom)) !== -1) {
        if (source[end - 1] !== '`' && source[end + length] !== '`') {
            return end + length;
        }
        searchFrom = end + length;
        while (source[searchFrom] === '`') searchFrom += 1;
    }
    return start;
}

function skipHtmlNoise(source, start) {
    const token = nextHtmlToken(source, start);
    if (!token || token.start !== start) return start;
    if (token.type === 'comment') return token.end;
    if (token.type !== 'tag' || token.closing || !HTML_SKIP_ELEMENTS.has(token.name)) {
        return start;
    }
    if (token.selfClosing) return token.end;

    const close = findElementClose(source, token);
    return close ? close.end : source.length;
}

function findUnescapedClose(source, from, close) {
    let cursor = from;
    while (cursor < source.length) {
        const index = source.indexOf(close, cursor);
        if (index === -1) return -1;
        if (!isEscaped(source, index)) return index + close.length;
        cursor = index + 1;
    }
    return -1;
}

// Unclosed-delimiter warnings are injected by the caller (scripts/mathjax.js)
// via options.warn — this pure module has no Hexo binding. warnContext is
// threaded from protectMarkdownMath → scanMathAt → scanners (no module state).
function warnUnclosedDelimiter(open, start, source, warnContext) {
    if (!warnContext || typeof warnContext.warn !== 'function') return;

    const snippet = String(source || '')
        .slice(start, start + 48)
        .replace(/\s+/g, ' ')
        .trim();
    const where = warnContext.sourcePath
        ? ' in ' + warnContext.sourcePath
        : '';
    warnContext.warn(
        '[mathjax] unclosed ' + open + ' delimiter (not protected)' + where
        + (snippet ? ': ' + snippet + (source.length > start + 48 ? '…' : '') : '')
    );
}

// If no unescaped closer is found, return empty — do not swallow to EOF.
// Protecting an unclosed \[ / \( / $$ would hide the rest of the document
// from Markdown and leave a broken placeholder; leaving it unprotected is
// safer (author sees broken TeX / MD artifacts and can fix the source).
function scanDelimited(source, start, open, close, warnContext) {
    if (!source.startsWith(open, start) || isEscaped(source, start)) return '';
    const end = findUnescapedClose(source, start + open.length, close);
    if (end === -1) {
        warnUnclosedDelimiter(open, start, source, warnContext);
        return '';
    }
    return source.slice(start, end);
}

function scanEnvironment(source, start, warnContext) {
    if (source[start] !== '\\' || isEscaped(source, start)) return '';

    const open = MATH_ENV_OPEN_RE.exec(source.slice(start, start + 64));
    if (!open) return '';

    const envName = open[1];
    const bodyStart = start + open[0].length;
    const boundaryRe = new RegExp(
        '\\\\(begin|end)\\s*\\{' + escapeRegExp(envName) + '\\}',
        'g'
    );
    boundaryRe.lastIndex = bodyStart;
    let depth = 1;
    let boundary;
    while ((boundary = boundaryRe.exec(source))) {
        if (isEscaped(source, boundary.index) || isInTexComment(source, boundary.index)) continue;
        if (boundary[1] === 'begin') {
            depth += 1;
        } else {
            depth -= 1;
            if (depth === 0) return source.slice(start, boundaryRe.lastIndex);
        }
    }

    // Same policy as scanDelimited: do not protect, warn on generate only.
    warnUnclosedDelimiter('\\begin{' + envName + '}', start, source, warnContext);
    return '';
}

// Heuristic single-dollar pairs (mitigation, not a MathJax clone).
function isSingleDollarOpener(source, start) {
    if (source[start] !== '$' || source[start + 1] === '$' || isEscaped(source, start)) {
        return false;
    }
    const previous = start > 0 ? source[start - 1] : '';
    const next = source[start + 1] || '';
    if (previous && /[\w$]/.test(previous)) return false;
    if (!next || /[\s$]/.test(next)) return false;
    return true;
}

function isSingleDollarCloser(source, index) {
    if (source[index] !== '$' || source[index + 1] === '$' || isEscaped(source, index)) {
        return false;
    }
    const previous = source[index - 1] || '';
    const next = source[index + 1] || '';
    if (/[\s$]/.test(previous)) return false;
    if (next && /[\d\w]/.test(next)) return false;
    return true;
}

function scanSingleDollarMath(source, start) {
    if (!isSingleDollarOpener(source, start)) return '';

    for (let cursor = start + 2; cursor < source.length; cursor += 1) {
        if (source[cursor] === '\n' && startsBlankLine(source, cursor)) return '';
        if (source[cursor] !== '$') continue;
        if (isEscaped(source, cursor)) continue;
        if (!isSingleDollarCloser(source, cursor)) return '';
        return source.slice(start, cursor + 1);
    }

    return '';
}

function scanMathAt(source, start, options) {
    const inlineDollars = !!(options && options.inlineDollars === true);
    const warnContext = options && options.warnContext;

    if (source.startsWith('$$', start)) {
        return scanDelimited(source, start, '$$', '$$', warnContext);
    }
    if (source.startsWith('\\[', start)) {
        return scanDelimited(source, start, '\\[', '\\]', warnContext);
    }
    if (source.startsWith('\\(', start)) {
        return scanDelimited(source, start, '\\(', '\\)', warnContext);
    }
    if (source.startsWith('\\begin', start)) {
        return scanEnvironment(source, start, warnContext);
    }
    if (inlineDollars) {
        return scanSingleDollarMath(source, start);
    }
    return '';
}

// Unescaped \$ (prose currency escape for MathJax processEscapes).
function scanEscapedDollar(source, start) {
    if (source[start] !== '\\' || source[start + 1] !== '$') return '';
    if (isEscaped(source, start)) return '';
    return '\\$';
}

function nextInterestingIndex(source, from) {
    for (let cursor = from; cursor < source.length; cursor += 1) {
        const ch = source[cursor];
        if (ch === '`' || ch === '<' || ch === '\\' || ch === '$' || ch === '\n') {
            return cursor;
        }
    }
    return source.length;
}

module.exports = {
    atLineStart,
    skipFenceBlock,
    skipIndentedCodeBlock,
    skipCodeSpan,
    skipHtmlNoise,
    scanMathAt,
    scanEscapedDollar,
    nextInterestingIndex
};
