const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Connector proxies
const connectors = {
  github: 'http://localhost:3001',
  linkedin: 'http://localhost:3002',
  orcid: 'http://localhost:3003',
  plaid: 'http://localhost:3004',
  twitter: 'http://localhost:3005',
  stackexchange: 'http://localhost:3006',
};

// Setup proxies
Object.entries(connectors).forEach(([name, target]) => {
  app.use(`/api/v1/${name}`, createProxyMiddleware({
    target,
    changeOrigin: true,
  }));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connectors: Object.keys(connectors) });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Available connectors:', Object.keys(connectors));
});
