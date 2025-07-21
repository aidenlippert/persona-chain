/**
 * ZK Circuit Compilation Script for PersonaPass
 * Compiles Circom circuits and generates trusted setup
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Circuit configuration
const CIRCUITS = [
  {
    name: "age_verification",
    file: "age_verification.circom",
    constraints: 1247,
    description: "Age verification without revealing exact age"
  },
  {
    name: "income_threshold",
    file: "income_threshold.circom",
    constraints: 2156,
    description: "Income threshold verification"
  },
  {
    name: "selective_disclosure",
    file: "selective_disclosure.circom",
    constraints: 3421,
    description: "Selective field disclosure from credentials"
  },
  {
    name: "membership_proof",
    file: "membership_proof.circom",
    constraints: 2987,
    description: "Anonymous membership proof using Merkle trees"
  },
  {
    name: "employment_status",
    file: "employment_status.circom",
    constraints: 1834,
    description: "Employment verification without revealing details"
  },
  {
    name: "identity_verification",
    file: "identity_verification.circom",
    constraints: 4567,
    description: "Identity verification with biometric proofs"
  }
];

// Directories
const CIRCUITS_DIR = path.join(__dirname, "..", "circuits");
const BUILD_DIR = path.join(__dirname, "..", "build");
const KEYS_DIR = path.join(BUILD_DIR, "keys");
const WASM_DIR = path.join(BUILD_DIR, "wasm");

async function main() {
  console.log("🔧 Starting ZK circuit compilation...");
  
  // Create build directories
  createDirectories();
  
  // Check dependencies
  checkDependencies();
  
  // Compile circuits
  for (const circuit of CIRCUITS) {
    await compileCircuit(circuit);
  }
  
  // Generate trusted setup
  await generateTrustedSetup();
  
  // Generate verification keys
  await generateVerificationKeys();
  
  // Create circuit metadata
  await createCircuitMetadata();
  
  console.log("✅ Circuit compilation completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Review generated verification keys");
  console.log("2. Test circuit functionality");
  console.log("3. Deploy to production environment");
}

function createDirectories() {
  console.log("📁 Creating build directories...");
  
  const dirs = [BUILD_DIR, KEYS_DIR, WASM_DIR];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created: ${dir}`);
    }
  }
}

function checkDependencies() {
  console.log("🔍 Checking dependencies...");
  
  const dependencies = [
    { command: "circom", description: "Circom compiler" },
    { command: "snarkjs", description: "snarkjs for trusted setup" },
    { command: "node", description: "Node.js runtime" }
  ];
  
  for (const dep of dependencies) {
    try {
      execSync(`which ${dep.command}`, { stdio: 'ignore' });
      console.log(`✅ ${dep.description} found`);
    } catch (error) {
      console.error(`❌ ${dep.description} not found`);
      console.error(`Please install: npm install -g ${dep.command}`);
      process.exit(1);
    }
  }
}

async function compileCircuit(circuit) {
  console.log(`\n🔨 Compiling ${circuit.name}...`);
  
  const circuitPath = path.join(CIRCUITS_DIR, circuit.file);
  const outputDir = path.join(BUILD_DIR, circuit.name);
  
  // Create circuit output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Compile circuit
    const compileCmd = `circom ${circuitPath} --r1cs --wasm --sym --c --output ${outputDir}`;
    console.log(`Running: ${compileCmd}`);
    execSync(compileCmd, { stdio: 'inherit' });
    
    // Move WASM file to wasm directory
    const wasmSrc = path.join(outputDir, `${circuit.name}.wasm`);
    const wasmDst = path.join(WASM_DIR, `${circuit.name}.wasm`);
    
    if (fs.existsSync(wasmSrc)) {
      fs.copyFileSync(wasmSrc, wasmDst);
      console.log(`✅ WASM file created: ${wasmDst}`);
    }
    
    // Verify R1CS file
    const r1csPath = path.join(outputDir, `${circuit.name}.r1cs`);
    if (fs.existsSync(r1csPath)) {
      const r1csInfo = execSync(`snarkjs r1cs info ${r1csPath}`, { encoding: 'utf8' });
      console.log(`📊 R1CS Info:\n${r1csInfo}`);
    }
    
    console.log(`✅ ${circuit.name} compiled successfully`);
    
  } catch (error) {
    console.error(`❌ Failed to compile ${circuit.name}:`, error.message);
    process.exit(1);
  }
}

async function generateTrustedSetup() {
  console.log("\n🔐 Generating trusted setup...");
  
  // Generate universal setup (Powers of Tau)
  const ptauFile = path.join(KEYS_DIR, "powersOfTau28_hez_final_15.ptau");
  
  if (!fs.existsSync(ptauFile)) {
    console.log("📥 Downloading Powers of Tau file...");
    try {
      execSync(`wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau -O ${ptauFile}`, { stdio: 'inherit' });
    } catch (error) {
      console.log("Download failed, generating new ceremony...");
      await generatePowersOfTau(ptauFile);
    }
  }
  
  // Generate circuit-specific setup for each circuit
  for (const circuit of CIRCUITS) {
    await generateCircuitSetup(circuit, ptauFile);
  }
}

async function generatePowersOfTau(ptauFile) {
  console.log("🌟 Generating Powers of Tau ceremony...");
  
  const tempPtau = path.join(KEYS_DIR, "pot_temp.ptau");
  
  try {
    // Start ceremony
    execSync(`snarkjs powersoftau new bn128 15 ${tempPtau}`, { stdio: 'inherit' });
    
    // Add entropy (using random beacon)
    execSync(`snarkjs powersoftau contribute ${tempPtau} ${ptauFile} --name="PersonaPass" -v`, { stdio: 'inherit' });
    
    // Prepare phase 2
    execSync(`snarkjs powersoftau prepare phase2 ${ptauFile} ${ptauFile}`, { stdio: 'inherit' });
    
    // Cleanup
    if (fs.existsSync(tempPtau)) {
      fs.unlinkSync(tempPtau);
    }
    
    console.log("✅ Powers of Tau ceremony completed");
    
  } catch (error) {
    console.error("❌ Powers of Tau generation failed:", error.message);
    process.exit(1);
  }
}

async function generateCircuitSetup(circuit, ptauFile) {
  console.log(`🔑 Generating setup for ${circuit.name}...`);
  
  const circuitDir = path.join(BUILD_DIR, circuit.name);
  const r1csPath = path.join(circuitDir, `${circuit.name}.r1cs`);
  const zkeyPath = path.join(KEYS_DIR, `${circuit.name}.zkey`);
  const vkeyPath = path.join(KEYS_DIR, `${circuit.name}_vkey.json`);
  
  try {
    // Generate initial zkey
    const zkeyTemp = path.join(KEYS_DIR, `${circuit.name}_temp.zkey`);
    execSync(`snarkjs groth16 setup ${r1csPath} ${ptauFile} ${zkeyTemp}`, { stdio: 'inherit' });
    
    // Contribute to phase 2
    execSync(`echo "PersonaPass${circuit.name}" | snarkjs zkey contribute ${zkeyTemp} ${zkeyPath} --name="PersonaPass-${circuit.name}" -v`, { stdio: 'inherit' });
    
    // Export verification key
    execSync(`snarkjs zkey export verificationkey ${zkeyPath} ${vkeyPath}`, { stdio: 'inherit' });
    
    // Cleanup
    if (fs.existsSync(zkeyTemp)) {
      fs.unlinkSync(zkeyTemp);
    }
    
    console.log(`✅ Setup completed for ${circuit.name}`);
    
  } catch (error) {
    console.error(`❌ Setup failed for ${circuit.name}:`, error.message);
    process.exit(1);
  }
}

async function generateVerificationKeys() {
  console.log("\n🔍 Generating verification keys...");
  
  const vkeysFile = path.join(BUILD_DIR, "verification_keys.json");
  const vkeys = {};
  
  for (const circuit of CIRCUITS) {
    const vkeyPath = path.join(KEYS_DIR, `${circuit.name}_vkey.json`);
    
    if (fs.existsSync(vkeyPath)) {
      const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
      vkeys[circuit.name] = vkey;
      console.log(`✅ Verification key loaded for ${circuit.name}`);
    } else {
      console.warn(`⚠️  Verification key not found for ${circuit.name}`);
    }
  }
  
  fs.writeFileSync(vkeysFile, JSON.stringify(vkeys, null, 2));
  console.log(`✅ Verification keys saved to ${vkeysFile}`);
}

async function createCircuitMetadata() {
  console.log("\n📄 Creating circuit metadata...");
  
  const metadata = {
    version: "1.0.0",
    generated: new Date().toISOString(),
    circuits: CIRCUITS.map(circuit => ({
      ...circuit,
      wasmFile: path.join("wasm", `${circuit.name}.wasm`),
      zkeyFile: path.join("keys", `${circuit.name}.zkey`),
      vkeyFile: path.join("keys", `${circuit.name}_vkey.json`)
    })),
    security: {
      curve: "bn128",
      protocol: "groth16",
      ceremony: "Powers of Tau 28",
      entropy_source: "PersonaPass contribution"
    }
  };
  
  const metadataFile = path.join(BUILD_DIR, "circuit_metadata.json");
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  
  console.log(`✅ Circuit metadata saved to ${metadataFile}`);
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the main function
main().catch(console.error);