document.addEventListener('DOMContentLoaded', async () => {
  const cards = document.querySelectorAll('.card');
  const btnReset = document.getElementById('btn-reset');
  const btnSimplify = document.getElementById('btn-simplify');
  const themeSelector = document.getElementById('theme-selector');
  const fontSelector = document.getElementById('font-selector');

  // Load saved state
  const data = await chrome.storage.local.get(['activeProfiles', 'activeTheme', 'activeDyslexiaFont']);
  const activeProfiles = data.activeProfiles || [];
  const activeTheme = data.activeTheme || 'none';
  const activeDyslexiaFont = data.activeDyslexiaFont || 'comic-sans';

  // ── Theme dropdown helpers ──────────────────────────────────────────────
  const themeSelectedContent = themeSelector.querySelector('.selected-content');
  function updateThemeUI(value) {
    const opt = themeSelector.querySelector(`.option[data-value="${value}"]`);
    if (opt && themeSelectedContent) themeSelectedContent.innerHTML = opt.innerHTML;
  }
  updateThemeUI(activeTheme);

  // ── Font dropdown helpers ────────────────────────────────────────────────
  const fontSelectedOption = document.getElementById('font-selected-option');
  const fontSelectedContent = fontSelectedOption.querySelector('.selected-content');
  function updateFontUI(value) {
    const opt = fontSelector.querySelector(`.option[data-value="${value}"]`);
    if (opt && fontSelectedContent) fontSelectedContent.innerHTML = opt.innerHTML;
  }
  updateFontUI(activeDyslexiaFont);

  // ── Restore active profile cards ─────────────────────────────────────────
  activeProfiles.forEach(profile => {
    document.querySelector(`[data-profile="${profile}"]`)?.classList.add('active');
  });

  // ── Profile card clicks ──────────────────────────────────────────────────
  cards.forEach(card => {
    card.addEventListener('click', async () => {
      card.classList.toggle('active');
      const profile = card.dataset.profile;
      let { activeProfiles = [], activeTheme = 'none', activeDyslexiaFont = 'comic-sans' } =
        await chrome.storage.local.get(['activeProfiles', 'activeTheme', 'activeDyslexiaFont']);

      if (card.classList.contains('active')) {
        if (!activeProfiles.includes(profile)) activeProfiles.push(profile);
      } else {
        activeProfiles = activeProfiles.filter(p => p !== profile);
        if (profile === 'autism') {
          activeTheme = 'none';
          updateThemeUI('none');
          await chrome.storage.local.set({ activeTheme: 'none' });
        }
      }

      await chrome.storage.local.set({ activeProfiles });
      notifyContentScript(activeProfiles, activeTheme, activeDyslexiaFont);
    });
  });

  // ── Theme dropdown interaction ───────────────────────────────────────────
  themeSelector.querySelector('.selected-option').addEventListener('click', () => {
    themeSelector.classList.toggle('open');
  });
  themeSelector.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', async () => {
      const theme = opt.dataset.value;
      updateThemeUI(theme);
      themeSelector.classList.remove('open');
      await chrome.storage.local.set({ activeTheme: theme });
      let { activeProfiles = [], activeDyslexiaFont = 'comic-sans' } =
        await chrome.storage.local.get(['activeProfiles', 'activeDyslexiaFont']);
      notifyContentScript(activeProfiles, theme, activeDyslexiaFont);
    });
  });

  // ── Font dropdown interaction ────────────────────────────────────────────
  fontSelectedOption.addEventListener('click', () => {
    fontSelector.classList.toggle('open');
  });
  fontSelector.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', async () => {
      const font = opt.dataset.value;
      updateFontUI(font);
      fontSelector.classList.remove('open');
      await chrome.storage.local.set({ activeDyslexiaFont: font });
      let { activeProfiles = [], activeTheme = 'none' } =
        await chrome.storage.local.get(['activeProfiles', 'activeTheme']);
      notifyContentScript(activeProfiles, activeTheme, font);
    });
  });

  // ── Close any open dropdown on outside click ─────────────────────────────
  document.addEventListener('click', (e) => {
    if (!themeSelector.contains(e.target)) themeSelector.classList.remove('open');
    if (!fontSelector.contains(e.target)) fontSelector.classList.remove('open');
  });

  // ── Reset button ─────────────────────────────────────────────────────────
  btnReset.addEventListener('click', async () => {
    cards.forEach(c => c.classList.remove('active'));
    updateThemeUI('none');
    updateFontUI('comic-sans');
    await chrome.storage.local.set({ activeProfiles: [], activeTheme: 'none', activeDyslexiaFont: 'comic-sans' });
    notifyContentScript([], 'none', 'comic-sans');
  });

  // ── Simplify button ──────────────────────────────────────────────────────
  btnSimplify.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'simplifyText' });
    });
  });
});

function notifyContentScript(profiles, theme, font) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { profiles, theme, font });
    }
  });
}
