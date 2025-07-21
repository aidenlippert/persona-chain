#!/usr/bin/env node

/**
 * Debug DID Storage and Retrieval
 * This script simulates the exact storage and retrieval logic to debug the issue
 */

console.log('🔍 Debugging DID Storage and Retrieval Logic\n');

// Simulate localStorage
const localStorage = {
  storage: {},
  setItem(key, value) {
    this.storage[key] = value;
    console.log(`📝 STORE: ${key} = ${value.length > 100 ? value.substring(0, 100) + '...' : value}`);
  },
  getItem(key) {
    const value = this.storage[key];
    console.log(`📖 READ: ${key} = ${value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'null'}`);
    return value || null;
  },
  removeItem(key) {
    delete this.storage[key];
    console.log(`🗑️ DELETE: ${key}`);
  }
};

// Simulate the exact onboarding DID storage process
async function simulateOnboardingStorage() {
  console.log('\n1️⃣ SIMULATING ONBOARDING DID STORAGE');
  console.log('=' * 50);

  // Mock wallet from onboarding (demo mode)
  const onboardingWallet = {
    address: "cosmos1demo5t7sxgk8xyk7hz8xvr6jf7h8k9demo", // Demo address
    did: "did:personachain:mainnet:abc123def456",
    publicKey: "A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0"
  };

  console.log('🏗️ Creating DID during onboarding with wallet:', onboardingWallet);

  // 1. Store in blockchain storage (like personaChainService.createDIDOnChain)
  const didRecord = {
    did: onboardingWallet.did,
    controller: onboardingWallet.address,
    document: JSON.stringify({
      id: onboardingWallet.did,
      controller: onboardingWallet.address,
      verificationMethod: [{
        id: `${onboardingWallet.did}#key-1`,
        type: "Ed25519VerificationKey2020",
        controller: onboardingWallet.did,
        publicKeyBase58: onboardingWallet.publicKey,
      }],
      created: new Date().toISOString(),
    }),
    created: Date.now(),
    txHash: `REAL_TX_${Date.now().toString(36).toUpperCase()}`,
    network: 'PersonaChain',
    blockNumber: Math.floor(Math.random() * 1000000),
  };

  // Store in blockchain_dids array
  const existingDIDs = JSON.parse(localStorage.getItem('blockchain_dids') || '[]');
  existingDIDs.push(didRecord);
  localStorage.setItem('blockchain_dids', JSON.stringify(existingDIDs));
  
  // Store in individual DID record
  localStorage.setItem(`did_record_${onboardingWallet.did}`, JSON.stringify(didRecord));

  // 2. Store authentication data (like handleComplete in onboarding)
  const walletWithDID = { ...onboardingWallet, did: onboardingWallet.did };
  localStorage.setItem('persona_wallet', JSON.stringify(walletWithDID));
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('user_did', onboardingWallet.did);
  localStorage.setItem('wallet_address', onboardingWallet.address);

  console.log('✅ Onboarding storage completed\n');
  return onboardingWallet;
}

// Simulate the exact login DID checking process
async function simulateLoginChecking() {
  console.log('2️⃣ SIMULATING LOGIN DID CHECKING');
  console.log('=' * 50);

  // Mock real Keplr wallet address (different from demo)
  const keplrAddress = "persona17em02n4rgky94xhc8e3q35zr4ht84pgznkj56z";

  console.log('🔍 Checking for existing DID for Keplr address:', keplrAddress);

  // Simulate checkExistingDID logic
  console.log('\n📍 Step 1: Check localStorage for exact address match...');
  const storedWallet = localStorage.getItem('persona_wallet');
  const storedDID = localStorage.getItem('user_did');
  const storedAddress = localStorage.getItem('wallet_address');
  
  // Check exact address match
  if (storedAddress === keplrAddress && storedDID) {
    console.log(`✅ Found exact address match: ${storedDID}`);
    return storedDID;
  } else {
    console.log(`❌ No exact address match. Stored: ${storedAddress}, Looking for: ${keplrAddress}`);
  }
  
  if (storedWallet) {
    const wallet = JSON.parse(storedWallet);
    if (wallet.address === keplrAddress && wallet.did) {
      console.log(`✅ Found wallet address match: ${wallet.did}`);
      return wallet.did;
    } else {
      console.log(`❌ No wallet address match. Stored: ${wallet.address}, Looking for: ${keplrAddress}`);
    }
  }

  console.log('\n📍 Step 2: Check blockchain storage...');
  try {
    const blockchainDIDs = JSON.parse(localStorage.getItem('blockchain_dids') || '[]');
    console.log(`📊 Found ${blockchainDIDs.length} DIDs in blockchain storage`);
    
    for (const didRecord of blockchainDIDs) {
      console.log(`🔍 Checking DID record: controller=${didRecord.controller}, did=${didRecord.did}`);
      if (didRecord.controller === keplrAddress || didRecord.controller.includes(keplrAddress.slice(-8))) {
        console.log(`✅ Found blockchain storage match: ${didRecord.did}`);
        return didRecord.did;
      }
    }
    console.log('❌ No blockchain storage match found');
  } catch (blockchainError) {
    console.warn('❌ Error checking blockchain storage:', blockchainError);
  }

  console.log('\n📍 Step 3: Check DID records...');
  try {
    const keys = Object.keys(localStorage.storage);
    const didKeys = keys.filter(key => key.startsWith('did_record_'));
    console.log(`📊 Found ${didKeys.length} DID record keys: ${didKeys.join(', ')}`);
    
    for (const key of didKeys) {
      const didRecord = JSON.parse(localStorage.getItem(key) || '{}');
      console.log(`🔍 Checking record ${key}: controller=${didRecord.controller}`);
      if (didRecord.controller === keplrAddress || didRecord.controller.includes(keplrAddress.slice(-8))) {
        console.log(`✅ Found DID record match: ${didRecord.did}`);
        return didRecord.did;
      }
    }
    console.log('❌ No DID record match found');
  } catch (recordError) {
    console.warn('❌ Error checking DID records:', recordError);
  }

  console.log('\n📍 Step 4: Check login migration logic...');
  const anyExistingDID = localStorage.getItem('user_did');
  const anyStoredWallet = localStorage.getItem('persona_wallet');
  
  if (anyExistingDID && anyStoredWallet) {
    console.log(`✅ Found existing identity for migration: ${anyExistingDID}`);
    console.log('🔄 Would migrate identity to current Keplr wallet');
    return anyExistingDID;
  } else {
    console.log('❌ No existing identity found for migration');
  }

  console.log('\n❌ NO DID FOUND - This is why login fails!');
  return null;
}

// Analyze the storage mismatch
async function analyzeStorageMismatch() {
  console.log('\n3️⃣ ANALYZING STORAGE MISMATCH');
  console.log('=' * 50);

  console.log('📊 Current localStorage contents:');
  Object.keys(localStorage.storage).forEach(key => {
    const value = localStorage.storage[key];
    console.log(`  ${key}: ${value.length > 100 ? value.substring(0, 100) + '...' : value}`);
  });

  console.log('\n🔍 Analysis:');
  console.log('1. Onboarding creates demo address: cosmos1demo...');
  console.log('2. Login uses real Keplr address: persona17em...');
  console.log('3. Address formats completely different');
  console.log('4. Migration logic should catch this with step 4');
  
  const userDID = localStorage.getItem('user_did');
  const personaWallet = localStorage.getItem('persona_wallet');
  
  if (userDID && personaWallet) {
    console.log('\n✅ SOLUTION: Migration logic should work!');
    console.log(`   - user_did exists: ${userDID}`);
    console.log(`   - persona_wallet exists: ${personaWallet.substring(0, 100)}...`);
    console.log('   - Login should detect and migrate this identity');
  } else {
    console.log('\n❌ PROBLEM: Required data missing!');
    console.log(`   - user_did: ${userDID ? 'EXISTS' : 'MISSING'}`);
    console.log(`   - persona_wallet: ${personaWallet ? 'EXISTS' : 'MISSING'}`);
  }
}

// Run the full simulation
async function runFullSimulation() {
  try {
    await simulateOnboardingStorage();
    await simulateLoginChecking();
    await analyzeStorageMismatch();
    
    console.log('\n🎯 CONCLUSION:');
    console.log('If migration logic isn\'t working, the issue is in the LoginPage.tsx logic.');
    console.log('The DID should be found in Step 4 (migration check) even if Steps 1-3 fail.');
    
  } catch (error) {
    console.error('💥 Simulation failed:', error);
  }
}

runFullSimulation();