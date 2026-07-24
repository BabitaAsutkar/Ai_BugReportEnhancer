import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import { createJiraIssue, attachFileToIssue } from '../services/jiraService';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for JIRA attachments
});

/**
 * POST /api/jira/create — Create a JIRA issue and attach the screenshot
 * Expects multipart form with:
 *   - 'screenshot' file
 *   - 'summary' text (bug title)
 *   - 'description' text (full bug report)
 */
router.post('/create', upload.single('screenshot'), async (req: Request, res: Response) => {
  try {
    let config;
    try {
      config = JSON.parse(req.body.config || '{}');
    } catch (e) {
      res.status(400).json({ error: 'Invalid configuration payload' });
      return;
    }
    const { jira } = config;

    if (!jira.baseUrl || !jira.email || !jira.apiToken || !jira.projectKey) {
      res.status(400).json({ error: 'JIRA is not fully configured. Please check Settings.' });
      return;
    }

    const { summary, description } = req.body;
    if (!summary || !description) {
      res.status(400).json({ error: 'Summary and description are required' });
      return;
    }

    console.log(`Creating JIRA issue in project ${jira.projectKey}: "${summary}"`);

    // Step 1: Create the issue
    const issue = await createJiraIssue(jira, summary, description);
    console.log(`JIRA issue created: ${issue.key}`);

    // Step 2: Attach screenshot if provided
    if (req.file) {
      console.log(`Attaching screenshot to ${issue.key}...`);
      await attachFileToIssue(
        jira,
        issue.key,
        req.file.buffer,
        req.file.originalname || 'screenshot.png'
      );
      console.log(`Screenshot attached to ${issue.key}`);
    }

    res.json({
      success: true,
      issueKey: issue.key,
      issueUrl: `${jira.baseUrl}/browse/${issue.key}`,
      message: `Bug ticket ${issue.key} created successfully!`,
    });
  } catch (err: any) {
    console.error('JIRA creation error:', err?.response?.data || err?.message || err);
    const errorData = err?.response?.data;
    let message = 'Failed to create JIRA issue';

    if (errorData?.errors) {
      message = Object.values(errorData.errors).join(', ');

      // Help user if JIRA complains about invalid issue type
      if (errorData.errors.issuetype && String(errorData.errors.issuetype).toLowerCase().includes('valid issue type')) {
        try {
          let reqConfig;
          try {
            reqConfig = JSON.parse(req.body.config || '{}');
          } catch (e) {
            reqConfig = {};
          }
          const { jira } = reqConfig;
          if (jira && jira.email && jira.apiToken && jira.baseUrl && jira.projectKey) {
            const credentials = Buffer.from(`${jira.email}:${jira.apiToken}`).toString('base64');
            const projectResponse = await axios.get(
              `${jira.baseUrl.replace(/\/+$/, '')}/rest/api/3/project/${jira.projectKey}`,
              {
                headers: {
                  Authorization: `Basic ${credentials}`,
                  Accept: 'application/json',
                },
              }
            );
            if (projectResponse.data && Array.isArray(projectResponse.data.issueTypes)) {
              const types = projectResponse.data.issueTypes.map((it: any) => `"${it.name}" (or ID: ${it.id})`).join(', ');
              message += `. Supported in project "${jira.projectKey}": ${types}`;
            }
          }
        } catch (fetchErr) {
          // Ignore fetch project details errors
        }
      }
    } else if (errorData?.errorMessages) {
      message = errorData.errorMessages.join(', ');
    } else if (err?.message) {
      message = err.message;
    }

    res.status(500).json({ error: message });
  }
});

export default router;
