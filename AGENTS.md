# AGENTS.md

## Project overview

Shiro (白) is a clean, minimalist, multilingual Hexo theme built with Nunjucks templates and Tailwind CSS v4. It focuses on typography, whitespace, performance, dark mode, table of contents, static search, comments, analytics, and minimal client-side JavaScript for static Hexo output.

## Repository layout

- `layout/` — Nunjucks templates for Hexo pages.
- `layout/_layout.njk` — base HTML layout, shared page shell, conditional script loading, and global i18n data injection.
- `layout/_macro/` — shared Nunjucks macros: `ui.njk` (e.g., `svg_filters` used by the seal, `seal` shape, `section_title` for archive/tag/category headers, icons, post `meta`) and `archive.njk` (archive list rendering). The `seal` macro reads its path geometry from the `seal_path_d` helper so it stays in sync with the generated `favicon.svg`.
- `layout/_partial/common/` — shared shell partials: `head.njk`, `header.njk`, `footer.njk`, `pagination.njk`, `empty.njk`.
- `layout/_partial/components/` — page components: `article.njk`, `post-card.njk`, `toc.njk`.
- `layout/_partial/comments/` — comment providers and shared comment bootstrapping: `disqus.njk`, `giscus.njk`, `bootstrap.njk`.
- `layout/_partial/analytics/` — analytics providers: `google.njk`.
- `layout/index.njk`, `post.njk`, `page.njk`, `archive.njk`, `tag.njk`, `category.njk` — main page templates.
- `scripts/helpers.js` — custom Hexo helpers (`should_render_toc`, `build_toc`, `google_font_urls`, `page_has_code`, `page_looks_long`, `versioned_url`, `has_images`, `first_image`, `excerpt_for`, `clean_description`, `copyright_year`, `build_page_title`, `seal_path_d`, `og_image`) and the dynamic `favicon.svg` generator (`favicon_svg`). Treat this list as authoritative — check `scripts/helpers.js` before adding new helpers or duplicating logic. TOC, image, code, long-page, description, and excerpt helpers share page-level cached analysis; pass the full `page` object to these helpers instead of `page.content` so the cache is reused. The `seal` macro and the `favicon_svg` generator share the same SVG path constant (`SEAL_PATH_D`) exposed via `seal_path_d` — when tweaking the seal shape, edit only that constant.
- `scripts/images.js` — `after_post_render` hook that adds loading/decoding/fetchpriority/sizes attributes to rendered content images and infers local image dimensions when possible; the first article content image is eager/high priority, later content and excerpt images are lazy.
- `scripts/pagefind.js` — `before_exit` hook that runs Pagefind against `public/` after `hexo generate` / `hexo deploy` when `search.enabled: true`; resolves the binary via `pagefind/package.json` with an `npx --yes pagefind` fallback.
- `source/css/_tailwind.css` — core Tailwind CSS v4 source, theme tokens, core component styles, and custom utilities; compiled to `style.min.css`.
- `source/css/style.min.css` — compiled core CSS output generated from `_tailwind.css` by `npm run build`.
- `source/css/search.css` / `search.min.css` — optional plain CSS source and minified output for the search modal and Pagefind UI accents; lazy-loaded when search is opened.
- `source/css/comments.css` / `comments.min.css` — optional plain CSS source and minified output for comment containers (giscus / Disqus); loaded only on post/page views with a configured comment provider.
- `source/css/lightgallery.css` / `lightgallery.min.css` — optional plain CSS source and minified output for LightGallery theme overrides; lazy-loaded on first image lightbox interaction.
- `source/css/giscus.css` / `giscus.min.css` — custom giscus iframe theme source and minified output, also published via jsDelivr; **not** processed by Tailwind.
- `source/js/` — lightweight browser script sources and generated `*.min.js` outputs: `theme-toggle`, `search`, `search-bootstrap`, `toc`, `progress`, `back-to-top`, `clipboard`, `clipboard-bootstrap`, `lightgallery`, `lightgallery-bootstrap`, `mobile-menu`, `mobile-menu-bootstrap`. Some source files include build-time snippet markers such as `<shiro-asset-loader>` and must be consumed through `npm run build`, not served directly.
- `tools/build-assets.js` — release asset build script; minifies CSS/JS and injects shared snippets before JS minification.
- `tools/snippets/` — build-time JavaScript snippets shared by client scripts, currently `asset-loader.js` for lazy asset loading helpers and `script-loader.js` for tiny bootstrap handoffs.
- `languages/` — i18n YAML files for supported locales and locale aliases.
- `_config.yml` — default theme configuration users may copy into `_config.shiro.yml`.
- `package.json` — npm scripts and Tailwind development dependencies.

## Setup commands

- Install dev dependencies: `npm install`
- Watch CSS during development: `npm run dev` (long-running Tailwind watch; writes an unminified `source/css/style.min.css`)
- Build minified CSS and JS for release: `npm run build` (runs Tailwind for core CSS, then minifies optional CSS modules and browser JS)

Both `dev` and `build` read `source/css/_tailwind.css` and write `source/css/style.min.css`; `build` also minifies optional CSS modules to `*.min.css` and browser scripts to `source/js/*.min.js`. Before minifying browser scripts, `build` injects shared snippets from `tools/snippets/` into marked source regions. After changing `_tailwind.css`, optional CSS modules, Tailwind utility usage in templates/client scripts, any `source/js/*.js` source file, or `tools/snippets/*`, always finish with `npm run build` and include the regenerated minified assets in the same change set; these files are part of the published package (see `Release and publishing`). Use `npm run build`, not `npm run dev`, for one-shot validation before finishing changes.
- Do not hand-edit generated minified assets (`source/css/style.min.css`, `source/css/*.min.css`, `source/js/*.min.js`); change their source files, then regenerate them with `npm run build`.

## Development workflow

- Prefer small, focused changes that preserve Hexo theme compatibility.
- Keep generated output, templates, scripts, config, README docs, and language files consistent.
- When changing the repository/file layout or adding a new feature, update `README.md`, `README_CN.md`, and `AGENTS.md` in the same change set so project structure and agent guidance stay current.
- When changing npm dependencies or bumping the package version, update `package.json` and `package-lock.json` together using `npm install` or `npm install --package-lock-only`; avoid manual lockfile edits unless there is a clear reason.
- When adding config options, update `_config.yml`, `README.md`, `README_CN.md` if needed, and any relevant template or script logic.
- When adding user-facing strings, update every file in `languages/` and keep the same key structure across locales.
- When modifying templates, check the relevant Hexo page types: home, post, page, archive, tag, and category.
- Avoid introducing heavy client-side dependencies unless clearly justified by the feature and consistent with the existing lazy/deferred loading approach.

## Code style

- Keep Nunjucks templates readable and modular; use existing macros and partials where possible.
- Keep Tailwind utility usage consistent with the existing design system and minimalist aesthetic.
- Preserve the Shiro visual style: clean whitespace, warm neutral tones, subtle vermilion accents, strong typography, and performance-conscious UI.
- JavaScript should be plain, lightweight, browser-compatible, and suitable for static Hexo output.
- Match existing JS conventions: `'use strict'` at the top, 4-space indentation, single quotes, CommonJS (`require` / `hexo.extend.*`) in `scripts/`, and DOMContentLoaded-guarded IIFEs in `source/js/`. Do not introduce ESM, TypeScript, bundlers, or build pipelines for client scripts.
- Reference static assets via the `versioned_url` helper so cache-busting hashes are added automatically.
- YAML config and language files should remain human-readable and well-commented where helpful.
- Do not rewrite large files unnecessarily.
- Do not reformat unrelated code.

## Testing and validation

- **Primary local validation: `npm run build`** — this repository has no dedicated `npm test`, `lint`, or formatter script. See `Setup commands` for exactly when to rebuild and which file to commit; verify rendering in a host Hexo site when possible.
- This repository is a theme package, not a full Hexo site fixture. To verify theme rendering, run `hexo clean && hexo generate` from a host Hexo site that uses this theme, unless a fixture site is added later.
- If search is enabled, remember Pagefind indexing runs in the `before_exit` filter after `hexo generate` / `hexo deploy`, **not** during `hexo server`.
- Pagefind is **not** declared as a devDependency of this theme; when `search.enabled: true`, install it in the host Hexo site (`npm i pagefind -D`) or ensure network access for the `npx --yes pagefind` fallback.
- When changing `_config.yml`, also update the YAML snippet copied verbatim into `README.md` and `README_CN.md` so the documented defaults stay in sync.
- Manually inspect generated pages when possible: home, post, page, archive, tag, category, dark mode, TOC, comments, search button, code blocks, image lightbox, and responsive layout.
- Treat build failures, template rendering errors, missing translation keys, and broken config defaults as blockers.

## Internationalization

- Keep all language YAML files structurally aligned.
- When adding a new key to one locale, add it to all supported locales and aliases.
- Do not hard-code English text in templates when an existing i18n pattern should be used.
- Preserve support for English, Simplified Chinese, Traditional Chinese, Japanese, and French unless the repository has changed.
- Current locale files include `default.yml`, `en.yml`, `en-US.yml`, `zh-CN.yml`, `zh-TW.yml`, `ja.yml`, `ja-JP.yml`, `fr.yml`, and `fr-FR.yml`.

## Configuration compatibility

- Preserve backward compatibility for existing `_config.yml` options whenever possible.
- Prefer adding new optional config keys with safe defaults.
- Do not remove or rename config keys without updating docs and adding clear migration notes.
- Be careful with comments in `_config.yml` because users copy this file into `_config.shiro.yml`.
- Treat copied user config as potentially older than the current default config; templates and scripts should handle missing optional keys safely.
- Current top-level config keys: `site`, `menu`, `excerpt`, `toc`, `dark_mode`, `progress_bar`, `back_to_top`, `comments` (`disqus` / `giscus`), `analytics.google`, `search` (Pagefind). Renaming or removing any of them is a breaking change.
- `site.seal_text` controls both the header seal and the dynamically generated `favicon.svg` (see `hexo.extend.generator.favicon_svg` in `scripts/helpers.js`). Do not add a static `favicon.svg` into `source/` — it will be overwritten on each generate.
- The default giscus theme URL in `_config.yml` (`https://cdn.jsdelivr.net/npm/hexo-theme-shiro@<version>/source/css/giscus.min.css`) hard-codes a release version. When cutting a new release, bump this version in `_config.yml`, `README.md`, and `README_CN.md` to match the published npm/git tag so existing users keep loading a matching `giscus.min.css`. Note any breaking changes to `giscus.css` / `giscus.min.css` in the release notes.

## Performance and accessibility

- Keep JavaScript minimal and defer or lazy-load non-critical behavior where appropriate.
- Avoid blocking scripts and unnecessary assets.
- All `<script>` tags in `layout/_layout.njk` are gated by Hexo page-type predicates (`is_home()` / `is_post()` / `is_page()`) and feature toggles (`theme.toc.enabled`, `theme.search.enabled`, etc.). New scripts should follow the same double-gating pattern so unused pages stay JS-free.
- Preserve responsive behavior across mobile and desktop layouts.
- Use semantic HTML where possible.
- Keep keyboard and screen-reader accessibility in mind for toggles, buttons, navigation, search, copy buttons, and lightbox interactions.
- Do not degrade Core Web Vitals with unnecessary dependencies or large assets.

## Security

- Do not include secrets, analytics IDs, Disqus shortnames, giscus IDs, or private repository values in the repository.
- Treat user-provided config values as untrusted when rendering attributes or URLs.
- Avoid unsafe inline script patterns unless already established and necessary.
- Be careful when changing external script integrations such as giscus, Google Analytics, LightGallery, or Pagefind.
- When changing CDN asset versions, update matching `integrity` hashes and verify the asset still loads correctly.

## Pull request guidance

- Summarize user-visible changes clearly.
- List validation commands run, especially `npm run build` and any Hexo generation checks.
- Mention screenshots or visual checks for layout/UI changes.
- Call out config, i18n, or documentation updates.
- Keep PRs focused.

## Commit messages

- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification: `<type>(<optional scope>): <description>`.
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Use the imperative mood ("add", "fix", "update"), keep the subject line concise (≤ 72 chars), and prefer lowercase.
- Use scopes that map to the affected area when helpful, e.g. `feat(toc): ...`, `fix(search): ...`, `docs(readme): ...`, `style(css): ...`.
- For breaking changes, append `!` after the type/scope (e.g., `feat(config)!: ...`) and/or include a `BREAKING CHANGE:` footer.
- Use the commit body to explain motivation and context when the subject alone is not enough.

## Release and publishing

- This package is published to npm; `package.json` does not set `files` and there is no `.npmignore`, so most non-ignored project files may be packed. Run `npm pack --dry-run` before release to verify the exact contents, and keep the package tidy.
- `source/css/style.min.css` and other generated `*.min.css` / `*.min.js` files are build outputs and **must** be included in the release/npm package — consumers install the theme straight from npm/git without running a build step, so without it the theme will be unstyled. Re-run the release build (see `Setup commands`) and include the regenerated files before tagging a release.
- When cutting a release, bump `package.json`, `package-lock.json`, and the `hexo-theme-shiro@<version>` reference in `_config.yml`, `README.md`, and `README_CN.md` together so the bundled giscus theme URL points at the matching published tag. Before release, verify `package.json`, `package-lock.json`, and every documented `hexo-theme-shiro@<version>` URL all point to the same version.
- Self-check all version references with a single grep: `grep -RnE 'hexo-theme-shiro@[0-9]+\.[0-9]+\.[0-9]+' _config.yml README.md README_CN.md package.json package-lock.json`

## Agent-specific notes

- Read existing files before editing.
- Prefer modifying the smallest relevant file.
- If an agent needs to run Python scripts, use `uv` to run them.
- Treat `node_modules/` as generated dependency output; do not edit files inside it.
- Do not delete generated CSS or package lock files unless there is a clear reason.
- If unsure about Hexo behavior, verify against Hexo conventions or existing project patterns.
- Explicit user instructions override this `AGENTS.md`.
- If there are nested `AGENTS.md` files in the future, the closest one to the edited file should take precedence.