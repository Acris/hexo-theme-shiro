# Shiro (白)

**[English](README.md) | 简体中文**

<div style="text-align: center">
  <img alt="Shiro" src="https://github.com/user-attachments/assets/a039b7ff-f510-41b7-be88-27f262ca1dc3" width="1000" />
</div>

一个简洁、优雅、健壮的 Hexo 主题，灵感源自留白（余白）。基于 [Nunjucks](https://mozilla.github.io/nunjucks/) 和 [Tailwind CSS](https://tailwindcss.com/) 构建。

由 Acris 倾情打造 ❤️

<div style="text-align: center">
  <a href="https://github.com/Acris/hexo-theme-shiro/releases/latest" target="_blank"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/Acris/hexo-theme-shiro?logo=github"/></a>
  <a href="https://www.npmjs.com/package/hexo-theme-shiro" target="_blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/hexo-theme-shiro?logo=npm"/></a>
</div>

**[在线演示](https://acris.me/2026/03/07/Introducing-Hexo-Theme-Shiro/)**

## 特性

- **简洁美学**：极简设计，注重排版与可读性。
- **响应式**：完全响应式设计，适配移动端和桌面端。
- **Tailwind CSS**：现代实用优先的 CSS 框架。
- **多语言**：支持英语、简体中文（`zh-CN`）、繁体中文（`zh-TW`）、日语（`ja-JP`）和法语（`fr`）。
- **暗色模式**：优雅的暗色主题，采用暖中性色调，三态切换（系统/亮色/暗色）。
- **目录**：自动生成侧边栏目录，可配置标题深度。
- **阅读进度条**：页面顶部的朱红色细进度条。
- **回到顶部**：平滑滚动的回到顶部按钮。
- **代码块**：语法高亮，带复制按钮和语言标签。
- **图片灯箱**：通过 [LightGallery](https://www.lightgalleryjs.com/) 点击放大文章中的图片。
- **评论系统**：支持 Disqus（通过 `IntersectionObserver` 懒加载）和 giscus（GitHub Discussions）评论系统。
- **Google Analytics**：GA4 支持，非阻塞脚本加载。
- **RSS**：Atom 订阅支持（需要 [hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed)）。
- **印章**：可选的装饰性朱红印章图标显示在页头，可通过 `seal_text` 自定义印章文字。
- **快速**：优化性能，最小化 JavaScript。

## 安装

### 安装主题

如果你使用 Hexo 5.0 或更高版本，最简单的安装方式是通过 npm：

```bash
npm i hexo-theme-shiro
```

通过 git 安装：

```bash
git clone -b main --depth=1 https://github.com/Acris/hexo-theme-shiro.git themes/shiro
```

如果你想启用 RSS，请安装 feed 插件：

```bash
npm i hexo-generator-feed
```

### 启用

修改 `_config.yml` 中的主题设置为 `shiro`：

```diff
_config.yml
- theme: some-theme
+ theme: shiro
```

### 🛠️ 更新

要将主题更新到最新版本，请使用与你的安装方式对应的方法：

**npm**

```bash
npm i hexo-theme-shiro@latest
```

**Git**

```bash
cd themes/shiro
git pull
```

> **注意：** 升级后，请查看[默认 `_config.yml`](_config.yml) 中是否有新增或变更的选项，并相应更新你的 `_config.shiro.yml`。

## 配置

### 配置文件

在站点根目录创建专用的主题配置文件 `_config.shiro.yml`（Hexo 5.0.0 起支持）。此文件的优先级高于主题的默认配置。

将 `themes/shiro/_config.yml` 的内容复制到站点根目录的 `_config.shiro.yml`：

```yaml
# 站点
site:
  favicon: /favicon.svg
  # 站点创建年份；在页脚显示为"起始年–当前年"（省略则仅显示当前年份）
  # since: 2020
  # 是否在页头显示印章
  seal: true
  # 印章和 favicon 中显示的文字（建议使用单个字符）
  seal_text: "白"
  rss:
    enabled: false
    path: /atom.xml

# 导航菜单
# "name" 字段接受任意文本 — 使用你偏好的语言。
# 示例："Home"（英语）、"首页"（中文）、"ホーム"（日语）
menu:
  - name: 首页
    url: /
  - name: 归档
    url: /archives
  - name: 分类
    url: /categories
  - name: 标签
    url: /tags
#  - name: 关于
#    url: /about
#  - name: GitHub
#    url: https://github.com/Acris/hexo-theme-shiro
#    # 在新标签页打开
#    target: _blank

# 摘要设置
# 优先级：<!-- more --> 标签 > 自动截断（当 fallback.enabled 为 true 时）> 全文显示。
excerpt:
  # 如果文章有 <!-- more --> 标签，则使用它。
  # 否则回退到自动截断摘要。
  fallback:
    enabled: true
    # 截断的字符数（非单词数）
    length: 200

# 目录（TOC）
toc:
  enabled: true
  # 最大标题深度：2 = h2，3 = h2+h3，4 = h2+h3+h4
  depth: 3
  # 显示目录的最少标题数
  min_headings: 3

# 暗色模式
# 默认主题：system（跟随系统）、light 或 dark
# 当默认为 "system" 时，切换按钮在三个状态间循环：系统 → 亮色 → 暗色。
# 当默认为 "light" 或 "dark" 时，切换按钮仅在亮色 ↔ 暗色之间切换（无系统选项）。
# 当 toggle 为 false 时，主题切换按钮隐藏，始终使用默认主题。
# 如果禁用切换，建议将默认值设为 "light" 以匹配主题设计。
dark_mode:
  default: light
  toggle: true

# 阅读进度条（页面顶部的朱红色细条）
progress_bar:
  enabled: true

# 回到顶部按钮
back_to_top:
  enabled: true

# 评论系统
# 支持的评论服务：disqus、giscus
# 将 enabled 设为 true 并选择一个评论服务。
#
# Disqus：在 https://disqus.com/admin/create/ 注册，
# 并记下分配给你站点的唯一 shortname（例如 "my-blog-name"）。
#
# giscus：基于 GitHub Discussions 的评论系统。
# 前往 https://giscus.app/ 生成你的配置值。
# 确保你的仓库是公开的并且已启用 Discussions。
comments:
  enabled: false
  # disqus 或 giscus
  provider: giscus
  disqus:
    shortname: ""
  giscus:
    # giscus 脚本 URL（自托管或默认）
    src: https://giscus.app/client.js
    # GitHub 仓库（例如 "owner/repo"）
    repo: ""
    # 仓库 ID，从 https://giscus.app 获取
    repo_id: ""
    # Discussion 分类名称（例如 "Announcements"）
    category: ""
    # 分类 ID，从 https://giscus.app 获取
    category_id: ""
    # pathname、url、title、og:title、specific、number
    mapping: pathname
    # 1 启用严格标题匹配
    strict: 0
    # 1 启用表情回应
    reactions_enabled: 1
    # 1 发送讨论元数据
    emit_metadata: 0
    # bottom 或 top
    input_position: bottom
    # 语言代码（例如 en、zh-CN、ja）
    lang: en
    # giscus 主题 CSS URL 或内置主题名（例如 light、dark、preferred_color_scheme）
    # 默认使用通过 jsDelivr CDN 分发的 Shiro 自定义主题。
    theme: https://cdn.jsdelivr.net/npm/hexo-theme-shiro@1.3.2/source/css/giscus.css
    # true 启用懒加载（添加 data-loading="lazy"）
    lazy_loading: false

# 统计分析
# 目前支持 Google Analytics 4（GA4）。
# 要获取 GA4 Measurement ID，请前往 https://analytics.google.com/，
# 创建一个媒体资源，然后在"管理 > 数据流 > 网站 > 衡量 ID"中找到 ID（格式：G-XXXXXXXXXX）。
analytics:
  google:
    enabled: false
    # 例如 "G-XXXXXXXXXX"
    id: ""
```

### 创建页面（标签和分类）

由于 Hexo 默认不会生成"所有标签"或"所有分类"页面，如果你想在菜单中使用它们，需要手动创建。

1. 创建页面：
   ```bash
   hexo new page tags
   hexo new page categories
   ```

2. 修改 `source/tags/index.md`：
   ```yaml
   ---
   title: 标签
   layout: tag
   ---
   ```

3. 修改 `source/categories/index.md`：
   ```yaml
   ---
   title: 分类
   layout: category
   ---
   ```

## 开发

如果你想修改主题源代码或参与贡献：

### 项目结构

```
hexo-theme-shiro/
├── layout/                 # Nunjucks 模板
│   ├── _layout.njk         # 基础布局
│   ├── _macro/             # 可复用宏（ui、archive）
│   ├── _partial/           # 局部模板（head、header、footer、组件、评论、统计）
│   ├── index.njk           # 首页
│   ├── post.njk            # 文章页
│   ├── page.njk            # 独立页面
│   ├── archive.njk         # 归档页
│   ├── tag.njk             # 标签页
│   └── category.njk        # 分类页
├── scripts/
│   └── helpers.js          # 自定义 Hexo 辅助函数和生成器（clean_description、og_image、favicon_svg 等）
├── source/
│   ├── css/_tailwind.css   # Tailwind CSS 源文件（编译为 style.min.css）
│   └── js/                 # 客户端脚本
├── languages/              # i18n YAML 文件（en、zh-CN、zh-TW、ja、fr 等）
├── _config.yml             # 主题默认配置
└── package.json
```

### 快速开始

1. 在主题目录安装依赖：
   ```bash
   cd themes/shiro
   npm install
   ```

2. 开发时监听 CSS 变更：
   ```bash
   npm run dev
   ```

3. 构建生产环境 CSS（Tailwind）：
   ```bash
   npm run build
   ```

注意：修改 `_tailwind.css` 后，必须运行 `npm run build` 重新生成 `style.min.css`。

### 添加新语言

1. 在 `languages/` 目录创建新的 YAML 文件（例如 `ko.yml`）。
2. 复制 `languages/en.yml` 的结构并翻译所有值。
3. 确保所有顶级键（`back_to_top`、`clipboard_copy`、`clipboard_copied`、`empty`、`gallery_view_image`、`gallery_visit_source`、`index`、`nav`、`page`、`theme`、`toc`）都存在。

## 致谢

感谢 [JetBrains](https://jb.gg/OpenSource?from=hexo-theme-shiro) 提供开源许可证。

<a href="https://jb.gg/OpenSource?from=hexo-theme-shiro">
  <img alt="IntelliJ IDEA" src="https://resources.jetbrains.com/storage/products/company/brand/logos/IntelliJ_IDEA_icon.png" width="100">
</a>

## 许可证

[MIT 许可证](LICENSE)
