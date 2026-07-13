'use strict';

const path = require('path');
const nunjucks = require('nunjucks');

const layoutDir = path.join(__dirname, '..', 'layout');
const loader = new nunjucks.FileSystemLoader(layoutDir, {
    noCache: true,
    watch: false
});
const environment = new nunjucks.Environment(loader, {
    autoescape: false,
    throwOnUndefined: false,
    trimBlocks: false,
    lstripBlocks: false
});

function compile(data) {
    const template = nunjucks.compile(String(data.text || ''), environment, data.path);
    return locals => template.render(locals);
}

function render(data, locals) {
    return compile(data)(locals);
}

render.compile = compile;

// Theme scripts load after host plugins, so this replaces renderString-based
// registrations with a layout-root loader that supports extends/include/import.
hexo.extend.renderer.register('njk', 'html', render, true);

module.exports = {
    compile,
    render
};
