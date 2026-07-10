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
- **Tailwind CSS**: Modern utility-first CSS framework.
- **Multi-language**: Supports English, Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`), Japanese (`ja-JP`),
  and French (`fr`).
- **Dark Mode**: Elegant dark theme with warm neutral tones, 3-state toggle (system/light/dark).
- **Table of Contents**: Build-time generated sidebar TOC for articles with configurable heading depth; client JavaScript only handles folding and active-section highlighting.
- **Reading Progress Bar**: Thin vermilion progress bar at the top of the page.
- **Back to Top**: Smooth scroll back-to-top button.
- **Font-load Preloader**: A themed veil with a subtle vermilion ripple covers the page until document fonts are ready, with a bounded timeout so a slow font CDN cannot hold the page indefinitely.
- **Code Blocks**: Syntax highlighting with copy button and language labels.
- **MathJax**: Optional MathJax v4 TeX rendering (`enabled` / `every_page` / front-matter, Markdown shield; `$...$` opt-in via `inline_dollars`; no KaTeX).
- **Images**: Content images get build-time loading, decoding, size, and priority attributes; the first article image stays eager for the initial viewport. LightGallery assets are prefetched ahead of the first click, so the lightbox opens instantly — even on touch devices.
- **Comments**: Disqus and giscus (GitHub Discussions) comment systems, loaded near the comments area.
- **Google Analytics**: GA4 support with non-blocking script loading.
- **RSS**: Atom feed support (requires [hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed)).
- **SEO-friendly**: Per-page meta description, Open Graph (with `article:*`, `og:locale`, and `og:image` width/height) and Twitter Card tags, canonical plus paginated `rel=prev`/`rel=next` links (paginated `<title>`s carry a page number so they aren't duplicates of page 1), and schema.org JSON-LD (`BlogPosting` for posts, `WebSite` for the home page).
- **Seal Stamp**: Optional decorative vermilion seal (印章) icon in the header, with customizable character via `seal_text`.
- **Static Site Search**: Built-in static site search powered by [Pagefind](https://pagefind.app/) Component UI — index is generated automatically after `hexo generate`, no external service required. A header pill button (same style as RSS / theme toggle) opens the modal; `/` and asset warm-up are handled by a tiny bootstrap script so Component UI stays off the critical path.
- **Fast**: Optimized for performance with minimal JavaScript, cached build-time page analysis, and content image loading/size hints.

## Installation

### Install

If you're using Hexo 5.0 or later, the simplest way to install is through npm:

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

# Excerpt settings
# Priority: <!-- more --> tag > auto-truncation (when fallback.enabled: true) > full content.
# For better readability, prefer adding <!-- more --> manually in posts.
excerpt:
  # If post has <!-- more -->, use it.
  # Otherwise fallback to auto-truncated excerpt.
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

# LightGallery image lightbox. The official project name uses a capital G.
lightGallery:
  enabled: true
  css: https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/css/lightgallery.min.css
  js: https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/lightgallery.min.js

# MathJax TeX rendering (MathJax only; no KaTeX). Official defaults are
# \(...\) / $$...$$ / \[...\]; single $...$ stays off unless inline_dollars: true.
# Usage: set enabled: true, then front-matter mathjax: true and/or every_page: true.
mathjax:
  # false = never inject; true = follow every_page / front-matter.
  enabled: false
  # false = only pages with mathjax: true in front-matter.
  # true  = all post/page views except mathjax: false (opt-out).
  # When true and protect is on, every such page is scanned by the Markdown
  # shield (including pages with no formulas) — same gate as script load.
  every_page: false
  # MathJax script URL; pin a version for reproducibility (like lightGallery).
  src: https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js
  # Equation numbering: none, ams, or all.
  tags: none
  # Enable $...$ as inline math. Default false matches MathJax v4; demos opt in
  # with inlineMath: {'[+]': [['$', '$']]}. When true, also shields prose \$.
  inline_dollars: false
  # Process bare \begin{env}...\end{env} outside delimiters (MathJax default).
  process_environments: true
  # Treat \$ as a literal dollar in text (MathJax processEscapes; default true).
  process_escapes: true
  # Markdown shield in scripts/mathjax.js. Set false if you use
  # hexo-renderer-pandoc --mathjax or hexo-filter-mathjax (avoid double work).
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
    # giscus theme CSS URL or built-in theme name (e.g., light, dark, preferred_color_scheme)
    # Default uses the bundled Shiro custom theme via jsDelivr CDN.
    theme: https://cdn.jsdelivr.net/npm/hexo-theme-shiro@1.5.2/source/css/giscus.min.css
    # true to enable lazy loading (adds data-loading="lazy")
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

# Site search powered by Pagefind (https://pagefind.app/) Component UI.
# Index is built automatically after `hexo generate` and written to `public/pagefind/`.
# Required when enabled: install Pagefind 1.5.0+ as a site-level devDependency:
#   npm install pagefind --save-dev
# Generation fails with an install hint if Pagefind is missing or too old.
search:
  enabled: false
  # Pagefind document root selector. Defaults to body to tolerate generated pages
  # without an outer <html> element; set to html to keep Pagefind's default.
  root_selector: body
  # Force language for tokenization (auto-detected from <html lang> by default).
  # Override only if Pagefind fails to detect your site language correctly.
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

### LightGallery

Shiro enables the image lightbox by default on post/page content that contains images. You can disable it or replace the LightGallery CDN URLs in `_config.yml` / `_config.shiro.yml`:

```yaml
lightGallery:
  enabled: true
  css: https://cdn.example.com/npm/lightgallery@2.9.0/css/lightgallery.min.css
  js: https://cdn.example.com/npm/lightgallery@2.9.0/lightgallery.min.js
```

### MathJax

Shiro renders TeX with [MathJax](https://docs.mathjax.org/en/v4.0/) only (no KaTeX). There is no extra theme dependency: the CDN script loads on demand. Configure in `_config.yml` or `_config.shiro.yml`:

```yaml
mathjax:
  enabled: false          # must set true to allow any MathJax injection
  every_page: false       # false = only front-matter mathjax: true; true = all posts/pages except mathjax: false (also runs protect on those pages)
  src: https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js
  tags: none              # none | ams | all
  inline_dollars: false   # set true to append $...$ via MathJax '[+]' API (MathJax v4 default is off)
  process_environments: true  # bare \begin{env}...\end{env} outside delimiters
  process_escapes: true   # MathJax processEscapes — \$ as a literal dollar in text
  protect: true           # Markdown shield in scripts/mathjax.js
```

**Loading rules** (post/page only; home/archives never load):

| `enabled` | `every_page` | front-matter | Load? |
|-----------|--------------|--------------|-------|
| `false` | * | * | No |
| `true` | `false` | `mathjax: true` | Yes |
| `true` | `false` | unset / `false` | No |
| `true` | `true` | unset / `true` | Yes |
| `true` | `true` | `mathjax: false` | No (opt-out) |

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

Site-wide math blog: `enabled: true` and `every_page: true`; use `mathjax: false` on pages that should stay script-free. With `every_page: true` and `protect: true`, the Markdown shield scans every post/page that loads MathJax (including pages without formulas) so load and protect never diverge; the extra build cost is intentional and usually small.

With `protect: true` (default), the Markdown shield runs on the **same pages that load MathJax** — so `\(...\)`, `\[...\]`, `$$...$$`, and whitelisted bare environments such as `\begin{align}...\end{align}` keep their TeX escapes (`\[`, `\!`, …). When `inline_dollars: true`, `$...$` and prose `\$` are shielded as well. Unclosed delimiters (e.g. a lone `\[` without `\]`, or `\begin{align}` without `\end{align}`) are left unprotected so the rest of the page is not swallowed into a placeholder; during `hexo generate` / `hexo g` the theme also logs a warning (`[mathjax] unclosed …`, including the post source path when available) without changing protect results. Bare-env **shielding** is independent of `process_environments` (that flag only controls the browser MathJax option).

**Delimiters.** MathJax v4 defaults are `\(...\)` (inline) and `$$...$$` / `\[...\]` (display). Single-dollar `$...$` is **off** by default (official docs and stock config). Set `inline_dollars: true` to opt in the same way as the [MathJax demos](https://mathjax.github.io/MathJax-demos-web/page/tex-chtml.html) (`inlineMath: {'[+]': [['$', '$']]}`).

**Currency.** With default `inline_dollars: false`, ordinary `$5` is plain text. If you enable single dollars, prefer `\$2.50` (Markdown shield + client `process_escapes: true`) or `<span>$</span>2.50`; ambiguous `$…$` pairs can still be misread as math. Note: the Markdown shield for prose `\$` is gated only by `inline_dollars` — `process_escapes` is a **client-only** MathJax option and does not turn the shield on or off.

**Advanced / mutual exclusion.**

- **`hexo-renderer-pandoc`** with `--mathjax`: set `mathjax.protect: false` so only one layer handles math-in-Markdown.
- **`hexo-filter-mathjax`** (server-side): set `mathjax.enabled: false` (or leave it false) so the theme never injects a second renderer; do not combine with `every_page: true` or front-matter `mathjax: true` while the filter is active.
- **KaTeX** is not shipped. Use a site-level markdown-it KaTeX plugin if you need it, and do not enable Shiro MathJax on the same pages.

Pin `mathjax.src` to a concrete version (default `4.1.3`) for reproducible builds, similar to LightGallery.

### Search

Shiro ships with a built-in static site search powered by [Pagefind](https://pagefind.app/) Component UI. The index is generated automatically after `hexo generate`, so you do not need to run a separate search command before publishing generated output.

**npm install (required when search is enabled)**

When `search.enabled: true`, install Pagefind 1.5.0+ as a devDependency in your **site root** (not the theme directory):

```bash
npm install pagefind --save-dev
```

This is required for both `npm i hexo-theme-shiro` installs and `git clone` installs under `themes/shiro/`. There is no `npx` fallback: if Pagefind is missing, or older than 1.5.0, `hexo generate` / `hexo deploy` fails with an install hint so broken search is caught before publishing. Shiro uses Pagefind's Component UI assets (`pagefind-component-ui.js` / `pagefind-component-ui.css`), which need 1.5.0+.

Most search UI strings (summary, empty results, keyboard hints) use Pagefind's built-in translations from `<html lang>` (or `search.force_language`). The theme localizes the header button label (`search.trigger`) and the modal input placeholder (`search.placeholder`) in `languages/`.

**Configuration (`_config.yml` / `_config.shiro.yml`)**

```yaml
search:
  enabled: true
  # Pagefind document root selector. Defaults to body to tolerate generated pages
  # without an outer <html> element; set to html to keep Pagefind's default.
  root_selector: body
  # Force language for tokenization and Component UI translations
  # (auto-detected from <html lang> by default).
  # Override only if Pagefind fails to detect your site language correctly.
  # force_language: zh
```

Set `search.enabled: false` to disable the feature: the build hook is skipped and the search trigger is not rendered.

**Local preview**

The hook runs on Hexo's `before_exit` event for the `generate` (`g`) and `deploy` (`d`) commands. For publishing, run `hexo generate` before deployment so `public/pagefind/` is written before upload. `hexo server` renders pages from memory and does **not** trigger this hook, so the search index is not rebuilt during local preview. To preview search locally, run a real build and serve the output:

```bash
hexo clean && hexo g
npx serve public
```

## Development

If you want to modify the theme source code or contribute:

### Project Structure

```
hexo-theme-shiro/
├── layout/                 # Nunjucks templates
│   ├── _layout.njk         # Base layout
│   ├── _macro/             # Reusable macros (ui, archive)
│   ├── _partial/           # Partials (head, header, footer, components, comments/index, analytics)
│   ├── index.njk           # Home page
│   ├── post.njk            # Article page
│   ├── page.njk            # Standalone page
│   ├── archive.njk         # Archive page
│   ├── tag.njk             # Tag page
│   └── category.njk        # Category page
├── scripts/
│   ├── helpers.js          # Custom Hexo helpers and generators (build_toc, clean_description, og_image, favicon_svg, etc.)
│   ├── mathjax.js          # MathJax load gate + Markdown TeX protect/restore
│   ├── images.js           # after_post_render image loading/decoding/sizing optimizer
│   └── pagefind.js         # Pagefind indexing hook
├── source/
│   ├── css/_tailwind.css   # Core Tailwind CSS source (compiled to style.min.css)
│   ├── css/_src/*.css      # Optional feature CSS sources ignored by Hexo
│   ├── css/*.min.css       # Generated CSS assets loaded on demand
│   ├── js/_src/*.js        # Client-side script sources ignored by Hexo
│   └── js/*.min.js         # Generated client-side scripts and feature bootstraps
├── tools/
│   ├── build-assets.js     # Release asset build script
│   └── snippets/           # Build-time JS snippets injected before minification
├── languages/              # i18n YAML files (en, zh-CN, zh-TW, ja, fr, etc.)
├── _config.yml             # Theme default config
└── package.json
```

### Getting Started

1. Install dependencies in the theme directory:
   ```bash
   cd themes/shiro
   npm install
   ```

2. Watch for CSS changes during development:
   ```bash
   npm run dev
   ```

3. Build CSS and JavaScript for production:
   ```bash
   npm run build
   ```

Note: After modifying `_tailwind.css`, optional feature CSS under `source/css/_src/`, files under `source/js/_src/`, or build-time snippets under `tools/snippets/`, run `npm run build` to regenerate `style.min.css`, feature `*.min.css`, and `*.min.js` assets.

### Adding a New Language

1. Create a new YAML file in `languages/` (e.g., `ko.yml`).
2. Copy the structure from `languages/en.yml` and translate all values.
3. Keep keys sorted alphabetically at each level and ensure all top-level namespaces (`clipboard`, `common`, `gallery`, `index`, `nav`, `page`, `search`, `theme`, `toc`) are present.

## Thanks

Thanks to [JetBrains](https://jb.gg/OpenSource?from=hexo-theme-shiro) for providing open source licenses.

<a href="https://jb.gg/OpenSource?from=hexo-theme-shiro">
  <img alt="IntelliJ IDEA" src="https://resources.jetbrains.com/storage/products/company/brand/logos/IntelliJ_IDEA_icon.png" width="100">
</a>

## License

[MIT License](LICENSE)
