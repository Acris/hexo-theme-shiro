document.addEventListener('DOMContentLoaded', () => {
    const highlights = document.querySelectorAll('.prose-shiro .highlight');
    if (!highlights.length) return;

    highlights.forEach((block) => {
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.setAttribute('aria-label', 'Copy code');
        const iconCopy = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="14" height="14" rx="1"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>';
        const iconDone = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
        btn.innerHTML = iconCopy;

        btn.addEventListener('click', () => {
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
            });
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'highlight-wrapper';
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);
        wrapper.appendChild(btn);
    });
});
