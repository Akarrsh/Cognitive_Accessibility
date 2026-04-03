// Apply initial state before page fully paints to avoid FOUC
chrome.storage.local.get('activeProfile', (data) => {
  if (data.activeProfile) {
    applyProfile(data.activeProfile);
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.profile) {
    applyProfile(request.profile);
  } else if (request.action === 'simplifyText') {
    handleSimplifyRequest();
  }
});

function applyProfile(profileName) {
  // Clear all neuro profiles first
  document.documentElement.classList.remove('neuro-adhd', 'neuro-autism', 'neuro-dyslexia');
  
  if (profileName !== 'reset') {
    document.documentElement.classList.add(`neuro-${profileName}`);
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
