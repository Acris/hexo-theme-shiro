# AGENTS.md

Human docs: `README.md` / `README_CN.md`. Design tokens: `DESIGN.md`. User chat overrides this file; nearest nested `AGENTS.md` wins.

## Project overview

Shiro (白) is a clean, minimalist, multilingual Hexo theme: Nunjucks templates, Tailwind CSS v4, optional MathJax, word count (host plugin), Pagefind search, comments, analytics, and minimal client JS for static output.

## Setup commands

| Command         | Purpose                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| `npm install`   | Install dev dependencies                                                              |
| `npm run dev`   | Tailwind watch (unminified `source/css/style.min.css`)                                |
| `npm run build` | Release assets: core CSS, optional `*.min.css`, browser `*.min.js` |
| `npm test`      | Node built-in tests (`test/**/*.js`)                                                  |

- Both `dev` and `build` read `source/css/_tailwind.css` → `source/css/style.min.css`.
- After changing `_tailwind.css`, `source/css/_src/*`, Tailwind utilities in templates, or `source/js/_src/*`: run **`npm run build`** (see Testing for committing outputs).
- Do **not** hand-edit `source/css/style.min.css`, `source/css/*.min.css`, or `source/js/*.min.js`; do not delete generated CSS or the package lock without clear reason.
- Prefer `npm run build` over `npm run dev` for one-shot validation.

## Repository map

| Path                       | Role                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout/`                  | Nunjucks: `_layout.njk` shell (feature gates + foot scripts; include scope does not leak `{% set %}`); `_macro/`; `_partial/common/` (`head`, `header`, …), components, comments, analytics; pages |
| `scripts/`                 | Hexo helpers/filters: thin `helpers.js` registrar; pure logic in `scripts/lib/` (`html-analysis`, `toc`, `urls`, `seo`, `fonts`, `seal`, `util`); also `mathjax.js`, `images.js`, `pagefind.js`, `word_count.js` |
| `scripts/lib/`             | Pure modules required by `helpers.js` / `mathjax.js` / `images.js` (and unit tests): urls, analysis, toc, seo, code-blocks, image-meta, … Side-effect free — safe if Hexo also loads nested `scripts/**` files. |
| `source/css/_tailwind.css` | Tailwind entry (`@import` core parts) → `style.min.css`                                                                                                                                                          |
| `source/css/_core/`        | Core theme CSS parts: tokens, base, components, dark, theme-toggle (imported by `_tailwind.css`)                                                                                                                 |
| `source/css/_src/`         | Feature CSS → `source/css/*.min.css` (code, toc, search, comments, lightgallery, giscus). Site-cascade files wrap rules in `@layer components` (match `style.min.css`); giscus iframe theme stays unlayered. |
| `source/js/_src/`          | Client sources → `source/js/*.min.js` (Hexo ignores `_src` via underscore prefix). Shared helpers: `runtime.js` → `runtime.min.js` (loaded before feature bootstraps).                                          |
| `tools/`                   | `build-assets.js` (Tailwind + lightningcss + terser minify)                                                                                                                                                      |
| `test/`                    | Unit tests (`npm test`)                                                                                                                                                                                          |
| `languages/`               | i18n YAML (keep keys aligned across locales)                                                                                                                                                                     |
| `_config.yml`              | Default theme config (users copy to `_config.shiro.yml`)                                                                                                                                                         |
| `DESIGN.md`                | Design system; sync with CSS when changing colors, type, spacing, elevation, or component look                                                                                                                   |

**Do not invent helpers** — check `scripts/helpers.js` first. Implementation details live in source and tests.

### Pitfalls

- No static `source/favicon.svg` — generator overwrites it; seal path is `SEAL_PATH_D` / `seal_path_d`.
- Font family changes: update the family list in `google_font_urls` (shared preload / preloader token).
- Pagefind is **not** a theme dependency; host needs Pagefind **1.5.0+** when `search.enabled`. Indexing runs on `hexo generate` / `hexo deploy` `before_exit`, **not** `hexo server`. No `npx` fallback.
- Word count: theme `word_count.enabled` only controls display; counting needs host [hexo-word-counter](https://github.com/next-theme/hexo-word-counter). Missing plugin omits meta — does **not** fail generate.
- Keep default LightGallery CDN versions in sync across `_config.yml` and `scripts/lib/feature-gates.js` (`DEFAULT_LIGHTGALLERY_*`). Client reads bag keys via `runtime.get` (`lightgalleryCss` / `lightgalleryJs` / …) — no hardcoded CDN fallback.
- Runtime-injected class names are not Tailwind-scanned from client JS — put styles in feature CSS or a scanned template.
- MathJax: set `protect: false` when using pandoc `--mathjax` or `hexo-filter-mathjax`. No KaTeX.
- Optional `security.csp_nonce` is emitted on theme `<script>` tags via `csp_nonce_attr`, injected as `window.__shiro.cspNonce`, and applied by `runtime.js` to dynamically created scripts; optional CDN SRI via `sri_attrs` / `lightGallery.*_integrity` / `mathjax.integrity` (empty = no attributes).
- Hexo’s `hexo-renderer-nunjucks` sets `autoescape: false`. Escape text/attrs with helpers `escape_html` / `escape_attr` (not `| safe`); for `href`/`src` prefer `href_for` / `attr_url`. Menu `target` is allowlisted (`_self|_blank|_parent|_top`).
- Feature flags: layout uses `page_feature_gates()` only. Helper `feature_enabled(value, defaultOn)` remains for child themes (default-off: search/comments/mathjax/word_count; default-on: toc/lightGallery/progress/back_to_top/dark_mode.toggle).
- Page gates + CDN URLs: pure `scripts/lib/feature-gates.js` → helper `page_feature_gates()` → layout sets `gates` once; templates read `gates.*` (do not re-implement policy in Nunjucks). Foot feature scripts come from `gates.footScripts` (ordered paths); comments stay in `comments/foot.njk`.
- Categories: pure `scripts/lib/categories.js` → `category_index_cards()` (one view-model; exclusive count/preview on index). Detail pages use Hexo’s full assignment list (superset). Home meta uses `post_primary_category` (deepest). Config: `category_index.preview_limit`.
- Attribute URLs: prefer `href_for(path)` / `attr_url(value)` over raw `url_for` / `versioned_url` in `href`/`src` (Hexo nunjucks autoescape is off).
- Comments readiness: prefer `gates.shiroComments`. Containers: `comments/index.njk`; scripts: `comments/foot.njk` after deferred `runtime.min.js`. Client config: `feature_var('commentsConfig', …)` → `__shiro.commentsConfig`. Boot: queue stub in `comments/bootstrap.njk` → defer `comments-bootstrap.min.js` → defer `comments-giscus|disqus.min.js` via `__shiro.whenCommentsReady`.
- MathJax load policy lives in gates (`needsMathjax`, `mathjaxSrc`, …). Helpers `page_wants_mathjax` / `mathjax_options` are thin aliases for tests/child themes — do not re-read `theme.mathjax` in templates.
- Feature CSS minify (`tools/build-assets.js`) sets Lightning CSS `targets` so nesting flattens for older browsers; prefer flat `html[data-theme=dark] …` selectors in `_src` sources.
- Lazy client features use bootstrap + body scripts (`*-bootstrap.js` + feature file). Canonical loader: `runtime.loadBootstrapScript` / `runtime.createFeatureLoader` / `runtime.bindIntentWarm` with a short stable `id` + optional `scheduleIdleWarm`. Do not invent a parallel path.
- Client config lives on `window.__shiro` only (bare keys: `clipboardScript`, `cspNonce`, `commentsConfig`, …). Read via `runtime.get('clipboardScript')` (bag-only; no flat `window.__*` fallback). Flat `window.__shiroRuntime` remains the runtime API alias. LightGallery: feature script signals true readiness via `lightGalleryOnReady` / abort via `lightGalleryOnAbort` (bootstrap must not treat `createFeatureLoader` onReady as usable); hard-fail unbinds capture and navigates pending autoOpen; modifier clicks (meta/ctrl/shift/alt/non-primary) are ignored.
- Post-render HTML: `scripts/lib/code-blocks.js` (`markCodeBlocksNotProse`) + `scripts/lib/image-meta.js` (header size parsers). `scripts/images.js` is the Hexo filter orchestrator only.
- MathJax protect placeholders are salted (`@@SHIRO_MATH_<salt>_<id>@@`) so prose tokens cannot collide with a live protect pass.
- Archive year groups: helper `posts_by_year` / `scripts/lib/archive.js` (do not re-open/close year `<div>`s in Nunjucks loops).
- Tag/category detail post lists: shared `_partial/common/paginated-posts.njk` (caller imports `render_list`).
- Syntax highlight colors: tokens `--color-code-*` in `tokens.css` / dark swaps in `dark.css`; feature `code.css` consumes tokens only (no parallel dark hex palette).
- Dark mode does **not** invert the Tailwind slate scale. Chrome and prose use semantic tokens (`text-heading` / `text-body` / `text-muted` / `text-chrome` / `border-*` / `bg-*`). Prefer those over `text-slate-*` in layouts and components.
- Comments boot: stub enqueue in `comments/bootstrap.njk` during parse; `comments-bootstrap.js` (after `runtime.min.js`) installs helpers and drains `__shiroCommentsReadyQueue`. Missing runtime aborts hard — do not silent-run providers.

## Workflow rules

- Small, focused changes; preserve Hexo theme compatibility and the Shiro minimal aesthetic.
- Layout/feature changes that affect structure or agent-facing rules: update `README.md`, `README_CN.md`, and this file.
- New/changed npm deps or version bumps: update `package.json` **and** `package-lock.json` via npm (not hand-edited lockfiles).
- New config keys: follow **Config, i18n, and security** (`_config.yml` + docs; safe defaults).
- New user-facing strings: every file under `languages/`; keys sorted alphabetically per level; group under existing namespaces (`clipboard`, `common`, `gallery`, `nav`, `search`, `word_count`, …).
- Template edits: consider home, post, page, archive, tag, category (and dark mode / TOC / search / code / lightbox / MathJax when relevant).
- Avoid heavy client dependencies; prefer lazy/deferred loading.

## Code style

- Nunjucks: modular macros/partials; semantic HTML; keyboard/a11y for toggles, search, copy, lightbox.
- JS: plain browser-compatible code — `'use strict'`, 4-space indent, single quotes; CommonJS in `scripts/`; DOMContentLoaded-guarded IIFEs in `source/js/_src/`. No ESM/TypeScript/bundlers for client scripts.
- Assets: use `versioned_url` for static theme assets.
- CSS: match existing tokens and minimalist style; do not reformat unrelated code or rewrite large files without need.
- Gate scripts in `_layout.njk` by page type, feature flags, and DOM needs so unused pages stay JS-free. Keep feature `{% set %}` in the layout parent — Nunjucks include scope does not leak sets to the parent.
- **Comments:** short (one line when possible). Prefer clear names over essays. Deep design notes belong here or in `DESIGN.md`, not in source headers.
- Prefer the smallest fix that restores prior behavior; do not add dual configs, retries, or abstractions unless a real bug needs them.

## Docs style

- **`README.md` / `README_CN.md`:** user-facing setup and config. Keys, defaults, and short usage only — not implementation internals (hooks, cascade, postMessage, FOUC, etc.).
- **`AGENTS.md`:** agent/maintainer rules, pitfalls, architecture.
- **`DESIGN.md`:** visual system only.
- When docs must mention behavior, one short sentence is enough; put the “why” here.

## Testing and validation

**Required after relevant edits (blockers if red):**

1. Logic under `scripts/` or `test/` (or behavior those tests cover) → **`npm test`**
2. CSS/JS sources → **`npm run build`** and include regenerated minified assets in the change set
3. Pure function / gate changes (MathJax protect/load, word-count display, etc.) → extend `test/` in the same change set

Also:

- No separate lint/format script.
- This repo is a theme package, not a full Hexo site. For render checks: host site `hexo clean && hexo generate`.
- Docs-only changes: tests optional unless nearby tested behavior is described.
- Treat build/test failures, template errors, missing i18n keys, and broken config defaults as blockers.

## Config, i18n, and security

- Prefer optional keys with safe defaults; missing optional keys must not throw.
- Do not remove/rename config without docs and migration notes.
- Treat copied `_config.shiro.yml` as possibly older than defaults.
- Breaking: renaming/removing top-level keys in `_config.yml` (see that file for the current set).
- Release-coupled: default giscus theme URL embeds `hexo-theme-shiro@<version>` — bump with package version in `_config.yml`, `README.md`, and `README_CN.md`.
- giscus dark: one CSS with `@media (prefers-color-scheme: dark)`; host sets `.giscus-frame { color-scheme }` from `html[data-theme]` (comments.css). Paint `iframe.style.colorScheme` when the iframe mounts and when `data-theme` changes — no second theme URL.
- Do not commit secrets, analytics IDs, Disqus shortnames, giscus IDs, or private values.
- Treat config-rendered attributes/URLs as untrusted; be careful with external integrations (giscus, GA, LightGallery, Pagefind, CDN versions). Optional SRI hashes must be valid `sha256|384|512-…` digests; invalid values are ignored.

## PR, commits, and release

**PR:** focused; summarize user-visible changes; list `npm test` / `npm run build` / Hexo checks; note config, i18n, docs, and UI verification.

**Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `<type>(optional-scope): description`; imperative, lowercase subject ≤72 chars; scopes like `toc`, `search`, `readme`. Breaking: `!` and/or `BREAKING CHANGE:` footer.

**Release:** package is published to npm without a restrictive `files` list — run `npm pack --dry-run` before tagging; keep generated `*.min.css` / `*.min.js` in the package. Align `package.json`, `package-lock.json`, and every documented `hexo-theme-shiro@<version>` URL:

```bash
node -e "const p=require('./package.json').version,l=require('./package-lock.json'); if (l.version !== p || l.packages[''].version !== p) process.exit(1); console.log(p)"
grep -RnE 'hexo-theme-shiro@[0-9]+\.[0-9]+\.[0-9]+' _config.yml README.md README_CN.md
```
