'use strict';

// Pure MathJax markdown shield + gate helpers (no Hexo registration).
// Implementation: scripts/lib/mathjax/* — this file re-exports the public surface.

const { makePlaceholderSalt } = require('./mathjax/placeholders');
const { scanMathAt, scanEscapedDollar } = require('./mathjax/scan');
const { protectMarkdownMath, restoreProtectedMath } = require('./mathjax/protect');
const {
    DEFAULT_MATHJAX_SRC,
    resolveMathjaxConfig,
    pageWantsMathjax
} = require('./mathjax/config');

module.exports = {
    DEFAULT_MATHJAX_SRC,
    makePlaceholderSalt,
    protectMarkdownMath,
    restoreProtectedMath,
    scanMathAt,
    scanEscapedDollar,
    resolveMathjaxConfig,
    pageWantsMathjax
};
