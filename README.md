# Neuro-Inclusive Web Interface

> A Chrome extension that adapts any website for users with ADHD, Autism, and Dyslexia — using CSS-driven sensory profiles, configurable fonts, color theme overrides, and local AI-powered text simplification via Ollama.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [File-by-File Breakdown](#file-by-file-breakdown)
  - [manifest.json](#manifestjson)
  - [popup/popup.html](#popuppopuphtml)
  - [popup/popup.css](#popuppopupcss)
  - [popup/popup.js](#popuppopupjs)
  - [scripts/content.js](#scriptscontentjs)
  - [styles/accessibility.css](#stylesaccessibilitycss)
  - [background/background.js](#backgroundbackgroundjs)
- [Cognitive Profiles](#cognitive-profiles)
  - [ADHD Focus Mode](#1-adhd-focus-mode)
  - [Autism Mode](#2-autism-mode)
  - [Dyslexia Mode](#3-dyslexia-mode)
- [Sensory Base Themes](#sensory-base-themes)
  - [The Great Theme Neutralizer](#the-great-theme-neutralizer)
  - [Available Themes](#available-themes)
  - [Theme Blacklist](#theme-blacklist)
- [Dyslexia Font System](#dyslexia-font-system)
- [AI Text Simplification (Phase 3)](#ai-text-simplification-phase-3)
- [Popup UI Design](#popup-ui-design)
- [Hard-Won Design Lessons](#hard-won-design-lessons)
- [Known Limitations](#known-limitations)
- [Installation & Setup](#installation--setup)
  - [Extension Installation](#extension-installation)
  - [Ollama Setup (for AI Simplification)](#ollama-setup-for-ai-simplification)
  - [Troubleshooting Ollama CORS (403 Forbidden)](#troubleshooting-ollama-cors-403-forbidden)
- [Development Workflow](#development-workflow)

---

## Problem Statement

The modern web is a hostile environment for neurodivergent users:

- **ADHD users** are overwhelmed by auto-playing animations, sidebars, floating ads, decorative gradients, and visual noise that constantly pulls attention away from the primary content.
- **Autistic users** experience sensory overload from high-contrast color schemes, flashing elements, and sudden motion. They need muted, predictable visual environments.
- **Dyslexic users** struggle with standard fonts, tight line spacing, and justified text alignment. They need specific typefaces with increased letter and word spacing.

Existing solutions are either too simple (basic font changers) or too complex (full screen readers). There is no lightweight, CSS-driven tool that combines all three profiles with configurable sensory themes and local AI-powered content simplification.

---

## Solution Overview

**Neuro-Inclusive Web Interface** is a Chrome Manifest V3 extension that injects accessibility CSS overrides into every webpage. It provides:

1. **Three cognitive profiles** (ADHD, Autism, Dyslexia) that can be toggled independently and combined.
2. **Three sensory color themes** (Sepia, Soft Dark, Muted Gray) that override site colors universally.
3. **Six dyslexia-friendly fonts** loaded on-demand from Google Fonts / CDN.
4. **AI text simplification** powered by a local Ollama instance running the Gemma 3 lightweight model, with a floating result panel injected into the page.

The entire system is CSS-first: profiles are applied by adding classes to `<html>` (`neuro-adhd`, `neuro-autism`, `neuro-dyslexia`), themes via a `data-neuro-theme` attribute, and fonts via a `data-neuro-font` attribute. JavaScript's only role is state management and message passing.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                         │
│                                                                 │
│  ┌─────────────┐    chrome.storage     ┌──────────────────────┐ │
│  │  popup.js   │◄═══════════════════►  │  State (profiles,    │ │
│  │  popup.html │    (persist prefs)    │  theme, font)        │ │
│  │  popup.css  │                       └──────────────────────┘ │
│  └──────┬──────┘                                                │
│         │ chrome.tabs.sendMessage                               │
│         ▼                                                       │
│  ┌──────────────┐  classList.add/     ┌───────────────────────┐ │
│  │  content.js  │  setAttribute       │  <html> element       │ │
│  │              │═════════════════►   │  .neuro-adhd          │ │
│  │  (injected   │                    │  .neuro-autism         │ │
│  │   into every │                    │  .neuro-dyslexia      │ │
│  │   webpage)   │                    │  [data-neuro-theme]   │ │
│  │              │                    │  [data-neuro-font]    │ │
│  └──────┬──────┘                     └───────────────────────┘ │
│         │                                        ▲              │
│         │ chrome.runtime                         │ CSS matches  │
│         │ .sendMessage                           │              │
│         ▼                             ┌──────────┴────────────┐ │
│  ┌──────────────┐                     │  accessibility.css    │ │
│  │ background.js│                     │  (injected globally)  │ │
│  │              │                     │                       │ │
│  │  Ollama API  │                     │  html.neuro-adhd ...  │ │
│  │  proxy       │                     │  html.neuro-autism .. │ │
│  └──────┬──────┘                     │  html[data-neuro-     │ │
│         │                             │    theme] ...         │ │
│         ▼                             └───────────────────────┘ │
│  ┌──────────────┐                                               │
│  │  Ollama      │  ◄── localhost:11434                          │
│  │  (gemma3:1b) │      POST /api/generate                       │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User opens popup → toggles a profile card or selects a theme/font.
2. `popup.js` saves the preference to `chrome.storage.local`.
3. `popup.js` sends a message to `content.js` in the active tab.
4. `content.js` applies/removes CSS classes and data attributes on `<html>`.
5. `accessibility.css` (already injected) activates the matching rules.
6. On page refresh/new tab, `content.js` reads from `chrome.storage.local` at `document_start` to avoid FOUC (Flash of Unstyled Content).

For AI simplification:
1. User clicks "🤖 AI Summarize Page" in the popup.
2. `popup.js` sends `{ action: 'simplifyText' }` to `content.js`.
3. `content.js` extracts text, creates a loading panel, sends text to `background.js`.
4. `background.js` POSTs to Ollama at `http://127.0.0.1:11434/api/generate`.
5. Response is rendered in the floating panel overlay.

---

## Directory Structure

```text
Cognitive_accessibility/
├── manifest.json              # Chrome extension manifest (MV3)
├── README.md                  # This file
├── background/
│   └── background.js          # Service worker — Ollama API proxy
├── popup/
│   ├── popup.html             # Extension popup UI structure
│   ├── popup.css              # Popup styling (Catppuccin dark theme)
│   └── popup.js               # Popup logic — state management
├── scripts/
│   └── content.js             # Content script — DOM manipulation + AI panel
└── styles/
    └── accessibility.css      # ALL accessibility CSS rules + AI panel styles
```

---

## File-by-File Breakdown

### `manifest.json`

**Purpose:** Chrome extension configuration (Manifest V3).

| Field | Value | Why |
| ----- | ----- | --- |
| `manifest_version` | `3` | Required for Chrome Web Store |
| `permissions` | `activeTab`, `scripting`, `storage` | Tab messaging, CSS injection, preference persistence |
| `content_scripts.run_at` | `document_start` | Prevents FOUC — CSS is injected before first paint |
| `content_scripts.matches` | `<all_urls>` | Extension works on every website |
| `host_permissions` | `http://127.0.0.1/*`, `http://localhost/*` | Required for Ollama API calls from the background worker |

---

### `popup/popup.html`

**Purpose:** The extension popup UI that appears when clicking the extension icon.

**Structure:**

- **Header** — "Neuro-Inclusive Settings" title
- **Profile Cards** — Three toggleable cards (ADHD, Autism, Dyslexia)
- **Sensory Theme Picker** — Custom dropdown with color swatches (Sepia, Soft Dark, Muted Gray)
- **Dyslexia Font Picker** — Custom dropdown with font "A" previews (Comic Sans, Roboto, Helvetica, Nunito, OpenDyslexic, Atkinson Hyperlegible)
- **Action Buttons** — "🤖 AI Summarize Page" and "Reset to Default"

Both dropdowns are fully custom `<div>`-based components (not native `<select>`) to allow rendering of color boxes and font previews inside the options. Each has an animated SVG chevron that rotates 180° when open.

---

### `popup/popup.css`

**Purpose:** Styling for the extension popup.

**Design System:** Based on [Catppuccin Mocha](https://catppuccin.com/):

- `--bg: #1e1e2e` — Deep navy background
- `--text: #cdd6f4` — Soft blue-white text
- `--card-bg: #313244` — Card surface color
- `--accent: #89b4fa` — Blue accent for active states
- `--danger: #f38ba8` — Pink/red for destructive actions

**Key Components:**

- `.card` / `.card.active` — Profile toggle cards with accent border on active
- `.custom-select` / `.options-container` — Reusable custom dropdown component
- `.color-box` — 18×18px color swatch squares in theme picker
- `.font-preview` — Styled "A" characters rendered in each font

---

### `popup/popup.js`

**Purpose:** State management, UI interaction, and messaging to content scripts.

**State Shape (chrome.storage.local):**

```js
{
  activeProfiles: ['adhd', 'autism'],  // Array of active profile keys
  activeTheme: 'sepia',               // 'none' | 'sepia' | 'soft-dark' | 'muted-light'
  activeDyslexiaFont: 'roboto'        // 'comic-sans' | 'roboto' | 'helvetica' | 'nunito' | 'opendyslexic' | 'atkinson'
}
```

**Key Behaviors:**

- Multiple profiles can be active simultaneously (ADHD + Dyslexia, etc.)
- Turning off Autism Mode automatically resets the Sensory Theme to "Site Default" (since themes are linked to Autism Mode conceptually)
- "Reset to Default" clears all profiles, resets theme to `none`, and resets font to `comic-sans`
- All state changes are immediately sent to `content.js` via `chrome.tabs.sendMessage`

---

### `scripts/content.js`

**Purpose:** Injected into every webpage. Applies accessibility state to the DOM and handles AI simplification.

**Sections:**

#### 1. State Application (lines 1–70)

- Reads persisted state from `chrome.storage.local` at `document_start`
- Listens for real-time messages from popup
- Applies classes (`neuro-adhd`, `neuro-autism`, `neuro-dyslexia`) to `<html>`
- Sets `data-neuro-theme` and `data-neuro-font` attributes on `<html>`
- Manages the Theme Blacklist (YouTube is excluded from color themes)
- Lazily injects Google Fonts `<link>` tags only when a non-system font is selected

#### 2. Theme Blacklist (lines 15–21)

Sites where sensory color themes are completely skipped because they break the native UI:

```js
const THEME_BLACKLIST = ['youtube.com', 'www.youtube.com', 'music.youtube.com'];
```

Profiles (ADHD, Autism, Dyslexia) still work on blacklisted sites — only the color theme is skipped.

#### 3. Font Injection (lines 23–43)

Maps font keys to CDN URLs and creates `<link>` elements on demand:

| Font Key | Source | Cost |
| -------- | ------ | ---- |
| `comic-sans` | System | Zero (pre-installed) |
| `helvetica` | System | Zero (pre-installed) |
| `roboto` | Google Fonts | ~16KB |
| `nunito` | Google Fonts | ~18KB |
| `atkinson` | Google Fonts | ~14KB |
| `opendyslexic` | cdnfonts.com | ~45KB |

#### 4. AI Simplification — Phase 3 (lines 72–178)

- `extractPageText()` — Finds the main content area (`article` > `[role="main"]` > `main` > `.content` > `#content` > `body`), extracts text from `p`, `h1-h6`, `li`, `blockquote`, `figcaption`, `td` elements, filtering out snippets shorter than 10 characters and capping at 4000 characters.
- `createPanel()` — Injects a fixed-position dark panel (bottom-right, z-index `2147483647`) with a loading spinner.
- `renderResult(text)` — Replaces loading state with formatted paragraphs of simplified text.
- `renderError(errorMsg)` — Displays a styled error card with instructions to start Ollama.
- `handleSimplifyRequest()` — Orchestrates the full flow: extract → panel → API call → render.

---

### `styles/accessibility.css`

**Purpose:** The core CSS engine. All visual modifications happen here. This is the most critical and extensively iterated file in the project.

**Total:** ~345 lines of battle-tested CSS covering 7 major sections.

#### Section 1: ADHD Focus Mode (lines 4–57)

**Philosophy:** Non-destructive. NEVER hides or repositions elements. Instead:

| Sub-section | What it does |
| ----------- | ------------ |
| **(a) Kill motion** | `animation: none`, `transition: none`, `scroll-behavior: auto` on all elements |
| **(b) Dim distractions** | Sidebars, banners, footers → `opacity: 0.35` + `grayscale(80%)`. Hover restores full visibility. Uses ARIA roles (`complementary`, `banner`, `contentinfo`) for semantic targeting. |
| **(c) Hide ads** | Only specifically targeted selectors: `[class*="advert"]`, `[data-ad-slot]`, `[data-google-query-id]`, `ins.adsbygoogle`. Deliberately avoids `[class*="ad-"]` which false-positives on "header", "thread", "shadow", etc. |
| **(d) Simplify visuals** | Strips `box-shadow`, `text-shadow`, `background-image` from all elements |

**Evolution:** Originally used `display: none` on `nav`, `aside`, `footer` and forced an 800px centered column. This destroyed every site except Wikipedia. Rewritten to the current dimming approach.

#### Section 2: Autism Mode (lines 63–68)

- Kills all animations and transitions (same as ADHD, but stands alone since profiles are independent)
- Forces `background-attachment: scroll` to prevent parallax effects
- Applies `grayscale(40%) sepia(20%)` filter to images, videos, and iframes (lines 175–180)

#### Section 3: Sensory Base Themes (lines 70–173)

##### Theme Variable Definitions (lines 73–92)

| Theme | Background | Text | Border |
| ----- | ---------- | ---- | ------ |
| **Soft Dark** | `#1e1e2e` | `#cdd6f4` | `#45475a` |
| **Sepia** | `#f4ecdf` | `#333333` | `#d7c9b4` |
| **Muted Gray** | `#e5e7eb` | `#1f2937` | `#9ca3af` |

##### The Great Theme Neutralizer (lines 94–173)

This is the most technically complex and most iterated-upon section. It forces a consistent color theme onto any website, regardless of whether the site is in light mode, dark mode, or uses complex CSS frameworks.

**Step 1 — Global Strip (lines 98–106):**

```css
html[data-neuro-theme] * { background-color: transparent !important; }
```

Makes every single element transparent, strips `background-image` (removes gradients/blurs), forces `color` to the theme text color, and neutralizes `box-shadow`.

**Step 2 — Root Fill (lines 108–113):**

Applies the theme background color to `<html>` and `<body>` only. This creates the "canvas" on which all other transparent elements sit.

**Step 3 — Selective Opaque Restore (lines 115–125):**

Only table cells (`th`, `td`) and Wikipedia-specific containers (`.mw-body`, `.mw-page-container`) get their backgrounds restored. Structural containers like `<main>`, `<section>`, `<article>`, `<header>` are deliberately kept transparent because sites like YouTube use them as video player wrappers.

**Step 4 — Floating Overlay Enforcement (lines 127–143):**

Tooltips, dialogs, menus, and popups get forced backgrounds, borders, and shadows. Uses ONLY ARIA roles (`[role="dialog"]`, `[role="menu"]`, `[role="tooltip"]`, `[popover]`) — never class-name wildcards, which proved catastrophically dangerous (see [Design Lessons](#hard-won-design-lessons)).

**Step 5 — Interactive Element Restoration (lines 145–167):**

Input fields, buttons, textareas, `[contenteditable="true"]`, and `[role="textbox"]` get explicit borders and padding. This is critical for modern SPAs like ChatGPT that use invisible `<div>` elements as text inputs.

**Step 6 — Link Visibility (lines 169–173):**

Forces underlines on all links to ensure they remain identifiable after color stripping.

#### Section 4: Dyslexia Mode (lines 184–251)

**Font application is split into two scoping layers:**

1. **Global font override (lines 231–234):** `html.neuro-dyslexia * { font-family: "Comic Sans MS" ... }` — Applies the selected font to ALL text everywhere, including YouTube UI, navigation, and buttons.
2. **Content-only spacing (lines 187–201):** `letter-spacing` and `word-spacing` are applied ONLY to content elements (`p`, `li`, `dt`, `dd`, `blockquote`, `figcaption`, `td`, `th`, `[class*="description"]`, `[class*="summary"]`). This prevents tight UI containers (like YouTube video title cards) from overflowing.
3. **Scoped heading spacing (lines 204–229):** Headings (`h1`–`h6`) only receive letter/word spacing when they are children of a known content container (`article`, `main`, `[class*="article"]`, `[class*="content"]`, `[class*="post"]`). A standalone `<h1>` (like YouTube's video title) is never touched.
4. **Per-font overrides (lines 236–251):** Each font choice maps to a `data-neuro-font` attribute selector:

```css
html.neuro-dyslexia[data-neuro-font="roboto"] * { font-family: 'Roboto' ... }
```

#### Section 5: AI Panel Styles (lines 253–345)

Complete styling for the floating AI simplification panel:

- Fixed position, bottom-right, `z-index: 2147483647` (max)
- Dark theme matching the popup (Catppuccin Mocha)
- Loading state with CSS spinner animation (`neuro-spin`)
- Error state with red-tinted card and code block for instructions
- Scrollable body with `max-height: 70vh`

---

### `background/background.js`

**Purpose:** Service worker that proxies API calls to the local Ollama instance.

**Why a background script?** Content scripts cannot make `fetch()` calls to `localhost` from arbitrary web pages due to CORS and mixed content policies. The background service worker has unrestricted network access.

**API Configuration:**

- **Endpoint:** `http://127.0.0.1:11434/api/generate`
- **Model:** `gemma3:1b`
- **Streaming:** Disabled (`stream: false`) — waits for complete response
- **Prompt engineering:** Instructs the model to rewrite text at an 8th-grade reading level with short sentences and no jargon, explicitly telling it to avoid markdown entirely.

---

## Cognitive Profiles

### 1. ADHD Focus Mode

**Class:** `html.neuro-adhd`

| Feature | Implementation | Rationale |
| ------- | -------------- | --------- |
| Stop all motion | `animation: none` on `*` | Prevents attention being pulled by moving elements |
| Dim sidebars | `opacity: 0.35` + `grayscale(80%)` | Reduces peripheral visual noise without destroying layout |
| Hover-to-reveal | `:hover { opacity: 1 }` | Sidebars are accessible when needed, just not competing for attention |
| Hide ads | `display: none` on `[data-ad-slot]` etc. | Removes commercial distractions |
| Flatten visuals | `box-shadow: none`, `background-image: none` | Reduces decorative visual complexity |

### 2. Autism Mode

**Class:** `html.neuro-autism`

| Feature | Implementation | Rationale |
| ------- | -------------- | --------- |
| Stop all motion | `animation: none`, `transition: none` | Eliminates sudden visual changes that cause sensory overload |
| Stop parallax | `background-attachment: scroll` | Prevents motion sickness from fixed backgrounds |
| Desaturate media | `grayscale(40%) sepia(20%)` on img/video/iframe | Softens high-contrast visual stimuli |
| Sensory themes | Linked to the Theme Neutralizer | Allows full color environment control |

### 3. Dyslexia Mode

**Class:** `html.neuro-dyslexia`

| Feature | Implementation | Rationale |
| ------- | -------------- | --------- |
| Custom font | Applied globally via `*` | Dyslexia-friendly fonts improve letter recognition |
| Increased spacing | `letter-spacing: 0.04em`, `word-spacing: 0.08em` | Prevents letters from "crowding" together |
| Increased line height | `line-height: 1.8` | Reduces line-tracking errors |
| Left-aligned text | `text-align: left` | Overrides justified text which creates irregular word gaps |
| Scoped to content | Spacing only on `p`, `li`, headings-in-articles | Prevents layout breakage on UI elements |

---

## Sensory Base Themes

### The Great Theme Neutralizer

This is the most sophisticated CSS subsystem. It forces consistent colors onto any website by:

1. **Stripping** every element's background to transparent
2. **Painting** only `<html>` + `<body>` with the theme background
3. **Selectively restoring** opacity to floating overlays and interactive elements

This approach was arrived at after extensive iteration. See [Design Lessons](#hard-won-design-lessons) for the full history.

### Available Themes

| Theme | Mode | Hex Palette | Best For |
| ----- | ---- | ----------- | -------- |
| **Sepia** | Light | `#f4ecdf` / `#333333` / `#d7c9b4` | Reading-heavy pages, warm environment preference |
| **Soft Dark** | Dark | `#1e1e2e` / `#cdd6f4` / `#45475a` | Low-light environments, eye strain reduction |
| **Muted Gray** | Light | `#e5e7eb` / `#1f2937` / `#9ca3af` | Minimal contrast, sensory sensitivity |

### Theme Blacklist

YouTube is excluded from color theme application because:

- YouTube's video player uses HTML elements (`<main>`, overlays) as both structural containers and video UI wrappers
- The Theme Neutralizer's global `background: transparent` turns the video player invisible
- Class-name-based selectors (like `[class*="overlay"]`) match YouTube's player overlay elements
- Profiles (ADHD, Autism, Dyslexia) still work normally on YouTube

---

## Dyslexia Font System

| Font | Key | Source | Loaded From |
| ---- | --- | ------ | ----------- |
| Comic Sans MS | `comic-sans` | System font | Pre-installed |
| Roboto | `roboto` | Google Fonts | `fonts.googleapis.com` |
| Helvetica | `helvetica` | System font | Pre-installed |
| Nunito | `nunito` | Google Fonts | `fonts.googleapis.com` |
| OpenDyslexic | `opendyslexic` | CDN Fonts | `fonts.cdnfonts.com` |
| Atkinson Hyperlegible | `atkinson` | Google Fonts | `fonts.googleapis.com` |

Fonts are loaded lazily — `<link>` elements are injected into the page's `<head>` only when the user selects a non-system font AND has Dyslexia mode active. Duplicate injection is prevented by checking for existing `<link>` elements by ID.

---

## AI Text Simplification (Phase 3)

### Prerequisites

- [Ollama](https://ollama.com/download) installed and running locally
- Gemma 3 1B lightweight model downloaded: `ollama pull gemma3:1b`
- CORS permissions set so Chrome can talk to the Ollama local server (see [Troubleshooting](#troubleshooting-ollama-cors-403-forbidden))

### Flow

```text
User clicks "🤖 AI Summarize Page"
  → popup.js: sendMessage({ action: 'simplifyText' })
    → content.js: checks window.getSelection().toString()
      - If text is highlighted: Summarize only the selection (Capped at 4000 chars)
      - If NO selection: Fallback to extractPageText() 
        - Prioritizes: article > [role="main"] > main > .content > #content > body
        - Extracts from: p, h1-h6, li, blockquote, figcaption, td
        - Capped at 4000 character limit
    → content.js: createPanel(isSelection)
      - Dynamic title: "🤖 AI Simplified Selection" vs "🤖 AI Simplified Page"
      - Shows loading spinner
    → content.js: sendMessage({ action: 'fetchOllama', text })
      → background.js: POST http://127.0.0.1:11434/api/generate
        - Model: gemma3:1b
        - Prompt: Strictly enforces plain text, prevents "8th-grade" mentions, blocks conversational filler
        - stream: false
      → background.js: sendResponse({ success, text })
    → content.js: renderResult(text) — parses basic markdown, replaces spinner with paragraphs
    → OR: renderError(msg) — shows troubleshooting instructions
```

### Error Handling

- If Ollama is not running: Shows error panel with `ollama run gemma3:1b` command
- If not enough text on page: Alert popup (minimum 50 characters)
- If `chrome.runtime.lastError`: Displays the raw error in the panel

---

## Popup UI Design

The popup uses a **Catppuccin Mocha** dark theme with custom-built dropdown components:

- **Profile Cards:** Vertical stack of toggleable cards. Active state shown with blue accent border and subtle blue tint background.
- **Theme Dropdown:** Custom `<div>`-based dropdown. Each option shows a 18×18px color swatch box rendered in the actual theme color. Has an animated SVG chevron that rotates 180° when open.
- **Font Dropdown:** Same component pattern. Each option shows an "A" character rendered in the corresponding font at `1.1rem` bold, colored with the accent blue.
- **Action Buttons:** Primary (blue, filled) for AI, Secondary (red border, transparent) for Reset.

Both dropdowns close automatically when clicking outside them.

---

## Hard-Won Design Lessons

These are critical learnings from extensive debugging across Wikipedia, YouTube, ChatGPT, and GitHub:

### 1. Never use `display: none` on structural elements

**What happened:** ADHD mode originally hid `<nav>`, `<aside>`, `<footer>`, and forced `max-width: 800px` on `<body>`. This worked on Wikipedia but destroyed every other site.
**Fix:** Dim elements to `opacity: 0.35` + `grayscale(80%)` instead. Hover-to-reveal restores full visibility.

### 2. Class-name wildcards are extremely dangerous

**What happened:** `[class*="ad-"]` was used to hide ads. It matched "he**ad-**er", "thre**ad-**container", "sh**ad-**ow", "p**ad-**ding" — hiding ChatGPT's entire conversation thread.
**Fix:** Only use specific, narrow selectors: `[class*="advert"]`, `[data-ad-slot]`, `ins.adsbygoogle`.

### 3. Never make structural containers opaque

**What happened:** `<main>`, `<section>`, `<article>` were given opaque backgrounds to ensure text readability. YouTube's video player lives inside `<main>` — it was painted over with a solid color block.
**Fix:** Only `<html>` + `<body>` get the theme background. All other containers stay transparent. Text readability comes from `color: var(--neuro-text)` being set globally.

### 4. ARIA roles > class name wildcards for floating elements

**What happened:** `[class*="overlay"]` was used to style tooltips/dropdowns. YouTube's video player uses classes like `ytp-overlay`. The player was painted opaque.
**Fix:** Use ONLY `[role="dialog"]`, `[role="menu"]`, `[role="tooltip"]`, `[popover]`. These are semantic and unambiguous.

### 5. Font is global, spacing is scoped

**What happened:** `html.neuro-dyslexia *` applied `font-family`, `letter-spacing`, AND `word-spacing` to every element. YouTube video titles overflowed their fixed-width cards.
**Fix:** Font-family applies to `*` (safe — fonts don't change layout dimensions). Spacing applies ONLY to content elements (`p`, `li`, etc.) and headings-inside-articles.

### 6. CSS `body` font inheritance is a footgun

**What happened:** `html.neuro-dyslexia body { font-family: "Comic Sans" }` caused every element on every site to inherit Comic Sans through CSS cascade, even when only `*` was explicitly targeted.
**Resolution:** Use `html.neuro-dyslexia *` directly. While it looks functionally identical, using `*` makes the override explicit rather than relying on inheritance, which is easier to debug.

---

## Known Limitations

| Issue | Root Cause | Status |
| ----- | ---------- | ------ |
| Sensory themes break YouTube | Theme Neutralizer strips backgrounds from video player containers | **Mitigated** — YouTube is blacklisted from themes |
| Some React portal popups (GitHub) may lack borders | Portals render outside `<main>` and may not have ARIA roles | Partially addressed with `[popover]` selector |
| Theme Neutralizer makes some elements invisible | Elements that used `background-image` for visual function (not decoration) lose their content | Known limitation of CSS-only approach |
| AI simplification requires local Ollama | No cloud API fallback | By design — privacy-first architecture |
| Text extraction is heuristic | `article > main > body` priority may miss content in complex layouts | Will be improved in future iterations |

---

## Installation & Setup

### Extension Installation

1. Clone or download this repository.
2. Open Chrome → navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in top-right).
4. Click **Load unpacked** → select the `Cognitive_accessibility` folder.
5. The extension icon appears in the toolbar.

### Ollama Setup (for AI Simplification)

1. Download Ollama for Windows from [ollama.com/download](https://ollama.com/download).
2. Install the application.
3. Open a **new** command prompt and download the fast model:
   ```cmd
   ollama pull gemma3:1b
   ```
4. *Crucial:* Once loaded, the extension can call the local API automatically, **but on Windows, Ollama blocks browser extensions by default from calling it natively.** Read the troubleshooting section directly below for the fix.

### Troubleshooting Ollama CORS (403 Forbidden)

If you press "🤖 AI Summarize Page" and instantly get an `HTTP error! status: 403` or a `Failed to fetch` error, it is because Ollama is actively rejecting the Chrome extension's web origin network requests.

**The Fix:** You must start Ollama and tell it to accept requests from all origins (`*`).

On Windows, follow these exact steps:

1. Look in the bottom-right corner of your screen (the Windows System Tray), click the up-arrow `^`, find the **llama head icon**, right-click it, and select **"Quit Ollama"**. (Ollama always silently runs in the background. If you skip this step, it will stay locked!).
2. Open a **new** Command Prompt window.
3. Run this exact command to start an "unlocked" instance of Ollama:
   ```cmd
   set OLLAMA_ORIGINS=* && "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
   ```
   *(Note: The terminal will pause and say "Listening on 127.0.0.1:11434". Keep this terminal open!)*
4. Go back to Chrome and go to `chrome://extensions`.
5. Click the **Refresh 🔄** circle icon on the Neuro-Inclusive Web Interface card.
6. Try a new active web page, click the button, and watch it generate correctly.

*(Note: The easiest way to permanently fix this is applying the `OLLAMA_ORIGINS` permanently inside of your Environment Variables via the Windows settings).*

---

## Development Workflow

1. Edit files in the `Cognitive_accessibility/` directory.
2. Go to `chrome://extensions`.
3. Click the **Refresh 🔄** icon on the extension card.
4. Reload the target webpage (or open a new tab).
5. Test changes.

**Important:** CSS changes in `accessibility.css` always require an extension refresh. Content script changes also require a page reload after the extension refresh.

---

## License

This project is developed as part of an academic research initiative on cognitive accessibility for neurodivergent web users.
