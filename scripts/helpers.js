'use strict';

hexo.extend.helper.register('first_image', function (content) {
    if (!content) return '';
    var match = content.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
    return match ? match[1] : '';
});

hexo.extend.helper.register('clean_description', function (page, config) {
    var raw = page.description || page.excerpt || config.description || '';
    var text = this.strip_html(raw).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
});

hexo.extend.helper.register('copyright_year', function (since) {
    var current = new Date().getFullYear().toString();
    return (since && since.toString() !== current) ? since + '\u2013' + current : current;
});

hexo.extend.helper.register('build_page_title', function (page, config) {
    var site = config.title || '';
    if (this.is_home()) return site;
    if (page.title) return page.title + ' | ' + site;
    if (this.is_archive()) return this.__('nav.archives') + (page.year ? ': ' + page.year : '') + ' | ' + site;
    if (this.is_tag()) return this.__('nav.tags') + (page.tag ? ': ' + page.tag : '') + ' | ' + site;
    if (this.is_category()) return this.__('nav.categories') + (page.category ? ': ' + page.category : '') + ' | ' + site;
    return site;
});

// Generate favicon.svg dynamically from seal_text config
hexo.extend.generator.register('favicon_svg', function (locals) {
    var themeConfig = this.theme.config || this.config.theme_config || {};
    var text = (themeConfig.site && themeConfig.site.seal_text) || '白';
    var color = '#b0171a';
    var svg = '<svg width="52" height="52" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
        + '<defs>'
        + '<style>@font-face{font-family:\'Yuji Syuku\';font-style:normal;font-weight:400;'
        + 'src:url(https://fonts.gstatic.com/l/font?kit=BngNUXdTV3vO6Lw5ApOPqPf4xUcYXA&amp;skey=9ffd14150d67040a&amp;v=v8) format(\'truetype\');}</style>'
        + '<filter id="seal-roughness" x="-20%" y="-20%" width="140%" height="140%">'
        + '<feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="noise"/>'
        + '<feDisplacementMap in="SourceGraphic" in2="noise" scale="3"/></filter>'
        + '<filter id="text-erosion">'
        + '<feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="1" result="noise"/>'
        + '<feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5"/></filter>'
        + '</defs>'
        + '<path d="M15,12 Q50,5 85,12 Q95,50 88,88 Q50,95 12,88 Q5,50 15,12 Z" fill="' + color + '" filter="url(#seal-roughness)" opacity="0.92"/>'
        + '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" '
        + 'font-family="\'Yuji Syuku\',\'Zen Old Mincho\',\'Noto Serif JP\',serif" font-size="42" '
        + 'fill="rgba(255,255,255,0.92)" filter="url(#text-erosion)" style="user-select:none">'
        + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        + '</text></svg>';
    return { path: 'favicon.svg', data: svg };
});

hexo.extend.helper.register('giscus_theme_url', function () {
    var fs = require('fs');
    var path = require('path');
    // Read version from theme's package.json for jsDelivr CDN URL (npm source)
    var pkgPath = path.join(hexo.theme_dir, 'package.json');
    var pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    var version = pkg.version;
    return 'https://cdn.jsdelivr.net/npm/hexo-theme-shiro@' + version + '/source/css/giscus.css';
});

hexo.extend.helper.register('og_image', function (page) {
    var src = '';
    if (page.photos && page.photos.length) src = page.photos[0];
    else src = this.first_image(page.content);
    if (!src) return '';
    // Ensure absolute URL for Open Graph
    if (src.indexOf('//') === 0) return 'https:' + src;
    if (!/^https?:\/\//.test(src)) {
        var base = this.config.url.replace(/\/$/, '');
        return base + this.url_for(src);
    }
    return src;
});
