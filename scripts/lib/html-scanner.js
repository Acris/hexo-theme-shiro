'use strict';

const HTML_VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
    'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);
const HTML_RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

function findTagEnd(source, start) {
    let quote = '';
    for (let i = start + 1; i < source.length; i += 1) {
        const char = source[i];
        if (quote) {
            if (char === quote) quote = '';
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (char === '>') {
            return i + 1;
        }
    }
    return -1;
}

function readHtmlToken(value, start) {
    const source = String(value || '');
    if (source[start] !== '<') return null;

    if (source.startsWith('<!--', start)) {
        const close = source.indexOf('-->', start + 4);
        return {
            type: 'comment',
            start,
            end: close === -1 ? source.length : close + 3
        };
    }

    if (source.startsWith('<![CDATA[', start)) {
        const close = source.indexOf(']]>', start + 9);
        return {
            type: 'special',
            start,
            end: close === -1 ? source.length : close + 3
        };
    }

    const head = /^<\s*(\/?)\s*([A-Za-z][\w:-]*)/.exec(source.slice(start));
    if (!head) {
        if (source.startsWith('<!', start) || source.startsWith('<?', start)) {
            const end = findTagEnd(source, start);
            return end === -1 ? null : { type: 'special', start, end };
        }
        return null;
    }

    const nameEnd = start + head[0].length;
    const boundary = source[nameEnd];
    if (boundary && !/[\s/>]/.test(boundary)) return null;

    const end = findTagEnd(source, start);
    if (end === -1) return null;

    const closing = !!head[1];
    let attrsEnd = end - 1;
    while (attrsEnd > nameEnd && /\s/.test(source[attrsEnd - 1])) attrsEnd -= 1;
    const selfClosing = !closing && source[attrsEnd - 1] === '/';
    if (selfClosing) attrsEnd -= 1;

    return {
        type: 'tag',
        start,
        end,
        name: head[2].toLowerCase(),
        closing,
        selfClosing,
        attrsStart: nameEnd,
        attrsEnd,
        attrs: closing ? '' : source.slice(nameEnd, attrsEnd)
    };
}

function nextHtmlToken(value, from) {
    const source = String(value || '');
    let start = source.indexOf('<', Math.max(0, Number(from) || 0));
    while (start !== -1) {
        const token = readHtmlToken(source, start);
        if (token) return token;
        start = source.indexOf('<', start + 1);
    }
    return null;
}

function escapedRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findElementClose(value, openingToken) {
    const source = String(value || '');
    if (!openingToken || openingToken.type !== 'tag' || openingToken.closing
        || openingToken.selfClosing || HTML_VOID_ELEMENTS.has(openingToken.name)) {
        return null;
    }

    if (HTML_RAW_TEXT_ELEMENTS.has(openingToken.name)) {
        const closeRe = new RegExp('</\\s*' + escapedRegExp(openingToken.name) + '\\s*>', 'ig');
        closeRe.lastIndex = openingToken.end;
        const match = closeRe.exec(source);
        return match ? {
            type: 'tag',
            name: openingToken.name,
            closing: true,
            selfClosing: false,
            attrs: '',
            attrsStart: match.index + match[0].length - 1,
            attrsEnd: match.index + match[0].length - 1,
            start: match.index,
            end: match.index + match[0].length
        } : null;
    }

    let depth = 1;
    let position = openingToken.end;
    let token;
    while ((token = nextHtmlToken(source, position))) {
        position = token.end;
        if (token.type !== 'tag') continue;

        if (!token.closing && HTML_RAW_TEXT_ELEMENTS.has(token.name)) {
            const rawClose = findElementClose(source, token);
            position = rawClose ? rawClose.end : source.length;
            continue;
        }

        if (token.name !== openingToken.name) continue;
        if (token.closing) {
            depth -= 1;
            if (depth === 0) return token;
        } else if (!token.selfClosing && !HTML_VOID_ELEMENTS.has(token.name)) {
            depth += 1;
        }
    }
    return null;
}

function parseHtmlAttributes(value) {
    const source = String(value || '');
    const attrs = [];
    let i = 0;

    while (i < source.length) {
        while (i < source.length && /\s/.test(source[i])) i += 1;
        if (i >= source.length || source[i] === '/') break;

        const nameStart = i;
        while (i < source.length && !/[\s=\/<>\x00]/.test(source[i])) i += 1;
        if (i === nameStart) {
            i += 1;
            continue;
        }

        const nameEnd = i;
        const name = source.slice(nameStart, nameEnd);
        while (i < source.length && /\s/.test(source[i])) i += 1;

        let valueText = '';
        let quote = '"';
        let boolean = true;
        let valueStart = i;
        let valueEnd = i;
        let valueTokenStart = i;
        let valueTokenEnd = i;

        if (source[i] === '=') {
            boolean = false;
            i += 1;
            while (i < source.length && /\s/.test(source[i])) i += 1;
            valueTokenStart = i;
            if (source[i] === '"' || source[i] === "'") {
                quote = source[i];
                i += 1;
                valueStart = i;
                while (i < source.length && source[i] !== quote) i += 1;
                valueEnd = i;
                valueText = source.slice(valueStart, valueEnd);
                if (source[i] === quote) i += 1;
                valueTokenEnd = i;
            } else {
                quote = '';
                valueStart = i;
                while (i < source.length && !/[\s"'`=<>]/.test(source[i])) i += 1;
                valueEnd = i;
                valueTokenEnd = i;
                valueText = source.slice(valueStart, valueEnd);
            }
        }

        attrs.push({
            name,
            value: valueText,
            quote,
            boolean,
            start: nameStart,
            end: i,
            valueStart,
            valueEnd,
            valueTokenStart,
            valueTokenEnd
        });
    }

    return attrs;
}

function findHtmlAttribute(attrs, name) {
    const target = String(name || '').toLowerCase();
    return parseHtmlAttributes(attrs).find(attr => attr.name.toLowerCase() === target) || null;
}

function htmlAttributeValue(attrs, name) {
    const attr = findHtmlAttribute(attrs, name);
    return attr && !attr.boolean ? attr.value : '';
}

function replaceHtmlAttributeValue(attrs, attr, value) {
    const source = String(attrs || '');
    if (!attr || attr.boolean) return source;
    const next = String(value == null ? '' : value);
    if (attr.quote) {
        return source.slice(0, attr.valueStart) + next + source.slice(attr.valueEnd);
    }
    return source.slice(0, attr.valueTokenStart) + '"' + next + '"'
        + source.slice(attr.valueTokenEnd);
}

function htmlTextContent(value, options) {
    const source = String(value || '');
    const opts = options || {};
    const skipped = new Set(Array.from(opts.skipElements || []).map(name => String(name).toLowerCase()));
    const maxLength = Math.max(0, Number(opts.maxLength) || 0);
    let text = '';
    let cursor = 0;
    let position = 0;
    let token;

    while ((token = nextHtmlToken(source, position))) {
        text += source.slice(cursor, token.start);
        if (maxLength && text.length > maxLength) break;

        let end = token.end;
        if (token.type === 'tag' && !token.closing && skipped.has(token.name)) {
            const close = findElementClose(source, token);
            end = close ? close.end : source.length;
        }
        text += ' ';
        cursor = end;
        position = end;
    }

    if (!maxLength || text.length <= maxLength) text += source.slice(cursor);
    return text;
}

module.exports = {
    HTML_VOID_ELEMENTS,
    nextHtmlToken,
    findElementClose,
    parseHtmlAttributes,
    findHtmlAttribute,
    htmlAttributeValue,
    replaceHtmlAttributeValue,
    htmlTextContent
};