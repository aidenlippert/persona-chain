import { Router } from 'express';
import Joi from 'joi';
import { RealZKProvingService } from '../services/RealZKProvingService';
import { validateRequest } from '../middleware/validation';

const router = Router();
const zkProvingService = new RealZKProvingService();

// Validation schemas
const proofRequestSchema = Joi.object({
  circuitType: Joi.string().valid('academic', 'financial', 'health', 'social', 'government', 'iot', 'universal').required(),
  operation: Joi.string().required(),
  privateInputs: Joi.object().required(),
  publicInputs: Joi.object().required(),
  commitment: Joi.string().optional(),
  merkleProof: Joi.object().optional()
});

const verifyProofSchema = Joi.object({
  proof: Joi.object().required(),
  publicSignals: Joi.array().required(),
  circuitType: Joi.string().valid('academic', 'financial', 'health', 'social', 'government', 'iot', 'universal').required(),
  operation: Joi.string().required()
});

const batchProofSchema = Joi.object({
  requests: Joi.array().items(proofRequestSchema).min(1).max(10).required()
});

/**
 * POST /prove/gpa
 * Generate GPA verification proof
 */
router.post('/prove/gpa', validateRequest(Joi.object({
  gpa: Joi.number().min(0).max(4.0).required().description('GPA value (0.0 - 4.0)'),
  gpa_salt: Joi.string().required().description('Salt for GPA commitment'),
  threshold: Joi.number().min(0).max(4.0).required().description('Minimum GPA threshold'),
  institution_id: Joi.number().required().description('Institution ID'),
  graduation_year: Joi.number().min(1950).max(2030).required().description('Graduation year'),
  merkle_root: Joi.string().required().description('Merkle root of academic credentials'),
  merkle_proof: Joi.array().items(Joi.string()).length(20).optional(),
  merkle_proof_indices: Joi.array().items(Joi.number()).length(20).optional()
})), async (req, res) => {
  try {
    console.log('📚 Processing GPA verification request...');
    
    const { gpa, gpa_salt, threshold, institution_id, graduation_year, merkle_root, merkle_proof, merkle_proof_indices } = req.body;
    
    // Scale GPA to avoid floating point (multiply by 100)
    const scaledGpa = Math.round(gpa * 100);
    const scaledThreshold = Math.round(threshold * 100);
    
    const proofRequest = {
      domain: 'academic',
      operation: 'gpa_verification',
      inputs: {
        gpa: scaledGpa,
        gpa_salt,
        merkle_proof: merkle_proof || Array(20).fill(0),
        merkle_proof_indices: merkle_proof_indices || Array(20).fill(0),
        threshold: scaledThreshold,
        merkle_root,
        institution_id,
        graduation_year
      }
    };
    
    const result = await zkProvingService.generateProof(proofRequest);
    
    res.json({
      success: result.success,
      data: result.success ? {
        proof: result.proof,
        publicInputs: result.publicInputs,
        verified: result.verified,
        proofId: result.proofId,
        circuit: result.circuit,
        domain: result.domain,
        generationTime: result.generationTime,
        constraints: result.constraints
      } : {
        error: result.error,
        proofId: result.proofId
      }
    });
    
  } catch (error) {
    console.error('❌ GPA proof generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate GPA proof',
      details: error.message
    });
  }
});

/**
 * POST /prove/income
 * Generate income verification proof
 */
router.post('/prove/income', validateRequest(Joi.object({
  income: Joi.number().min(0).max(100000000).required().description('Annual income in dollars'),
  income_salt: Joi.string().required().description('Salt for income commitment'),
  verification_method: Joi.number().min(1).max(4).required().description('1=W2, 2=1099, 3=Bank, 4=Tax'),
  tax_year: Joi.number().min(2020).max(2025).required().description('Tax year'),
  threshold: Joi.number().min(0).required().description('Minimum income threshold'),
  merkle_root: Joi.string().required().description('Merkle root of financial credentials'),
  allowed_verification_methods: Joi.number().min(1).max(15).default(15).description('Bitmask of allowed methods'),
  min_tax_year: Joi.number().min(2020).default(2022).description('Minimum acceptable tax year'),
  merkle_proof: Joi.array().items(Joi.string()).length(20).optional(),
  merkle_proof_indices: Joi.array().items(Joi.number()).length(20).optional()
})), async (req, res) => {
  try {
    console.log('💰 Processing income verification request...');
    
    const { 
      income, income_salt, verification_method, tax_year, threshold, 
      merkle_root, allowed_verification_methods, min_tax_year,
      merkle_proof, merkle_proof_indices 
    } = req.body;
    
    // Convert income to cents to avoid floating point
    const incomeInCents = Math.round(income * 100);
    const thresholdInCents = Math.round(threshold * 100);
    
    const proofRequest = {
      circuitType: 'financial' as const,
      operation: 'income_verification',
      privateInputs: {
        income: incomeInCents,
        income_salt,
        verification_method,
        tax_year,
        merkle_proof: merkle_proof || Array(20).fill(0),
        merkle_proof_indices: merkle_proof_indices || Array(20).fill(0)
      },
      publicInputs: {
        threshold: thresholdInCents,
        merkle_root,
        allowed_verification_methods,
        min_tax_year
      }
    };
    
    const result = await zkProvingService.generateProof(proofRequest);
    
    res.json({
      success: true,
      data: {
        proof: result.proof,
        publicSignals: result.publicSignals,
        verification: result.verification,
        proofId: result.proofId,
        metadata: result.metadata
      }
    });
    
  } catch (error) {
    console.error('❌ Income proof generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate income proof',
      details: error.message
    });
  }
});

/**
 * POST /prove/vaccination
 * Generate vaccination verification proof
 */
router.post('/prove/vaccination', validateRequest(Joi.object({
  vaccine_codes: Joi.array().items(Joi.number()).max(10).required().description('CVX vaccine codes'),
  vaccination_dates: Joi.array().items(Joi.number()).max(10).required().description('Vaccination dates (YYYYMMDD)'),
  vaccine_salt: Joi.string().required().description('Salt for vaccination commitment'),
  lot_numbers: Joi.array().items(Joi.number()).max(10).optional().description('Vaccine lot numbers'),
  provider_ids: Joi.array().items(Joi.number()).max(10).optional().description('Healthcare provider IDs'),
  required_vaccines: Joi.number().min(0).required().description('Bitmask of required vaccines'),
  minimum_date: Joi.number().min(20200101).required().description('Minimum vaccination date (YYYYMMDD)'),
  merkle_root: Joi.string().required().description('Merkle root of health credentials'),
  current_date: Joi.number().min(20200101).required().description('Current date (YYYYMMDD)'),
  merkle_proof: Joi.array().items(Joi.string()).length(20).optional(),
  merkle_proof_indices: Joi.array().items(Joi.number()).length(20).optional()
})), async (req, res) => {
  try {
    console.log('💉 Processing vaccination verification request...');
    
    const { 
      vaccine_codes, vaccination_dates, vaccine_salt, lot_numbers, provider_ids,
      required_vaccines, minimum_date, merkle_root, current_date,
      merkle_proof, merkle_proof_indices 
    } = req.body;
    
    // Pad arrays to fixed size
    const paddedVaccineCodes = [...vaccine_codes, ...Array(10 - vaccine_codes.length).fill(0)];
    const paddedVaccinationDates = [...vaccination_dates, ...Array(10 - vaccination_dates.length).fill(0)];
    const paddedLotNumbers = lot_numbers ? 
      [...lot_numbers, ...Array(10 - lot_numbers.length).fill(0)] : 
      Array(10).fill(0);
    const paddedProviderIds = provider_ids ? 
      [...provider_ids, ...Array(10 - provider_ids.length).fill(0)] : 
      Array(10).fill(0);
    
    const proofRequest = {
      circuitType: 'health' as const,
      operation: 'vaccination_verification',
      privateInputs: {
        vaccine_codes: paddedVaccineCodes,
        vaccination_dates: paddedVaccinationDates,
        vaccine_salt,
        lot_numbers: paddedLotNumbers,
        provider_ids: paddedProviderIds,
        merkle_proof: merkle_proof || Array(20).fill(0),
        merkle_proof_indices: merkle_proof_indices || Array(20).fill(0)
      },
      publicInputs: {
        required_vaccines,
        minimum_date,
        merkle_root,
        current_date
      }
    };
    
    const result = await zkProvingService.generateProof(proofRequest);
    
    res.json({
      success: true,
      data: {
        proof: result.proof,
        publicSignals: result.publicSignals,
        verification: result.verification,
        proofId: result.proofId,
        metadata: result.metadata
      }
    });
    
  } catch (error) {
    console.error('❌ Vaccination proof generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate vaccination proof',
      details: error.message
    });
  }
});

/**
 * POST /prove/aggregate
 * Generate aggregate proof across multiple domains
 */
router.post('/prove/aggregate', validateRequest(Joi.object({
  domain_proofs: Joi.array().items(Joi.number()).max(8).required().description('Domain proof results'),
  domain_commitments: Joi.array().items(Joi.string()).max(8).required().description('Domain commitments'),
  aggregate_salt: Joi.string().required().description('Salt for aggregate commitment'),
  required_domains: Joi.number().min(0).required().description('Bitmask of required domains'),
  aggregate_merkle_root: Joi.string().required().description('Aggregate Merkle root'),
  verification_policy: Joi.number().min(0).required().description('Verification policy'),
  current_time: Joi.number().min(0).required().description('Current timestamp'),
  expiration_time: Joi.number().min(0).required().description('Expiration timestamp'),
  merkle_proofs: Joi.array().items(Joi.array().items(Joi.string()).length(20)).max(8).optional(),
  merkle_proof_indices: Joi.array().items(Joi.array().items(Joi.number()).length(20)).max(8).optional()
})), async (req, res) => {
  try {
    console.log('🔄 Processing aggregate proof request...');
    
    const { 
      domain_proofs, domain_commitments, aggregate_salt, required_domains,
      aggregate_merkle_root, verification_policy, current_time, expiration_time,
      merkle_proofs, merkle_proof_indices 
    } = req.body;
    
    // Pad arrays to fixed size
    const paddedDomainProofs = [...domain_proofs, ...Array(8 - domain_proofs.length).fill(0)];
    const paddedDomainCommitments = [...domain_commitments, ...Array(8 - domain_commitments.length).fill('0')];
    const paddedMerkleProofs = merkle_proofs || Array(8).fill(Array(20).fill('0'));
    const paddedMerkleIndices = merkle_proof_indices || Array(8).fill(Array(20).fill(0));
    
    const proofRequest = {
      circuitType: 'universal' as const,
      operation: 'aggregate_proof',
      privateInputs: {
        domain_proofs: paddedDomainProofs,
        domain_commitments: paddedDomainCommitments,
        aggregate_salt,
        merkle_proofs: paddedMerkleProofs,
        merkle_proof_indices: paddedMerkleIndices
      },
      publicInputs: {
        required_domains,
        aggregate_merkle_root,
        verification_policy,
        current_time,
        expiration_time
      }
    };
    
    const result = await zkProvingService.generateProof(proofRequest);
    
    res.json({
      success: true,
      data: {
        proof: result.proof,
        publicSignals: result.publicSignals,
        verification: result.verification,
        proofId: result.proofId,
        metadata: result.metadata
      }
    });
    
  } catch (error) {
    console.error('❌ Aggregate proof generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate aggregate proof',
      details: error.message
    });
  }
});

/**
 * POST /verify
 * Verify a zero-knowledge proof
 */
router.post('/verify', validateRequest(verifyProofSchema), async (req, res) => {
  try {
    const { proof, publicSignals, circuitType, operation } = req.body;
    
    console.log(`🔍 Verifying ${circuitType} ${operation} proof...`);
    
    const isValid = await zkProvingService.verifyProof(proof, publicSignals, circuitType, operation);
    
    res.json({
      success: true,
      data: {
        valid: isValid,
        circuitType,
        operation,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error('❌ Proof verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify proof',
      details: error.message
    });
  }
});

/**
 * POST /prove/batch
 * Generate multiple proofs in batch
 */
router.post('/prove/batch', validateRequest(batchProofSchema), async (req, res) => {
  try {
    const { requests } = req.body;
    
    console.log(`🔄 Processing batch of ${requests.length} proof requests...`);
    
    const results = await zkProvingService.generateBatchProof(requests);
    
    res.json({
      success: true,
      data: {
        proofs: results,
        batchSize: results.length,
        totalTime: results.reduce((sum, r) => sum + (r.metadata?.actualTime || 0), 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Batch proof generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate batch proofs',
      details: error.message
    });
  }
});

/**
 * GET /circuits
 * Get information about available circuits
 */
router.get('/circuits', async (req, res) => {
  try {
    const circuits = zkProvingService.getAllCircuits();
    const circuitList = Array.from(circuits.entries()).map(([key, info]) => ({
      key,
      name: info.name,
      constraints: info.constraints,
      estimatedProvingTime: info.estimatedProvingTime
    }));
    
    res.json({
      success: true,
      data: {
        circuits: circuitList,
        totalCircuits: circuits.size
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to get circuits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit information'
    });
  }
});

/**
 * GET /circuits/:circuitType/:operation
 * Get specific circuit information
 */
router.get('/circuits/:circuitType/:operation', async (req, res) => {
  try {
    const { circuitType, operation } = req.params;
    
    const circuitInfo = zkProvingService.getCircuitInfo(circuitType, operation);
    
    if (!circuitInfo) {
      return res.status(404).json({
        success: false,
        error: 'Circuit not found'
      });
    }
    
    res.json({
      success: true,
      data: circuitInfo
    });
    
  } catch (error) {
    console.error('❌ Failed to get circuit info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit information'
    });
  }
});

/**
 * GET /statistics
 * Get proving service statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = zkProvingService.getStatistics();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Failed to get statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

export { router as provingRoutes };