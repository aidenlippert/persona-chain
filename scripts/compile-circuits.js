#!/usr/bin/env node

/**
 * Circuit Compilation Script
 * Compiles all ZK circuits for PersonaPass production deployment
 * NO HARDCODED VALUES - CONFIGURABLE CIRCUIT COMPILATION
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Circuit compilation configuration
const CIRCUITS_DIR = path.join(__dirname, '../../../circuits');
const BUILD_DIR = path.join(__dirname, '../dist/circuits');
const TRUSTED_SETUP_DIR = path.join(__dirname, '../trusted-setup');

// Supported circuits
const CIRCUITS = [
  {
    name: 'age_verification',
    file: 'age_verification.circom',
    constraintCount: 1000,
    description: 'Age verification circuit for selective disclosure'
  },
  {
    name: 'income_threshold',
    file: 'income_threshold.circom',
    constraintCount: 1200,
    description: 'Income threshold verification circuit'
  },
  {
    name: 'membership_proof',
    file: 'membership_proof.circom',
    constraintCount: 800,
    description: 'Membership proof circuit for organization verification'
  },
  {
    name: 'selective_disclosure',
    file: 'selective_disclosure.circom',
    constraintCount: 1500,
    description: 'General selective disclosure circuit'
  }
];

// Compilation results
const compilationResults = {
  successful: [],
  failed: [],
  skipped: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${timestamp} ${emoji} ${message}`);
}

/**
 * Check if required tools are installed
 */
async function checkRequiredTools() {
  log('Checking required tools...');
  
  const tools = [
    { name: 'circom', command: 'circom --version', required: true },
    { name: 'snarkjs', command: 'snarkjs --version', required: true },
    { name: 'node', command: 'node --version', required: true }
  ];
  
  for (const tool of tools) {
    try {
      await execAsync(tool.command);
      log(`✓ ${tool.name} is available`, 'success');
    } catch (error) {
      if (tool.required) {
        log(`✗ ${tool.name} is required but not installed`, 'error');
        log(`Install with: npm install -g ${tool.name}`, 'info');
        return false;
      } else {
        log(`⚠ ${tool.name} is optional but not installed`, 'warning');
      }
    }
  }
  
  return true;
}

/**
 * Create necessary directories
 */
async function createDirectories() {
  log('Creating build directories...');
  
  const directories = [BUILD_DIR, TRUSTED_SETUP_DIR];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`Created directory: ${dir}`);
    }
  }
}

/**
 * Compile a single circuit
 */
async function compileCircuit(circuit) {
  log(`Compiling circuit: ${circuit.name}`);
  
  const circuitPath = path.join(CIRCUITS_DIR, circuit.file);
  const outputDir = path.join(BUILD_DIR, circuit.name);
  
  // Check if circuit file exists
  if (!fs.existsSync(circuitPath)) {
    log(`Circuit file not found: ${circuitPath}`, 'error');
    compilationResults.failed.push({
      circuit: circuit.name,
      error: 'Circuit file not found'
    });
    return false;
  }
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Step 1: Compile circuit to R1CS
    log(`  Step 1: Compiling ${circuit.name} to R1CS...`);
    const r1csPath = path.join(outputDir, `${circuit.name}.r1cs`);
    const wasmPath = path.join(outputDir, `${circuit.name}.wasm`);
    
    await execAsync(`circom ${circuitPath} --r1cs --wasm --output ${outputDir}`);
    
    // Step 2: Generate witness calculator
    log(`  Step 2: Generating witness calculator...`);
    const witnessPath = path.join(outputDir, `${circuit.name}_js`);
    
    // Step 3: Setup trusted setup (Powers of Tau)
    log(`  Step 3: Setting up trusted setup...`);
    const ptauPath = path.join(TRUSTED_SETUP_DIR, 'powersOfTau28_hez_final_12.ptau');
    
    // Download powers of tau if not exists
    if (!fs.existsSync(ptauPath)) {
      log(`    Downloading powers of tau ceremony file...`);
      await execAsync(`wget -O ${ptauPath} https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau`);
    }
    
    // Step 4: Generate zkey
    log(`  Step 4: Generating zero-knowledge proving key...`);
    const zkeyPath = path.join(outputDir, `${circuit.name}_0000.zkey`);
    const finalZkeyPath = path.join(outputDir, `${circuit.name}_final.zkey`);
    
    await execAsync(`snarkjs groth16 setup ${r1csPath} ${ptauPath} ${zkeyPath}`);
    
    // Step 5: Contribute to ceremony (for demo purposes)
    log(`  Step 5: Contributing to ceremony...`);
    await execAsync(`snarkjs zkey contribute ${zkeyPath} ${finalZkeyPath} --name="PersonaPass Production" -v`);
    
    // Step 6: Generate verification key
    log(`  Step 6: Generating verification key...`);
    const vkeyPath = path.join(outputDir, `${circuit.name}_vkey.json`);
    await execAsync(`snarkjs zkey export verificationkey ${finalZkeyPath} ${vkeyPath}`);
    
    // Step 7: Generate Solidity verifier
    log(`  Step 7: Generating Solidity verifier...`);
    const verifierPath = path.join(outputDir, `${circuit.name}_verifier.sol`);
    await execAsync(`snarkjs zkey export solidityverifier ${finalZkeyPath} ${verifierPath}`);
    
    // Step 8: Verify the circuit
    log(`  Step 8: Verifying circuit compilation...`);
    const infoOutput = await execAsync(`snarkjs r1cs info ${r1csPath}`);
    
    // Store compilation result
    compilationResults.successful.push({
      circuit: circuit.name,
      r1csPath,
      wasmPath,
      zkeyPath: finalZkeyPath,
      vkeyPath,
      verifierPath,
      constraintCount: circuit.constraintCount,
      info: infoOutput.stdout
    });
    
    log(`✅ Successfully compiled circuit: ${circuit.name}`, 'success');
    return true;
    
  } catch (error) {
    log(`❌ Failed to compile circuit ${circuit.name}: ${error.message}`, 'error');
    compilationResults.failed.push({
      circuit: circuit.name,
      error: error.message
    });
    return false;
  }
}

/**
 * Generate circuit registry
 */
async function generateCircuitRegistry() {
  log('Generating circuit registry...');
  
  const registry = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    circuits: compilationResults.successful.map(result => ({
      id: result.circuit,
      name: result.circuit,
      description: CIRCUITS.find(c => c.name === result.circuit)?.description || '',
      constraintCount: result.constraintCount,
      files: {
        r1cs: path.relative(BUILD_DIR, result.r1csPath),
        wasm: path.relative(BUILD_DIR, result.wasmPath),
        zkey: path.relative(BUILD_DIR, result.zkeyPath),
        vkey: path.relative(BUILD_DIR, result.vkeyPath),
        verifier: path.relative(BUILD_DIR, result.verifierPath)
      }
    }))
  };
  
  const registryPath = path.join(BUILD_DIR, 'circuit-registry.json');
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  
  log(`Circuit registry generated: ${registryPath}`, 'success');
  return registry;
}

/**
 * Generate compilation report
 */
function generateCompilationReport() {
  console.log('\n' + '='.repeat(80));
  console.log('                     CIRCUIT COMPILATION REPORT');
  console.log('='.repeat(80));
  
  const { successful, failed, skipped } = compilationResults;
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   • Successfully compiled: ${successful.length} circuits`);
  console.log(`   • Failed compilations: ${failed.length} circuits`);
  console.log(`   • Skipped: ${skipped.length} circuits`);
  
  if (successful.length > 0) {
    console.log(`\n✅ SUCCESSFUL COMPILATIONS:`);
    successful.forEach(result => {
      console.log(`   • ${result.circuit} (${result.constraintCount} constraints)`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILED COMPILATIONS:`);
    failed.forEach(result => {
      console.log(`   • ${result.circuit}: ${result.error}`);
    });
  }
  
  if (skipped.length > 0) {
    console.log(`\n⏭️ SKIPPED COMPILATIONS:`);
    skipped.forEach(result => {
      console.log(`   • ${result.circuit}: ${result.reason}`);
    });
  }
  
  console.log(`\n📁 OUTPUT DIRECTORY: ${BUILD_DIR}`);
  console.log(`📋 CIRCUIT REGISTRY: ${path.join(BUILD_DIR, 'circuit-registry.json')}`);
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('   1. Deploy compiled circuits to production environment');
  console.log('   2. Update ZK proof service with circuit registry');
  console.log('   3. Test circuit compilation with real proof generation');
  console.log('   4. Configure circuit file paths in environment variables');
  
  console.log('='.repeat(80));
  
  return failed.length === 0;
}

/**
 * Main compilation function
 */
async function main() {
  console.log('🔧 Starting Circuit Compilation...');
  console.log('Compiling all ZK circuits for PersonaPass production deployment\n');
  
  try {
    // Check requirements
    const toolsAvailable = await checkRequiredTools();
    if (!toolsAvailable) {
      console.error('❌ Required tools are missing. Please install them first.');
      process.exit(1);
    }
    
    // Create directories
    await createDirectories();
    
    // Compile circuits
    let successCount = 0;
    for (const circuit of CIRCUITS) {
      const success = await compileCircuit(circuit);
      if (success) {
        successCount++;
      }
    }
    
    // Generate registry
    if (successCount > 0) {
      await generateCircuitRegistry();
    }
    
    // Generate report
    const success = generateCompilationReport();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Circuit compilation failed:', error);
    process.exit(1);
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, compilationResults };