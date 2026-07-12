---
version: alpha
name: Shiro
description: >-
  Clean minimalist Hexo theme: washi paper on fog, single vermilion seal,
  serif reading UI. Canonical names match theme CSS (paper, ink, seal, fog).
colors:
  # Spec aliases (= ink / chrome / seal / fog). Prefer Shiro names in UI and CSS.
  primary: "#2b3036"
  secondary: "#6b7280"
  tertiary: "#b0171a"
  neutral: "#f5f4f2"
  # Surfaces & type (light)
  paper: "#ffffff"
  fog: "#f5f4f2"
  ink: "#2b3036"
  heading: "#1a1a2e"
  body: "#2b3036"
  seal: "#b0171a"
  seal-fill: "#b0171a"
  chrome: "#6b7280"
  on-seal: "#fffffff2"
  code-bg: "#f8fafc"
  code-gutter: "#f6f8fa"
  # Surfaces & type (dark · 夜の白)
  paper-dark: "#1f1e1d"
  fog-dark: "#181817"
  ink-dark: "#d4d0cc"
  heading-dark: "#e8e5e1"
  body-dark: "#b0ada9"
  seal-dark: "#e16a60"
  seal-fill-dark: "#b7352e"
  # Semantic type/chrome (CSS: --color-text-*); not via inverted slate utilities
  text-chrome: "#6b7280"
  text-chrome-dark: "#918e8a"
  code-bg-dark: "#1b1a19"
  code-gutter-dark: "#181817"
typography:
  display-site:
    fontFamily: Yuji Syuku
    fontSize: 3.1rem
    fontWeight: 400
    lineHeight: 1.18
    letterSpacing: 0.025em
  display-site-sm:
    fontFamily: Yuji Syuku
    fontSize: 2.2rem
    fontWeight: 400
    lineHeight: 1.18
    letterSpacing: 0.025em
  headline-page:
    fontFamily: Cardo
    fontSize: 2.4rem
    fontWeight: 700
    lineHeight: 1.375
  headline-section:
    fontFamily: Cardo
    fontSize: 2.2rem
    fontWeight: 700
    lineHeight: 1.375
  headline-card:
    fontFamily: Cardo
    fontSize: 1.6rem
    fontWeight: 700
    lineHeight: 1.375
  body-lg:
    fontFamily: Cardo
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.625
  body-md:
    fontFamily: Cardo
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.625
  body-sm:
    fontFamily: Cardo
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Cardo
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25
  label-sm:
    fontFamily: Cardo
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.025em
  meta:
    fontFamily: Cardo
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  seal-mark:
    fontFamily: Yuji Syuku
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1
  eng-footnote:
    fontFamily: Cormorant Garamond
    fontSize: 0.7rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.025em
  site-note:
    fontFamily: Yuji Syuku
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.2em
  code:
    fontFamily: Fira Code
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.625
  toc-link:
    fontFamily: Cardo
    fontSize: 0.8rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 0.125rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  "2xl": 1rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 40px
  "3xl": 48px
  "4xl": 56px
  page-gutter: 16px
  card-padding-x-sm: 20px
  card-padding-x-md: 32px
  card-padding-x-lg: 48px
  card-padding-x-xl: 56px
  card-padding-y-sm: 40px
  card-padding-y-lg: 48px
  section-gap: 40px
  meta-gap: 16px
  paper-max: 56rem
  content-max: 48rem
  archive-max: 42rem
  toc-width: 12.5rem
  toc-gap: 1.25rem
  toc-breakpoint: 85.5rem
  search-modal-max: 38rem
components:
  paper-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.body}"
    rounded: "{rounded.xl}"
    # Token padding = desktop vertical only; horizontal is responsive (see Layout).
    padding: "{spacing.card-padding-y-lg}"
    width: "{spacing.paper-max}"
  paper-card-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.body-dark}"
  fog-page:
    backgroundColor: "{colors.fog}"
    textColor: "{colors.ink}"
  fog-page-dark:
    backgroundColor: "{colors.fog-dark}"
    textColor: "{colors.ink-dark}"
  site-title:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.heading}"
    typography: "{typography.display-site}"
  site-title-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.heading-dark}"
  site-subtitle:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chrome}"
    typography: "{typography.body-sm}"
  button-ink:
    # Idle is bordered (slate/border-strong), not a solid fill — schema has no border field.
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.xl}"
    padding: 10px 16px
  button-ink-hover:
    backgroundColor: "{colors.seal-fill}"
    textColor: "{colors.on-seal}"
  button-ink-active:
    backgroundColor: "{colors.seal-fill}"
    textColor: "{colors.on-seal}"
  button-ink-hover-dark:
    backgroundColor: "{colors.seal-fill-dark}"
    textColor: "{colors.on-seal}"
  header-pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chrome}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  header-pill-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.seal}"
  header-pill-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.text-chrome-dark}"
  tag-pill:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.chrome}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 6px 12px
  tag-pill-hover:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.seal}"
  back-to-top:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chrome}"
    rounded: "{rounded.full}"
    size: 36px
  back-to-top-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.seal}"
  back-to-top-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.body-dark}"
  progress-bar:
    backgroundColor: "{colors.seal}"
    height: 2px
  progress-bar-dark:
    backgroundColor: "{colors.seal-dark}"
    height: 2px
  toc-panel:
    # Real UI uses semi-transparent panel over the page; paper is the AA composite.
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chrome}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.lg}"
    padding: 16px
    width: "{spacing.toc-width}"
  toc-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chrome}"
    typography: "{typography.toc-link}"
  toc-link-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.body-dark}"
  toc-link-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.seal}"
  menu-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: 0px
  menu-panel-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.body-dark}"
  search-modal:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.body}"
    rounded: "{rounded.lg}"
    width: "{spacing.search-modal-max}"
  code-block:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.body}"
    rounded: "{rounded.lg}"
    padding: 16px
  code-block-dark:
    backgroundColor: "{colors.code-bg-dark}"
    textColor: "{colors.body-dark}"
  code-gutter:
    backgroundColor: "{colors.code-gutter}"
    textColor: "{colors.text-chrome}"
  code-gutter-dark:
    backgroundColor: "{colors.code-gutter-dark}"
    textColor: "{colors.text-chrome-dark}"
  link-chrome:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chrome}"
  link-chrome-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.seal}"
  prose-inline-code:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.seal}"
    typography: "{typography.code}"
  prose-kbd:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.heading}"
  prose-kbd-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.heading-dark}"
  meta-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chrome}"
    typography: "{typography.meta}"
  empty-state:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chrome}"
    typography: "{typography.body-md}"
  heading-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.heading}"
    typography: "{typography.headline-page}"
  heading-text-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.heading-dark}"
  preloader:
    backgroundColor: "{colors.fog}"
    size: 48px
  preloader-dark:
    backgroundColor: "{colors.fog-dark}"
  preloader-mark:
    backgroundColor: "{colors.seal}"
    size: 8px
    rounded: "{rounded.full}"
  preloader-mark-dark:
    backgroundColor: "{colors.seal-dark}"
    size: 8px
    rounded: "{rounded.full}"
  # Color/type only — real mark uses seal SVG path, not a plain circle chip.
  seal-stamp:
    backgroundColor: "{colors.seal-fill}"
    textColor: "{colors.on-seal}"
    typography: "{typography.seal-mark}"
    rounded: "{rounded.full}"
---

# Shiro Design System

## Overview

**Shiro (白)** is a reading surface, not a product dashboard.

Picture a sheet of **washi** on a fog-colored desk, stamped once with a **朱文** vermilion seal. The job of the UI is long-form prose (Latin and CJK): calm hierarchy, generous 余白, one accent used sparingly. The screen is the desk; the design is the paper.

It should feel like a physical letter or literary pamphlet — never like an admin console, a Substack marketing title page, a glassmorphism weather app, or a multi-card analytics home. Emotion: **serenity, legibility, permanence**. Interaction fades and settles; it does not bounce or announce itself.

Dark mode is **夜の白** (“night white”): warm charcoal layers (deep fog → paper → inset), same single seal accent — night reading light, not a neon “dark theme skin.”

## Colors

Ink-on-paper with one interactive accent. **Canonical names match theme CSS** (`paper`, `ink`, `seal`, `fog`, …).

| Role | Spec alias | Shiro name | Light | Dark |
|:-----|:-----------|:-----------|:------|:-----|
| Core ink | `primary` | `ink` (chrome) · `body` (reading) | both `#2b3036` | ink `#d4d0cc` · body `#b0ada9` |
| Metadata / idle chrome | `secondary` | **`chrome`** | light `#6b7280` | dark `#918e8a` (AA idle). CSS `--color-text-chrome` / `text-text-chrome` |
| Accent foreground | `tertiary` | `seal` | `#b0171a` | `#e16a60` |
| Accent fill | — | `seal-fill` | `#b0171a` | `#b7352e` |
| Atmosphere | `neutral` | `fog` | `#f5f4f2` | `#181817` |
| Surface | — | `paper` | `#ffffff` | `#1f1e1d` |
| Titles | — | `heading` | `#1a1a2e` | `#e8e5e1` |

**Naming:** Spec aliases (`primary` / `secondary` / `tertiary` / `neutral`) equal `ink` / `chrome` / `seal` / `fog` and exist only for design.md tooling. **New UI, components, and theme CSS always use Shiro names** — never a parallel `text-primary` / `--color-primary` track. (`neutral` may lint as orphaned; that is intentional.)

- **Seal (朱):** `seal` is the foreground accent for hovers, active page, progress, inline code, and focus; `seal-fill` is reserved for surfaces carrying `on-seal` text, including buttons and the stamp. Never use either for large solid section fills.
- **Line numbers:** Use semantic `text-chrome` in both themes (`#6b7280` light / `#918e8a` dark); do not maintain a separate line-number palette.
- **Chrome idle dark:** `text-chrome-dark` keeps operable idle icons/labels AA-safe on paper-dark.
- **CSS-only (not decision tokens):** `subtle` / `faint` (+ dark) — decorative only, never body/controls; borders (`soft-border`, `border-strong`, `border-decorative`, `focus-ring`); alpha `bg-panel` / `bg-inset` / `bg-overlay` (+ dark); fog gradient mids (`#f1f0ee` light, `#191918` dark); scrollbar track/thumb greys. Full list: `source/css/_core/tokens.css` and `source/css/_core/dark.css`.
- **Alpha / composite fills:** Paint over paper/fog. Contrast-check against the composite surface (often documented as `paper`), not raw rgba on black. Header pills may use near-paper translucent slate fills in CSS while tokens list solid `paper` for AA pairs.
- **AA:** Readable text and controls ≥ 4.5:1 on paper. Light and dark UI secondary/idle text use **`text-chrome`** (`text-text-chrome` / `--color-text-chrome`). Dark chrome is AA on paper (`text-chrome-dark`); dark `seal` is readable on paper, while `seal-fill` keeps `on-seal` readable on solid accents.

Tailwind `slate-*` is not remapped in dark mode; theme chrome uses semantic text, border, and surface tokens instead.

## Typography

**Serif-first**, long-form multilingual. Token `fontFamily` is the primary face; implement full stacks:

| Role | Primary | Stack |
|:-----|:--------|:------|
| Title / seal / TOC label / site note | Yuji Syuku | `Yuji Syuku` first for every language, followed by the locale-matched `Noto Serif JP` / `SC` / `TC` and `Zen Old Mincho` fallbacks |
| Body / UI | Cardo | `Cardo`, then the locale-matched `Noto Serif JP` / `SC` / `TC`, with `Zen Old Mincho` as fallback |
| English credits | Cormorant Garamond | Cormorant Garamond, serif |
| Code | Fira Code | `Fira Code`, `JetBrains Mono`, `Cascadia Code`, ui-monospace, monospace |

Weights loaded: Cardo 400/700; Zen Old Mincho 400/600; locale-matched Noto Serif JP/SC/TC 400/600; Cormorant 400/600; Fira Code 400/500; Yuji default. Prefer **400 and 700** for Cardo — no reliable 500 cut. Site note is visually light (`tracking` + opacity in CSS); token weight stays 400.

**Token sizes are representative desktop / upper values.** Implementations may step down on small viewports (e.g. site title ~2.2–3.1rem, card titles ~1.35–1.6rem). Do not treat a single rem value as the only legal size.

**Hierarchy:** Site title centered title-face (responsive); page titles bold Cardo ~1.8–2.4rem; card titles smaller bold, hover seal; prose relaxed leading, links hover seal; meta chrome with middots and oldstyle nums.

**Site note:** Under the paper card, a decorative Japanese line (default copy: 「白は、余白の名。」), title face, wide tracking, chrome/faint opacity — `aria-hidden`, not content or SEO text.

**Icons:** Line icons, ~2px stroke, round caps/joins; inherit `text-chrome` / `text-chrome-dark` idle and `seal` on hover. No separate icon palette or filled glyph sets as default chrome.

No geometric sans as primary UI. Title face only for branding moments.

## Layout

**One centered paper column.** Optional fixed TOC only past `toc-breakpoint` **85.5rem**. Whitespace is material.

- Shell: full-height fog; `page-gutter` 16px; top ~3.5rem.
- Paper: `paper-max` **56rem**, `rounded.xl`. **Horizontal padding is stepped**, not one value: 20 → 32 → 48 → 56px (`card-padding-x-*`). Vertical ~40px mobile / ~48px desktop top (`card-padding-y-*`). Component `padding` on `paper-card` documents desktop vertical only.
- Measure: article lists often tighten to `content-max` / `archive-max` inside the card — prefer a comfortable reading column over full-bleed text.
- Rhythm: header → soft section divider → main → footer.
- TOC: width 12.5rem, gap 1.25rem, 1rem viewport margin; never overlap the card.
- Search modal max **38rem**; colors from Shiro tokens only (`--pf-*`).
- Mobile: simpler grain; `menu-panel` full-width sheet `rounded.2xl`; touch-sized pills.
- Scale: 4px base; year groups use large vertical gaps.

No multi-column dashboard home.

## Elevation & Depth

**Paper on fog** — not Material elevation steps.

1. **Fog** — warm gradient (`fog` → mid `#f1f0ee` light / `#191918` dark) + micro-grain.
2. **Paper** — hairline soft border (light); multi-stop  
   `shadow-paper`: `0 1px 1px rgba(16,24,40,0.06), 0 10px 30px rgba(16,24,40,0.08), 0 35px 70px rgba(16,24,40,0.06)`.
3. **Inset** — tags, gutters, menus via near-transparent tints (CSS `bg-inset`).
4. **Lift** — seal hover: `shadow-ink` `0 4px 12px rgba(16,24,40,0.14)`; pressed `shadow-ink-pressed` `0 2px 8px rgba(16,24,40,0.12)` + 1px down.

Dark: fog `#181817`, paper `#1f1e1d`, transparent border, softer `0 1px 2px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15)`.

Other cues: 2px seal progress (`z-50`); back-to-top / TOC as quiet floats; search backdrop soft ink/black. Scrollbars follow fog/ink greys (thin, low-contrast track/thumb in CSS) — chrome, not a second accent. No heavy glows or neumorphism.

## Motion

Transitions are quiet and mechanical — a soft light switch, not a door slam or a bounce.

| Kind | Duration | Easing |
|:-----|:---------|:-------|
| Interactive (hover, color, border) | ~150–300ms | `ease-soft` `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Theme cross-fade | ~350ms | ease / View Transitions |
| Preloader dismiss | ~420ms opacity | `ease-soft` |
| Menu open | ~260ms | ease-out + max-height |

- Prefer opacity and color over large movement.
- Nothing playful: no bounce, overshoot, or spring.
- Cap routine UI motion under ~400ms; if it needs longer, cut it.
- `prefers-reduced-motion`: collapse durations (keep tiny non-zero if JS waits on `transitionend`).
- Theme: View Transitions fade or class-based color fade — not a theatrical wipe.
- Preloader: fog veil + seal ripple; underlying content stays hidden and non-interactive until dismissal; CSS failsafe outlives JS deadline and reveals both layers; reduced motion stills the ripple.

## Shapes

**Softly architectural:** restrained radii on content; full pills for compact chrome.

| Element | Token |
|:--------|:------|
| Paper, `.btn-ink` | `xl` (0.75rem) |
| TOC, search, code | `lg` (0.5rem) |
| Tags, small hits | `md` (0.375rem) |
| Header pills, back-to-top, seal, preloader rings | `full` |
| Mobile menu sheet | `2xl` (1rem) |
| Search marks | `sm` (0.125rem) |

1px low-contrast borders. Text nav: underline + offset, not filled chips. Border color is prose/CSS only (not a component schema field).

## Components

Front matter lists **product UI** only. Variants: `*-hover`, `*-dark`, `*-active`.

### Paper & atmosphere

- **`.fog-bg` / `.paper`:** Only content shell; no full-bleed hero behind the fog.
- **Seal stamp:** Single character, vermilion. Front-matter tokens only constrain color + type; **geometry is the shared SVG path** (`seal_path_d` / generated `favicon.svg`) — a carved 朱文 form, not a Material circular badge or app-icon grid. Not a button.
- **Preloader:** Fog veil + seal graphic mark (mark is decorative; may sit under AA vs fog). Underlying controls are visibility-hidden until font readiness or the shared failsafe.

### Buttons & chrome

- **`.btn-ink`:** Idle = paper-like surface + visible border + ink text (not a filled primary). Hover = seal fill + on-seal + ink shadow. Active = slight press. Shared by home “read more” and category “view all”; optional `.btn-ink-meta` is quieter count text that tracks idle/hover ink.
- **`.header-pill-btn`:** `full` pills (search, theme, RSS). Light idle `text-chrome` on near-paper translucent fill (token AA pair uses solid `paper`); dark idle `text-chrome-dark`. Hover seal.
- **`.tag-pill`:** Soft chip; hover seal border/text.
- **`.menu-panel`:** Collapsible sheet, `2xl`, paper surface; mobile nav list.
- **Focus:** `.focus-elegant` uses a 2px solid seal outline with a 2px offset in both themes.
- **Empty state:** Muted readable copy — never faint.

### Navigation & reading

- Nav links: hover seal, no heavy active fills.
- Pagination: chrome; current = seal underline; oldstyle nums.
- Progress: 2px seal, posts only.
- Back to top: 36px; idle chrome; hover seal.
- TOC: quieter title (title face + em dashes); links chrome (light) / body (dark); active seal.

### Content

- **`.prose-shiro`:** Ink/slate prose; code + link hover seal; dark quote border may use seal on purpose.
- **Reading measure (intentional):** body copy is locked to **~65ch** (`max-w-[65ch]`, Typography’s optimal line length). Do **not** switch to `max-w-none` / full paper width for “wider content” — that is the long-form contract. The paper card may be wider than the column; empty side 余白 is expected.
- **Code full-bleed:** on large viewports, highlight blocks expand past the 65ch measure by `--shiro-code-bleed` (default `3.5rem` each side), defined on `.prose-shiro` and consumed in `source/css/_src/code.css`. Adjust the token, not magic `7rem` margins, when retuning the layout.
- **Code:** `code-bg`; gutters use semantic `text-chrome` in both themes. Gate CSS when unused.
- **Tables:** Markdown tables stay within the reading measure and scroll horizontally when their data is wider than the column.
- **MathJax:** Formulas sit inside prose and **inherit** reading colors (`mjx-container { color: inherit }`). No separate MathJax brand palette. Theme chrome uses `html[data-theme]` (not OS preference); MathJax is loaded with `ui/no-dark-mode` so Explorer/dialogs do not follow `prefers-color-scheme` against a forced theme — dialog surfaces use paper/body tokens instead.
- **Search:** Pagefind modal reuses Shiro colors; same header-pill trigger. No third-party default rainbow skin.
- **Comments / lightbox:** Tint to Shiro neutrals and seal; do not ship vendor neon defaults as brand.

### Theme

Three-state control: **system / light / dark**. Switching cross-fades; it does not re-skin the whole page with a different brand.

## Do's and Don'ts

**Do**

- Treat 余白 as material; let pages end with air.
- Use **one** seal accent; keep it scarce.
- Serif reading on the paper card; full CJK fallbacks.
- Warm neutrals in both day fog and 夜の白.
- AA idle: `text-chrome` (light) / `text-chrome-dark` (dark).
- Name tokens in CSS as Shiro (`paper`, `ink`, `seal`, …).

**Don't**

- Don't add a hero magazine cover or dashboard card grid as the home default.
- Don't introduce a second accent (blue links, purple gradients, multicolor badges).
- Don't use `subtle`/`faint` for anything people must read or click.
- Don't put primary content outside `.paper`.
- Don't use pure black canvases, neon glows, heavy glass, or bounce motion.
- Don't dual-track `primary`/`tertiary` class names alongside `ink`/`seal`.
- Don't restyle Pagefind/giscus/LightGallery into a second brand.

## Implementation notes

For agents editing this repo (visual rules above still govern look-and-feel):

1. **CSS source of truth:** `source/css/_tailwind.css` is the entry; core variables live in `source/css/_core/tokens.css` and `source/css/_core/dark.css`, with feature styles in `source/css/_src/*`. DESIGN.md keeps the **decision palette** only. Update both when visuals change.
2. **Class/token names:** `--color-paper|ink|seal|fog|…` only. Never a parallel `primary`/`tertiary` system in theme CSS or templates.
3. **Export:** `npx @google/design.md export` may emit both alias and Shiro color variables (same hex). Prefer consuming Shiro names; merge or ignore aliases so templates do not dual-track.
4. **Gate** optional assets (code, TOC, search, lightbox, comments, MathJax) per page.
5. **Lint:** `npx @google/design.md lint DESIGN.md` — treat **errors** and **contrast-ratio** on real components as blockers. Expect possible `orphaned-tokens` on unused spec aliases (e.g. `neutral`); do not reintroduce fake components to silence them. New orphans on Shiro decision colors (`paper`, `seal`, …) usually mean a broken reference.
6. Build/i18n/minified-asset rules: see `AGENTS.md`.
