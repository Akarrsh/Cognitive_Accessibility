# Neuro-Inclusive Web Interface
**Participant:** Akarsh Jaiswal
**Event:** The Big Code 2026

**Project Links & Resources**
*   **GitHub Repository:** [https://github.com/Akarrsh/Cognitive_Accessibility](https://github.com/Akarrsh/Cognitive_Accessibility)
*   **Full Technical README:** [https://github.com/Akarrsh/Cognitive_Accessibility/blob/main/README.md](https://github.com/Akarrsh/Cognitive_Accessibility/blob/main/README.md)

---

## 1. Problem Statement
The modern web is an innately hostile environment for neurodivergent users:
*   **ADHD Users** face crippling distraction from auto-playing video, floating advertisements, and dense peripheral sidebars.
*   **Autistic Users** often experience severe sensory overload due to harsh contrast, unpredictable color palettes, and parallax motion.
*   **Dyslexic Users** struggle with standard web typography, tight line spacing, and justified text alignment, slowing down cognitive processing.

Current solutions are fragmented. Users are forced to patch together ad-blockers, font changers, and destructive "reader modes" that frequently break modern complex web applications. 

## 2. My Solution
The **Neuro-Inclusive Web Interface** is a lightweight, non-destructive Chrome Extension (Manifest V3) that adapts any website directly in the DOM. It empowers users to apply CSS-driven sensory profiles, configurable layouts, and local-AI text simplification.

### The Three Pillars of Cognitive Accessibility:
1.  **ADHD Focus Mode:** A "dim, don't destroy" philosophy. Instead of breaking webpage structures by deleting sidebars, it applies `opacity: 0.35` and heavy grayscale to peripheral elements. When hovered, they reveal instantly. It also strictly targets and removes commercial advertisements.
2.  **Autism Sensory Mode:** Kills all sudden DOM animations, parallax scroll effects, and desaturates media (images/iframes) to blunt harsh visual stimuli. 
3.  **Dyslexia Typography:** Injects readable fonts (like OpenDyslexic and Atkinson Hyperlegible) while applying scoped word/letter spacing *only* to main content containers, preventing destructive layout breaks on UI components.

---

## 3. The Sensory Theme Engine
A massive technical hurdle was ensuring the extension forces a consistent sensory color space across complex sites (like GitHub or ChatGPT) without overwriting critical UI components.

To solve this, I engineered the **Theme Neutralizer**. It is a cascading CSS architecture that:
*   Strips `background-images`, `box-shadows`, and recursive `background-color` attributes off every single element on the page.
*   Applies a uniform background color (Sepia, Soft Dark, or Muted Gray) to the target `<body>`.
*   Uses strict ARIA role selectors (e.g., `[role="menu"]`, `[role="dialog"]`) to selectively restore opacity and borders to floating interactive elements.

*Important Note: Certain highly complex media players, such as YouTube, required blacklisting from the color engine to ensure core video functionality wasn't compromised.*

---

## 4. Local AI Text Simplification (Phase 3)
Neurodivergent users often struggle with dense academic language or heavy corporate jargon. To solve this, I integrated **Ollama.**

**How it works (Privacy First):**
*   **Contextual Extraction:** The user can either highlight a difficult paragraph or let the content script heuristically extract the webpage's main `<article>` body.
*   **Local Processing:** The extension uses a Service Worker (`background.js`) to bypass restrictive CORS policies, sending the text to a local `http://127.0.0.1:11434` Ollama instance natively running the fast **Google Gemma 3 (1B)** model.
*   **Zero-Cloud Exfiltration:** Because the LLM runs locally on the user's CPU, sensitive web data is never sent to a corporate cloud API. 

The LLM is strictly prompted to return facts in 8th-grade-level plain text, which is parsed and cleanly injected into a floating non-destructive panel on the user's screen.

---

## 5. Summary & Technical Stack
The Neuro-Inclusive Web Interface proves that deep web accessibility does not require bloated screen readers or destructive DOM parsers. 

**Stack:**
*   **Core:** Vanilla JavaScript, HTML, CSS (Chrome Manifest V3 API)
*   **State Management:** `chrome.storage.local` to persist complex theme states immediately before FOUC (Flash of Unstyled Content).
*   **AI Backend:** Ollama (Local runtime), Gemma 3:1b model.

This project delivers a faster, cleaner, and vastly more predictable internet tailored entirely to the cognitive realities of its users.
