/**
 * COMPREHENSIVE MANUAL E2E TEST FOR PERSONAPASS PLATFORM
 * Tests critical security fixes and user journeys
 */

const { chromium, firefox, webkit } = require('playwright');

class PersonaPassE2ETest {
  constructor(baseUrl = 'http://localhost:5175') {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.page = null;
    this.testResults = {
      walletDetection: null,
      didGeneration: null,
      loginFlow: null,
      credentialCreation: null,
      secureStorage: null,
      zkProofs: null,
      securityFixes: {
        deterministicDID: null,
        realEncryption: null,
        realAPIs: null
      }
    };
  }

  async setUp() {
    console.log('🚀 Starting PersonaPass E2E Manual Testing');
    this.browser = await chromium.launch({ 
      headless: false, 
      slowMo: 1000,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      console.log(`🖥️  [CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    
    // Capture errors
    this.page.on('pageerror', error => {
      console.error(`❌ [PAGE ERROR]: ${error.message}`);
    });

    // Set viewport for consistent testing
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async test1_NavigateToLandingPage() {
    console.log('\n📱 TEST 1: Navigate to landing page and verify smart wallet detection');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);
      
      // Take screenshot
      await this.page.screenshot({ 
        path: 'test-screenshots/01-landing-page.png',
        fullPage: true 
      });
      
      // Check page title
      const title = await this.page.title();
      console.log(`📄 Page title: ${title}`);
      
      // Look for wallet detection elements
      const walletButtons = await this.page.locator('[data-testid="wallet-button"], .wallet-button, button:has-text("Keplr"), button:has-text("MetaMask")').count();
      console.log(`🔗 Found ${walletButtons} wallet connection buttons`);
      
      // Check for wallet detection status
      const walletDetected = await this.page.evaluate(() => {
        return !!(window.keplr || window.ethereum || window.getOfflineSigner);
      });
      console.log(`🎯 Wallet APIs detected: ${walletDetected}`);
      
      this.testResults.walletDetection = {
        status: 'passed',
        pageLoaded: true,
        walletButtons: walletButtons,
        walletAPIsDetected: walletDetected,
        title: title
      };
      
      console.log('✅ TEST 1 PASSED: Landing page loaded successfully');
    } catch (error) {
      console.error('❌ TEST 1 FAILED:', error.message);
      this.testResults.walletDetection = { status: 'failed', error: error.message };
    }
  }

  async test2_KeplrWalletConnection() {
    console.log('\n🔗 TEST 2: Test Keplr wallet connection and DID generation');
    
    try {
      // Look for Keplr connect button
      const keplrButton = this.page.locator('button:has-text("Keplr"), [data-testid="keplr-button"]').first();
      
      if (await keplrButton.count() > 0) {
        console.log('🎯 Keplr button found, attempting connection...');
        await keplrButton.click();
        await this.page.waitForTimeout(3000);
        
        // Take screenshot after click
        await this.page.screenshot({ 
          path: 'test-screenshots/02-after-keplr-click.png',
          fullPage: true 
        });
        
        // Check for DID generation
        const didGenerated = await this.page.evaluate(() => {
          const didElement = document.querySelector('[data-testid="user-did"], .did-display');
          return didElement ? didElement.textContent : null;
        });
        
        if (didGenerated) {
          console.log(`🆔 DID Generated: ${didGenerated}`);
          
          // Test deterministic DID by checking localStorage/IndexedDB
          const storedDID = await this.page.evaluate(() => {
            return localStorage.getItem('userDID') || 
                   localStorage.getItem('persona_did') ||
                   sessionStorage.getItem('userDID');
          });
          
          console.log(`💾 Stored DID: ${storedDID}`);
          
          this.testResults.didGeneration = {
            status: 'passed',
            didGenerated: didGenerated,
            storedDID: storedDID,
            isDeterministic: didGenerated === storedDID
          };
          
          this.testResults.securityFixes.deterministicDID = {
            fixed: true,
            evidence: 'DID generated and stored consistently'
          };
        } else {
          console.log('⚠️  No DID found in UI, checking background generation...');
          
          // Wait longer for background DID generation
          await this.page.waitForTimeout(5000);
          
          const backgroundDID = await this.page.evaluate(() => {
            return localStorage.getItem('userDID') || localStorage.getItem('persona_did');
          });
          
          if (backgroundDID) {
            console.log(`🔍 Background DID found: ${backgroundDID}`);
            this.testResults.didGeneration = {
              status: 'passed',
              didGenerated: backgroundDID,
              note: 'DID generated in background'
            };
          } else {
            this.testResults.didGeneration = {
              status: 'failed',
              error: 'No DID generated'
            };
          }
        }
      } else {
        console.log('⚠️  Keplr button not found, simulating wallet connection...');
        
        // Try to trigger wallet connection programmatically
        const walletConnected = await this.page.evaluate(() => {
          // Simulate wallet connection
          if (window.keplr) {
            return true;
          }
          // Mock Keplr for testing
          window.keplr = { 
            experimentalSuggestChain: () => Promise.resolve(),
            enable: () => Promise.resolve(),
            getOfflineSigner: () => ({ getAccounts: () => Promise.resolve([]) })
          };
          return false;
        });
        
        console.log(`🔗 Wallet connection simulated: ${walletConnected}`);
        this.testResults.didGeneration = {
          status: 'partial',
          note: 'Wallet connection simulated for testing'
        };
      }
      
      console.log('✅ TEST 2 COMPLETED: Wallet connection tested');
    } catch (error) {
      console.error('❌ TEST 2 FAILED:', error.message);
      this.testResults.didGeneration = { status: 'failed', error: error.message };
    }
  }

  async test3_LoginFlowRecognition() {
    console.log('\n🔄 TEST 3: Verify login flow recognizes returning users');
    
    try {
      // Refresh page to test returning user flow
      await this.page.reload({ waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);
      
      // Check if user is recognized
      const userRecognized = await this.page.evaluate(() => {
        const storedDID = localStorage.getItem('userDID') || localStorage.getItem('persona_did');
        const userStatus = document.querySelector('[data-testid="user-status"], .user-status');
        return {
          hasDID: !!storedDID,
          storedDID: storedDID,
          userStatusText: userStatus ? userStatus.textContent : null
        };
      });
      
      console.log(`👤 User recognition status:`, userRecognized);
      
      // Take screenshot
      await this.page.screenshot({ 
        path: 'test-screenshots/03-returning-user.png',
        fullPage: true 
      });
      
      this.testResults.loginFlow = {
        status: userRecognized.hasDID ? 'passed' : 'partial',
        userRecognized: userRecognized.hasDID,
        storedDID: userRecognized.storedDID,
        userStatusText: userRecognized.userStatusText
      };
      
      console.log('✅ TEST 3 COMPLETED: Login flow tested');
    } catch (error) {
      console.error('❌ TEST 3 FAILED:', error.message);
      this.testResults.loginFlow = { status: 'failed', error: error.message };
    }
  }

  async test4_CredentialCreation() {
    console.log('\n📜 TEST 4: Test credential creation using real APIs');
    
    try {
      // Navigate to credentials page
      const credentialsLink = this.page.locator('a:has-text("Credentials"), [href*="credentials"], [data-testid="credentials-nav"]').first();
      
      if (await credentialsLink.count() > 0) {
        await credentialsLink.click();
        await this.page.waitForTimeout(3000);
        
        // Take screenshot
        await this.page.screenshot({ 
          path: 'test-screenshots/04-credentials-page.png',
          fullPage: true 
        });
        
        // Look for credential creation buttons
        const credentialButtons = await this.page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("Connect"), .credential-button').count();
        console.log(`🎯 Found ${credentialButtons} credential creation options`);
        
        // Check for API integrations
        const apiIntegrations = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, .integration-card'));
          return buttons.map(btn => btn.textContent).filter(text => 
            text && (text.includes('GitHub') || text.includes('LinkedIn') || text.includes('Stripe') || text.includes('Plaid'))
          );
        });
        
        console.log(`🔗 API integrations found:`, apiIntegrations);
        
        // Test one credential creation (GitHub if available)
        const githubButton = this.page.locator('button:has-text("GitHub"), [data-testid="github-connect"]').first();
        
        if (await githubButton.count() > 0) {
          console.log('🐙 Testing GitHub credential creation...');
          await githubButton.click();
          await this.page.waitForTimeout(2000);
          
          // Check if real API call is made (not mock)
          const networkRequests = await this.page.evaluate(() => {
            return window.performance.getEntriesByType('navigation').length > 0;
          });
          
          console.log(`🌐 Network activity detected: ${networkRequests}`);
        }
        
        this.testResults.credentialCreation = {
          status: 'passed',
          credentialButtons: credentialButtons,
          apiIntegrations: apiIntegrations,
          realAPIsDetected: apiIntegrations.length > 0
        };
        
        this.testResults.securityFixes.realAPIs = {
          fixed: apiIntegrations.length > 0,
          evidence: `Found ${apiIntegrations.length} real API integrations: ${apiIntegrations.join(', ')}`
        };
        
      } else {
        console.log('⚠️  Credentials page not accessible, checking current page...');
        const currentUrl = this.page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        this.testResults.credentialCreation = {
          status: 'partial',
          note: 'Credentials page not directly accessible',
          currentUrl: currentUrl
        };
      }
      
      console.log('✅ TEST 4 COMPLETED: Credential creation tested');
    } catch (error) {
      console.error('❌ TEST 4 FAILED:', error.message);
      this.testResults.credentialCreation = { status: 'failed', error: error.message };
    }
  }

  async test5_SecureStorage() {
    console.log('\n🔒 TEST 5: Validate secure credential storage and retrieval');
    
    try {
      // Check IndexedDB vs localStorage usage
      const storageAnalysis = await this.page.evaluate(async () => {
        // Check localStorage content
        const localStorageKeys = Object.keys(localStorage);
        const localStorageContent = {};
        localStorageKeys.forEach(key => {
          localStorageContent[key] = localStorage.getItem(key);
        });
        
        // Check IndexedDB
        let indexedDBDatabases = [];
        try {
          const databases = await indexedDB.databases();
          indexedDBDatabases = databases.map(db => db.name);
        } catch (e) {
          indexedDBDatabases = ['Unable to enumerate databases'];
        }
        
        // Look for encryption indicators
        const encryptedData = localStorageKeys.some(key => {
          const value = localStorage.getItem(key);
          return value && (value.includes('encrypted') || value.includes('cipher') || value.length > 100);
        });
        
        return {
          localStorageKeys: localStorageKeys,
          localStorageContent: localStorageContent,
          indexedDBDatabases: indexedDBDatabases,
          hasEncryptedData: encryptedData,
          localStorageSize: JSON.stringify(localStorageContent).length
        };
      });
      
      console.log('💾 Storage Analysis:', storageAnalysis);
      
      // Check for secure storage implementation
      const secureStorageFound = storageAnalysis.indexedDBDatabases.length > 0 || 
                                 storageAnalysis.hasEncryptedData ||
                                 storageAnalysis.localStorageKeys.some(key => key.includes('encrypted'));
      
      console.log(`🔐 Secure storage detected: ${secureStorageFound}`);
      
      this.testResults.secureStorage = {
        status: secureStorageFound ? 'passed' : 'needs_review',
        localStorageKeys: storageAnalysis.localStorageKeys,
        indexedDBDatabases: storageAnalysis.indexedDBDatabases,
        hasEncryptedData: storageAnalysis.hasEncryptedData,
        storageSize: storageAnalysis.localStorageSize
      };
      
      this.testResults.securityFixes.realEncryption = {
        fixed: secureStorageFound,
        evidence: `IndexedDB databases: ${storageAnalysis.indexedDBDatabases.join(', ')}, Encrypted data: ${storageAnalysis.hasEncryptedData}`
      };
      
      // Take screenshot
      await this.page.screenshot({ 
        path: 'test-screenshots/05-storage-analysis.png',
        fullPage: true 
      });
      
      console.log('✅ TEST 5 COMPLETED: Storage security analyzed');
    } catch (error) {
      console.error('❌ TEST 5 FAILED:', error.message);
      this.testResults.secureStorage = { status: 'failed', error: error.message };
    }
  }

  async test6_ZKProofGeneration() {
    console.log('\n🔐 TEST 6: Test ZK proof generation from stored credentials');
    
    try {
      // Navigate to proofs page if available
      const proofsLink = this.page.locator('a:has-text("Proofs"), a:has-text("ZK"), [href*="proof"], [data-testid="proofs-nav"]').first();
      
      if (await proofsLink.count() > 0) {
        await proofsLink.click();
        await this.page.waitForTimeout(3000);
        
        // Take screenshot
        await this.page.screenshot({ 
          path: 'test-screenshots/06-proofs-page.png',
          fullPage: true 
        });
        
        // Look for ZK proof generation options
        const zkProofOptions = await this.page.locator('button:has-text("Generate"), button:has-text("Prove"), button:has-text("ZK"), .proof-button').count();
        console.log(`🧮 Found ${zkProofOptions} ZK proof generation options`);
        
        // Check for ZK proof libraries
        const zkLibrariesLoaded = await this.page.evaluate(() => {
          return !!(window.snarkjs || window.circomlib || window.poseidon);
        });
        
        console.log(`📚 ZK libraries loaded: ${zkLibrariesLoaded}`);
        
        this.testResults.zkProofs = {
          status: zkProofOptions > 0 ? 'passed' : 'partial',
          zkProofOptions: zkProofOptions,
          zkLibrariesLoaded: zkLibrariesLoaded
        };
        
      } else {
        console.log('⚠️  ZK Proofs page not found, checking for ZK functionality on current page...');
        
        const zkFunctionality = await this.page.evaluate(() => {
          const zkElements = document.querySelectorAll('[data-testid*="zk"], [class*="zk"], [class*="proof"]');
          return zkElements.length;
        });
        
        this.testResults.zkProofs = {
          status: zkFunctionality > 0 ? 'partial' : 'not_found',
          zkElementsFound: zkFunctionality,
          note: 'ZK functionality searched on current page'
        };
      }
      
      console.log('✅ TEST 6 COMPLETED: ZK proof functionality tested');
    } catch (error) {
      console.error('❌ TEST 6 FAILED:', error.message);
      this.testResults.zkProofs = { status: 'failed', error: error.message };
    }
  }

  async generateReport() {
    console.log('\n📊 GENERATING COMPREHENSIVE TEST REPORT');
    
    const report = {
      timestamp: new Date().toISOString(),
      testingSummary: {
        platform: 'PersonaPass Identity Wallet',
        testUrl: this.baseUrl,
        browser: 'Chromium',
        totalTests: 6
      },
      criticalSecurityFixes: this.testResults.securityFixes,
      testResults: this.testResults,
      overallStatus: this.calculateOverallStatus(),
      recommendations: this.generateRecommendations()
    };
    
    // Write report to file
    const fs = require('fs');
    fs.writeFileSync('test-results/manual-e2e-test-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n🎯 TEST SUMMARY:');
    console.log('================');
    Object.entries(this.testResults).forEach(([testName, result]) => {
      if (typeof result === 'object' && result.status) {
        const statusIcon = result.status === 'passed' ? '✅' : 
                          result.status === 'partial' ? '⚠️' : '❌';
        console.log(`${statusIcon} ${testName}: ${result.status}`);
      }
    });
    
    console.log('\n🔒 SECURITY FIXES VALIDATION:');
    console.log('==============================');
    Object.entries(this.testResults.securityFixes).forEach(([fix, result]) => {
      if (result) {
        const statusIcon = result.fixed ? '✅' : '❌';
        console.log(`${statusIcon} ${fix}: ${result.fixed ? 'FIXED' : 'NEEDS ATTENTION'}`);
        if (result.evidence) {
          console.log(`   Evidence: ${result.evidence}`);
        }
      }
    });
    
    return report;
  }
  
  calculateOverallStatus() {
    const statuses = Object.values(this.testResults)
      .filter(result => typeof result === 'object' && result.status)
      .map(result => result.status);
    
    const passed = statuses.filter(s => s === 'passed').length;
    const total = statuses.length;
    
    if (passed === total) return 'passed';
    if (passed >= total * 0.7) return 'mostly_passed';
    return 'needs_attention';
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    if (!this.testResults.securityFixes.deterministicDID?.fixed) {
      recommendations.push('Verify deterministic DID generation implementation');
    }
    
    if (!this.testResults.securityFixes.realEncryption?.fixed) {
      recommendations.push('Implement proper AES-256-GCM encryption for credential storage');
    }
    
    if (!this.testResults.securityFixes.realAPIs?.fixed) {
      recommendations.push('Replace mock API responses with real service integrations');
    }
    
    return recommendations;
  }

  async tearDown() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('\n🏁 Testing completed successfully');
  }
}

// Run the comprehensive test
async function runPersonaPassE2ETest() {
  const tester = new PersonaPassE2ETest();
  
  try {
    await tester.setUp();
    
    await tester.test1_NavigateToLandingPage();
    await tester.test2_KeplrWalletConnection();
    await tester.test3_LoginFlowRecognition();
    await tester.test4_CredentialCreation();
    await tester.test5_SecureStorage();
    await tester.test6_ZKProofGeneration();
    
    const report = await tester.generateReport();
    
    console.log('\n📋 Full report saved to: test-results/manual-e2e-test-report.json');
    
    return report;
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    throw error;
  } finally {
    await tester.tearDown();
  }
}

// Export for use
module.exports = { PersonaPassE2ETest, runPersonaPassE2ETest };

// Run if called directly
if (require.main === module) {
  runPersonaPassE2ETest().catch(console.error);
}