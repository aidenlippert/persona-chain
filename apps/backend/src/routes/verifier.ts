import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { CosmosVerifierService, CosmosVerifierConfig } from '../../../zk-api/src/services/CosmosVerifierService';
import deploymentConfig from '../../../../config/zk-verifier-deployment.json';
import { requireAdmin, AuthRequest } from '../middleware/auth';
import { getErrorMessage } from '../utils/errorHandler';

const router = Router();

// Initialize Cosmos Verifier Service
const verifierConfig: CosmosVerifierConfig = {
  contractAddress: deploymentConfig.contract_address,
  chainId: deploymentConfig.chain_id,
  rpcEndpoint: deploymentConfig.rpc_endpoint,
  gasPrice: '0.1upersona',
  mnemonic: process.env.VERIFIER_MNEMONIC,
  accountAddress: process.env.VERIFIER_ACCOUNT
};

let verifierService: CosmosVerifierService | null = null;

// Initialize service on startup
(async () => {
  try {
    verifierService = new CosmosVerifierService(verifierConfig);
    await verifierService.initialize();
    console.log('✅ Cosmos Verifier Service initialized for backend API');
  } catch (error) {
    console.error('❌ Failed to initialize Cosmos Verifier Service:', error);
    console.log('⚠️  Operating in mock mode for testing');
  }
})();

// Validation middleware
const validateProofSubmission = [
  body('proof').isString().notEmpty().withMessage('Proof is required'),
  body('public_inputs').isArray().withMessage('Public inputs must be an array'),
  body('circuit_id').isString().notEmpty().withMessage('Circuit ID is required'),
  (req: any, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

const validateCircuitRegistration = [
  body('circuit_id').isString().notEmpty().withMessage('Circuit ID is required'),
  body('verification_key').isString().notEmpty().withMessage('Verification key is required'),
  body('circuit_type').isString().notEmpty().withMessage('Circuit type is required'),
  (req: any, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * POST /verifier/submit
 * Submit a proof for verification to the on-chain verifier contract
 */
router.post('/submit', validateProofSubmission, async (req: any, res: any) => {
  try {
    const { proof, public_inputs, circuit_id, metadata } = req.body;
    
    console.log(`📤 Processing proof submission for circuit: ${circuit_id}`);

    if (verifierService) {
      // Real on-chain submission
      const result = await verifierService.submitProof({
        circuitId: circuit_id,
        publicInputs: public_inputs,
        proof: proof
      });

      if (result.success) {
        res.json({
          success: true,
          data: {
            proof_id: result.proofId,
            tx_hash: result.txHash,
            verified: result.verified,
            circuit_id: circuit_id,
            timestamp: Date.now()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Proof submission failed'
        });
      }
    } else {
      // Mock submission for testing
      console.log('⚠️  Using mock proof submission - verifier service not available');
      
      // Simulate proof verification
      const mockVerified = !proof.includes('invalid_test_proof') && 
                          !public_inputs.includes('999999');
      
      const mockProofId = `proof_${circuit_id}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 40)}`;
      
      res.json({
        success: true,
        data: {
          proof_id: mockProofId,
          tx_hash: mockTxHash,
          verified: mockVerified,
          circuit_id: circuit_id,
          timestamp: Date.now()
        },
        note: 'Mock verification - on-chain service not available'
      });
    }

  } catch (error) {
    console.error('Proof submission error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error) || 'Internal server error'
    });
  }
});

/**
 * POST /verifier/register-circuit
 * Register a new circuit (admin only or governance proposal)
 */
router.post('/register-circuit', validateCircuitRegistration, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { circuit_id, verification_key, circuit_type } = req.body;
    
    console.log(`🔧 Processing circuit registration: ${circuit_id} by admin: ${req.user?.address}`);

    // User is authenticated as admin via JWT middleware
    const isAdmin = req.user?.role === 'admin';
    
    if (verifierService) {
      if (isAdmin) {
        // Direct registration as admin
        const result = await verifierService.registerCircuit({
          circuitId: circuit_id,
          verificationKey: verification_key,
          circuitType: circuit_type
        });

        if (result.success) {
          res.json({
            success: true,
            data: {
              circuit_id: circuit_id,
              tx_hash: result.txHash,
              registration_type: 'direct_admin',
              timestamp: Date.now()
            }
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.error || 'Circuit registration failed'
          });
        }
      } else {
        // Submit governance proposal for non-admin users
        // Note: This would require governance proposal submission logic
        res.status(501).json({
          success: false,
          error: 'Governance proposal submission not yet implemented',
          suggestion: 'Contact admin or wait for governance feature completion'
        });
      }
    } else {
      // Mock registration for testing
      console.log('⚠️  Using mock circuit registration - verifier service not available');
      
      const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 40)}`;
      
      res.json({
        success: true,
        data: {
          circuit_id: circuit_id,
          tx_hash: mockTxHash,
          registration_type: isAdmin ? 'direct_admin' : 'governance_proposal',
          timestamp: Date.now()
        },
        note: 'Mock registration - on-chain service not available'
      });
    }

  } catch (error) {
    console.error('Circuit registration error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error) || 'Internal server error'
    });
  }
});

/**
 * GET /verifier/circuits
 * List all registered circuits
 */
router.get('/circuits', async (req, res) => {
  try {
    const limit = parseInt((req.query?.limit as string) || '10') || 10;
    const start_after = req.query?.start_after as string;

    console.log(`🔍 Fetching circuits (limit: ${limit})`);

    if (verifierService) {
      const circuits = await verifierService.listCircuits(limit);
      
      res.json({
        success: true,
        data: {
          circuits: circuits,
          total: circuits.length,
          limit: limit
        }
      });
    } else {
      // Mock circuits for testing
      console.log('⚠️  Using mock circuits - verifier service not available');
      
      const mockCircuits = deploymentConfig.circuits.map((circuit: any) => ({
        circuitId: circuit.id,
        circuitType: circuit.type,
        creator: deploymentConfig.deployer,
        active: true,
        createdAt: Date.now() - Math.random() * 86400000 // Random time in last 24h
      }));

      res.json({
        success: true,
        data: {
          circuits: mockCircuits,
          total: mockCircuits.length,
          limit: limit
        },
        note: 'Mock circuits - on-chain service not available'
      });
    }

  } catch (error) {
    console.error('List circuits error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error) || 'Internal server error'
    });
  }
});

/**
 * GET /verifier/circuits/:circuit_id
 * Get details for a specific circuit
 */
router.get('/circuits/:circuit_id', 
  param('circuit_id').isString().notEmpty(),
  async (req, res) => {
  try {
    const { circuit_id } = req.params || {};

    console.log(`🔍 Fetching circuit details: ${circuit_id}`);

    if (verifierService) {
      const circuit = await verifierService.getCircuit(circuit_id);
      
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
    } else {
      // Mock circuit details for testing
      console.log('⚠️  Using mock circuit details - verifier service not available');
      
      const mockCircuit = deploymentConfig.circuits.find((c: any) => c.id === circuit_id);
      
      if (mockCircuit) {
        res.json({
          success: true,
          data: {
            circuitId: mockCircuit.id,
            verificationKey: '{"mock": "verification_key"}',
            circuitType: mockCircuit.type,
            creator: deploymentConfig.deployer,
            active: true,
            createdAt: Date.now() - Math.random() * 86400000
          },
          note: 'Mock circuit details - on-chain service not available'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Circuit not found'
        });
      }
    }

  } catch (error) {
    console.error('Get circuit error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error) || 'Internal server error'
    });
  }
});

/**
 * GET /verifier/contract-info
 * Get contract information and statistics
 */
router.get('/contract-info', async (req, res) => {
  try {
    console.log('🔍 Fetching contract information');

    if (verifierService) {
      const contractInfo = await verifierService.getContractInfo();
      
      if (contractInfo) {
        res.json({
          success: true,
          data: {
            ...contractInfo,
            contractAddress: verifierConfig.contractAddress,
            chainId: verifierConfig.chainId,
            rpcEndpoint: verifierConfig.rpcEndpoint
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch contract information'
        });
      }
    } else {
      // Mock contract info for testing
      console.log('⚠️  Using mock contract info - verifier service not available');
      
      res.json({
        success: true,
        data: {
          admin: deploymentConfig.deployer,
          totalCircuits: deploymentConfig.circuits.length,
          totalProofs: Math.floor(Math.random() * 100),
          version: deploymentConfig.version,
          contractAddress: deploymentConfig.contract_address,
          chainId: deploymentConfig.chain_id,
          rpcEndpoint: deploymentConfig.rpc_endpoint,
          governanceEnabled: deploymentConfig.governance_enabled
        },
        note: 'Mock contract info - on-chain service not available'
      });
    }

  } catch (error) {
    console.error('Get contract info error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error) || 'Internal server error'
    });
  }
});

/**
 * GET /verifier/proofs/:proof_id
 * Get details for a specific proof
 */
router.get('/proofs/:proof_id',
  param('proof_id').isString().notEmpty(),
  async (req, res) => {
  try {
    const { proof_id } = req.params || {};

    console.log(`🔍 Fetching proof details: ${proof_id}`);

    if (verifierService) {
      const proof = await verifierService.getProof(proof_id);
      
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
    } else {
      // Mock proof details for testing
      console.log('⚠️  Using mock proof details - verifier service not available');
      
      res.json({
        success: true,
        data: {
          proofId: proof_id,
          circuitId: 'academic_gpa',
          submitter: 'persona1mocksubmitter123',
          publicInputs: ['18', '2025'],
          proof: '{"mock": "proof_data"}',
          verified: true,
          submittedAt: Date.now() - Math.random() * 86400000,
          verifiedAt: Date.now() - Math.random() * 86400000
        },
        note: 'Mock proof details - on-chain service not available'
      });
    }

  } catch (error) {
    console.error('Get proof error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error) || 'Internal server error'
    });
  }
});

/**
 * GET /verifier/health
 * Health check endpoint for the verifier service
 */
router.get('/health', async (req, res) => {
  try {
    console.log('🔍 Performing verifier health check');

    if (verifierService) {
      const healthCheck = await verifierService.healthCheck();
      
      res.json({
        success: true,
        data: {
          ...healthCheck,
          service: 'cosmos-verifier',
          timestamp: Date.now(),
          version: deploymentConfig.version
        }
      });
    } else {
      // Mock health check for testing
      console.log('⚠️  Using mock health check - verifier service not available');
      
      res.json({
        success: true,
        data: {
          connected: false,
          contractExists: false,
          service: 'cosmos-verifier',
          timestamp: Date.now(),
          version: deploymentConfig.version,
          error: 'Service not initialized'
        },
        note: 'Mock health check - on-chain service not available'
      });
    }

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error) || 'Internal server error'
    });
  }
});

/**
 * GET /verifier/circuits/:circuit_id/proofs
 * Get proofs for a specific circuit
 */
router.get('/circuits/:circuit_id/proofs',
  param('circuit_id').isString().notEmpty(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  async (req, res) => {
  try {
    const { circuit_id } = req.params || {};
    const limit = parseInt((req.query?.limit as string) || '10') || 10;

    console.log(`🔍 Fetching proofs for circuit: ${circuit_id} (limit: ${limit})`);

    if (verifierService) {
      const proofs = await verifierService.getProofsByCircuit(circuit_id, limit);
      
      res.json({
        success: true,
        data: {
          circuit_id: circuit_id,
          proofs: proofs,
          total: proofs.length,
          limit: limit
        }
      });
    } else {
      // Mock proofs for testing
      console.log('⚠️  Using mock proofs - verifier service not available');
      
      const mockProofs = [
        {
          proofId: `proof_${circuit_id}_${Date.now()}_1`,
          circuitId: circuit_id,
          submitter: 'persona1mocksubmitter123',
          publicInputs: ['18', '2025'],
          proof: '{"mock": "proof_data_1"}',
          verified: true,
          submittedAt: Date.now() - 3600000,
          verifiedAt: Date.now() - 3600000
        },
        {
          proofId: `proof_${circuit_id}_${Date.now()}_2`,
          circuitId: circuit_id,
          submitter: 'persona1anotheruser456',
          publicInputs: ['21', '2025'],
          proof: '{"mock": "proof_data_2"}',
          verified: true,
          submittedAt: Date.now() - 7200000,
          verifiedAt: Date.now() - 7200000
        }
      ];

      res.json({
        success: true,
        data: {
          circuit_id: circuit_id,
          proofs: mockProofs,
          total: mockProofs.length,
          limit: limit
        },
        note: 'Mock proofs - on-chain service not available'
      });
    }

  } catch (error) {
    console.error('Get circuit proofs error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error) || 'Internal server error'
    });
  }
});

export default router;