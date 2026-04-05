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

async function handleSimplifyRequest() {
  const article = document.querySelector('article') || document.querySelector('main') || document.body;
  alert("AI simplification triggered! (Backend integration pending in Phase 3)");
}
