;(() => {
    'use strict';

    const shiro = window.__shiro || {};
    const i18nClipboard = () => {
        const i18n = shiro.i18n;
        return (i18n && i18n.clipboard) || {};
    };
    const i18nCopy = () => i18nClipboard().copy || 'Copy code';
    const i18nCopied = () => i18nClipboard().copied || 'Copied';
    const i18nFailed = () => i18nClipboard().failed || 'Copy failed';

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
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

    const iconCopy = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="14" height="14" rx="1"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>';
    const iconDone = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';

    function enhanceBlock(block) {
        if (!block || block.dataset.clipboardEnhanced === 'true') return;

        const codeEl = block.querySelector('td.code pre') || block.querySelector('pre');
        if (!codeEl || !codeEl.textContent.trim()) return;

        block.dataset.clipboardEnhanced = 'true';

        const lines = codeEl.querySelectorAll('.line');
        const copyValue = lines.length
            ? Array.from(lines, line => line.textContent).join('\n')
            : codeEl.textContent;

        const langMatch = block.className.match(/\bhighlight\s+(\S+)/);
        const lang = langMatch ? langMatch[1] : '';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copy-btn';
        btn.setAttribute('aria-label', i18nCopy());
        btn.innerHTML = iconCopy;

        let resetTimer = 0;
        const resetButton = () => {
            btn.innerHTML = iconCopy;
            btn.classList.remove('copied');
            btn.setAttribute('aria-label', i18nCopy());
            btn.disabled = false;
        };

        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            btn.disabled = true;
            if (resetTimer) {
                clearTimeout(resetTimer);
                resetTimer = 0;
            }
            copyText(copyValue).then(() => {
                btn.innerHTML = iconDone;
                btn.classList.add('copied');
                btn.setAttribute('aria-label', i18nCopied());
                resetTimer = setTimeout(() => {
                    resetTimer = 0;
                    resetButton();
                }, 2000);
            }).catch(() => {
                btn.setAttribute('aria-label', i18nFailed());
                resetTimer = setTimeout(() => {
                    resetTimer = 0;
                    resetButton();
                }, 2000);
            });
        });

        if (!block.parentNode) return;

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
    }

    function scheduleEnhance(blocks) {
        const queue = Array.from(blocks);
        const rt = shiro.runtime || window.__shiroRuntime;
        const schedule = (rt && rt.scheduleIdle)
            || ((task, options) => {
                const opts = options || {};
                const idle = window.requestIdleCallback
                    || ((fn) => window.setTimeout(fn, opts.fallbackMs || 32));
                idle(() => task(), { timeout: opts.timeout || 800 });
            });
        const run = (deadline) => {
            const hasTime = () => !deadline || deadline.timeRemaining() > 4;
            let count = 0;
            while (queue.length && hasTime() && count < 6) {
                enhanceBlock(queue.shift());
                count += 1;
            }
            if (queue.length) schedule(run, { timeout: 800, fallbackMs: 32 });
        };
        schedule(run, { timeout: 800, fallbackMs: 32 });
    }

    shiro.enhanceClipboard = (blocks) => {
        const targets = (Array.isArray(blocks) ? blocks : [blocks])
            .filter(block => block && block.isConnected);
        if (targets.length) scheduleEnhance(targets);
    };

    const initialTargets = Array.isArray(shiro.clipboardTargets)
        ? shiro.clipboardTargets
        : [];
    shiro.clipboardTargets = [];
    shiro.enhanceClipboard(initialTargets);

    const rtReady = shiro.runtime || window.__shiroRuntime;
    if (rtReady && typeof rtReady.featureReady === 'function') {
        rtReady.featureReady('clipboard');
    }
})();
