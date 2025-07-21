import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { githubRouter } from './routes/github';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { rateLimiter } from '../../shared/middleware/rateLimiter';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  enableAutoPipelining: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "https://github.com", "https://avatars.githubusercontent.com"],
      connectSrc: ["'self'", "https://api.github.com"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter(redis));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'github-connector',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/v1/github', githubRouter(redis));

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`GitHub connector service running on port ${port}`);
});