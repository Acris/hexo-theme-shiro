# Shiro (白)

**[English](README.md) | 简体中文**

<div style="text-align: center">
  <img alt="Shiro" src="https://github.com/user-attachments/assets/0040cf16-5971-4888-aad1-d39936cfb346" width="1000" />
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
- **无障碍导航**：折叠菜单与目录具备安全的键盘焦点管理，并在移动菜单处理器就绪前保留可见回退导航。
- **多语言**：支持英语、简体中文（`zh-CN`）、繁体中文（`zh-TW`）、日语（`ja-JP`）和法语（`fr`）；页脚署名固定使用英文。
- **暗色模式**：优雅的暗色主题，采用暖中性色调；支持系统 / 亮色 / 暗色切换。
- **目录**：文章侧边栏目录，保留语义化标题层级并可配置深度。
- **阅读进度条**：页面顶部的朱红色细进度条。
- **字数与阅读时长**：可选的文章 meta，由 [hexo-word-counter](https://github.com/next-theme/hexo-word-counter) 提供。
- **回到顶部**：平滑滚动的回到顶部按钮。
- **字体加载遮罩**：主题字体就绪前以主题雾面遮罩盖住页面，并阻止与底层内容交互。
- **代码块**：语法高亮，带复制按钮和语言标签；仅在需要时加载样式与交互式复制资源。
- **MathJax**：可选的 MathJax v4 TeX 渲染（按页或全站开启；不内置 KaTeX）。
- **图片**：正文图片优化、首页首张卡片图片优先加载，以及可回退原图的 LightGallery 灯箱。
- **评论系统**：支持 Disqus 和 giscus（GitHub Discussions），按需加载。
- **Google Analytics**：支持 GA4。
- **RSS**：Atom 订阅支持（需要 [hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed)）。
- **SEO 友好**：元信息、社交卡片与结构化数据。
- **印章**：可选的装饰性朱红印章显示在页头，可通过 `seal_text` 自定义文字。
- **站内搜索**：内置基于 [Pagefind](https://pagefind.app/) 的静态站内搜索——生成完成后或部署前自动生成索引，无需外部服务；客户端处理器就绪前隐藏搜索入口。
- **快速**：注重性能，JavaScript 精简，资源按需加载。

## 安装

### 安装主题

Shiro 要求 Node.js 20 或更高版本。如果你使用 Hexo 5.0 或更高版本，最简单的安装方式是通过 npm：

生成的 CSS 采用 Tailwind CSS v4 的浏览器基线：Safari 16.4+、Chrome 111+、Firefox 128+。

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

根据你的安装方式，将对应默认配置复制到站点根目录的 `_config.shiro.yml`：

- npm 安装：`node_modules/hexo-theme-shiro/_config.yml`
- git 安装：`themes/shiro/_config.yml`

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

# 分类总览（/categories）：树形名称；预览仅含「本层独占」文章（不含更深子类）。
# 分类详情页仍列出 Hexo 关联的全部文章（可能多于总览数字）。
category_index:
  preview_limit: 5

# 摘要设置
# 优先级：<!-- more --> 标签 > 自动截断（当 fallback.enabled 为 true 时）> 空摘要。
# 为了更好的阅读性，推荐在文章中手动添加 <!-- more -->。
excerpt:
  # 如果文章有 <!-- more --> 标签，则使用它。
  # 启用后，若没有该标签，则使用自动截断摘要。
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

# 可选：站点 CSP nonce（静态主题脚本 + runtime 动态注入的脚本）与下方 CDN SRI 钩子。
# 仅为静态配置值，不是按请求轮换的 CSP nonce。仅当主机/边缘在 CSP 头中注入同一值时有意义；
# 真正的 nonce 安全应在主机侧按请求生成。
security:
  csp_nonce: ""

# 图片灯箱（配置键为 lightGallery，G 大写）。可按需替换 CDN URL。
# 启用后，文章/页面正文中图片的主键单击会打开灯箱（修饰键/中键仍走浏览器默认行为）。
# 灯箱脚本加载完成前，以最后一次主键单击的图片为准（后续单击会替换待打开目标）。
lightGallery:
  enabled: true
  css: https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/css/lightgallery.min.css
  js: https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/lightgallery.min.js
  # 可选：上方 CDN 的 Subresource Integrity（sha256-/sha384-/sha512-…）。
  css_integrity: ""
  js_integrity: ""

# MathJax TeX 公式渲染（仅 MathJax，无 KaTeX）。
# 默认定界符：\(...\) / $$...$$ / \[...\]；$...$ 需 inline_dollars: true。
# 用法：先设 enabled: true，再 front-matter mathjax: true 和/或 every_page: true。
mathjax:
  # false = 永不加载；true = 按 every_page / front-matter 决定。
  enabled: false
  # false = 仅 front-matter 写了 mathjax: true 的页。
  # true  = 所有文章/独立页面视图，除非 front-matter 写 mathjax: false。
  # 脚本只在 post/page 注入（首页/归档等列表页不加载 MathJax）。
  every_page: false
  # MathJax 脚本 URL；建议像 lightGallery 一样固定版本以保证可复现。
  src: https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js
  # 可选：mathjax.src 的 SRI。
  integrity: ""
  # 公式编号：none、ams 或 all。
  tags: none
  # 启用 $...$ 行内公式（默认关闭，与 MathJax v4 一致）。
  inline_dollars: false
  # 客户端是否处理裸 \begin{env}...\end{env}。Markdown 护栏仍会保护
  # 这些块，即使此处为 false（避免 MD 破坏 TeX；客户端只是不排版）。
  process_environments: true
  # 将正文 \$ 视为字面美元符号。
  process_escapes: true
  # 渲染前保护 Markdown 中的 TeX。若使用 hexo-renderer-pandoc --mathjax
  # 或 hexo-filter-mathjax，请设为 false。
  protect: true

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

# 字数统计与阅读时长（仅展示）
# 需要站点插件：npm install hexo-word-counter
# 在站点根目录 _config.yml 的 symbols_count_time 下配置计数/WPM。
# 未启用或未安装插件时不会显示对应 meta，也不会报错。
word_count:
  enabled: false

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
# 开启后默认在文章页加载评论。独立页面需 front-matter comments: true。
# 可选 front-matter：show_meta: true（页面显示日期/分类）、comments: false（单篇文章关闭评论）。
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
    # mapping 为 "specific" 或 "number" 时必填
    term: ""
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
    # 主题 CSS URL 或内置名（如 light、dark、preferred_color_scheme）
    theme: https://cdn.jsdelivr.net/npm/hexo-theme-shiro@1.5.2/source/css/giscus.min.css
    # true 启用懒加载
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

# 站内搜索，由 Pagefind 提供（https://pagefind.app/）
# 索引会在生成后构建，并在部署前于 `public/pagefind/` 中最终完成。
# 启用搜索时必须安装 Pagefind 1.5.0+ 为站点级 devDependency：
#   npm install pagefind --save-dev
# 若未安装或版本过旧，生成会失败并提示安装。
search:
  enabled: false
  # 索引用的文档根选择器（默认：body）。
  root_selector: body
  # 强制指定分词语言（默认从 <html lang> 自动检测）。
  # 仅当语言识别不正确时才需要覆盖。
  # force_language: zh
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

### MathJax

Shiro **仅**使用 [MathJax](https://docs.mathjax.org/en/v4.0/) 渲染 TeX（不内置 KaTeX）。完整选项见上方配置块。

**何时加载**（仅文章/页面；首页/归档等永不加载）：

| `enabled` | `every_page` | front-matter     | 是否加载       |
| --------- | ------------ | ---------------- | -------------- |
| `false`   | \*           | \*               | 否             |
| `true`    | `false`      | `mathjax: true`  | 是             |
| `true`    | `false`      | 未写 / `false`   | 否             |
| `true`    | `true`       | 未写 / `true`    | 是             |
| `true`    | `true`       | `mathjax: false` | 否（单页关闭） |

常见用法：先打开功能，再在需要公式的文章上标记：

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

全站数学向博客可设 `enabled: true` 与 `every_page: true`，个别无公式页写 `mathjax: false` 即可跳过脚本。MathJax 仅在文章/独立页面注入——首页/归档/标签/分类列表不加载引擎（列表摘要里的公式会保持 TeX 原文，打开正文后再排版）。

**定界符。** 默认与 MathJax v4 一致：行内 `\(...\)`、独立 `$$...$$` / `\[...\]`。单美元 `$...$` **默认关闭**。需要时设 `inline_dollars: true`。

**主题 / 暗色模式。** 公式继承正文颜色。Shiro 用 `html[data-theme]` 控制外观，因此 MathJax 配置了 `ui/no-dark-mode`（MathJax v4.1+），避免 Explorer/对话框跟随系统深浅色而与站点强制亮/暗冲突；对话框表面由主题 paper/body token 的 CSS 处理。

**货币。** 默认 `inline_dollars: false` 时，普通 `$5` 就是正文。若开启单美元，请写 `\$2.50`（配合 `process_escapes: true`）或 `<span>$</span>2.50`；成对的裸 `$…$` 仍可能被当成公式。

**与其他数学方案配合。**

- **`hexo-renderer-pandoc`** 使用 `--mathjax` 时：将 `mathjax.protect` 设为 `false`，避免重复处理。
- **`hexo-filter-mathjax`（服务端渲染）**：保持 `mathjax.enabled: false`，避免主题再注入第二套渲染。
- **KaTeX**：主题不提供。若在站点侧使用 KaTeX 插件，请勿在同一页面启用 Shiro MathJax。

### 字数统计与阅读时长

Shiro 可在文章 meta（首页卡片与详情页标题下方）显示字数与预估阅读时长。计数由站点级插件 [hexo-word-counter](https://github.com/next-theme/hexo-word-counter) 提供（对中日韩与中英混排更准确）。主题只负责展示；未安装插件或 `word_count.enabled: false` 时不会显示对应 meta，生成也不会失败。

**安装**（需要显示字数时）——在 **站点根目录**（不是主题目录）：

```bash
npm install hexo-word-counter
hexo clean
```

**站点根目录 `_config.yml`**（插件选项）：

```yaml
symbols_count_time:
  symbols: true
  time: true
  # 插件默认为 false；技术文建议 true，避免代码块抬高字数/阅读时长
  exclude_codeblock: true
  wpm: 275 # 插件默认；以中文为主可设 300
```

主题配置（`_config.shiro.yml`）中，安装插件后将 `word_count.enabled` 设为 `true`（默认为 `false`）。若只需字数或只需阅读时长，请用站点插件的 `symbols_count_time.symbols` / `time`。

### 搜索

Shiro 内置基于 [Pagefind](https://pagefind.app/) 的静态站内搜索。独立运行 `hexo generate` 后会自动生成索引，部署命令则会在部署开始前完成索引；发布前无需再单独运行搜索索引命令。

**安装**（启用搜索时必须）——将 Pagefind 1.5.0+ 作为 devDependency 安装到 **站点根目录**（不是主题目录）：

```bash
npm install pagefind --save-dev
```

无论 npm 还是 git 安装主题都需要这样做。若未安装 Pagefind、版本低于 1.5.0，或使用低于正式版 1.5.0 的预发布版本，`hexo generate` / `hexo deploy` 会失败并给出安装提示，以便发布前发现搜索不可用。

在主题配置中将 `search.enabled` 设为 `true` 即可开启。搜索界面语言跟随 `<html lang>`（或配置的 `search.force_language`）。

**本地预览**

搜索索引在 `hexo generate` / `hexo deploy` 时构建，**不会**在 `hexo server` 期间重建。`hexo generate --deploy`、`hexo deploy --generate` 与 `hexo deploy` 都会在部署器读取 `public/` 前完成索引。本地预览搜索可：

```bash
hexo clean && hexo g
npx serve public
```

### 内容安全策略（CSP）

Shiro 将 Hexo 渲染后的文章 HTML 视为可信内容；若接受不受信任的作者或 CMS 输入，请在渲染器或发布流程中进行清理。

请由宿主或边缘服务通过 HTTP 响应头设置 CSP。基础策略应在 `script-src` 使用每请求 nonce，并包含 `object-src 'none'`、`base-uri 'self'`；然后只为实际启用的功能添加下表来源。

| 功能                | 默认 URL 所需的指令补充                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主题核心 / Pagefind | `script-src 'self' 'nonce-<每请求 nonce>'`；`style-src 'self'`；`style-src-elem 'self'`；`style-src-attr 'unsafe-inline'`；`font-src 'self' data:`；`img-src 'self' data:` |
| Google Fonts        | `style-src https://fonts.googleapis.com`；`style-src-elem https://fonts.googleapis.com`；`font-src https://fonts.gstatic.com`                                              |
| LightGallery        | `script-src https://cdn.jsdelivr.net`；`style-src https://cdn.jsdelivr.net`；`style-src-elem https://cdn.jsdelivr.net`                                                     |
| MathJax             | `script-src https://cdn.jsdelivr.net`；`style-src-elem 'unsafe-inline'`；`font-src https://cdn.jsdelivr.net`                                                               |
| giscus              | `script-src https://giscus.app`；`frame-src https://giscus.app`                                                                                                            |
| Disqus              | `script-src https://*.disqus.com https://*.disquscdn.com`；`frame-src https://*.disqus.com`；并在 `connect-src` / `img-src` 加入相同主机                                   |
| Google Analytics    | `script-src https://www.googletagmanager.com`；`connect-src https://www.google-analytics.com https://region1.google-analytics.com`                                         |

交互元素状态与分类深度需要 `style-src-attr 'unsafe-inline'`。MathJax CommonHTML 还会创建内联样式元素，因此 `style-src-elem` 必须加入 `'unsafe-inline'`；脚本 nonce 不会授权这些样式。`style-src-elem` 会覆盖样式元素的 `style-src`，所以必须合并所有已启用的样式表来源。不支持 CSP Level 3 的浏览器需改在 `style-src` 中加入所需内联许可与来源。自定义 CDN、图片、评论或统计域名也必须加入对应指令。`security.csp_nonce` 只是静态配置钩子；真正的 nonce 防护必须由宿主为每个响应生成新值，并同时注入 CSP 响应头与主题配置。

## 开发

如果你想修改主题源代码或参与贡献：

### 项目结构

```
hexo-theme-shiro/
├── layout/       # Nunjucks 模板
├── scripts/      # Hexo 辅助函数与过滤器
├── source/       # CSS/JS 源文件与生成资源
├── tools/        # 资源构建脚本
├── languages/    # i18n YAML
├── _config.yml   # 主题默认配置
└── package.json
```

### 快速开始

开发与资源构建要求 Node.js 20.19 或更高版本；`.node-version` 推荐当前的 Node.js 24 LTS。

1. 在主题目录安装依赖：

   ```bash
   cd themes/shiro
   npm install
   ```

2. 开发时监听 CSS 变更：

   ```bash
   npm run dev
   ```

3. 构建生产环境 CSS 和 JavaScript：
   ```bash
   npm run build
   ```

修改 `source/` 下的 CSS/JS 源文件后，请运行 `npm run build` 重新生成压缩资源。

### 添加新语言

1. 在 `languages/` 目录创建新的 YAML 文件（例如 `ko.yml`）。
2. 复制 `languages/en.yml` 的结构并翻译所有值。
3. 按同级字母顺序排列键，并保持与 `en.yml` 相同的顶级命名空间。

## 致谢

感谢 [JetBrains](https://jb.gg/OpenSource?from=hexo-theme-shiro) 提供开源许可证。

<a href="https://jb.gg/OpenSource?from=hexo-theme-shiro">
  <img alt="IntelliJ IDEA" src="https://resources.jetbrains.com/storage/products/company/brand/logos/IntelliJ_IDEA_icon.png" width="100">
</a>

## 许可证

[MIT 许可证](LICENSE)
