'use strict';

// Markdown shield for MathJax pages: protect TeX from the Markdown renderer,
// then restore after render. Browser-side MathJax remains the authority for
// typesetting.
//
// Theme config (hexo.theme.config.mathjax), defaults match _config.yml:
//   enabled              — master switch (default false)
//   every_page           — load all post/page except mathjax: false (default false)
//   inline_dollars       — enable/protect $...$ (default false; matches MathJax v4)
//   process_environments — MathJax processEnvironments (default true; client only)
//   process_escapes      — MathJax processEscapes (default true; client only)
//   protect              — run this shield (default true)
//   src / tags           — CDN URL and equation tags
//
// Protected forms:
//   \(...\), \[...\], $$...$$, whitelisted \begin{env}...\end{env}
//   when inline_dollars: $...$ and prose \$ (for processEscapes)

const PLACEHOLDER_PROP = '__shiroMathPlaceholders';
const PLACEHOLDER_RE = /@@SHIRO_MATH_(\d+)@@/g;

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

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

// Warn only during `hexo generate` / `hexo g` so authors notice unclosed TeX
// without noise during `hexo server` or unit tests. Does not change protect.
// warnContext is threaded from protectMarkdownMath → scanMathAt → scanners
// (no module-level mutable state) so messages can include the post path.
function isGenerateCommand() {
    const cmd = (typeof hexo !== 'undefined' && hexo.env && hexo.env.cmd) || '';
    return cmd === 'generate' || cmd === 'g';
}

function warnUnclosedDelimiter(open, start, source, warnContext) {
    if (!isGenerateCommand()) return;
    if (typeof hexo === 'undefined' || !hexo.log || typeof hexo.log.warn !== 'function') return;

    const snippet = String(source || '')
        .slice(start, start + 48)
        .replace(/\s+/g, ' ')
        .trim();
    const where = warnContext && warnContext.sourcePath
        ? ' in ' + warnContext.sourcePath
        : '';
    hexo.log.warn(
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

function protectMarkdownMath(content, options) {
    const source = String(content || '');
    if (!source) return { content: source, segments: null };

    const opts = options || {};
    const inlineDollars = opts.inlineDollars === true;
    const segments = [];
    let result = '';
    let cursor = 0;

    // Sequential ids (@@SHIRO_MATH_0@@, …) keep the shield simple. If a heading
    // is rendered while placeholders are still present, auto-generated anchor
    // ids may include those tokens and can shift when formulas are inserted
    // earlier in the post — acceptable for this theme (not content-hash stable).
    function placeholder(segment) {
        const id = segments.length;
        segments.push(segment);
        return '@@SHIRO_MATH_' + id + '@@';
    }

    const warnContext = {
        sourcePath: opts.sourcePath ? String(opts.sourcePath) : ''
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

            // Only when $ is an inline delimiter: keep \$ so Markdown does not
            // strip the backslash before MathJax processEscapes.
            // Independent of process_escapes (client-only MathJax option).
            if (inlineDollars && ch === '\\') {
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

    return {
        content: segments.length ? result : source,
        segments: segments.length ? segments : null
    };
}

function restoreProtectedMath(content, segments) {
    const source = String(content || '');
    if (!segments || !segments.length) return source;

    return source.replace(PLACEHOLDER_RE, (match, id) => {
        const segment = segments[Number(id)];
        return segment === undefined ? match : escapeHtml(segment);
    });
}

// Theme mathjax config (defaults match _config.yml).
// enabled: false → never; true → every_page / front-matter.
// every_page: false → only mathjax: true; true → all posts/pages except mathjax: false.
function resolveMathjaxConfig(themeConfig) {
    // Prefer themeConfig.mathjax; never fall back to the whole theme object
    // (avoids reading unrelated root keys if mathjax is missing).
    const root = themeConfig || {};
    const cfg = (root.mathjax != null && typeof root.mathjax === 'object')
        ? root.mathjax
        : {};
    return {
        // Default off: must set enabled: true, then every_page and/or front-matter.
        enabled: cfg.enabled === true,
        everyPage: cfg.every_page === true,
        // Default on: shield marked from eating TeX. Set false when using
        // pandoc --mathjax or a server-side math plugin that already handles this.
        protect: cfg.protect !== false,
        // Default off: same as MathJax v4 (only \(...\) unless opted in).
        inlineDollars: cfg.inline_dollars === true,
        // MathJax tex.processEnvironments (client). Default true matches v4.
        processEnvironments: cfg.process_environments !== false,
        // MathJax tex.processEscapes (client). Default true matches v3+/v4.
        processEscapes: cfg.process_escapes !== false
    };
}

function themeMathjaxConfig() {
    const themeConfig = (hexo.theme && hexo.theme.config) || {};
    return resolveMathjaxConfig(themeConfig);
}

// Whether this post/page should load MathJax and (if protect) run the shield.
// Load and protect intentionally share this predicate so the two never diverge.
// With every_page: true that means every post/page (except mathjax: false) is
// scanned by protect even when the page has no formulas — acceptable cost.
// Layout still ANDs (is_post() || is_page()). Filters only see post/page documents.
//
//   enabled false                              → never
//   mathjax: true                              → yes
//   every_page true and mathjax not false      → yes
//   otherwise                                  → no
function pageWantsMathjax(data, mathjaxConfig) {
    if (!data) return false;
    const cfg = mathjaxConfig || themeMathjaxConfig();
    if (!cfg.enabled) return false;
    if (data.mathjax === true) return true;
    if (cfg.everyPage && data.mathjax !== false) return true;
    return false;
}

function themeConfigFromHelperContext(ctx) {
    // Hexo helpers expose theme config as this.theme (not a Theme instance).
    return (ctx && ctx.theme) || (hexo.theme && hexo.theme.config) || {};
}

// Optional second arg: pre-resolved options from mathjax_options() so layout
// can call resolveMathjaxConfig once per post/page.
hexo.extend.helper.register('page_wants_mathjax', function (page, mathjaxConfig) {
    const cfg = mathjaxConfig || resolveMathjaxConfig(themeConfigFromHelperContext(this));
    return pageWantsMathjax(page, cfg);
});

// Single source for client + gate flags (layout should prefer this over ad-hoc theme.mathjax reads).
hexo.extend.helper.register('mathjax_options', function () {
    return resolveMathjaxConfig(themeConfigFromHelperContext(this));
});

// Non-enumerable so intermediate placeholder lists do not show up in
// Object.keys / JSON.stringify of the post between protect and restore.
function setHiddenPostValue(data, key, value) {
    try {
        Object.defineProperty(data, key, {
            configurable: true,
            enumerable: false,
            writable: true,
            value
        });
    } catch (_) {
        data[key] = value;
    }
}

hexo.extend.filter.register('before_post_render', function (data) {
    const cfg = themeMathjaxConfig();
    if (!pageWantsMathjax(data, cfg) || typeof data.content !== 'string' || !data.content) {
        return data;
    }
    if (!cfg.protect) return data;

    const protectedMath = protectMarkdownMath(data.content, {
        inlineDollars: cfg.inlineDollars,
        sourcePath: data.source || data.path || ''
    });
    if (!protectedMath.segments) return data;

    data.content = protectedMath.content;
    setHiddenPostValue(data, PLACEHOLDER_PROP, protectedMath.segments);
    return data;
});

// Priority 5: restore before scripts/images.js (default 10).
// Key off segments only — if protect ran, always restore (no second gate resolve).
hexo.extend.filter.register('after_post_render', function (data) {
    const segments = data[PLACEHOLDER_PROP];
    if (!segments) return data;

    data.content = restoreProtectedMath(data.content, segments);
    if (typeof data.excerpt === 'string' && data.excerpt) {
        data.excerpt = restoreProtectedMath(data.excerpt, segments);
    }
    if (typeof data.more === 'string' && data.more) {
        data.more = restoreProtectedMath(data.more, segments);
    }
    delete data[PLACEHOLDER_PROP];
    return data;
}, 5);

// Public surface for unit tests: pure protect/restore + gate helpers.
// Registration side effects stay in this file; internal storage helpers are not exported.
module.exports = {
    protectMarkdownMath,
    restoreProtectedMath,
    scanMathAt,
    scanEscapedDollar,
    resolveMathjaxConfig,
    pageWantsMathjax,
    themeMathjaxConfig
};
