import { Router, Request, Response } from 'express';
import multer from 'multer';
import { analyzeScreenshot } from '../services/groqService';

const router = Router();

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB limit (Groq base64 limit)
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * POST /api/analyze — Analyze a screenshot using Groq Llama Scout
 * Expects multipart form with 'screenshot' file and optional 'notes' text field
 */
router.post('/', upload.single('screenshot'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No screenshot file provided' });
      return;
    }

    let config;
    try {
      config = JSON.parse(req.body.config || '{}');
    } catch (e) {
      res.status(400).json({ error: 'Invalid configuration payload' });
      return;
    }

    if (!config.groq?.apiKey) {
      res.status(400).json({ error: 'Groq API Key not configured. Please set it in Settings.' });
      return;
    }

    const imageBase64 = file.buffer.toString('base64');
    const mimeType = file.mimetype;
    const additionalNotes = req.body.notes || '';

    console.log(`Analyzing screenshot: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`);

    const analysis = await analyzeScreenshot(
      config.groq.apiKey,
      imageBase64,
      mimeType,
      additionalNotes
    );

    res.json({
      success: true,
      analysis,
      fileName: file.originalname,
      fileSize: file.size,
    });
  } catch (err: any) {
    console.error('Analysis error:', err?.message || err);
    const message = err?.message || 'Failed to analyze screenshot';
    res.status(500).json({ error: message });
  }
});

export default router;
