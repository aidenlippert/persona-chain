import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { githubRouter } from './routes/github';
import { linkedinRouter } from './routes/linkedin';
import { plaidRouter } from './routes/plaid';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Initialize Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  enableAutoPipelining: true,
  maxRetriesPerRequest: 3,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', rateLimiter(redis));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'persona-connectors',
    timestamp: new Date().toISOString(),
    connectors: ['github', 'linkedin', 'plaid', 'orcid', 'twitter', 'stackexchange']
  });
});

// Routes
app.use('/api/connectors/github', githubRouter(redis));
app.use('/api/connectors/linkedin', linkedinRouter(redis));
app.use('/api/connectors/plaid', plaidRouter(redis));

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(`Connector service running on port ${port}`);
});