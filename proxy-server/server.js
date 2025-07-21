const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// PersonaChain endpoints
const PERSONA_CHAIN_RPC = 'http://34.170.121.182:26657';
const PERSONA_CHAIN_REST = 'http://34.170.121.182:1317';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'PersonaChain HTTPS Proxy Active',
    timestamp: new Date().toISOString(),
    endpoints: {
      rpc: '/rpc',
      api: '/api'
    }
  });
});

// RPC proxy (Tendermint)
app.use('/rpc', createProxyMiddleware({
  target: PERSONA_CHAIN_RPC,
  changeOrigin: true,
  pathRewrite: {
    '^/rpc': '', // Remove /rpc prefix
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers to response
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  },
  onError: (err, req, res) => {
    console.error('RPC Proxy Error:', err.message);
    res.status(500).json({
      error: 'PersonaChain RPC connection failed',
      message: err.message,
      target: PERSONA_CHAIN_RPC
    });
  }
}));

// REST API proxy
app.use('/api', createProxyMiddleware({
  target: PERSONA_CHAIN_REST,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove /api prefix
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers to response
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  },
  onError: (err, req, res) => {
    console.error('REST Proxy Error:', err.message);
    res.status(500).json({
      error: 'PersonaChain REST API connection failed',
      message: err.message,
      target: PERSONA_CHAIN_REST
    });
  }
}));

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'PersonaChain HTTPS Proxy',
    version: '1.0.0',
    status: 'Active',
    blockchain: {
      name: 'PersonaChain',
      network: 'persona-chain-1',
      endpoints: {
        rpc: req.protocol + '://' + req.get('host') + '/rpc',
        api: req.protocol + '://' + req.get('host') + '/api'
      }
    },
    usage: {
      rpc: 'Use /rpc for Tendermint RPC calls',
      api: 'Use /api for Cosmos REST API calls'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 PersonaChain HTTPS Proxy running on port ${PORT}`);
  console.log(`📡 Proxying to PersonaChain at ${PERSONA_CHAIN_RPC} and ${PERSONA_CHAIN_REST}`);
});

module.exports = app;