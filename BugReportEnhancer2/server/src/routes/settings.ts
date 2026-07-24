import { Router, Request, Response } from 'express';
import { testJiraConnection } from '../services/jiraService';
import { testGroqConnection } from '../services/groqService';

const router = Router();

/**
 * POST /api/settings/test-jira — Test JIRA connection
 */
router.post('/test-jira', async (req: Request, res: Response) => {
  try {
    const jiraConfig = req.body.config?.jira;

    if (!jiraConfig?.baseUrl || !jiraConfig?.email || !jiraConfig?.apiToken) {
      console.log('test-jira missing fields:', { hasBaseUrl: !!jiraConfig?.baseUrl, hasEmail: !!jiraConfig?.email, hasApiToken: !!jiraConfig?.apiToken });
      res.status(400).json({ success: false, error: 'JIRA URL, Email, and API Token are required' });
      return;
    }

    console.log(`Testing JIRA connection for: ${jiraConfig.baseUrl} / ${jiraConfig.email}`);
    const result = await testJiraConnection(jiraConfig);
    console.log('JIRA connection result:', result);
    res.json(result);
  } catch (err) {
    console.error('test-jira unexpected error:', err);
    res.status(500).json({ success: false, error: 'Connection test failed unexpectedly' });
  }
});

/**
 * POST /api/settings/test-groq — Test Groq API connection
 */
router.post('/test-groq', async (req: Request, res: Response) => {
  try {
    const apiKey = req.body.config?.groq?.apiKey;

    if (!apiKey) {
      res.status(400).json({ success: false, error: 'Groq API Key is required' });
      return;
    }

    const success = await testGroqConnection(apiKey);
    res.json({ success, message: success ? 'Groq connection successful' : 'Groq connection failed' });
  } catch (err: any) {
    const message = err?.message || 'Connection test failed';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
