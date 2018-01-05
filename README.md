# Hexo Theme Shiro (白)

A clean, elegant, and robust Hexo theme inspired by Japanese aesthetics involved with whitespace (余白). Built with [Nunjucks](https://mozilla.github.io/nunjucks/) and [Tailwind CSS](https://tailwindcss.com/).

## Features

- **Clean Aesthetics**: Minimalist design with focus on typography and readability.
- **Responsive**: Fully responsive design for mobile and desktop.
- **Tailwind CSS**: Modern utility-first CSS framework.
- **Multi-language**: Supports English, Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`), Japanese (`ja-JP`), and French (`fr`).
- **Fast**: Optimized for performance with minimal Javascript.

## Installation

1. Clone the repository into your Hexo theme directory:
   ```bash
   git clone https://github.com/Acris/hexo-theme-shiro.git themes/shiro
   ```

2. Install dependencies:
   ```bash
   cd themes/shiro
   npm install
   ```
   *Note: This theme requires `tailwindcss` processing. The `postinstall` or build scripts should handle this, or you can run `npm run build:css` manually.*

3. Enable the theme in your Hexo root `_config.yml`:
   ```yaml
   theme: shiro
   ```

## Configuration

Copy the `_config.yml` from the theme directory to your site's `source/_data/shiro.yml` (recommended) or modify `themes/shiro/_config.yml`.

```yaml
# Menu Configuration
menu:
  Home: /
  Archives: /archives
  # ...

# Language (en or zh-CN)
language: zh-CN
```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Watch for CSS changes:
   ```bash
   npm run watch:css
   ```

## License

MIT
