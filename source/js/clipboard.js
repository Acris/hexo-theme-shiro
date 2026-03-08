;(() => {
    const highlights = document.querySelectorAll('.prose-shiro .highlight');
    if (!highlights.length) return;

    highlights.forEach((block) => {
        // Skip empty code blocks
        const codeEl = block.querySelector('td.code pre') || block.querySelector('pre');
        if (!codeEl || !codeEl.textContent.trim()) return;

        // Detect code language from Hexo's class names (e.g., "highlight javascript")
        const langMatch = block.className.match(/\bhighlight\s+(\S+)/);
        const lang = langMatch ? langMatch[1] : '';

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.setAttribute('aria-label', 'Copy code');
        const iconCopy = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="14" height="14" rx="1"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>';
        const iconDone = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
        btn.innerHTML = iconCopy;

        btn.addEventListener('click', () => {
            // Prefer td.code (table-based line numbers) to avoid copying line numbers;
            // do NOT use combined selector "td.code pre, pre" — it may match the
            // line-number <pre> first when no td.code exists in the DOM order.
            const code = block.querySelector('td.code pre') || block.querySelector('pre');
            if (!code) return;

            const text = code.textContent;
            navigator.clipboard.writeText(text).then(() => {
                btn.innerHTML = iconDone;
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = iconCopy;
                    btn.classList.remove('copied');
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
