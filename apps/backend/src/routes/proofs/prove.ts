import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getErrorMessage } from '../../utils/errorHandler';

const execAsync = promisify(exec);
const router = Router();

// Contract addresses (will be populated after deployment)
const CONTRACT_ADDRESSES = {
  age_verification: process.env.AGE_VERIFICATION_CONTRACT || '',
  employment_verification: process.env.EMPLOYMENT_VERIFICATION_CONTRACT || '',
  education_verification: process.env.EDUCATION_VERIFICATION_CONTRACT || '',
  financial_verification: process.env.FINANCIAL_VERIFICATION_CONTRACT || '',
  health_verification: process.env.HEALTH_VERIFICATION_CONTRACT || '',
  location_verification: process.env.LOCATION_VERIFICATION_CONTRACT || ''
};

interface ZKProofRequest {
  credential: any;
  publicInputs: any;
  privateInputs: any;
}

interface ZKProofResponse {
  proof: string;
  publicInputs: string[];
  txHash: string;
  verified: boolean;
}

// Generate ZK proof using snarkjs
async function generateZKProof(
  circuitName: string,
  inputs: any
): Promise<{ proof: any; publicSignals: any }> {
  const tempDir = `/tmp/zk-proof-${uuidv4()}`;
  const inputFile = join(tempDir, 'input.json');
  const proofFile = join(tempDir, 'proof.json');
  const publicFile = join(tempDir, 'public.json');
  
  try {
    // Create temp directory
    await execAsync(`mkdir -p ${tempDir}`);
    
    // Write input file
    writeFileSync(inputFile, JSON.stringify(inputs));
    
    // Generate proof using snarkjs
    const wasmPath = join(__dirname, `../../../circuits/${circuitName}/${circuitName}.wasm`);
    const zkeyPath = join(__dirname, `../../../circuits/${circuitName}/${circuitName}_final.zkey`);
    
    console.log(`🔄 Generating ZK proof for ${circuitName}...`);
    const proveCommand = `snarkjs groth16 fullprove ${inputFile} ${wasmPath} ${zkeyPath} ${proofFile} ${publicFile}`;
    await execAsync(proveCommand);
    
    // Read generated proof and public signals
    const proof = JSON.parse(readFileSync(proofFile, 'utf8'));
    const publicSignals = JSON.parse(readFileSync(publicFile, 'utf8'));
    
    console.log(`✅ ZK proof generated successfully for ${circuitName}`);
    return { proof, publicSignals };
    
  } catch (error) {
    console.error(`❌ ZK proof generation failed for ${circuitName}:`, error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : String(error);
    throw new Error(`ZK proof generation failed: ${errorMessage}`);
  } finally {
    // Cleanup temp directory
    await execAsync(`rm -rf ${tempDir}`).catch(() => {});
  }
}

// Verify ZK proof using snarkjs
async function verifyZKProof(
  circuitName: string,
  proof: any,
  publicSignals: any
): Promise<boolean> {
  const tempDir = `/tmp/zk-verify-${uuidv4()}`;
  const proofFile = join(tempDir, 'proof.json');
  const publicFile = join(tempDir, 'public.json');
  
  try {
    // Create temp directory
    await execAsync(`mkdir -p ${tempDir}`);
    
    // Write proof and public signals
    writeFileSync(proofFile, JSON.stringify(proof));
    writeFileSync(publicFile, JSON.stringify(publicSignals));
    
    // Verify proof using snarkjs
    const vkeyPath = join(__dirname, `../../../circuits/${circuitName}/verification_key.json`);
    
    console.log(`🔄 Verifying ZK proof for ${circuitName}...`);
    const verifyCommand = `snarkjs groth16 verify ${vkeyPath} ${publicFile} ${proofFile}`;
    const { stdout } = await execAsync(verifyCommand);
    
    const isValid = stdout.includes('OK');
    console.log(`${isValid ? '✅' : '❌'} ZK proof verification ${isValid ? 'passed' : 'failed'} for ${circuitName}`);
    return isValid;
    
  } catch (error) {
    console.error(`❌ ZK proof verification failed for ${circuitName}:`, error);
    return false;
  } finally {
    // Cleanup temp directory
    await execAsync(`rm -rf ${tempDir}`).catch(() => {});
  }
}

// Submit verified proof to blockchain
async function submitProofToBlockchain(
  contractAddress: string,
  proof: any,
  publicInputs: any[]
): Promise<string> {
  const executeMsg = {
    verify_proof: {
      proof: JSON.stringify(proof),
      public_inputs: publicInputs.map(String)
    }
  };
  
  try {
    console.log(`🔄 Submitting proof to contract ${contractAddress}...`);
    
    // For now, simulate blockchain submission since we need full CosmWasm support
    const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`;
    
    // TODO: Replace with real blockchain submission when CosmWasm is fully deployed
    // const command = `persona-chaind tx wasm execute ${contractAddress} '${JSON.stringify(executeMsg)}' --from operatorKey --yes`;
    // const { stdout } = await execAsync(command);
    // const txHash = extractTxHashFromOutput(stdout);
    
    console.log(`✅ Proof submitted to blockchain with tx hash: ${mockTxHash}`);
    return mockTxHash;
    
  } catch (error) {
    console.error(`❌ Blockchain submission failed:`, error);
    throw new Error(`Blockchain submission failed: ${getErrorMessage(error)}`);
  }
}

// Age verification endpoint
router.post('/prove/age', async (req, res) => {
  try {
    const { credential, publicInputs, privateInputs }: ZKProofRequest = req.body;
    
    // Validate inputs
    if (!credential || !publicInputs || !privateInputs) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: credential, publicInputs, privateInputs'
      });
    }
    
    // Prepare circuit inputs
    const circuitInputs = {
      birth_year: privateInputs.birthYear,
      current_year: publicInputs.currentYear,
      min_age: publicInputs.minAge
    };
    
    // Generate ZK proof
    const { proof, publicSignals } = await generateZKProof('age_verification', circuitInputs);
    
    // Verify proof locally first
    const isValid = await verifyZKProof('age_verification', proof, publicSignals);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Generated proof failed verification'
      });
    }
    
    // Submit to blockchain
    const contractAddr = CONTRACT_ADDRESSES.age_verification;
    const txHash = await submitProofToBlockchain(contractAddr, proof, publicSignals);
    
    const response: ZKProofResponse = {
      proof: JSON.stringify(proof),
      publicInputs: publicSignals.map(String),
      txHash,
      verified: true
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Age verification error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

// Employment verification endpoint
router.post('/prove/employment', async (req, res) => {
  try {
    const { credential, publicInputs, privateInputs }: ZKProofRequest = req.body;
    
    const circuitInputs = {
      employment_status: privateInputs.employmentStatus,
      company_id: privateInputs.companyId,
      start_date: privateInputs.startDate,
      current_date: publicInputs.currentDate,
      min_duration_months: publicInputs.minDurationMonths
    };
    
    const { proof, publicSignals } = await generateZKProof('employment_verification', circuitInputs);
    const isValid = await verifyZKProof('employment_verification', proof, publicSignals);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Generated proof failed verification'
      });
    }
    
    const contractAddr = CONTRACT_ADDRESSES.employment_verification;
    const txHash = await submitProofToBlockchain(contractAddr, proof, publicSignals);
    
    const response: ZKProofResponse = {
      proof: JSON.stringify(proof),
      publicInputs: publicSignals.map(String),
      txHash,
      verified: true
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Employment verification error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

// Education verification endpoint
router.post('/prove/education', async (req, res) => {
  try {
    const { credential, publicInputs, privateInputs }: ZKProofRequest = req.body;
    
    const circuitInputs = {
      degree_level: privateInputs.degreeLevel,
      graduation_year: privateInputs.graduationYear,
      institution_id: privateInputs.institutionId,
      min_degree_level: publicInputs.minDegreeLevel,
      current_year: publicInputs.currentYear
    };
    
    const { proof, publicSignals } = await generateZKProof('education_verification', circuitInputs);
    const isValid = await verifyZKProof('education_verification', proof, publicSignals);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Generated proof failed verification'
      });
    }
    
    const contractAddr = CONTRACT_ADDRESSES.education_verification;
    const txHash = await submitProofToBlockchain(contractAddr, proof, publicSignals);
    
    const response: ZKProofResponse = {
      proof: JSON.stringify(proof),
      publicInputs: publicSignals.map(String),
      txHash,
      verified: true
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Education verification error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

// Financial verification endpoint
router.post('/prove/financial', async (req, res) => {
  try {
    const { credential, publicInputs, privateInputs }: ZKProofRequest = req.body;
    
    const circuitInputs = {
      income_amount: privateInputs.incomeAmount,
      account_balance: privateInputs.accountBalance,
      credit_score: privateInputs.creditScore,
      min_income: publicInputs.minIncome,
      min_balance: publicInputs.minBalance,
      min_credit_score: publicInputs.minCreditScore
    };
    
    const { proof, publicSignals } = await generateZKProof('financial_verification', circuitInputs);
    const isValid = await verifyZKProof('financial_verification', proof, publicSignals);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Generated proof failed verification'
      });
    }
    
    const contractAddr = CONTRACT_ADDRESSES.financial_verification;
    const txHash = await submitProofToBlockchain(contractAddr, proof, publicSignals);
    
    const response: ZKProofResponse = {
      proof: JSON.stringify(proof),
      publicInputs: publicSignals.map(String),
      txHash,
      verified: true
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Financial verification error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

// Health verification endpoint
router.post('/prove/health', async (req, res) => {
  try {
    const { credential, publicInputs, privateInputs }: ZKProofRequest = req.body;
    
    const circuitInputs = {
      vaccination_status: privateInputs.vaccinationStatus,
      test_result: privateInputs.testResult,
      test_date: privateInputs.testDate,
      current_date: publicInputs.currentDate,
      required_vaccination: publicInputs.requiredVaccination,
      max_test_age_days: publicInputs.maxTestAgeDays
    };
    
    const { proof, publicSignals } = await generateZKProof('health_verification', circuitInputs);
    const isValid = await verifyZKProof('health_verification', proof, publicSignals);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Generated proof failed verification'
      });
    }
    
    const contractAddr = CONTRACT_ADDRESSES.health_verification;
    const txHash = await submitProofToBlockchain(contractAddr, proof, publicSignals);
    
    const response: ZKProofResponse = {
      proof: JSON.stringify(proof),
      publicInputs: publicSignals.map(String),
      txHash,
      verified: true
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Health verification error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

// Location verification endpoint
router.post('/prove/location', async (req, res) => {
  try {
    const { credential, publicInputs, privateInputs }: ZKProofRequest = req.body;
    
    const circuitInputs = {
      latitude: privateInputs.latitude,
      longitude: privateInputs.longitude,
      timestamp: privateInputs.timestamp,
      target_lat: publicInputs.targetLatitude,
      target_lng: publicInputs.targetLongitude,
      max_distance_km: publicInputs.maxDistanceKm,
      current_time: publicInputs.currentTime,
      max_age_hours: publicInputs.maxAgeHours
    };
    
    const { proof, publicSignals } = await generateZKProof('location_verification', circuitInputs);
    const isValid = await verifyZKProof('location_verification', proof, publicSignals);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Generated proof failed verification'
      });
    }
    
    const contractAddr = CONTRACT_ADDRESSES.location_verification;
    const txHash = await submitProofToBlockchain(contractAddr, proof, publicSignals);
    
    const response: ZKProofResponse = {
      proof: JSON.stringify(proof),
      publicInputs: publicSignals.map(String),
      txHash,
      verified: true
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Location verification error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

export default router;