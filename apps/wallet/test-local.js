import { chromium } from 'playwright';

async function comprehensiveLocalTest() {
  console.log('🔍 Starting Comprehensive Local Frontend Testing...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect all errors
  const allErrors = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      allErrors.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('pageerror', (error) => {
    allErrors.push({
      type: 'pageerror',
      text: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });
  
  try {
    console.log('\n📱 Testing Local Development Server...');
    await page.goto('http://localhost:5175/');
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    
    // Test all pages thoroughly
    const testPages = [
      { path: '/', name: 'Home' },
      { path: '/credentials', name: 'Credentials' },
      { path: '/proofs', name: 'Proofs' },
      { path: '/onboarding', name: 'Onboarding' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/connections', name: 'Connections' },
      { path: '/settings', name: 'Settings' }
    ];
    
    for (const testPage of testPages) {
      console.log(`\n🧪 Testing ${testPage.name} page...`);
      try {
        await page.goto(`http://localhost:5175${testPage.path}`);
        await page.waitForTimeout(2000);
        
        // Check for any UI elements
        const hasContent = await page.locator('body').textContent();
        if (hasContent && hasContent.length > 0) {
          console.log(`✅ ${testPage.name} page loaded with content`);
        } else {
          console.log(`⚠️ ${testPage.name} page loaded but appears empty`);
        }
        
        // Check for React components
        const reactComponents = await page.locator('[data-reactroot], [data-testid]').count();
        console.log(`📊 ${testPage.name}: ${reactComponents} React components found`);
        
      } catch (error) {
        console.log(`❌ ${testPage.name} page error: ${error.message}`);
      }
    }
    
    // Test specific interactions
    console.log('\n🔄 Testing Interactions...');
    
    // Go to credentials page and test functionality
    await page.goto('http://localhost:5175/credentials');
    await page.waitForTimeout(2000);
    
    // Look for credential-related elements
    const credentialButtons = await page.locator('button').count();
    console.log(`🎫 Found ${credentialButtons} buttons on credentials page`);
    
    // Test onboarding flow
    console.log('\n🚀 Testing Onboarding Flow...');
    await page.goto('http://localhost:5175/onboarding');
    await page.waitForTimeout(3000);
    
    // Look for onboarding elements
    const onboardingElements = await page.locator('div').count();
    console.log(`🆔 Found ${onboardingElements} elements on onboarding page`);
    
    // Test error boundaries
    console.log('\n🛡️ Testing Error Boundaries...');
    const errorBoundaries = await page.locator('[data-testid="error-boundary"]').count();
    console.log(`🔒 Found ${errorBoundaries} error boundaries`);
    
  } catch (error) {
    console.log(`❌ Critical error during testing: ${error.message}`);
    allErrors.push({
      type: 'critical',
      text: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  // Comprehensive error analysis
  console.log('\n📊 COMPREHENSIVE ERROR ANALYSIS:');
  console.log(`Total Errors Found: ${allErrors.length}`);
  
  if (allErrors.length > 0) {
    console.log('\n🚨 DETAILED ERROR BREAKDOWN:');
    
    // Group errors by type
    const errorsByType = {};
    allErrors.forEach(error => {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = [];
      }
      errorsByType[error.type].push(error);
    });
    
    Object.keys(errorsByType).forEach(type => {
      console.log(`\n${type.toUpperCase()}: ${errorsByType[type].length} errors`);
      errorsByType[type].forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.text}`);
        if (error.location) {
          console.log(`     Location: ${error.location.url}:${error.location.lineNumber}`);
        }
        if (error.stack) {
          console.log(`     Stack: ${error.stack.substring(0, 100)}...`);
        }
      });
    });
    
    // Look for specific patterns
    console.log('\n🔍 ERROR PATTERN ANALYSIS:');
    
    const blockchainErrors = allErrors.filter(e => e.text.includes('blockchainService'));
    const reactErrors = allErrors.filter(e => e.text.includes('React error #306'));
    const hookErrors = allErrors.filter(e => e.text.includes('hook'));
    const serviceErrors = allErrors.filter(e => e.text.includes('Service') || e.text.includes('service'));
    
    console.log(`🔗 Blockchain Service Errors: ${blockchainErrors.length}`);
    console.log(`⚛️ React Hook Errors: ${reactErrors.length}`);
    console.log(`🪝 Hook Call Errors: ${hookErrors.length}`);
    console.log(`🛠️ Service-related Errors: ${serviceErrors.length}`);
    
  } else {
    console.log('\n🎉 NO ERRORS FOUND! Website is clean!');
  }
  
  await browser.close();
  
  return {
    totalErrors: allErrors.length,
    errors: allErrors,
    success: allErrors.length === 0
  };
}

// Run the comprehensive test
comprehensiveLocalTest().catch(console.error);