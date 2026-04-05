// Apply initial state before page fully paints to avoid FOUC
chrome.storage.local.get(['activeProfiles', 'activeTheme', 'activeDyslexiaFont'], (data) => {
  applyState(data.activeProfiles || [], data.activeTheme || 'none', data.activeDyslexiaFont || 'comic-sans');
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.profiles !== undefined || request.theme !== undefined || request.font !== undefined) {
    applyState(request.profiles, request.theme, request.font);
  } else if (request.action === 'simplifyText') {
    handleSimplifyRequest();
  }
});

// Sites where sensory color themes are skipped to avoid breaking native media players
const THEME_BLACKLIST = [
  'youtube.com',
  'www.youtube.com',
  'music.youtube.com',
];
const isThemeBlacklisted = THEME_BLACKLIST.some(domain => location.hostname === domain);

// Maps font key → Google Fonts URL (null = system font, no loading needed)
const FONT_URLS = {
  'comic-sans':   null,
  'helvetica':    null,
  'roboto':       'https://fonts.googleapis.com/css2?family=Roboto&display=swap',
  'nunito':       'https://fonts.googleapis.com/css2?family=Nunito&display=swap',
  'atkinson':     'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible&display=swap',
  'opendyslexic': 'https://fonts.cdnfonts.com/css/opendyslexic',
};

function injectFontLink(fontKey) {
  const url = FONT_URLS[fontKey];
  if (!url) return; // system font, nothing to inject
  const existingId = `neuro-font-link-${fontKey}`;
  if (document.getElementById(existingId)) return; // already loaded
  const link = document.createElement('link');
  link.id = existingId;
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

function applyState(profileNames, themeName, fontName) {
  // Clear all neuro profiles first
  document.documentElement.classList.remove('neuro-adhd', 'neuro-autism', 'neuro-dyslexia');

  // Clear previous themes and fonts
  document.documentElement.removeAttribute('data-neuro-theme');
  document.documentElement.removeAttribute('data-neuro-font');

  // Apply profiles
  if (Array.isArray(profileNames)) {
    profileNames.forEach(profileName => {
      document.documentElement.classList.add(`neuro-${profileName}`);
    });
  }

  // Apply sensory color theme (skip on blacklisted sites)
  if (themeName && themeName !== 'none' && !isThemeBlacklisted) {
    document.documentElement.setAttribute('data-neuro-theme', themeName);
  }

  // Apply dyslexia font if dyslexia mode is active
  if (Array.isArray(profileNames) && profileNames.includes('dyslexia') && fontName && fontName !== 'comic-sans') {
    injectFontLink(fontName);
    document.documentElement.setAttribute('data-neuro-font', fontName);
  }
}

// ── AI Simplification (Phase 3) ────────────────────────────────────────────────

function extractPageText() {
  // Try to find the main content area, fall back to body
  const root = document.querySelector('article')
    || document.querySelector('[role="main"]')
    || document.querySelector('main')
    || document.querySelector('.content')
    || document.querySelector('#content')
    || document.body;

  // Grab only visible text from paragraphs, headings, and list items
  const selectors = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, td';
  const elements = root.querySelectorAll(selectors);
  
  let text = '';
  elements.forEach(el => {
    const t = el.innerText?.trim();
    if (t && t.length > 10) text += t + '\n\n';
  });

  // Cap at ~4000 chars to avoid overwhelming the model
  return text.substring(0, 4000);
}

function createPanel() {
  // Remove existing panel if present
  const existing = document.getElementById('neuro-ai-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'neuro-ai-panel';
  panel.innerHTML = `
    <div class="neuro-ai-panel-header">
      <span>🤖 AI Simplified Version</span>
      <button id="neuro-ai-close" title="Close">&times;</button>
    </div>
    <div class="neuro-ai-panel-body" id="neuro-ai-body">
      <div class="neuro-ai-loading">
        <div class="neuro-ai-spinner"></div>
        <p>Simplifying page content…</p>
        <p style="font-size: 0.8rem; opacity: 0.6;">Waiting for local Ollama (gemma3:1b)</p>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById('neuro-ai-close').addEventListener('click', () => {
    panel.remove();
  });

  return panel;
}

function renderResult(text) {
  const body = document.getElementById('neuro-ai-body');
  if (!body) return;
  
  // Basic markdown → HTML conversion
  function md(str) {
    return str
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')   // **bold**
      .replace(/\*(.+?)\*/g, '<em>$1</em>')               // *italic*
      .replace(/`(.+?)`/g, '<code style="background:#313244;padding:1px 5px;border-radius:3px;font-size:0.85em;">$1</code>') // `code`
      .replace(/^[-•]\s+/gm, '• ');                        // bullet points
  }

  // Convert line breaks to paragraphs
  const paragraphs = text.split(/\n+/).filter(p => p.trim());
  body.innerHTML = paragraphs.map(p => `<p>${md(p)}</p>`).join('');
}

function renderError(errorMsg) {
  const body = document.getElementById('neuro-ai-body');
  if (!body) return;
  
  body.innerHTML = `
    <div class="neuro-ai-error">
      <p><strong>⚠️ Could not connect to Ollama</strong></p>
      <p>${errorMsg}</p>
      <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 12px;">
        Make sure Ollama is running locally:<br>
        <code>ollama run gemma3:1b</code>
      </p>
    </div>
  `;
}

async function handleSimplifyRequest() {
  const pageText = extractPageText();
  
  if (!pageText || pageText.length < 50) {
    alert('Not enough readable text found on this page to simplify.');
    return;
  }

  // Show the panel with loading state
  createPanel();

  // Send text to background.js → Ollama
  chrome.runtime.sendMessage(
    { action: 'fetchOllama', text: pageText },
    (response) => {
      if (chrome.runtime.lastError) {
        renderError(chrome.runtime.lastError.message);
        return;
      }
      if (response && response.success) {
        renderResult(response.text);
      } else {
        renderError(response?.error || 'Unknown error occurred.');
      }
    }
  );
}
