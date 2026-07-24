import {
  getLocalConfig,
  saveLocalConfig,
  testJiraConnection,
  testGroqConnection,
  type AppConfig,
} from '../api';

/**
 * Settings page — JIRA & Groq configuration with connection testing.
 */

// ── DOM Helpers ──

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function showSettingsToast(type: 'success' | 'error', message: string) {
  const toast = $('toast');
  const icon = $('toast-icon');
  const msg = $('toast-message');

  toast.className = `toast ${type}`;
  icon.textContent = type === 'success' ? '✅' : '❌';
  msg.textContent = message;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 5000);
}

function setButtonLoading(btn: HTMLElement, loading: boolean) {
  const loader = btn.querySelector('.btn-loader');
  if (loading) {
    btn.classList.add('loading');
    btn.setAttribute('disabled', 'true');
    if (loader) loader.classList.remove('hidden');
  } else {
    btn.classList.remove('loading');
    btn.removeAttribute('disabled');
    if (loader) loader.classList.add('hidden');
  }
}

function showTestResult(elementId: string, success: boolean, message: string) {
  const el = $(elementId);
  el.className = `test-result ${success ? 'success' : 'error'}`;
  el.textContent = `${success ? '✅' : '❌'} ${message}`;
  el.classList.remove('hidden');
}

// ── Getters ──

function getJiraFormValues() {
  return {
    projectKey: ($('jira-project') as HTMLInputElement).value.trim(),
    email: ($('jira-email') as HTMLInputElement).value.trim(),
    apiToken: ($('jira-token') as HTMLInputElement).value.trim(),
    baseUrl: ($('jira-url') as HTMLInputElement).value.trim(),
    issueType: ($('jira-issue-type') as HTMLInputElement).value.trim(),
  };
}

function getGroqFormValues() {
  return {
    apiKey: ($('groq-key') as HTMLInputElement).value.trim(),
  };
}

// ── Load saved settings ──

function loadSettings() {
  try {
    const data = getLocalConfig();
    const { jira, groq } = data;

    ($('jira-project') as HTMLInputElement).value = jira.projectKey || '';
    ($('jira-email') as HTMLInputElement).value = jira.email || '';
    ($('jira-token') as HTMLInputElement).value = jira.apiToken || '';
    ($('jira-url') as HTMLInputElement).value = jira.baseUrl || '';
    ($('jira-issue-type') as HTMLInputElement).value = jira.issueType || '';
    ($('groq-key') as HTMLInputElement).value = groq.apiKey || '';
  } catch (err) {
    console.warn('Could not load settings:', err);
  }
}

// ── Event Handlers ──

function handleSaveSettings() {
  const saveBtn = $('save-settings-btn');
  setButtonLoading(saveBtn, true);

  try {
    const payload: AppConfig = {
      jira: getJiraFormValues(),
      groq: getGroqFormValues(),
    };

    if (payload.jira.baseUrl.includes('test.atlassian.net')) {
      showSettingsToast('error', "Cannot save default JIRA URL. Please replace 'test.atlassian.net' with your own Jira site URL.");
      return;
    }

    saveLocalConfig(payload);
    showSettingsToast('success', 'Settings saved successfully!');
    
    // Auto-close modal after successful save
    setTimeout(() => {
      $('settings-modal')?.classList.add('hidden');
    }, 1500);

  } catch (err: any) {
    showSettingsToast('error', err.message || 'Failed to save settings');
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

async function handleTestJira() {
  const testBtn = $('test-jira-btn');
  setButtonLoading(testBtn, true);
  $('jira-test-result').classList.add('hidden');

  try {
    const jiraConfig = getJiraFormValues();

    if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
      showTestResult('jira-test-result', false, 'Please fill in URL, Email, and API Token');
      return;
    }

    if (jiraConfig.baseUrl.includes('test.atlassian.net')) {
      showTestResult(
        'jira-test-result',
        false,
        "You are using the placeholder 'test.atlassian.net'. Please replace it with your own actual Jira URL."
      );
      return;
    }

    const result = await testJiraConnection(jiraConfig);

    if (result.success) {
      const msg = `Connected successfully! Authenticated as: ${result.displayName || 'User'}`;
      showTestResult('jira-test-result', true, msg);
    } else {
      showTestResult('jira-test-result', false, result.error || 'Connection failed');
    }
  } catch (err: any) {
    showTestResult('jira-test-result', false, err.message || 'Connection test failed');
  } finally {
    setButtonLoading(testBtn, false);
  }
}

async function handleTestGroq() {
  const testBtn = $('test-groq-btn');
  setButtonLoading(testBtn, true);
  $('groq-test-result').classList.add('hidden');

  try {
    const groqConfig = getGroqFormValues();

    if (!groqConfig.apiKey) {
      showTestResult('groq-test-result', false, 'Please enter your Groq API Key');
      return;
    }

    const result = await testGroqConnection(groqConfig);

    if (result.success) {
      showTestResult('groq-test-result', true, 'Groq connection successful! Llama Scout model is accessible.');
    } else {
      showTestResult('groq-test-result', false, result.error || 'Connection failed');
    }
  } catch (err: any) {
    showTestResult('groq-test-result', false, err.message || 'Connection test failed');
  } finally {
    setButtonLoading(testBtn, false);
  }
}

// ── Initialize ──

export function initSettingsPage() {
  const saveBtn = $('save-settings-btn');
  const testJiraBtn = $('test-jira-btn');
  const testGroqBtn = $('test-groq-btn');

  saveBtn.addEventListener('click', handleSaveSettings);
  testJiraBtn.addEventListener('click', handleTestJira);
  testGroqBtn.addEventListener('click', handleTestGroq);

  loadSettings();
  
  // Re-load settings whenever the modal is opened
  const btnOpenSettings = $('btn-open-settings');
  if (btnOpenSettings) {
    btnOpenSettings.addEventListener('click', loadSettings);
  }
}
