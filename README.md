# Shiro (白)

<p align="center">
  <img alt="Shiro" src="https://github.com/user-attachments/assets/9184c7c2-c4e0-4b2d-b583-b70ef2c86c6d" />
</p>

A clean, elegant, and robust Hexo theme involved with whitespace (余白). Built
with [Nunjucks](https://mozilla.github.io/nunjucks/) and [Tailwind CSS](https://tailwindcss.com/).

Made by Acris with ❤️

## Features

- **Clean Aesthetics**: Minimalist design with focus on typography and readability.
- **Responsive**: Fully responsive design for mobile and desktop.
- **Tailwind CSS**: Modern utility-first CSS framework.
- **Multi-language**: Supports English, Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`), Japanese (`ja-JP`),
  and French (`fr`).
- **Fast**: Optimized for performance with minimal Javascript.

## Installation

1. Clone the repository into your Hexo theme directory:
   ```bash
   git clone --depth=1 https://github.com/Acris/hexo-theme-shiro.git themes/shiro
   ```

2. Enable the theme in your Hexo root `_config.yml`:
   ```yaml
   theme: shiro
   ```

3. Create a dedicated theme config file `_config.shiro.yml` in your site root (Supported since Hexo 5.0.0). This file
   will have higher priority than the theme's default config.

## Configuration

Copy the content from `themes/shiro/_config.yml` to `_config.shiro.yml` in your site root.

```yaml
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

site:
  favicon: /favicon.svg
  # Whether to display the seal (stamp) in the header
  seal: true
  rss:
    enabled: false
    path: /atom.xml

# Analytics
analytics:
  # Only support Google Analytics 4
  google:
    enabled: false
    id: ""

# Comment systems
comments:
  enabled: false
  provider: disqus
  disqus:
    shortname: ""

# Excerpt settings
excerpt:
  fallback:
    enabled: true
    length: 200
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
