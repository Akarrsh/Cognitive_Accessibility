// Apply initial state before page fully paints to avoid FOUC
chrome.storage.local.get(['activeProfiles', 'activeTheme'], (data) => {
  if (data.activeProfiles || data.activeTheme) {
    applyState(data.activeProfiles || [], data.activeTheme || 'none');
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.profiles !== undefined || request.theme !== undefined) {
    applyState(request.profiles, request.theme);
  } else if (request.action === 'simplifyText') {
    handleSimplifyRequest();
  }
});

function applyState(profileNames, themeName) {
  // Clear all neuro profiles first
  document.documentElement.classList.remove('neuro-adhd', 'neuro-autism', 'neuro-dyslexia');
  
  // Clear previous themes
  document.documentElement.removeAttribute('data-neuro-theme');
  
  // Support multiple toggled modes
  if (Array.isArray(profileNames)) {
    profileNames.forEach(profileName => {
      document.documentElement.classList.add(`neuro-${profileName}`);
    });
  }

  // Apply theme if not none
  if (themeName && themeName !== 'none') {
    document.documentElement.setAttribute('data-neuro-theme', themeName);
  }
}

async function handleSimplifyRequest() {
  // Very simplistic element grabbing for Phase 1
  // Will be improved in Phase 2
  const article = document.querySelector('article') || document.querySelector('main') || document.body;
  
  // Just a placeholder alert for now to ensure wiring works
  // Phase 3 will replace this with an actual API call
  alert("AI simplification triggered! (Backend integration pending in Phase 3)");
}
