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
- **Tailwind CSS**：现代实用优先的 CSS 框架。
- **多语言**：支持英语、简体中文（`zh-CN`）、繁体中文（`zh-TW`）、日语（`ja-JP`）和法语（`fr`）。
- **暗色模式**：优雅的暗色主题，采用暖中性色调，三态切换（系统/亮色/暗色）。
- **目录**：构建期生成文章侧边栏目录，可配置标题深度；客户端 JavaScript 仅负责折叠和当前章节高亮。
- **阅读进度条**：页面顶部的朱红色细进度条。
- **字数与阅读时长**：可选的文章 meta，由 [hexo-word-counter](https://github.com/next-theme/hexo-word-counter) 提供（基于 Unicode 的多语言字数统计）；安装插件并将 `word_count.enabled` 设为 `true` 后显示。
- **回到顶部**：平滑滚动的回到顶部按钮。
- **字体加载遮罩**：在本页主题字体就绪前（字体 stylesheet + `document.fonts.ready`），用一层主题雾面遮罩盖住页面，配以淡淡的朱红涟漪，并带有随网络情况变化的最大等待时间，避免字体 CDN 过慢时无限遮挡页面。
- **代码块**：语法高亮，带复制按钮和语言标签。
- **MathJax**：可选的 MathJax v4 TeX 渲染（`enabled` / `every_page` / front-matter、Markdown 护栏；`$...$` 需 `inline_dollars` 开启；不内置 KaTeX）。
- **图片**：构建期为正文图片补充加载、解码、尺寸和优先级属性，文章首图保留 eager 以照顾首屏。LightGallery 资源会提前预取，因此即便是没有悬停的触摸设备也能点击即开。
- **评论系统**：支持 Disqus 和 giscus（GitHub Discussions）评论系统，接近评论区时按需加载。
- **Google Analytics**：GA4 支持，非阻塞脚本加载。
- **RSS**：Atom 订阅支持（需要 [hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed)）。
- **SEO 友好**：为每个页面输出 meta 描述、Open Graph（含 `article:*`、`og:locale` 与 `og:image` 宽高）与 Twitter Card 标签、canonical 及分页 `rel=prev`/`rel=next` 链接（分页页面的 `<title>` 带页码，避免与第 1 页重复），以及 schema.org JSON-LD（文章页用 `BlogPosting`，首页用 `WebSite`）。
- **印章**：可选的装饰性朱红印章图标显示在页头，可通过 `seal_text` 自定义印章文字。
- **站内搜索**：内置基于 [Pagefind](https://pagefind.app/) Component UI 的静态站内搜索——`hexo generate` 之后自动生成索引，无需任何外部服务。页头使用与 RSS / 主题切换同风格的 pill 按钮打开弹窗；`/` 快捷键与资源预热由轻量 bootstrap 处理，Component UI 不占用首屏关键路径。
- **快速**：优化性能，最小化 JavaScript，并在构建期缓存页面分析、补充正文图片加载与尺寸提示。

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

# 摘要设置
# 优先级：<!-- more --> 标签 > 自动截断（当 fallback.enabled 为 true 时）> 全文显示。
# 为了更好的阅读性，推荐在文章中手动添加 <!-- more -->。
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

# LightGallery 图片灯箱。官方项目名使用大写 G。
lightGallery:
  enabled: true
  css: https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/css/lightgallery.min.css
  js: https://cdn.jsdelivr.net/npm/lightgallery@2.9.0/lightgallery.min.js

# MathJax TeX 公式渲染（仅 MathJax，无 KaTeX）。官方默认是
# \(...\) / $$...$$ / \[...\]；单美元 $...$ 默认关闭，需 inline_dollars: true。
# 用法：先设 enabled: true，再 front-matter mathjax: true 和/或 every_page: true。
mathjax:
  # false = 永不注入；true = 按 every_page / front-matter 决定。
  enabled: false
  # false = 仅 front-matter 写了 mathjax: true 的页。
  # true  = 所有文章/页面，除非 front-matter 写 mathjax: false（单页关闭）。
  # 为 true 且 protect 开启时，上述每个 post/page 都会跑 Markdown 护栏
  # （含无公式页）——与脚本加载条件一致。
  every_page: false
  # MathJax 脚本 URL；建议像 lightGallery 一样固定版本以保证可复现。
  src: https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js
  # 公式编号：none、ams 或 all。
  tags: none
  # 启用 $...$ 行内公式。默认 false 与 MathJax v4 一致；演示站用
  # inlineMath: {'[+]': [['$', '$']]} 显式开启。开启后才会护栏正文 \$。
  inline_dollars: false
  # 是否处理定界符外的裸 \begin{env}...\end{env}（与 MathJax 默认一致）。
  process_environments: true
  # 将正文 \$ 视为字面美元符号（MathJax processEscapes；默认 true）。
  process_escapes: true
  # scripts/mathjax.js 的 Markdown 护栏。若使用 hexo-renderer-pandoc --mathjax
  # 或 hexo-filter-mathjax，请设为 false，避免重复处理。
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
# 在站点根目录 _config.yml 的 symbols_count_time 下配置计数/WPM
# 以及 symbols/time 开关。未启用或未安装插件时不会显示对应 meta，也不会报错。
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
    # giscus 主题 CSS URL 或内置主题名（例如 light、dark、preferred_color_scheme）
    # 默认使用通过 jsDelivr CDN 分发的 Shiro 自定义主题。
    theme: https://cdn.jsdelivr.net/npm/hexo-theme-shiro@1.5.2/source/css/giscus.min.css
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

# 站内搜索，由 Pagefind Component UI 提供（https://pagefind.app/）
# 索引会在 `hexo generate` 之后自动构建并写入 `public/pagefind/`。
# 启用搜索时必须安装 Pagefind 1.5.0+ 为站点级 devDependency：
#   npm install pagefind --save-dev
# 若未安装或版本过旧，生成会失败并提示安装。
search:
  enabled: false
  # Pagefind 文档根选择器。默认使用 body，以兼容缺少外层 <html> 的生成页；
  # 若想保持 Pagefind 默认行为，可设为 html。
  root_selector: body
  # 强制指定分词语言（默认从 <html lang> 自动检测）。
  # 仅当 Pagefind 无法正确识别站点语言时才需要覆盖。
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

### LightGallery

Shiro 默认会在包含图片的文章/页面中启用图片灯箱。你可以在 `_config.yml` / `_config.shiro.yml` 中关闭它，或替换 LightGallery CDN URL：

```yaml
lightGallery:
  enabled: true
  css: https://cdn.example.com/npm/lightgallery@2.9.0/css/lightgallery.min.css
  js: https://cdn.example.com/npm/lightgallery@2.9.0/lightgallery.min.js
```

### MathJax

Shiro **仅**使用 [MathJax](https://docs.mathjax.org/en/v4.0/) 渲染 TeX（不内置 KaTeX），无需额外主题依赖；CDN 脚本按需加载。可在 `_config.yml` 或 `_config.shiro.yml` 中配置：

```yaml
mathjax:
  enabled: false          # 必须设为 true 才允许任何 MathJax 注入
  every_page: false       # false = 仅 front-matter mathjax: true；true = 全部 post/page（mathjax: false 除外，且会对这些页跑 protect）
  src: https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js
  tags: none              # none | ams | all
  inline_dollars: false   # true 时通过 MathJax 官方 '[+]' API 追加 $...$（v4 默认关闭单 $）
  process_environments: true  # 定界符外的裸 \begin{env}...\end{env}
  process_escapes: true   # MathJax processEscapes — 正文 \$ 为字面美元
  protect: true           # scripts/mathjax.js 的 Markdown 护栏
```

**加载规则**（仅 post/page；首页/归档等永不加载）：

| `enabled` | `every_page` | front-matter | 是否加载 |
|-----------|--------------|--------------|----------|
| `false` | * | * | 否 |
| `true` | `false` | `mathjax: true` | 是 |
| `true` | `false` | 未写 / `false` | 否 |
| `true` | `true` | 未写 / `true` | 是 |
| `true` | `true` | `mathjax: false` | 否（单页关闭） |

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

全站数学向博客可设 `enabled: true` 与 `every_page: true`，个别无公式页写 `mathjax: false` 即可跳过脚本。在 `every_page: true` 且 `protect: true` 时，凡会加载 MathJax 的 post/page（含无公式页）都会跑 Markdown 护栏扫描，使加载与护栏条件始终一致；多出来的构建开销是有意为之，通常可忽略。

当 `protect: true`（默认）时，护栏与加载使用**同一套页面条件**，会在 Markdown 渲染前保护 TeX 并在之后恢复——包括 `\(...\)`、`\[...\]`、`$$...$$`，以及 `\begin{align}...\end{align}` 等白名单裸环境，避免 `\[`、`\!` 等被渲染器吃掉。仅当 `inline_dollars: true` 时才额外保护 `$...$` 与正文 `\$`。未闭合的定界符（如只有 `\[` 没有 `\]`，或 `\begin{align}` 没有 `\end{align}`）不会整段吞到文末，以免误伤后续正文；在 `hexo generate` / `hexo g` 时还会打出 `[mathjax] unclosed …` 警告（尽量带上文章 source 路径；不改变 protect 结果）。裸 env 的**护栏**不受 `process_environments` 影响（该开关只控制浏览器端 MathJax）。

**定界符。** MathJax v4 默认是行内 `\(...\)`、独立 `$$...$$` / `\[...\]`。单美元 `$...$` **默认关闭**（官方文档与默认配置）。若需要，设 `inline_dollars: true`，与 [MathJax 演示](https://mathjax.github.io/MathJax-demos-web/page/tex-chtml.html) 相同：`inlineMath: {'[+]': [['$', '$']]}`。

**货币。** 默认 `inline_dollars: false` 时，普通 `$5` 就是正文。若开启单美元，请优先写 `\$2.50`（Markdown 护栏 + 客户端 `process_escapes: true`）或 `<span>$</span>2.50`；成对的裸 `$…$` 仍可能被当成公式。注意：正文 `\$` 的 Markdown 护栏只由 `inline_dollars` 控制；`process_escapes` 是**仅客户端**的 MathJax 选项，不会开关护栏。

**进阶 / 互斥。**

- **`hexo-renderer-pandoc`** 使用 `--mathjax` 时：将 `mathjax.protect` 设为 `false`，只保留一层 Markdown 数学处理。
- **`hexo-filter-mathjax`（服务端渲染）**：将 `mathjax.enabled` 设为 `false`（或保持默认 false），避免主题再注入第二套渲染；不要与 `every_page: true` 或 front-matter `mathjax: true` 同时使用。
- **KaTeX**：主题不提供。若需要，请在站点侧使用 markdown-it KaTeX 等方案，并与 Shiro MathJax 互斥。

`mathjax.src` 建议固定具体版本（默认 `4.1.3`），与 LightGallery 的 pin 策略一致，便于可复现构建。

### 字数统计与阅读时长

Shiro 可在文章 meta（首页卡片与详情页标题下方）显示字数与预估阅读时长。计数由站点级插件 [hexo-word-counter](https://github.com/next-theme/hexo-word-counter) 提供（Unicode UAX #29，对中日韩与中英混排更准确）。主题只负责展示；未安装插件或 `word_count.enabled: false` 时不会显示对应 meta，生成也不会失败。

**npm 安装（需要显示字数时）**

在 **站点根目录**（不是主题目录）安装：

```bash
npm install hexo-word-counter
hexo clean
```

**站点根目录 `_config.yml`（插件选项）**

```yaml
symbols_count_time:
  symbols: true
  time: true
  # 插件默认为 false；技术文建议 true，避免代码块抬高字数/阅读时长
  exclude_codeblock: true
  wpm: 275                 # 插件默认；以中文为主可设 300
```

**主题配置（`_config.yml` / `_config.shiro.yml`）**

```yaml
word_count:
  enabled: true   # 默认 false；安装插件后设为 true
```

将 `word_count.enabled` 设为 `false` 可隐藏 meta。若只需字数或只需阅读时长，请用站点插件的 `symbols_count_time.symbols` / `time`。

**60 分钟以内**的阅读时长单位使用主题语言包（`languages/` 中的 `word_count.time_minutes`）。**达到或超过 60 分钟**时，[hexo-word-counter](https://github.com/next-theme/hexo-word-counter) 会格式化为 `H:MM`（例如 `1:05`），**不会**再附加该单位文案。

开启字数展示时，小屏上的文章 meta 会略加密（`text-xs`、更紧的间距），以便日期、分类与「字数 / 时长」同排更整齐；未开启字数时仍为常规 `text-sm`。

### 搜索

Shiro 内置基于 [Pagefind](https://pagefind.app/) Component UI 的静态站内搜索。索引会在 `hexo generate` 完成后自动生成；发布已生成的输出前，无需再单独运行搜索索引命令。

**npm 安装（启用搜索时必须）**

当 `search.enabled: true` 时，必须将 Pagefind 1.5.0+ 作为 devDependency 安装到 **站点根目录**（不是主题目录）：

```bash
npm install pagefind --save-dev
```

无论你通过 `npm i hexo-theme-shiro` 安装主题，还是以 `git clone` 方式将主题放在 `themes/shiro/`，都需要这样做。主题**不会**再回退到 `npx`：若未安装 Pagefind，或版本低于 1.5.0，`hexo generate` / `hexo deploy` 会直接失败并给出安装提示，以便发布前发现搜索不可用。Shiro 使用 Pagefind 的 Component UI 资产（`pagefind-component-ui.js` / `pagefind-component-ui.css`），需要 1.5.0+。

多数搜索 UI 文案（结果摘要、空结果、键盘提示）使用 Pagefind 内置翻译，语言来自 `<html lang>`（或 `search.force_language`）。主题在 `languages/` 中本地化页头按钮标签（`search.trigger`）与弹层输入框占位（`search.placeholder`）。

**配置（`_config.yml` / `_config.shiro.yml`）**

```yaml
search:
  enabled: true
  # Pagefind 文档根选择器。默认使用 body，以兼容缺少外层 <html> 的生成页；
  # 若想保持 Pagefind 默认行为，可设为 html。
  root_selector: body
  # 强制指定分词语言与 Component UI 翻译（默认从 <html lang> 自动检测）。
  # 仅当 Pagefind 无法正确识别站点语言时才需要覆盖。
  # force_language: zh
```

将 `search.enabled` 设为 `false` 即可关闭：构建钩子被跳过，搜索触发器也不会渲染。

**本地预览**

该钩子注册在 Hexo 的 `before_exit` 事件上，并对 `generate`（`g`）与 `deploy`（`d`）命令生效。发布时，请先运行 `hexo generate`，确保 `public/pagefind/` 已写入后再上传。`hexo server` 走内存渲染，不会触发该钩子，因此本地预览时不会重建搜索索引。要本地预览搜索，请走真实构建并用静态服务器：

```bash
hexo clean && hexo g
npx serve public
```

## 开发

如果你想修改主题源代码或参与贡献：

### 项目结构

```
hexo-theme-shiro/
├── layout/                 # Nunjucks 模板
│   ├── _layout.njk         # 基础布局
│   ├── _macro/             # 可复用宏（ui、archive）
│   ├── _partial/           # 局部模板（head、header、footer、组件、comments/index、统计）
│   ├── index.njk           # 首页
│   ├── post.njk            # 文章页
│   ├── page.njk            # 独立页面
│   ├── archive.njk         # 归档页
│   ├── tag.njk             # 标签页
│   └── category.njk        # 分类页
├── scripts/
│   ├── helpers.js          # 自定义 Hexo 辅助函数和生成器（build_toc、clean_description、og_image、favicon_svg 等）
│   ├── mathjax.js          # MathJax 加载门控 + Markdown TeX 保护/还原
│   ├── images.js           # after_post_render 图片加载、解码与尺寸优化
│   ├── pagefind.js         # Pagefind 索引钩子
│   └── word_count.js       # 可选字数/阅读时长 meta（hexo-word-counter）
├── source/
│   ├── css/_tailwind.css   # 核心 Tailwind CSS 源文件（编译为 style.min.css）
│   ├── css/_src/*.css      # 可选功能 CSS 源文件，会被 Hexo 忽略
│   ├── css/*.min.css       # 生成的 CSS 资源，按需加载
│   ├── js/_src/*.js        # 客户端脚本源文件，会被 Hexo 忽略
│   └── js/*.min.js         # 生成的客户端脚本与功能 bootstrap
├── tools/
│   ├── build-assets.js     # 发布资源构建脚本
│   └── snippets/           # 构建期注入的 JS 片段
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

3. 构建生产环境 CSS 和 JavaScript：
   ```bash
   npm run build
   ```

注意：修改 `_tailwind.css`、`source/css/_src/` 下的可选功能 CSS、`source/js/_src/` 下的文件或 `tools/snippets/` 下的构建期片段后，必须运行 `npm run build` 重新生成 `style.min.css`、功能 `*.min.css` 和 `*.min.js` 资源。

### 添加新语言

1. 在 `languages/` 目录创建新的 YAML 文件（例如 `ko.yml`）。
2. 复制 `languages/en.yml` 的结构并翻译所有值。
3. 按同级字母顺序排列所有键，并确保所有顶级命名空间（`clipboard`, `common`, `gallery`, `index`, `nav`, `page`, `search`, `theme`, `toc`）都存在。

## 致谢

感谢 [JetBrains](https://jb.gg/OpenSource?from=hexo-theme-shiro) 提供开源许可证。

<a href="https://jb.gg/OpenSource?from=hexo-theme-shiro">
  <img alt="IntelliJ IDEA" src="https://resources.jetbrains.com/storage/products/company/brand/logos/IntelliJ_IDEA_icon.png" width="100">
</a>

## 许可证

[MIT 许可证](LICENSE)
