import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import entityRoutes from './routes/entities.js';
import aiRoutes from './routes/ai.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local first, then .env as fallback
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_academic_copilot';

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Academic Copilot Backend',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    ai: process.env.MISTRAL_API_KEY ? 'mistral' : process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : 'fallback'
  });
});

// Start Express server immediately
app.listen(PORT, () => {
  console.log(`\n🚀 Express server listening on http://localhost:${PORT}`);
  const aiProvider = process.env.GEMINI_API_KEY ? 'Gemini AI (gemini-flash-lite-latest)' : process.env.GROQ_API_KEY ? 'Groq (Llama 3.3)' : process.env.MISTRAL_API_KEY ? 'Mistral AI' : process.env.OPENAI_API_KEY ? 'OpenAI' : 'Built-in fallback';
  console.log(`🤖 AI provider: ${aiProvider}`);
});

// Connect to MongoDB asynchronously
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(() => {
    console.log(`✅ Connected to MongoDB: ${MONGODB_URI}`);
  })
  .catch((err) => {
    console.warn(`⚠️  MongoDB connection notice: ${err.message}`);
    console.warn('   → Using in-memory store (data resets on restart)');
  });
