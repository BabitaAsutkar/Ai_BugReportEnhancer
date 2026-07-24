import express from 'express';
import cors from 'cors';
import path from 'path';
import settingsRouter from './routes/settings';
import analyzeRouter from './routes/analyze';
import jiraRouter from './routes/jira';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/settings', settingsRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/jira', jiraRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   🐛 Bug Report Enhancer — Server       ║');
  console.log(`  ║   Running on http://localhost:${PORT}        ║`);
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});

export default app;
