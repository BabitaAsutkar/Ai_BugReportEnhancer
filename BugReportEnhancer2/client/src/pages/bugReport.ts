import { analyzeScreenshot, createJiraTicket, getLocalConfig } from '../api';

/**
 * Bug Report page — handles drag & drop, wizard steps, analysis, and JIRA push.
 */

let selectedFile: File | null = null;
let analysisText: string = '';
let suggestedTitle: string = '';

// ── DOM Helpers ──

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function showToast(type: 'success' | 'error', message: string) {
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

// ── Wizard Navigation ──

function goToStep(step: number) {
  // Update panes
  [1, 2, 3].forEach((s) => {
    $(`step-${s}`).classList.toggle('active', s === step);
    $(`step-${s}`).classList.toggle('hidden', s !== step);
    
    const indicator = $(`step-indicator-${s}`);
    if (indicator) {
      indicator.classList.toggle('active', s === step);
    }
  });
}

function resetWizard() {
  selectedFile = null;
  analysisText = '';
  suggestedTitle = '';
  
  const fileInput = $('file-input') as HTMLInputElement;
  fileInput.value = '';
  
  ($('additional-notes') as HTMLTextAreaElement).value = '';
  $('analysis-content').innerHTML = '';
  
  goToStep(1);
}

// ── Image Selection ──

function handleFileSelected(file: File) {
  if (!file.type.startsWith('image/')) {
    showToast('error', 'Please select an image file (PNG, JPG, WEBP)');
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    showToast('error', 'Image too large. Maximum size is 4MB.');
    return;
  }

  selectedFile = file;

  const preview = $('image-preview') as HTMLImageElement;
  const fileName = $('file-name');

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);

  fileName.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  
  // Transition to Step 2
  goToStep(2);
}

// ── Analysis ──

async function handleAnalyze() {
  if (!selectedFile) return;

  const analyzeBtn = $('analyze-btn');
  const notes = ($('additional-notes') as HTMLTextAreaElement).value;

  setButtonLoading(analyzeBtn, true);

  try {
    const config = getLocalConfig();
    const result = await analyzeScreenshot(selectedFile, notes, config);
    analysisText = result.analysis;

    // Extract title
    const titleMatch = analysisText.match(/(?:\*\*Bug Title\*\*|\*\*Title\*\*|Bug Title|Title)[:\s]*\**([^\n]+)/i)
      || analysisText.match(/^#+\s*(.+)/m);
      
    let extractedTitle = titleMatch ? titleMatch[1].replace(/\*+/g, '').replace(/^["']|["']$/g, '').trim() : '';
    suggestedTitle = extractedTitle || 'Bug found via screenshot analysis';
    
    // Jira limits summary to 255 chars
    if (suggestedTitle.length > 250) {
      suggestedTitle = suggestedTitle.substring(0, 250) + '...';
    }

    $('analysis-content').innerHTML = formatAnalysis(analysisText);
    
    // Transition to Step 3
    goToStep(3);

  } catch (err: any) {
    showToast('error', err.message || 'Analysis failed');
  } finally {
    setButtonLoading(analyzeBtn, false);
  }
}

// ── JIRA Push ──

async function handlePushToJira() {
  if (!selectedFile || !analysisText) return;

  const pushBtn = $('push-jira-btn');
  setButtonLoading(pushBtn, true);

  try {
    const config = getLocalConfig();
    const jiraResult = await createJiraTicket(selectedFile, suggestedTitle, analysisText, config);
    
    showToast('success', `${jiraResult.message} → ${jiraResult.issueKey}`);

    if (jiraResult.issueUrl) {
      window.open(jiraResult.issueUrl, '_blank');
    }

    // Reset UI state after 2 seconds
    setTimeout(resetWizard, 2000);

  } catch (err: any) {
    showToast('error', err.message || 'Push to JIRA failed');
  } finally {
    setButtonLoading(pushBtn, false);
  }
}

// ── Markdown Formatting ──

function formatAnalysis(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="font-family: var(--font-mono); background: rgba(139, 92, 246, 0.15); padding: 2px 6px; border-radius: 4px; color: var(--accent-secondary); font-size: 0.9em;">$1</code>')
    .replace(/^### (.+)$/gm, '<h4 style="margin: 12px 0 4px; color: var(--accent-secondary);">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin: 16px 0 6px; color: var(--accent-primary);">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin: 20px 0 8px; color: var(--accent-primary);">$1</h2>')
    .replace(/^(\s*)[-*]\s+(.+)$/gm, '<span style="display:block; padding-left:16px; margin:2px 0;">• $2</span>')
    .replace(/\n/g, '<br>');
}

// ── Initialize ──

export function initBugReportPage() {
  const dropZone = $('drop-zone');
  const fileInput = $('file-input') as HTMLInputElement;
  const analyzeBtn = $('analyze-btn');
  const pushBtn = $('push-jira-btn');
  const backBtn = $('btn-back-step-1');
  const restartBtn = $('btn-restart');

  // File Upload Handlers
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      handleFileSelected(files[0]);
    }
  });

  // Navigation & Actions
  backBtn.addEventListener('click', resetWizard);
  restartBtn.addEventListener('click', resetWizard);
  analyzeBtn.addEventListener('click', handleAnalyze);
  pushBtn.addEventListener('click', handlePushToJira);

  // Prevent default drag
  document.body.addEventListener('dragover', (e) => e.preventDefault());
  document.body.addEventListener('drop', (e) => e.preventDefault());
}
