import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { didRoutes } from './routes/did';
import { vcRoutes } from './routes/vc';
import { zkRoutes } from './routes/zk';
import { mcpRoutes } from './routes/mcp';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { CosmosClient } from './services/cosmosClient';
import { VeramoAgent } from './services/veramoAgent';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize services
const cosmosClient = new CosmosClient(
  process.env.RPC_ENDPOINT || 'http://localhost:26657',
  process.env.CHAIN_ID || 'persona-chain'
);

const veramoAgent = new VeramoAgent();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/did', authMiddleware, didRoutes(cosmosClient, veramoAgent));
app.use('/api/vc', authMiddleware, vcRoutes(cosmosClient, veramoAgent));
app.use('/api/zk', authMiddleware, zkRoutes(cosmosClient));
app.use('/api/mcp', mcpRoutes(cosmosClient, veramoAgent));

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`🚀 Persona Chain API service running on port ${port}`);
  console.log(`📡 Connected to Cosmos RPC: ${process.env.RPC_ENDPOINT || 'http://localhost:26657'}`);
  console.log(`🔗 Chain ID: ${process.env.CHAIN_ID || 'persona-chain'}`);
});

export default app;