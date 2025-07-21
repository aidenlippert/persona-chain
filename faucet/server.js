const express = require('express');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const winston = require('winston');

// Configuration
const config = {
  port: process.env.PORT || 8080,
  rpcEndpoint: process.env.RPC_ENDPOINT || 'http://localhost:1317',
  chainId: process.env.CHAIN_ID || 'persona-testnet-1',
  denom: process.env.DENOM || 'uprsn',
  faucetAddress: process.env.FAUCET_ADDRESS || 'persona1testnetfaucet1234567890abcdefghijklmn',
  faucetAmount: process.env.FAUCET_AMOUNT || '1000000', // 1 PRSN in uprsn
  maxRequestsPerHour: parseInt(process.env.MAX_REQUESTS_PER_HOUR) || 5,
  maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY) || 20
};

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'faucet-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'faucet.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Rate limiters
const hourlyLimiter = new RateLimiterMemory({
  keyByIP: true,
  points: config.maxRequestsPerHour,
  duration: 3600, // 1 hour
});

const dailyLimiter = new RateLimiterMemory({
  keyByIP: true,
  points: config.maxRequestsPerDay,
  duration: 86400, // 24 hours
});

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    chainId: config.chainId,
    faucetAddress: config.faucetAddress,
    timestamp: Math.floor(Date.now() / 1000)
  });
});

// Faucet info endpoint
app.get('/info', (req, res) => {
  res.json({
    chainId: config.chainId,
    denom: config.denom,
    faucetAmount: config.faucetAmount,
    maxRequestsPerHour: config.maxRequestsPerHour,
    maxRequestsPerDay: config.maxRequestsPerDay,
    rpcEndpoint: config.rpcEndpoint
  });
});

// Address validation middleware
const validateAddress = [
  body('address')
    .isLength({ min: 39, max: 48 })
    .matches(/^persona1[a-z0-9]{32,39}$/)
    .withMessage('Invalid Persona Chain address format'),
];

// Request faucet tokens
app.post('/faucet', validateAddress, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid request',
        details: errors.array()
      });
    }

    const { address } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Rate limiting
    try {
      await hourlyLimiter.consume(clientIP);
      await dailyLimiter.consume(clientIP);
    } catch (rateLimitError) {
      logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      });
    }

    // Simulate token transfer (in a real implementation, this would interact with the blockchain)
    const txData = {
      tx: {
        body: {
          messages: [{
            '@type': '/cosmos.bank.v1beta1.MsgSend',
            from_address: config.faucetAddress,
            to_address: address,
            amount: [{
              denom: config.denom,
              amount: config.faucetAmount
            }]
          }],
          memo: `Faucet transfer to ${address}`,
          timeout_height: "0",
          extension_options: [],
          non_critical_extension_options: []
        },
        auth_info: {
          signer_infos: [],
          fee: {
            amount: [{
              denom: config.denom,
              amount: "5000"
            }],
            gas_limit: "200000",
            payer: "",
            granter: ""
          }
        },
        signatures: []
      },
      mode: "BROADCAST_MODE_SYNC"
    };

    // Send transaction to blockchain (mock)
    try {
      const response = await axios.post(`${config.rpcEndpoint}/cosmos/tx/v1beta1/txs`, txData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Generate mock transaction hash
      const txHash = 'mock_tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      logger.info(`Faucet request successful`, {
        address,
        amount: config.faucetAmount,
        denom: config.denom,
        txHash,
        clientIP
      });

      res.json({
        success: true,
        txHash,
        amount: config.faucetAmount,
        denom: config.denom,
        address,
        chainId: config.chainId,
        timestamp: Math.floor(Date.now() / 1000)
      });

    } catch (txError) {
      logger.error(`Transaction failed`, {
        address,
        error: txError.message,
        clientIP
      });

      res.status(500).json({
        error: 'Transaction failed',
        message: 'Failed to send tokens. Please try again later.'
      });
    }

  } catch (error) {
    logger.error(`Faucet request error`, {
      error: error.message,
      stack: error.stack,
      clientIP: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
});

// Balance check endpoint (mock)
app.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^persona1[a-z0-9]{38}$/.test(address)) {
      return res.status(400).json({
        error: 'Invalid address format'
      });
    }

    // Mock balance response
    const mockBalance = Math.floor(Math.random() * 10000000);
    
    res.json({
      address,
      balance: {
        denom: config.denom,
        amount: mockBalance.toString()
      },
      chainId: config.chainId,
      timestamp: Math.floor(Date.now() / 1000)
    });

  } catch (error) {
    logger.error(`Balance check error`, {
      error: error.message,
      address: req.params.address
    });

    res.status(500).json({
      error: 'Failed to check balance'
    });
  }
});

// Error handler
app.use((error, req, res, next) => {
  logger.error(`Unhandled error`, {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint was not found'
  });
});

// Start server
app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Persona Chain Faucet Server started`, {
    port: config.port,
    chainId: config.chainId,
    rpcEndpoint: config.rpcEndpoint,
    faucetAddress: config.faucetAddress
  });
  
  console.log(`🚰 Persona Chain Faucet Server`);
  console.log(`🌐 Server: http://localhost:${config.port}`);
  console.log(`⛓️  Chain ID: ${config.chainId}`);
  console.log(`💰 Faucet Address: ${config.faucetAddress}`);
  console.log(`💧 Amount per request: ${config.faucetAmount} ${config.denom}`);
  console.log(`⏱️  Rate limit: ${config.maxRequestsPerHour}/hour, ${config.maxRequestsPerDay}/day`);
  console.log(`🔗 RPC Endpoint: ${config.rpcEndpoint}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});