#!/usr/bin/env node

/**
 * Contract Compilation Script
 * Compiles Solidity contracts and generates ABIs for TypeScript integration
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Contract paths
const contractsDir = path.join(__dirname, '..', 'contracts');
const abiOutputDir = path.join(__dirname, '..', 'src', 'contracts', 'abi');

// Ensure output directory exists
if (!fs.existsSync(abiOutputDir)) {
  fs.mkdirSync(abiOutputDir, { recursive: true });
}

// Contract sources
const contracts = {
  'PERSToken.sol': fs.readFileSync(path.join(contractsDir, 'PERSToken.sol'), 'utf8'),
  'PERSStaking.sol': fs.readFileSync(path.join(contractsDir, 'PERSStaking.sol'), 'utf8'),
  'PERSRewards.sol': fs.readFileSync(path.join(contractsDir, 'PERSRewards.sol'), 'utf8'),
};

// OpenZeppelin contracts imports (simplified for demo)
const imports = {
  '@openzeppelin/contracts/token/ERC20/ERC20.sol': { content: '// ERC20 interface' },
  '@openzeppelin/contracts/token/ERC20/IERC20.sol': { content: '// IERC20 interface' },
  '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol': { content: '// ERC20Burnable' },
  '@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol': { content: '// ERC20Snapshot' },
  '@openzeppelin/contracts/access/Ownable.sol': { content: '// Ownable' },
  '@openzeppelin/contracts/access/AccessControl.sol': { content: '// AccessControl' },
  '@openzeppelin/contracts/security/Pausable.sol': { content: '// Pausable' },
  '@openzeppelin/contracts/security/ReentrancyGuard.sol': { content: '// ReentrancyGuard' },
};

// Compile settings
const input = {
  language: 'Solidity',
  sources: Object.entries(contracts).reduce((acc, [name, content]) => {
    acc[name] = { content };
    return acc;
  }, {}),
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'metadata', 'devdoc', 'userdoc', 'storageLayout', 'evm.legacyAssembly'],
      },
    },
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

function findImports(path) {
  if (imports[path]) {
    return imports[path];
  }
  return { error: 'File not found' };
}

console.log('Compiling contracts...');

// Compile
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

// Check for errors
if (output.errors) {
  output.errors.forEach((err) => {
    if (err.severity === 'error') {
      console.error('Error:', err.formattedMessage);
    } else {
      console.warn('Warning:', err.formattedMessage);
    }
  });
  
  const hasErrors = output.errors.some(err => err.severity === 'error');
  if (hasErrors) {
    console.error('Compilation failed with errors');
    process.exit(1);
  }
}

// Extract and save ABIs
for (const contractFile in output.contracts) {
  for (const contractName in output.contracts[contractFile]) {
    const contract = output.contracts[contractFile][contractName];
    const abi = contract.abi;
    
    // Save ABI
    const abiPath = path.join(abiOutputDir, `${contractName}.json`);
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    console.log(`✅ Generated ABI for ${contractName} at ${abiPath}`);
    
    // Save bytecode for deployment
    const bytecodePath = path.join(abiOutputDir, `${contractName}.bytecode.json`);
    fs.writeFileSync(bytecodePath, JSON.stringify({
      bytecode: contract.evm.bytecode.object,
      deployedBytecode: contract.evm.deployedBytecode.object,
    }, null, 2));
  }
}

console.log('✅ Contract compilation completed successfully!');