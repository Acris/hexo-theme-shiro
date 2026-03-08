# Shiro (白)

<div style="text-align: center">
  <img alt="Shiro" src="https://github.com/user-attachments/assets/9184c7c2-c4e0-4b2d-b583-b70ef2c86c6d" width="1000" />
</div>

A clean, elegant, and robust Hexo theme inspired by whitespace (余白). Built
with [Nunjucks](https://mozilla.github.io/nunjucks/) and [Tailwind CSS](https://tailwindcss.com/).

Made by Acris with ❤️

<div style="text-align: center">
  <a href="https://github.com/Acris/hexo-theme-shiro/releases/latest" target="_blank"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/Acris/hexo-theme-shiro?logo=github"/></a>
  <a href="https://www.npmjs.com/package/hexo-theme-shiro" target="_blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/hexo-theme-shiro?logo=npm"/></a>
</div>

**[Live Demo](https://acris.me)**

## Features

- **Clean Aesthetics**: Minimalist design with focus on typography and readability.
- **Responsive**: Fully responsive design for mobile and desktop.
- **Tailwind CSS**: Modern utility-first CSS framework.
- **Multi-language**: Supports English, Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`), Japanese (`ja-JP`),
  and French (`fr`).
- **Dark Mode**: Elegant dark theme with warm neutral tones, 3-state toggle (system/light/dark).
- **Table of Contents**: Auto-generated sidebar TOC for articles with configurable heading depth.
- **Reading Progress Bar**: Thin vermilion progress bar at the top of the page.
- **Back to Top**: Smooth scroll back-to-top button.
- **Code Blocks**: Syntax highlighting with copy button and language labels.
- **Image Lightbox**: Click to zoom images in articles via [LightGallery](https://www.lightgalleryjs.com/).
- **Disqus Comments**: Lazy-loaded Disqus comment integration via `IntersectionObserver`.
- **Google Analytics**: GA4 support with non-blocking script loading.
- **RSS**: Atom feed support (requires [hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed)).
- **Seal Stamp**: Optional decorative vermilion seal (印章) icon in the header, adding a traditional touch.
- **Fast**: Optimized for performance with minimal JavaScript.

## Installation

### Install

If you're using Hexo 5.0 or later, the simplest way to install is through npm:

```bash
npm i hexo-theme-shiro
```

Install via git:

```bash
git clone --depth=1 https://github.com/Acris/hexo-theme-shiro.git themes/shiro
```

If you would like to enable RSS, install the feed plugin:

```bash
npm install hexo-generator-feed --save
```

### Enable

Modify theme setting in `_config.yml` to `shiro`:

```diff
_config.yml
- theme: some-theme
+ theme: shiro
```

### Update

Install the latest version through npm:

```bash
npm i hexo-theme-shiro@latest
```

Or update to the latest `main` branch via git:

```bash
cd themes/shiro
git pull
```

## Configuration

### Config file

Create a dedicated theme config file `_config.shiro.yml` in your site root (Supported since Hexo 5.0.0). This file will
have higher priority than the theme's default config.

Copy the content from `themes/shiro/_config.yml` to `_config.shiro.yml` in your site root:

```yaml
# Site
site:
  favicon: /favicon.svg
  # Whether to display the seal (stamp) in the header
  seal: true
  rss:
    enabled: false
    path: /atom.xml

# Navigation menu
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
#    url: https://github.com
#    # Open in new tab
#    target: _blank

# Excerpt settings
excerpt:
  # If post has <!-- more -->, use it.
  # Otherwise fallback to auto-truncated excerpt.
  fallback:
    enabled: true
    length: 200

# Table of Contents (TOC)
toc:
  enabled: true
  # Max heading depth: 2 = h2, 3 = h2+h3, 4 = h2+h3+h4
  depth: 3
  # Minimum number of headings to show TOC
  min_headings: 3

# Dark mode
# Default theme: system (follow OS), light, or dark
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
comments:
  enabled: false
  provider: disqus
  disqus:
    shortname: ""

# Analytics
analytics:
  # Only support Google Analytics 4
  google:
    enabled: false
    id: ""
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

## Development

If you want to modify the theme source code or contribute:

### Project Structure

```
hexo-theme-shiro/
├── layout/                 # Nunjucks templates
│   ├── _layout.njk         # Base layout
│   ├── _macro/             # Reusable macros (ui, archive)
│   ├── _partial/           # Partials (head, header, footer, components, comments, analytics)
│   ├── index.njk           # Home page
│   ├── post.njk            # Article page
│   ├── page.njk            # Standalone page
│   ├── archive.njk         # Archive page
│   ├── tag.njk             # Tag page
│   └── category.njk        # Category page
├── source/
│   ├── css/_tailwind.css   # Tailwind CSS source (compiled to style.min.css)
│   └── js/                 # Client-side scripts
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

3. Build CSS (Tailwind) for production:
   ```bash
   npm run build
   ```

Note: After modifying `_tailwind.css`, you must run `npm run build` to regenerate `style.min.css`.

### Adding a New Language

1. Create a new YAML file in `languages/` (e.g., `ko.yml`).
2. Copy the structure from `languages/en.yml` and translate all values.
3. Ensure all top-level keys (`nav`, `page`, `index`, `toc`, `empty`, `back_to_top`, `theme`) are present.

## Thanks

Thanks to [JetBrains](https://jb.gg/OpenSource?from=hexo-theme-shiro) for providing open source licenses.

<a href="https://jb.gg/OpenSource?from=hexo-theme-shiro">
  <img alt="IntelliJ IDEA" src="https://resources.jetbrains.com/storage/products/company/brand/logos/IntelliJ_IDEA_icon.png" width="100">
</a>

## License

[MIT License](LICENSE)
