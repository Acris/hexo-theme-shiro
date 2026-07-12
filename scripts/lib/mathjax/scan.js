'use strict';

const { escapeRegExp } = require('../util');

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

const HTML_SKIP_OPEN_RE = /^<(script|style|textarea|template|pre|code)\b/i;

function isEscaped(source, index) {
    let slashes = 0;
    for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) {
        slashes += 1;
    }
    return slashes % 2 === 1;
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

function hasBlankLineBetween(source, from, to) {
    for (let cursor = from; cursor < to; cursor += 1) {
        if (source[cursor] === '\n' && startsBlankLine(source, cursor)) return true;
    }
    return false;
}

function closingFenceLine(line, marker, minLength) {
    let cursor = 0;
    let spaces = 0;
    while (line[cursor] === ' ' && spaces < 4) {
        cursor += 1;
        spaces += 1;
    }

    let count = 0;
    while (line[cursor + count] === marker) count += 1;
    return count >= minLength && /^[ \t]*$/.test(line.slice(cursor + count));
}

function skipFenceBlock(source, start) {
    if (!atLineStart(source, start)) return start;

    const firstLineEnd = lineEndIndex(source, start);
    const firstLine = source.slice(start, firstLineEnd);
    const match = /^( {0,3})(`{3,}|~{3,})/.exec(firstLine);
    if (!match) return start;

    const marker = match[2][0];
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
    if (source[start] !== '`') return start;

    let length = 1;
    while (source[start + length] === '`') length += 1;

    const marker = '`'.repeat(length);
    const end = source.indexOf(marker, start + length);
    if (end === -1) return start;
    if (hasBlankLineBetween(source, start + length, end)) return start;
    return end + length;
}

function skipHtmlNoise(source, start) {
    if (source.startsWith('<!--', start)) {
        const end = source.indexOf('-->', start + 4);
        return end === -1 ? source.length : end + 3;
    }

    const open = HTML_SKIP_OPEN_RE.exec(source.slice(start, start + 32));
    if (!open) return start;

    const tag = open[1];
    const closeRe = new RegExp('</' + tag + '\\s*>', 'i');
    const close = closeRe.exec(source.slice(start + open[0].length));
    if (!close) return source.length;
    return start + open[0].length + close.index + close[0].length;
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
    const closeRe = new RegExp('\\\\end\\s*\\{' + escapeRegExp(envName) + '\\}');
    const close = closeRe.exec(source.slice(bodyStart));
    if (!close) {
        // Same policy as scanDelimited: do not protect, warn on generate only.
        warnUnclosedDelimiter('\\begin{' + envName + '}', start, source, warnContext);
        return '';
    }

    return source.slice(start, bodyStart + close.index + close[0].length);
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
