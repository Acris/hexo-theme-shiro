# Shiro (白)

**English | [简体中文](README_CN.md)**

<div style="text-align: center">
  <img alt="Shiro" src="https://github.com/user-attachments/assets/0040cf16-5971-4888-aad1-d39936cfb346" width="1000" />
</div>

A clean, elegant, and robust Hexo theme inspired by whitespace (余白). Built
with [Nunjucks](https://mozilla.github.io/nunjucks/) and [Tailwind CSS](https://tailwindcss.com/).

Made by Acris with ❤️

<div style="text-align: center">
  <a href="https://github.com/Acris/hexo-theme-shiro/releases/latest" target="_blank"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/Acris/hexo-theme-shiro?logo=github"/></a>
  <a href="https://www.npmjs.com/package/hexo-theme-shiro" target="_blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/hexo-theme-shiro?logo=npm"/></a>
</div>

**[Live Demo](https://acris.me/2026/03/07/Introducing-Hexo-Theme-Shiro/)**

## Features

- **Clean Aesthetics**: Minimalist design with focus on typography and readability.
- **Responsive**: Fully responsive design for mobile and desktop.
- **Accessible Navigation**: Keyboard-safe collapsed menus, table of contents, skip link, motion-aware controls, and a no-JS mobile fallback that initializes without a collapse flash.
- **Multi-language**: Supports English, Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`), Japanese (`ja-JP`),
  and French (`fr`); the footer credit remains in English.
- **Dark Mode**: Elegant dark theme with warm neutral tones; system / light / dark toggle.
- **Table of Contents**: Sidebar TOC with a semantic heading hierarchy and configurable depth.
- **Reading Progress Bar**: Thin vermilion progress bar at the top of the page.
- **Word Count & Reading Time**: Optional post meta via [hexo-word-counter](https://github.com/next-theme/hexo-word-counter).
- **Back to Top**: Smooth scroll back-to-top button.
- **Font-load Preloader**: A themed veil covers the page and blocks underlying interaction until theme fonts are ready.
- **Code Blocks**: Syntax highlighting with copy button and language labels; styles and interactive copy assets load only when needed.
- **MathJax**: Optional MathJax v4 TeX rendering (per-page or site-wide; no KaTeX).
- **Images**: Optimized content images, prioritized first home-card image, and LightGallery with original-image fallback.
- **Comments**: Disqus and giscus (GitHub Discussions), loaded when needed.
- **Google Analytics**: GA4 support.
- **RSS**: Atom feed support (requires [hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed)).
- **SEO-friendly**: Meta tags, social cards, and structured data.
- **Seal Stamp**: Optional decorative vermilion seal (印章) in the header; customize the character with `seal_text`.
- **Static Site Search**: Built-in static search powered by [Pagefind](https://pagefind.app/) — the index is generated automatically after generation or immediately before deployment, with no external service; with JS the trigger paints from first paint and is enabled once its client handler is ready.
- **Fast**: Performance-focused with minimal JavaScript and careful asset loading.

## Installation

### Install

Shiro requires Node.js 24.11 or later (Node.js 24 LTS). If you're using Hexo 5.0 or later, the simplest way to install is through npm:

The theme includes its Nunjucks 3 layout renderer, so no separate Nunjucks renderer setup is required.

The generated CSS targets the Tailwind CSS v4 browser baseline: Safari 16.4+, Chrome 111+, and Firefox 128+.

```bash
npm i hexo-theme-shiro
```

Install via git:

```bash
git clone -b main --depth=1 https://github.com/Acris/hexo-theme-shiro.git themes/shiro
```

If you would like to enable RSS, install the feed plugin:

```bash
npm i hexo-generator-feed
```

### Enable

Modify theme setting in `_config.yml` to `shiro`:

```diff
_config.yml
- theme: some-theme
+ theme: shiro
```

### 🛠️ Upgrade

To update your theme to the latest version, use the method matching your installation:

**npm**

```bash
npm i hexo-theme-shiro@latest
```

**Git**

```bash
cd themes/shiro
git pull
```

> **Note:** After upgrading, review the [default `_config.yml`](_config.yml) for any new or changed options, and update your `_config.shiro.yml` accordingly.

## Configuration

### Config file

Create a dedicated theme config file `_config.shiro.yml` in your site root (Supported since Hexo 5.0.0). This file will
have higher priority than the theme's default config.

Copy the default config that matches your installation into `_config.shiro.yml` in your site root:

- npm install: `node_modules/hexo-theme-shiro/_config.yml`
- git install: `themes/shiro/_config.yml`

```yaml
# Site
site:
  favicon: /favicon.svg
  # Year the site was created; displayed in footer as "since–current" (omit to show current year only)
  # since: 2020
  # Whether to display the seal (stamp) in the header
  seal: true
  # Text displayed inside the seal stamp and favicon (single character recommended)
  seal_text: "白"
  rss:
    enabled: false
    path: /atom.xml

# Navigation menu
# The "name" field accepts any text — use your preferred language.
# Examples: "Home" (English), "首页" (Chinese), "ホーム" (Japanese)
menu:
  - name: Home
    url: /
  - name: Archives
    url: /archives
  - name: Categories
    url: /categories
  - name: Tags
    url: /tags
#  - name: About
#    url: /about
#  - name: GitHub
#    url: https://github.com/Acris/hexo-theme-shiro
#    # Open in new tab
#    target: _blank

# Categories index (/categories): tree of names; previews list posts owned at that
# node only (not deeper children). Category detail pages list all assigned posts.
category_index:
  preview_limit: 5

# Excerpt settings
# Priority: <!-- more --> tag > auto-truncation (when fallback.enabled: true) > empty excerpt.
# For better readability, prefer adding <!-- more --> manually in posts.
excerpt:
  # If post has <!-- more -->, use it.
  # When enabled and no marker is present, use an auto-truncated excerpt.
  fallback:
    enabled: true
    # Number of characters to truncate (not words)
    length: 200

# Table of Contents (TOC)
toc:
  enabled: true
  # Max heading depth: 2 = h2, 3 = h2+h3, 4 = h2+h3+h4
  depth: 3
  # Minimum number of headings to show TOC
  min_headings: 3

# Optional host CSP nonce (static theme scripts + runtime-injected loaders) and SRI hooks below.
# Static config value only — not a per-request CSP nonce. Meaningful when the host/edge
# injects the same value into Content-Security-Policy; prefer host-level per-request nonces.
security:
  csp_nonce: ""

# Image lightbox (config key is lightGallery with capital G). Swap CDN URLs if needed.
# When enabled, a primary click on post/page body images opens the lightbox
# (modifier-clicks / middle-click keep browser defaults).
# While the gallery script is still loading, the last primary click wins (later
# clicks replace the pending target until the lightbox is ready).
lightGallery:
  enabled: true
  css: https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/css/lightgallery.min.css
  js: https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/lightgallery.min.js
  # Optional Subresource Integrity for the CDN URLs (sha256-/sha384-/sha512-…).
  css_integrity: ""
  js_integrity: ""

# MathJax TeX rendering (MathJax only; no KaTeX).
# Default delimiters: \(...\) / $$...$$ / \[...\]; enable $...$ with inline_dollars.
# Usage: set enabled: true, then front-matter mathjax: true and/or every_page: true.
mathjax:
  # false = never load; true = follow every_page / front-matter.
  enabled: false
  # false = only pages with mathjax: true in front-matter.
  # true  = all post/page views except mathjax: false (opt-out).
  # Script loads on post/page only (home/archive lists stay free of MathJax).
  every_page: false
  # MathJax script URL; pin a version for reproducibility (like lightGallery).
  src: https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js
  # Optional SRI for mathjax.src.
  integrity: ""
  # Equation numbering: none, ams, or all.
  tags: none
  # Enable $...$ as inline math (off by default, matching MathJax v4).
  inline_dollars: false
  # Client: process bare \begin{env}...\end{env}. Markdown shield always
  # protects those blocks from MD even when this is false.
  process_environments: true
  # Treat \$ as a literal dollar in text.
  process_escapes: true
  # Protect TeX in Markdown before render. Set false if you use
  # hexo-renderer-pandoc --mathjax or hexo-filter-mathjax.
  protect: true

# Dark mode
# Default theme: system (follow OS), light, or dark
# When default is "system", the toggle cycles through 3 states: system → light → dark.
# When default is "light" or "dark", the toggle switches between light ↔ dark only (no system option).
# When toggle is false, the theme toggle button is hidden and the default theme is always used.
# If toggle is disabled, it is recommended to set default to "light" to match the theme's design.
dark_mode:
  default: light
  toggle: true

# Reading progress bar (thin vermilion bar at top of page)
progress_bar:
  enabled: true

# Word count & reading time (display only)
# Requires site plugin: npm install hexo-word-counter
# Configure counting/WPM under symbols_count_time in the site root _config.yml.
# When disabled or the plugin is missing, meta items are omitted with no error.
word_count:
  enabled: false

# Back to top button
back_to_top:
  enabled: true

# Comment systems
# Supported providers: disqus, giscus
# Set enabled to true and choose a provider.
#
# Disqus: register at https://disqus.com/admin/create/ and note the
# unique shortname assigned to your site (e.g., "my-blog-name").
#
# giscus: a comment system powered by GitHub Discussions.
# Go to https://giscus.app/ to generate your configuration values.
# Make sure your repository is public and has Discussions enabled.
# Comments load on posts when enabled. Static pages need front-matter comments: true.
# Optional page front-matter: show_meta: true (date/category on pages), comments: false (opt out on a post).
comments:
  enabled: false
  # disqus or giscus
  provider: giscus
  disqus:
    shortname: ""
  giscus:
    # giscus script URL (self-hosted or default)
    src: https://giscus.app/client.js
    # GitHub repo (e.g., "owner/repo")
    repo: ""
    # Repository ID from https://giscus.app
    repo_id: ""
    # Discussion category name (e.g., "Announcements")
    category: ""
    # Category ID from https://giscus.app
    category_id: ""
    # pathname, url, title, og:title, specific, number
    mapping: pathname
    # Required when mapping is "specific" or "number"
    term: ""
    # 1 to enable strict title matching
    strict: 0
    # 1 to enable reactions
    reactions_enabled: 1
    # 1 to emit discussion metadata
    emit_metadata: 0
    # bottom or top
    input_position: bottom
    # Language code (e.g., en, zh-CN, ja)
    lang: en
    # Theme CSS URL or built-in name (e.g. light, dark, preferred_color_scheme)
    theme: https://cdn.jsdelivr.net/npm/hexo-theme-shiro@1.5.2/source/css/giscus.min.css
    # true to enable lazy loading
    lazy_loading: false

# Analytics
# Currently supports Google Analytics 4 (GA4).
# To get a GA4 Measurement ID, go to https://analytics.google.com/,
# create a property, then find the ID (format: G-XXXXXXXXXX) under
# Admin > Data Streams > Web > Measurement ID.
analytics:
  google:
    enabled: false
    # e.g., "G-XXXXXXXXXX"
    id: ""

# Site search powered by Pagefind (https://pagefind.app/).
# Index is built after generation and finalized before deployment in `public/pagefind/`.
# Required when enabled: install Pagefind 1.5.0+ as a site-level devDependency:
#   npm install pagefind --save-dev
# Generation fails with an install hint if Pagefind is missing or too old.
search:
  enabled: false
  # Document root selector for indexing (default: body).
  root_selector: body
  # Force language for tokenization (auto-detected from <html lang> by default).
  # Override only if language detection is wrong for your site.
  # force_language: zh
```

### Creating Pages (Tags & Categories)

Since Hexo does not generate 'all tags' or 'all categories' pages by default, you need to create them manually if you
wish to use them in the menu.

1. Create the pages:

   ```bash
   hexo new page tags
   hexo new page categories
   ```

2. Modify `source/tags/index.md`:

   ```yaml
   ---
   title: Tags
   layout: tag
   ---
   ```

3. Modify `source/categories/index.md`:
   ```yaml
   ---
   title: Categories
   layout: category
   ---
   ```

### MathJax

Shiro renders TeX with [MathJax](https://docs.mathjax.org/en/v4.0/) only (no KaTeX). Options are listed in the config block above.

**When MathJax loads** (posts and pages only; home/archives never load it):

| `enabled` | `every_page` | front-matter     | Load?        |
| --------- | ------------ | ---------------- | ------------ |
| `false`   | \*           | \*               | No           |
| `true`    | `false`      | `mathjax: true`  | Yes          |
| `true`    | `false`      | unset / `false`  | No           |
| `true`    | `true`       | unset / `true`   | Yes          |
| `true`    | `true`       | `mathjax: false` | No (opt-out) |

Typical setup — enable the feature, then mark posts that need math:

```yaml
# _config.shiro.yml
mathjax:
  enabled: true
```

```yaml
---
title: Fourier Notes
mathjax: true
---
```

For a site-wide math blog, set `enabled: true` and `every_page: true`; use `mathjax: false` on pages that should stay script-free. MathJax is injected only on post/page views — home/archive/tag/category lists do not load the engine (excerpts may show raw TeX until the full post is opened).

**Delimiters.** Defaults follow MathJax v4: `\(...\)` (inline) and `$$...$$` / `\[...\]` (display). Single-dollar `$...$` is **off** by default. Set `inline_dollars: true` to enable it.

**Theme / dark mode.** Formulas inherit prose colors. Shiro drives appearance with `html[data-theme]`, so MathJax is configured with `ui/no-dark-mode` (MathJax v4.1+) to avoid Explorer/dialog chrome following the OS while the page is forced light or dark. Dialog surfaces use Shiro paper/body tokens in CSS.

**Currency.** With default `inline_dollars: false`, ordinary `$5` stays plain text. If you enable single dollars, write `\$2.50` (with `process_escapes: true`) or `<span>$</span>2.50`; ambiguous `$…$` pairs can still be treated as math.

**Using other math tools.**

- **`hexo-renderer-pandoc`** with `--mathjax`: set `mathjax.protect: false` to avoid double-processing.
- **`hexo-filter-mathjax`** (server-side): keep `mathjax.enabled: false` so the theme does not inject a second renderer.
- **KaTeX** is not included. If you use a site-level KaTeX plugin, do not enable Shiro MathJax on the same pages.

### Word Count & Reading Time

Shiro can show word count and estimated reading time in post meta (home cards and article headers). Counting is provided by the site-level plugin [hexo-word-counter](https://github.com/next-theme/hexo-word-counter) (accurate for CJK and mixed-language posts). The theme only controls display; without the plugin (or with `word_count.enabled: false`), meta items are omitted and generation still succeeds.

**Install** (required for counts to appear) — in your **site root**, not the theme directory:

```bash
npm install hexo-word-counter
hexo clean
```

**Site root `_config.yml`** (plugin options):

```yaml
symbols_count_time:
  symbols: true
  time: true
  # Plugin default is false; recommended true for tech posts so code blocks
  # do not inflate word count / reading time.
  exclude_codeblock: true
  wpm: 275 # plugin default; Chinese-heavy blogs often use 300
```

In theme config (`_config.shiro.yml`), set `word_count.enabled: true` after installing the plugin (default is `false`). To show only count or only reading time, use the site plugin flags (`symbols_count_time.symbols` / `time`).

### Search

Shiro ships with built-in static site search powered by [Pagefind](https://pagefind.app/). The index is generated automatically after a standalone `hexo generate` and before deployment, so you do not need a separate search command before publishing.

**Install** (required when search is enabled) — Pagefind 1.5.0+ as a devDependency in your **site root** (not the theme directory):

```bash
npm install pagefind --save-dev
```

This applies to both npm and git theme installs. If Pagefind is missing, older than 1.5.0, or a pre-release below 1.5.0, `hexo generate` / `hexo deploy` fails with an install hint so broken search is caught before publishing.

Set `search.enabled: true` in theme config to turn search on. Search UI language follows `<html lang>` (or `search.force_language` if set).

**Local preview**

The search index is built during `hexo generate` / `hexo deploy`, not during `hexo server`. `hexo generate --deploy`, `hexo deploy --generate`, and `hexo deploy` all finalize the index before the deployer reads `public/`. To preview search locally:

```bash
hexo clean && hexo g
npx serve public
```

### Content Security Policy

Shiro treats Hexo-rendered post HTML as trusted content; sanitize it in the renderer or publishing pipeline when accepting untrusted authors or CMS input.

Set CSP as an HTTP response header at the host or edge. Start with a request-specific nonce in `script-src`, `object-src 'none'`, `base-uri 'self'`, and the sources below; add only the rows for enabled features.

| Feature               | Directive additions for the default URLs                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core theme / Pagefind | `script-src 'self' 'nonce-<request-nonce>'`; `style-src 'self'`; `style-src-elem 'self'`; `style-src-attr 'unsafe-inline'`; `font-src 'self' data:`; `img-src 'self' data:` |
| Google Fonts          | `style-src https://fonts.googleapis.com`; `style-src-elem https://fonts.googleapis.com`; `font-src https://fonts.gstatic.com`                                               |
| LightGallery          | `script-src https://cdn.jsdelivr.net`; `style-src https://cdn.jsdelivr.net`; `style-src-elem https://cdn.jsdelivr.net`                                                      |
| MathJax               | `script-src https://cdn.jsdelivr.net`; `style-src-elem 'unsafe-inline'`; `font-src https://cdn.jsdelivr.net`                                                                |
| giscus                | `script-src https://giscus.app`; `frame-src https://giscus.app`                                                                                                             |
| Disqus                | `script-src https://*.disqus.com https://*.disquscdn.com`; `frame-src https://*.disqus.com`; `connect-src` / `img-src` for the same hosts                                   |
| Google Analytics      | `script-src https://www.googletagmanager.com`; `connect-src https://www.google-analytics.com https://region1.google-analytics.com`                                          |

`style-src-attr 'unsafe-inline'` is required for interactive element state and category depth. MathJax CommonHTML also creates inline style elements, so it requires `'unsafe-inline'` in `style-src-elem`; a script nonce does not authorize those styles. Merge every enabled stylesheet origin into `style-src-elem`, which overrides `style-src` for style elements. On browsers without CSP Level 3 support, place the required inline allowance and origins in `style-src` instead. Add any custom CDN, image, comment, or analytics hosts you configure. `security.csp_nonce` is a static config hook only—real nonce protection requires the host to inject a fresh nonce into both the CSP header and rendered theme config for every response.

## Development

If you want to modify the theme source code or contribute:

### Project Structure

```
hexo-theme-shiro/
├── layout/       # Nunjucks templates
├── scripts/      # Hexo helpers and filters
├── source/       # CSS/JS sources and generated assets
├── tools/        # Asset build scripts
├── languages/    # i18n YAML
├── _config.yml   # Theme default config
└── package.json
```

### Getting Started

Development and asset builds require Node.js 24.11 or later; `.node-version` selects Node.js 24 LTS. `npm test` includes a real temporary Hexo/Nunjucks generation smoke test.

1. Install dependencies in the theme directory:

   ```bash
   cd themes/shiro
   npm install
   ```

2. Watch CSS during development:

   ```bash
   npm run dev
   ```

3. Build CSS and JavaScript for production:
   ```bash
   npm run build
   ```

After changing CSS/JS sources under `source/`, run `npm run build` to regenerate minified assets.

### Adding a New Language

1. Create a new YAML file in `languages/` (e.g., `ko.yml`).
2. Copy the structure from `languages/en.yml` and translate all values.
3. Keep keys sorted alphabetically and include the same top-level namespaces as `en.yml`.

## Thanks

Thanks to [JetBrains](https://jb.gg/OpenSource?from=hexo-theme-shiro) for providing open source licenses.

<a href="https://jb.gg/OpenSource?from=hexo-theme-shiro">
  <img alt="IntelliJ IDEA" src="https://resources.jetbrains.com/storage/products/company/brand/logos/IntelliJ_IDEA_icon.png" width="100">
</a>

## License

[MIT License](LICENSE)
