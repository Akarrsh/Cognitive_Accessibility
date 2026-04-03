document.addEventListener('DOMContentLoaded', async () => {
  const cards = document.querySelectorAll('.card');
  const btnReset = document.getElementById('btn-reset');
  const btnSimplify = document.getElementById('btn-simplify');

  // Load saved state
  const { activeProfile } = await chrome.storage.local.get('activeProfile');
  if (activeProfile) {
    document.querySelector(`[data-profile="${activeProfile}"]`)?.classList.add('active');
  }

  // Handle profile clicks
  cards.forEach(card => {
    card.addEventListener('click', async () => {
      // Manage active UX
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const profile = card.dataset.profile;
      await chrome.storage.local.set({ activeProfile: profile });

      notifyContentScript(profile);
    });
  });

  // Handle reset
  btnReset.addEventListener('click', async () => {
    cards.forEach(c => c.classList.remove('active'));
    await chrome.storage.local.remove('activeProfile');
    notifyContentScript('reset');
  });

  // Handle Simplify command
  btnSimplify.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'simplifyText' });
    });
  });
});

function notifyContentScript(profile) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { profile });
    }
  });
}
