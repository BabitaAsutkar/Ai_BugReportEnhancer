import axios, { AxiosError } from 'axios';
import FormData from 'form-data';

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType: string;
}

function getAuthHeader(email: string, apiToken: string): string {
  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  return `Basic ${credentials}`;
}

function normalizeBaseUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

/**
 * Test JIRA connection by calling GET /rest/api/3/myself
 */
export async function testJiraConnection(config: JiraConfig): Promise<{
  success: boolean;
  displayName?: string;
  issueTypes?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const baseUrl = normalizeBaseUrl(config.baseUrl);
    const authHeader = getAuthHeader(config.email, config.apiToken);
    
    const response = await axios.get(`${baseUrl}/rest/api/3/myself`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    const displayName = response.data.displayName || response.data.emailAddress;
    let issueTypes: Array<{ id: string; name: string }> = [];

    if (config.projectKey) {
      try {
        const projectResponse = await axios.get(
          `${baseUrl}/rest/api/3/project/${config.projectKey}`,
          {
            headers: {
              Authorization: authHeader,
              Accept: 'application/json',
            },
          }
        );
        if (projectResponse.data && Array.isArray(projectResponse.data.issueTypes)) {
          issueTypes = projectResponse.data.issueTypes.map((it: any) => ({
            id: it.id,
            name: it.name,
          }));
        }
      } catch (projectErr: any) {
        console.warn(`Could not fetch project issue types for ${config.projectKey}:`, projectErr?.message);
      }
    }

    return {
      success: true,
      displayName,
      issueTypes,
    };
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    console.error('testJiraConnection error:', {
      status,
      data: axiosErr.response?.data,
      message: axiosErr.message,
    });
    let error = 'Connection failed';

    if (status === 401) {
      error = 'Authentication failed. Check your email and API token.';
    } else if (status === 403) {
      error = 'Access forbidden. Check your permissions.';
    } else if (status === 404) {
      error = 'JIRA URL not found. Check your base URL.';
    } else if (axiosErr.code === 'ENOTFOUND') {
      error = 'Could not resolve JIRA hostname. Check your URL.';
    }

    return { success: false, error };
  }
}

function parseInlineText(text: string): any[] {
  const content: any[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const plainText = text.substring(lastIndex, match.index);
    if (plainText) {
      content.push({ type: 'text', text: plainText });
    }

    const boldText = match[1];
    if (boldText) {
      content.push({
        type: 'text',
        text: boldText,
        marks: [{ type: 'strong' }],
      });
    }

    lastIndex = regex.lastIndex;
  }

  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    content.push({ type: 'text', text: remainingText });
  }

  return content;
}

export function parseMarkdownToAdf(markdown: string): any {
  const lines = markdown.split(/\r?\n/);
  const contentNodes: any[] = [];
  
  let currentList: any[] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // If line is empty
    if (!line) {
      if (currentList) {
        contentNodes.push({
          type: 'bulletList',
          content: currentList,
        });
        currentList = null;
      }
      // Add an empty paragraph to preserve spacing (using a space to prevent ADF validation errors)
      contentNodes.push({
        type: 'paragraph',
        content: [{ type: 'text', text: ' ' }],
      });
      continue;
    }

    // Check if line is a header
    const headingMatch = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentList) {
        contentNodes.push({
          type: 'bulletList',
          content: currentList,
        });
        currentList = null;
      }
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      contentNodes.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineText(headingText),
      });
      continue;
    }

    // Check if line is a list item
    const listMatch = rawLine.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listMatch) {
      if (!currentList) {
        currentList = [];
      }
      
      const itemText = listMatch[2];
      currentList.push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: parseInlineText(itemText),
          },
        ],
      });
      continue;
    }

    // If it's a normal line, close the list if one was active
    if (currentList) {
      contentNodes.push({
        type: 'bulletList',
        content: currentList,
      });
      currentList = null;
    }

    // Add as paragraph
    contentNodes.push({
      type: 'paragraph',
      content: parseInlineText(rawLine),
    });
  }

  // Close any remaining open list
  if (currentList) {
    contentNodes.push({
      type: 'bulletList',
      content: currentList,
    });
  }

  // Clean up double-empty paragraphs
  const cleanedNodes = contentNodes.filter((node, idx, arr) => {
    if (node.type === 'paragraph' && node.content.length === 1 && node.content[0].text === ' ') {
      const prevNode = arr[idx - 1];
      if (prevNode && prevNode.type === 'paragraph' && prevNode.content.length === 1 && prevNode.content[0].text === ' ') {
        return false;
      }
    }
    return true;
  });

  return {
    type: 'doc',
    version: 1,
    content: cleanedNodes,
  };
}

/**
 * Create a JIRA issue with the given summary and description.
 */
export async function createJiraIssue(
  config: JiraConfig,
  summary: string,
  description: string
): Promise<{ key: string; id: string; self: string }> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const authHeader = getAuthHeader(config.email, config.apiToken);

  // JIRA v3 uses Atlassian Document Format (ADF) for description
  const adfDescription = parseMarkdownToAdf(description);

  const response = await axios.post(
    `${baseUrl}/rest/api/3/issue`,
    {
      fields: {
        project: { key: config.projectKey },
        summary: summary,
        description: adfDescription,
        issuetype: (config.issueType && /^\d+$/.test(config.issueType))
          ? { id: config.issueType }
          : { name: (!config.issueType || config.issueType.toLowerCase() === 'bug') ? 'Task' : config.issueType },
      },
    },
    {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  return {
    key: response.data.key,
    id: response.data.id,
    self: response.data.self,
  };
}

/**
 * Attach a file (screenshot) to an existing JIRA issue.
 */
export async function attachFileToIssue(
  config: JiraConfig,
  issueKey: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<void> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const authHeader = getAuthHeader(config.email, config.apiToken);

  const form = new FormData();
  form.append('file', fileBuffer, {
    filename: fileName,
    contentType: 'image/png',
  });

  await axios.post(
    `${baseUrl}/rest/api/3/issue/${issueKey}/attachments`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: authHeader,
        'X-Atlassian-Token': 'nocheck', // Required for XSRF protection bypass
      },
    }
  );
}
