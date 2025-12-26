document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.prose-shiro');
    if (!containers.length || typeof window.lightGallery !== 'function') return;

    const escapeHtml = (value) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const getCaption = (img) => img.getAttribute('title') || img.getAttribute('alt') || '';

    const setCaption = (link, caption) => {
        if (!caption) {
            link.removeAttribute('data-sub-html');
            return;
        }
        link.setAttribute('data-sub-html', `<p>${escapeHtml(caption)}</p>`);
    };

    const ensureLink = (container, img) => {
        const src = img.currentSrc || img.src;
        if (!src) return null;

        const existing = img.closest('a');
        const link = existing && container.contains(existing) ? existing : document.createElement('a');

        if (!link.contains(img)) {
            img.parentNode.insertBefore(link, img);
            link.appendChild(img);
        }

        link.setAttribute('href', src);
        link.setAttribute('data-lg-item', 'true');
        setCaption(link, getCaption(img));
        return link;
    };

    containers.forEach((container) => {
        const images = container.querySelectorAll('img');
        if (!images.length) return;

        images.forEach((img) => {
            ensureLink(container, img);
        });

        window.lightGallery(container, {
            selector: 'a[data-lg-item]',
            download: false
        });
    });
});
