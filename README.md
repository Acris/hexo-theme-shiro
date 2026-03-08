# Shiro (白)

<div style="text-align: center">
  <img alt="Shiro" src="https://github.com/user-attachments/assets/9184c7c2-c4e0-4b2d-b583-b70ef2c86c6d" width="1000" />
</div>

A clean, elegant, and robust Hexo theme involved with whitespace (余白). Built
with [Nunjucks](https://mozilla.github.io/nunjucks/) and [Tailwind CSS](https://tailwindcss.com/).

Made by Acris with ❤️

<div style="text-align: center">
  <a href="https://github.com/Acris/hexo-theme-shiro/releases/latest" target="_blank"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/Acris/hexo-theme-shiro?logo=github"/></a>
  <a href="https://www.npmjs.com/package/hexo-theme-shiro" target="_blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/hexo-theme-shiro?logo=npm"/></a>
</div>

## Features

- **Clean Aesthetics**: Minimalist design with focus on typography and readability.
- **Responsive**: Fully responsive design for mobile and desktop.
- **Tailwind CSS**: Modern utility-first CSS framework.
- **Multi-language**: Supports English, Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`), Japanese (`ja-JP`),
  and French (`fr`).
- **Dark Mode**: Elegant dark theme with warm neutral tones, 3-state toggle (system/light/dark).
- **Reading Progress Bar**: Thin vermillion progress bar at the top of the page.
- **Back to Top**: Smooth scroll back-to-top button.
- **Code Blocks**: Syntax highlighting with copy button and language labels.
- **Fast**: Optimized for performance with minimal Javascript.

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

If you would like to enable the RSS, the hexo-generator-feed plugin is also required.

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
#  - name: Home
#    url: /
#  - name: Archives
#    url: /archives
#  - name: Categories
#    url: /categories
#  - name: Tags
#    url: /tags
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

# Reading progress bar (thin vermillion bar at top of page)
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

1. Install dependencies in the theme directory:
   ```bash
   cd themes/shiro
   npm install
   ```

2. Watch for CSS changes during development:
   ```bash
   npm run dev
   ```

3. Build CSS (Tailwind):
   ```bash
   npm run build
   ```

## Thanks

<a href="https://jb.gg/OpenSource?from=hexo-theme-shiro">
  <img alt="IntelliJ IDEA" src="https://resources.jetbrains.com/storage/products/company/brand/logos/IntelliJ_IDEA_icon.png" width="100">
</a>

## License

```
MIT License

Copyright (c) 2025 Acris Liu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```
