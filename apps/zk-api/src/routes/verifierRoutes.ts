import { Router } from 'express';
import Joi from 'joi';
import { CosmosVerifierService, createCosmosVerifierService } from '../services/CosmosVerifierService';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Initialize Cosmos verifier service
let cosmosVerifier: CosmosVerifierService | null = null;

// Initialize verifier service if environment variables are set
const initializeVerifierService = async () => {
  try {
    const contractAddress = process.env.ZK_VERIFIER_CONTRACT_ADDRESS;
    const chainId = process.env.ZK_VERIFIER_CHAIN_ID || 'persona-testnet';
    const rpcEndpoint = process.env.ZK_VERIFIER_NODE_URL || 'http://localhost:26657';
    const gasPrice = process.env.ZK_VERIFIER_GAS_PRICE || '0.1upersona';
    const mnemonic = process.env.ZK_VERIFIER_MNEMONIC;

    if (contractAddress && process.env.ZK_VERIFIER_ENABLED === 'true') {
      cosmosVerifier = await createCosmosVerifierService({
        contractAddress,
        chainId,
        rpcEndpoint,
        gasPrice,
        mnemonic,
      });
      console.log('🔗 Cosmos verifier integration enabled');
    } else {
      console.log('ℹ️  Cosmos verifier integration disabled (missing configuration)');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Cosmos verifier:', error);
  }
};

// Initialize on startup
initializeVerifierService();

// Validation schemas
const onChainSubmissionSchema = Joi.object({
  circuitId: Joi.string().valid('academic_gpa', 'financial_income', 'health_vaccination', 'universal_aggregate').required(),
  publicInputs: Joi.array().items(Joi.string()).required(),
  proof: Joi.object().required(),
});

const circuitRegistrationSchema = Joi.object({
  circuitId: Joi.string().required(),
  verificationKey: Joi.object().required(),
  circuitType: Joi.string().default('groth16'),
});

/**
 * POST /verifier/submit
 * Submit a proof to the on-chain verifier contract
 */
router.post('/submit', validateRequest(onChainSubmissionSchema), async (req, res) => {
  try {
    if (!cosmosVerifier) {
      return res.status(503).json({
        success: false,
        error: 'On-chain verifier not available',
        details: 'Cosmos verifier service is not configured or enabled'
      });
    }

    const { circuitId, publicInputs, proof } = req.body;

    console.log(`🔗 Submitting proof to on-chain verifier for circuit: ${circuitId}`);

    // Convert proof object to JSON string for contract submission
    const proofString = JSON.stringify(proof);

    const result = await cosmosVerifier.submitProof({
      circuitId,
      publicInputs,
      proof: proofString,
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          proofId: result.proofId,
          txHash: result.txHash,
          verified: result.verified,
          onChain: true,
          timestamp: Date.now()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'On-chain submission failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('❌ On-chain proof submission failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit proof to on-chain verifier',
      details: error.message
    });
  }
});

/**
 * POST /verifier/register-circuit
 * Register a new circuit with the on-chain verifier
 */
router.post('/register-circuit', validateRequest(circuitRegistrationSchema), async (req, res) => {
  try {
    if (!cosmosVerifier) {
      return res.status(503).json({
        success: false,
        error: 'On-chain verifier not available'
      });
    }

    const { circuitId, verificationKey, circuitType } = req.body;

    console.log(`🔧 Registering circuit with on-chain verifier: ${circuitId}`);

    // Convert verification key object to JSON string
    const vkString = JSON.stringify(verificationKey);

    const result = await cosmosVerifier.registerCircuit({
      circuitId,
      verificationKey: vkString,
      circuitType,
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          circuitId,
          txHash: result.txHash,
          registered: true,
          timestamp: Date.now()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Circuit registration failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('❌ Circuit registration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register circuit with on-chain verifier',
      details: error.message
    });
  }
});

/**
 * GET /verifier/contract-info
 * Get information about the verifier contract
 */
router.get('/contract-info', async (req, res) => {
  try {
    if (!cosmosVerifier) {
      return res.status(503).json({
        success: false,
        error: 'On-chain verifier not available'
      });
    }

    const contractInfo = await cosmosVerifier.getContractInfo();

    if (contractInfo) {
      res.json({
        success: true,
        data: contractInfo
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to query contract information'
      });
    }

  } catch (error) {
    console.error('❌ Failed to get contract info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query contract information',
      details: error.message
    });
  }
});

/**
 * GET /verifier/circuits
 * List all registered circuits
 */
router.get('/circuits', async (req, res) => {
  try {
    if (!cosmosVerifier) {
      return res.status(503).json({
        success: false,
        error: 'On-chain verifier not available'
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const circuits = await cosmosVerifier.listCircuits(limit);

    res.json({
      success: true,
      data: {
        circuits,
        total: circuits.length
      }
    });

  } catch (error) {
    console.error('❌ Failed to list circuits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list circuits',
      details: error.message
    });
  }
});

/**
 * GET /verifier/circuit/:circuitId
 * Get information about a specific circuit
 */
router.get('/circuit/:circuitId', async (req, res) => {
  try {
    if (!cosmosVerifier) {
      return res.status(503).json({
        success: false,
        error: 'On-chain verifier not available'
      });
    }

    const { circuitId } = req.params;
    const circuit = await cosmosVerifier.getCircuit(circuitId);

    if (circuit) {
      res.json({
        success: true,
        data: circuit
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Circuit not found'
      });
    }

  } catch (error) {
    console.error(`❌ Failed to get circuit ${req.params.circuitId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to query circuit',
      details: error.message
    });
  }
});

/**
 * GET /verifier/proof/:proofId
 * Get information about a specific proof
 */
router.get('/proof/:proofId', async (req, res) => {
  try {
    if (!cosmosVerifier) {
      return res.status(503).json({
        success: false,
        error: 'On-chain verifier not available'
      });
    }

    const { proofId } = req.params;
    const proof = await cosmosVerifier.getProof(proofId);

    if (proof) {
      res.json({
        success: true,
        data: proof
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Proof not found'
      });
    }

  } catch (error) {
    console.error(`❌ Failed to get proof ${req.params.proofId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to query proof',
      details: error.message
    });
  }
});

/**
 * GET /verifier/proofs/:circuitId
 * List proofs for a specific circuit
 */
router.get('/proofs/:circuitId', async (req, res) => {
  try {
    if (!cosmosVerifier) {
      return res.status(503).json({
        success: false,
        error: 'On-chain verifier not available'
      });
    }

    const { circuitId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const proofs = await cosmosVerifier.getProofsByCircuit(circuitId, limit);

    res.json({
      success: true,
      data: {
        circuitId,
        proofs,
        total: proofs.length
      }
    });

  } catch (error) {
    console.error(`❌ Failed to get proofs for circuit ${req.params.circuitId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to query circuit proofs',
      details: error.message
    });
  }
});

/**
 * GET /verifier/health
 * Check the health of the on-chain verifier integration
 */
router.get('/health', async (req, res) => {
  try {
    if (!cosmosVerifier) {
      return res.json({
        success: true,
        data: {
          enabled: false,
          status: 'disabled',
          message: 'On-chain verifier integration is not configured'
        }
      });
    }

    const health = await cosmosVerifier.healthCheck();

    res.json({
      success: true,
      data: {
        enabled: true,
        status: health.connected && health.contractExists ? 'healthy' : 'unhealthy',
        connected: health.connected,
        contractExists: health.contractExists,
        accountBalance: health.accountBalance,
        error: health.error
      }
    });

  } catch (error) {
    console.error('❌ Verifier health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * POST /verifier/prove-and-submit
 * Generate a proof and immediately submit it to the on-chain verifier
 */
router.post('/prove-and-submit', async (req, res) => {
  try {
    if (!cosmosVerifier) {
      return res.status(503).json({
        success: false,
        error: 'On-chain verifier not available'
      });
    }

    // Extract circuit type from request to determine which proving endpoint to use
    const circuitType = req.body.circuitType || 'academic'; // Default to academic
    let provingEndpoint: string;

    switch (circuitType) {
      case 'academic':
        provingEndpoint = '/prove/gpa';
        break;
      case 'financial':
        provingEndpoint = '/prove/income';
        break;
      case 'health':
        provingEndpoint = '/prove/vaccination';
        break;
      case 'universal':
        provingEndpoint = '/prove/aggregate';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid circuit type',
          details: 'Supported types: academic, financial, health, universal'
        });
    }

    // This would need to be implemented as an internal service call
    // For now, return a message indicating the feature is planned
    res.json({
      success: false,
      error: 'Feature in development',
      details: 'Integrated prove-and-submit functionality coming soon',
      suggestion: `First call ${provingEndpoint}, then use /verifier/submit with the result`
    });

  } catch (error) {
    console.error('❌ Prove-and-submit failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate and submit proof',
      details: error.message
    });
  }
});

export { router as verifierRoutes };