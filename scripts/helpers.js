'use strict';

hexo.extend.helper.register('first_image', function (content) {
    if (!content) return '';
    var match = content.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
    return match ? match[1] : '';
});

hexo.extend.helper.register('clean_description', function (page, config) {
    var raw = page.description || page.excerpt || config.description || '';
    var text = this.strip_html(raw).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
});

hexo.extend.helper.register('copyright_year', function (since) {
    var current = new Date().getFullYear().toString();
    return (since && since.toString() !== current) ? since + '\u2013' + current : current;
});

hexo.extend.helper.register('strip_id', function (html) {
    if (!html) return '';
    return html.replace(/ id="[^"]*"/g, '');
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
        return base + (src.charAt(0) === '/' ? '' : '/') + src;
    }
    return src;
});
