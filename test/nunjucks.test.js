'use strict';

const { after, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let registered;
global.hexo = {
    extend: {
        renderer: {
            register(extension, output, renderer, synchronous) {
                registered = { extension, output, renderer, synchronous };
            }
        }
    }
};

const rendererModule = require('../scripts/nunjucks');

after(() => {
    delete global.hexo;
});

describe('theme Nunjucks renderer', () => {
    it('registers a synchronous njk renderer without a host renderer plugin', () => {
        assert.equal(registered.extension, 'njk');
        assert.equal(registered.output, 'html');
        assert.equal(registered.synchronous, true);
        assert.equal(registered.renderer, rendererModule.render);
    });

    it('resolves include and import paths from the theme layout root', () => {
        const render = rendererModule.compile({
            path: path.join(__dirname, '../layout/fixture.njk'),
            text: '{% include "_partial/common/empty.njk" %}'
        });
        const html = render({
            __: key => key === 'common.empty' ? 'Nothing here' : key,
            escape_html: value => value,
            escape_attr: value => value
        });
        assert.match(html, /Nothing here/);
        assert.match(html, /<svg/);
    });
});
