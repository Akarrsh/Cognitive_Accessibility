document.addEventListener('DOMContentLoaded', async () => {
  const cards = document.querySelectorAll('.card');
  const btnReset = document.getElementById('btn-reset');
  const btnSimplify = document.getElementById('btn-simplify');
  const themeSelector = document.getElementById('theme-selector');

  // Load saved state - now handles multiple profiles and theme
  const data = await chrome.storage.local.get(['activeProfiles', 'activeTheme']);
  const activeProfiles = data.activeProfiles || [];
  const activeTheme = data.activeTheme || 'none';
  
  // Update UI helper
  const selectedOptionUI = themeSelector.querySelector('.selected-option');
  const selectedContentUI = themeSelector.querySelector('.selected-content');
  function updateDropdownUI(themeValue) {
    const chosenOption = themeSelector.querySelector(`.option[data-value="${themeValue}"]`);
    if (chosenOption && selectedContentUI) {
      selectedContentUI.innerHTML = chosenOption.innerHTML;
    }
  }
  
  updateDropdownUI(activeTheme);

  activeProfiles.forEach(profile => {
    document.querySelector(`[data-profile="${profile}"]`)?.classList.add('active');
  });

  // Handle profile clicks
  cards.forEach(card => {
    card.addEventListener('click', async () => {
      // Toggle active UX for multiple selection
      card.classList.toggle('active');

      const profile = card.dataset.profile;
      let { activeProfiles = [], activeTheme = 'none' } = await chrome.storage.local.get(['activeProfiles', 'activeTheme']);
      
      if (card.classList.contains('active')) {
        if (!activeProfiles.includes(profile)) activeProfiles.push(profile);
      } else {
        activeProfiles = activeProfiles.filter(p => p !== profile);
        
        // If Autism mode is turned off, automatically disable any linked sensory color themes
        if (profile === 'autism') {
          activeTheme = 'none';
          updateDropdownUI('none');
          await chrome.storage.local.set({ activeTheme: 'none' });
        }
      }

      await chrome.storage.local.set({ activeProfiles });
      notifyContentScript(activeProfiles, activeTheme);
    });
  });

  // Handle custom theme changes
  selectedOptionUI.addEventListener('click', () => {
    themeSelector.classList.toggle('open');
  });

  themeSelector.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', async () => {
      const theme = opt.dataset.value;
      updateDropdownUI(theme);
      themeSelector.classList.remove('open');
      
      await chrome.storage.local.set({ activeTheme: theme });
      let { activeProfiles = [] } = await chrome.storage.local.get('activeProfiles');
      notifyContentScript(activeProfiles, theme);
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!themeSelector.contains(e.target)) {
      themeSelector.classList.remove('open');
    }
  });

  // Handle reset
  btnReset.addEventListener('click', async () => {
    cards.forEach(c => c.classList.remove('active'));
    updateDropdownUI('none');
    await chrome.storage.local.set({ activeProfiles: [], activeTheme: 'none' });
    notifyContentScript([], 'none');
  });

  // Handle Simplify command
  btnSimplify.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'simplifyText' });
    });
  });
});

function notifyContentScript(profiles, theme) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { profiles, theme });
    }
  });
}
