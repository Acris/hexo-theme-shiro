# AGENTS.md

Human docs: `README.md` / `README_CN.md`. Design tokens: `DESIGN.md`. User chat overrides this file; nearest nested `AGENTS.md` wins.

## Project overview

Shiro (白) is a clean, minimalist, multilingual Hexo theme: Nunjucks templates, Tailwind CSS v4, optional MathJax, word count (host plugin), Pagefind search, comments, analytics, and minimal client JS for static output.

## Setup commands

| Command         | Purpose                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| `npm install`   | Install dev dependencies                                                              |
| `npm run dev`   | Tailwind watch (unminified `source/css/style.min.css`)                                |
| `npm run build` | Release assets: core CSS, optional `*.min.css`, browser `*.min.js` (+ snippet inject) |
| `npm test`      | Node built-in tests (`test/**/*.js`)                                                  |

- Both `dev` and `build` read `source/css/_tailwind.css` → `source/css/style.min.css`.
- After changing `_tailwind.css`, `source/css/_src/*`, Tailwind utilities in templates, `source/js/_src/*`, or `tools/snippets/*`: run **`npm run build`** (see Testing for committing outputs).
- Do **not** hand-edit `source/css/style.min.css`, `source/css/*.min.css`, or `source/js/*.min.js`; do not delete generated CSS or the package lock without clear reason.
- Prefer `npm run build` over `npm run dev` for one-shot validation.

## Repository map

| Path                       | Role                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout/`                  | Nunjucks: `_layout.njk` shell; `_macro/`; `_partial/common/`, `_partial/components/`, comments, analytics; pages `index`/`post`/`page`/`archive`/`tag`/`category` |
| `scripts/`                 | Hexo helpers/filters: `helpers.js`, `mathjax.js`, `images.js`, `pagefind.js`, `word_count.js`                                                                     |
| `source/css/_tailwind.css` | Theme tokens + core components → `style.min.css`                                                                                                                  |
| `source/css/_src/`         | Feature CSS → `source/css/*.min.css` (code, toc, search, comments, lightgallery, giscus)                                                                          |
| `source/js/_src/`          | Client sources → `source/js/*.min.js` (Hexo ignores `_src` via underscore prefix)                                                                                 |
| `tools/`                   | `build-assets.js`, `snippets/` (injected at build)                                                                                                                |
| `test/`                    | Unit tests (`npm test`)                                                                                                                                           |
| `languages/`               | i18n YAML (keep keys aligned across locales)                                                                                                                      |
| `_config.yml`              | Default theme config (users copy to `_config.shiro.yml`)                                                                                                          |
| `DESIGN.md`                | Design system; sync with CSS when changing colors, type, spacing, elevation, or component look                                                                    |

**Do not invent helpers** — check `scripts/helpers.js` first. Implementation details live in source and tests.

### Pitfalls

- No static `source/favicon.svg` — generator overwrites it; seal path is `SEAL_PATH_D` / `seal_path_d`.
- Font family changes: update the family list in `google_font_urls` (shared preload / preloader token).
- Pagefind is **not** a theme dependency; host needs Pagefind **1.5.0+** when `search.enabled`. Indexing runs on `hexo generate` / `hexo deploy` `before_exit`, **not** `hexo server`. No `npx` fallback.
- Word count: theme `word_count.enabled` only controls display; counting needs host [hexo-word-counter](https://github.com/next-theme/hexo-word-counter). Missing plugin omits meta — does **not** fail generate.
- Keep default LightGallery CDN versions in sync across `_config.yml`, `_layout.njk`, and `source/js/_src/lightgallery.js`.
- Runtime-injected class names are not Tailwind-scanned from client JS — put styles in feature CSS or a scanned template.
- MathJax: set `protect: false` when using pandoc `--mathjax` or `hexo-filter-mathjax`. No KaTeX.

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
- Gate scripts in `_layout.njk` by page type, feature flags, and DOM needs so unused pages stay JS-free.

## Testing and validation

**Required after relevant edits (blockers if red):**

1. Logic under `scripts/` or `test/` (or behavior those tests cover) → **`npm test`**
2. CSS/JS sources or build snippets → **`npm run build`** and include regenerated minified assets in the change set
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
- Do not commit secrets, analytics IDs, Disqus shortnames, giscus IDs, or private values.
- Treat config-rendered attributes/URLs as untrusted; be careful with external integrations (giscus, GA, LightGallery, Pagefind, CDN versions / future SRI).

## PR, commits, and release

**PR:** focused; summarize user-visible changes; list `npm test` / `npm run build` / Hexo checks; note config, i18n, docs, and UI verification.

**Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `<type>(optional-scope): description`; imperative, lowercase subject ≤72 chars; scopes like `toc`, `search`, `readme`. Breaking: `!` and/or `BREAKING CHANGE:` footer.

**Release:** package is published to npm without a restrictive `files` list — run `npm pack --dry-run` before tagging; keep generated `*.min.css` / `*.min.js` in the package. Align `package.json`, `package-lock.json`, and every documented `hexo-theme-shiro@<version>` URL:

```bash
node -e "const p=require('./package.json').version,l=require('./package-lock.json'); if (l.version !== p || l.packages[''].version !== p) process.exit(1); console.log(p)"
grep -RnE 'hexo-theme-shiro@[0-9]+\.[0-9]+\.[0-9]+' _config.yml README.md README_CN.md
```
