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
| `source/js/_src/`          | Client sources → `source/js/*.min.js` (Hexo ignores `_src` via underscore prefix). Runtime/lightgallery: `runtime/*.js` / `lightgallery/*.js` concat → `*.min.js` (see `scripts/lib/*-source.js`).             |
| `tools/`                   | `build-assets.js` (Tailwind + lightningcss + terser minify)                                                                                                                                                      |
| `test/`                    | Unit tests (`npm test`)                                                                                                                                                                                          |
| `languages/`               | i18n YAML (keep keys aligned across locales)                                                                                                                                                                     |
| `_config.yml`              | Default theme config (users copy to `_config.shiro.yml`)                                                                                                                                                         |
| `DESIGN.md`                | Design system; sync with CSS when changing colors, type, spacing, elevation, or component look                                                                                                                   |

**Do not invent helpers** — check `scripts/helpers.js` first. Implementation details live in source and tests.

### Pitfalls

- No static `source/favicon.svg` — generator overwrites it; seal path is `SEAL_PATH_D` / `seal_path_d`.
- Font family changes: update the family list in `google_font_urls` (shared preload / preloader token).
- Pagefind is **not** a theme dependency; host needs Pagefind **1.5.0+** when `search.enabled`. Standalone generation indexes at `before_exit`; deployment indexes at `deployBefore`, with process-level deduplication for combined commands. It does **not** index during `hexo server`; there is no `npx` fallback.
- Word count: theme `word_count.enabled` only controls display; counting needs host [hexo-word-counter](https://github.com/next-theme/hexo-word-counter). Missing plugin omits meta — does **not** fail generate.
- Keep default LightGallery CDN versions in sync across `_config.yml` and `scripts/lib/feature-gates.js` (`DEFAULT_LIGHTGALLERY_*`). Client reads one bag object via `runtime.get('lightgallery')` (`css` / `js` / `themeCss` / `script` / integrities) — no hardcoded CDN fallback.
- Runtime-injected class names are not Tailwind-scanned from client JS — put styles in feature CSS or a scanned template.
- MathJax: set `protect: false` when using pandoc `--mathjax` or `hexo-filter-mathjax`. No KaTeX.
- Optional `security.csp_nonce` is a **static** theme config value (not per-request). Emitted on theme `<script>` tags via `csp_nonce_attr`, injected once as `window.__shiro.cspNonce` in head-theme, applied by `runtime.min.js` (from `source/js/_src/runtime/*`) to dynamic scripts. Real CSP nonce security needs host/edge injection of the same value. Optional CDN SRI via `sri_attrs` / `lightGallery.*_integrity` / `mathjax.integrity` (empty = no attributes).
- Hexo’s `hexo-renderer-nunjucks` sets `autoescape: false`. Escape text/attrs with helpers `escape_html` / `escape_attr` (not `| safe`); for `href`/`src` prefer `href_for` / `attr_url`. Menu `target` is allowlisted (`_self|_blank|_parent|_top`).
- Feature flags: pure `scripts/lib/features.js` → `isFeatureEnabled` (also re-exported from `urls.js` for compat). Layout uses `page_feature_gates()` only; helper `feature_enabled` remains for child themes. Default-off: search/comments/mathjax/word_count; default-on: toc/lightGallery/progress/back_to_top/dark_mode.toggle. Word count stays meta-only (not in gates).
- Page gates + CDN URLs: pure `scripts/lib/feature-gates.js` → helper `page_feature_gates()` → layout sets `gates` once; templates read `gates.*` (excerpt: `excerpt_for_card`; analytics/RSS: `gates.needs*`; TOC: **`gates.toc`** view-model; comments: `gates.commentsClientConfig` with scheme-normalized giscus.src; CSP: `csp_nonce_attr(gates.shiroCspNonce)`). Foot: `gates.footScripts`; comments: `comments/foot.njk`. CDN defaults asserted by `test/defaults-sync.test.js`.
- Categories: pure `scripts/lib/categories.js` → `category_index_cards()` (one view-model; exclusive count/preview on index). Detail pages use Hexo’s full assignment list (superset). Home meta uses `post_primary_category` (deepest). Config: `category_index.preview_limit`.
- Attribute URLs: prefer `href_for(path)` / `attr_url(value)` over raw `url_for` / `versioned_url` in `href`/`src` (Hexo nunjucks autoescape is off).
- Comments readiness: prefer `gates.shiroComments` + `gates.commentsClientConfig`. Containers: `comments/index.njk`; scripts: `comments/foot.njk` after deferred `runtime.min.js`. Client config: `feature_var('commentsConfig', gates.commentsClientConfig)`. Boot: bag queue stub only → `comments-bootstrap` installs **`runtime.comments`**, drains queue, **retires** bag `whenCommentsReady` to no-op → providers use `runtime.comments.whenReady` only. Missing runtime aborts.
- MathJax load policy lives in gates (`needsMathjax`, `mathjaxSrc`, …). Helpers `page_wants_mathjax` / `mathjax_options` are thin aliases for tests/child themes — do not re-read `theme.mathjax` in templates.
- Feature CSS minify (`tools/build-assets.js`) sets Lightning CSS `targets` so nesting flattens for older browsers; prefer flat `html[data-theme=dark] …` selectors in `_src` sources.
- Client runtime source is split under `source/js/_src/runtime/*.js` (manifest + concat in `scripts/lib/runtime-source.js` → `runtime.min.js`). Lightgallery feature: `source/js/_src/lightgallery/*.js` via `scripts/lib/lightgallery-source.js`. MathJax pure logic: `scripts/lib/mathjax/*` re-exported by `mathjax-protect.js`. Build fails on missing/extra parts or broken single-IIFE shape.
- Lazy client features: two intentional protocols — (1) **classic body scripts** (`createFeatureLoader` + `featureReady`/`featureAbort`): lightgallery, clipboard, mobile-menu; (2) **external component UI** (Pagefind search): `loadAsset` only; `whenDefined` raced with clearable timeout. Comments: boot queue → `runtime.comments`. `createFeatureLoader` `onError(err, { permanent })`: abort/timeout/missing-src permanent; network retryable. **LG / clipboard / mobile-menu** only hard-stop on `permanent`. Clipboard/menu **re-arm** after retryable fail (delayed reload / keep viewport listener).
- Collapsed mobile-menu / inline-TOC content must be `inert` so hidden links leave the tab order. Disclosure buttons stay hidden until their client handler is ready. Mobile-menu permanent load failure restores the visible no-JS fallback; inline TOC is expanded without JS and collapses only after its deferred client initializes.
- Standard lazy open/warm handoff (LightGallery): `runtime.dispatchLiveOrStash` / `dispatchLiveOrWarm`. Do not invent a parallel handoff.
- Client config on `window.__shiro` bare keys only; read via `runtime.get(...)`. **API is `window.__shiro.runtime` only** (no flat `__shiroRuntime`). Shared escapes: `runtime.escapeHtml` / `escapeAttr`. LightGallery: bootstrap owns capture; feature installs open/warm; ready = API installed. Shared: `safeNavigate` / `navigateFromImage` / `isModifiedClick`.
- Post-render HTML: quote-aware token/attribute boundaries live in `scripts/lib/html-scanner.js`; consumers include `html-analysis.js`, `toc.js`, `code-blocks.js`, and `image-optimize.js`. Reuse `HTML_TOKEN_OPAQUE_ELEMENTS` for containers whose child-like text must not be scanned, then add consumer-specific skips such as `pre` / `code`. `scripts/images.js` is the Hexo filter orchestrator only (exports optimizeImages / localImageSize / markCodeBlocksNotProse); do not reintroduce `[^>]*` tag parsing.
- File-backed caches in `scripts/images.js` must revalidate positive entries and must not permanently cache missing files/directories; `hexo server` can add assets without restarting the process.
- CSP nonce: layout prefers `csp_nonce_attr(gates.shiroCspNonce)` (single normalize in gates).
- MathJax protect placeholders are salted (`@@SHIRO_MATH_<salt>_<id>@@`) so prose tokens cannot collide with a live protect pass.
- Archive year groups: helper `posts_by_year` / `scripts/lib/archive.js` (do not re-open/close year `<div>`s in Nunjucks loops).
- Tag/category detail post lists: shared `_partial/common/paginated-posts.njk` (caller imports `render_list`).
- Syntax highlight colors: tokens `--color-code-*` in `tokens.css` / dark swaps in `dark.css`; feature `code.css` consumes tokens only (no parallel dark hex palette).
- Dark mode does **not** invert the Tailwind slate scale. Prefer semantic tokens over `text-slate-*`. UI idle / secondary text uses **`text-chrome`** only (`text-text-chrome` / `--color-text-chrome`). Use `--color-seal` for foreground accents and `--color-seal-fill` for surfaces carrying `--color-on-seal`; there is no `--color-text-muted` token.
- Comments boot: stub enqueue in `comments/bootstrap.njk` (`__shiro.commentsReadyQueue`); `comments-bootstrap.js` installs `runtime.comments` and drains. Missing runtime aborts. Providers use `runtime.comments` only; immediate load if `onNearViewport` missing.
- Pagefind indexes only when **theme** `search.enabled` is on (not `hexo.config.search`).
- Pagefind Component UI config carries both `bundle-path` and Hexo-root `base-url`; keep result links correct for subdirectory deployments.
- Home cards: `excerpt_for_card` — no manual excerpt + fallback off → empty body + read-more (never full post HTML).
- Footer credit is fixed English copy and has no `footer.*` i18n namespace.
- Local image metadata resolution checks Hexo's `post.asset_dir` and the Markdown file's same-name asset folder before its source directory.
- Feature CSS dark overrides use flat `html[data-theme=dark] …` (not Tailwind-scanned). Core dark uses `@variant dark` in `_core/dark.css`.

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

**Release:** `.npmignore` excludes tests, build-only sources/tools, and maintainer docs; run `npm pack --dry-run` before tagging and keep runtime `scripts/lib/**` plus generated `*.min.css` / `*.min.js` in the package. Align `package.json`, `package-lock.json`, and every documented `hexo-theme-shiro@<version>` URL:

```bash
node -e "const p=require('./package.json').version,l=require('./package-lock.json'); if (l.version !== p || l.packages[''].version !== p) process.exit(1); console.log(p)"
grep -RnE 'hexo-theme-shiro@[0-9]+\.[0-9]+\.[0-9]+' _config.yml README.md README_CN.md
```
