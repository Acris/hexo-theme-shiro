;(() => {
    const highlights = document.querySelectorAll('.prose-shiro .highlight');
    if (!highlights.length) return;

    const i18nCopy = () => (window.__i18n && window.__i18n.clipboard_copy) || 'Copy code';
    const i18nCopied = () => (window.__i18n && window.__i18n.clipboard_copied) || 'Copied';

    // Clipboard write with fallback for insecure contexts (HTTP)
    function copyText(text) {
        // Clipboard API requires secure context (HTTPS) or localhost
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        // Fallback: create a temporary element and use Selection API + execCommand.
        // execCommand is deprecated but remains the only synchronous clipboard
        // mechanism for insecure contexts; no modern replacement exists.
        return new Promise((resolve, reject) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy') ? resolve() : reject();
            } catch (_) {
                reject();
            } finally {
                document.body.removeChild(ta);
            }
        });
    }

    const iconCopy = '<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="14" height="14" rx="1"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>';
    const iconDone = '<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';

    highlights.forEach((block) => {
        // Skip empty code blocks
        const codeEl = block.querySelector('td.code pre') || block.querySelector('pre');
        if (!codeEl || !codeEl.textContent.trim()) return;

        // Detect code language from Hexo's class names (e.g., "highlight javascript")
        const langMatch = block.className.match(/\bhighlight\s+(\S+)/);
        const lang = langMatch ? langMatch[1] : '';

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.setAttribute('aria-label', i18nCopy());
        btn.innerHTML = iconCopy;

        btn.addEventListener('click', () => {
            // Hexo highlight wraps each line in <span class="line">;
            // plain textContent concatenates them without newlines.
            const lines = codeEl.querySelectorAll('.line');
            const text = lines.length
                ? Array.from(lines, l => l.textContent).join('\n')
                : codeEl.textContent;
            copyText(text).then(() => {
                btn.innerHTML = iconDone;
                btn.classList.add('copied');
                btn.setAttribute('aria-label', i18nCopied());
                setTimeout(() => {
                    btn.innerHTML = iconCopy;
                    btn.classList.remove('copied');
                    btn.setAttribute('aria-label', i18nCopy());
                }, 2000);
            }).catch(() => {
                console.warn('Clipboard write failed');
            });
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'highlight-wrapper';
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);
        wrapper.appendChild(btn);

        if (lang) {
            const label = document.createElement('span');
            label.className = 'code-lang';
            label.textContent = lang;
            wrapper.appendChild(label);
        }
    });
})();
