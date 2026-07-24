import './styles/index.css';
import { initBugReportPage } from './pages/bugReport';
import { initSettingsPage } from './pages/settings';

/**
 * Main entry point — initializes the app.
 */

// ── DOM Helpers ──
function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function initSettingsModal() {
  const settingsModal = $('settings-modal');
  const btnOpen = $('btn-open-settings');
  const btnClose = $('btn-close-settings');
  
  if (!settingsModal || !btnOpen || !btnClose) return;

  btnOpen.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  btnClose.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  // Close on outside click
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });
}

// ── Initialize app on DOM ready ──
document.addEventListener('DOMContentLoaded', () => {
  initSettingsModal();
  initBugReportPage();
  initSettingsPage();
});
