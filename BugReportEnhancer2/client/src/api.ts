/**
 * Typed API client for Bug Report Enhancer backend.
 */

const API_BASE = '/api';
const LOCAL_STORAGE_KEY = 'bugReportEnhancerSettings';

// ── Types ──

export interface AppConfig {
  jira: {
    projectKey: string;
    email: string;
    apiToken: string;
    baseUrl: string;
    issueType: string;
  };
  groq: {
    apiKey: string;
  };
}

export interface TestConnectionResult {
  success: boolean;
  displayName?: string;
  issueTypes?: Array<{ id: string; name: string }>;
  message?: string;
  error?: string;
}

export interface AnalyzeResult {
  success: boolean;
  analysis: string;
  fileName: string;
  fileSize: number;
}

export interface JiraCreateResult {
  success: boolean;
  issueKey: string;
  issueUrl: string;
  message: string;
}

// ── Local Storage Management ──

export function getLocalConfig(): AppConfig {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse local config', e);
    }
  }
  return {
    jira: { projectKey: '', email: '', apiToken: '', baseUrl: '', issueType: '' },
    groq: { apiKey: '' }
  };
}

export function saveLocalConfig(config: AppConfig): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
}

// ── API Functions ──

export async function testJiraConnection(jiraConfig: AppConfig['jira']): Promise<TestConnectionResult> {
  const res = await fetch(`${API_BASE}/settings/test-jira`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: { jira: jiraConfig } }),
  });
  return res.json();
}

export async function testGroqConnection(groqConfig: AppConfig['groq']): Promise<TestConnectionResult> {
  const res = await fetch(`${API_BASE}/settings/test-groq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: { groq: groqConfig } }),
  });
  return res.json();
}

export async function analyzeScreenshot(file: File, notes: string, config: AppConfig): Promise<AnalyzeResult> {
  const formData = new FormData();
  formData.append('screenshot', file);
  formData.append('notes', notes);
  formData.append('config', JSON.stringify(config)); // Pass credentials

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(err.error || 'Failed to analyze screenshot');
  }
  return res.json();
}

export async function createJiraTicket(
  file: File,
  summary: string,
  description: string,
  config: AppConfig
): Promise<JiraCreateResult> {
  const formData = new FormData();
  formData.append('screenshot', file);
  formData.append('summary', summary);
  formData.append('description', description);
  formData.append('config', JSON.stringify(config)); // Pass credentials

  const res = await fetch(`${API_BASE}/jira/create`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create ticket' }));
    throw new Error(err.error || 'Failed to create JIRA ticket');
  }
  return res.json();
}
