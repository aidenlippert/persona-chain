import { chromium } from 'playwright';

async function testPersonaWallet() {
  console.log('🔍 Starting Persona Wallet Frontend Testing...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    }
  });
  
  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', (error) => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });
  
  try {
    // Test main page
    console.log('\n📱 Testing main page...');
    await page.goto('https://wallet-p4oy60j0v-aiden-lipperts-projects.vercel.app/');
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    
    // Test specific pages
    const testPages = [
      { path: '/credentials', name: 'Credentials' },
      { path: '/proofs', name: 'Proofs' },
      { path: '/onboarding', name: 'Onboarding' },
      { path: '/dashboard', name: 'Dashboard' }
    ];
    
    for (const testPage of testPages) {
      console.log(`\n🧪 Testing ${testPage.name} page...`);
      try {
        await page.goto(`https://wallet-p4oy60j0v-aiden-lipperts-projects.vercel.app${testPage.path}`);
        await page.waitForTimeout(3000);
        console.log(`✅ ${testPage.name} page loaded`);
      } catch (error) {
        console.log(`❌ ${testPage.name} page error: ${error.message}`);
      }
    }
    
    // Check for specific elements
    console.log('\n🔍 Checking for critical elements...');
    await page.goto('https://wallet-p4oy60j0v-aiden-lipperts-projects.vercel.app/');
    await page.waitForTimeout(3000);
    
    // Check navigation
    const navExists = await page.locator('nav').count();
    console.log(`📊 Navigation elements: ${navExists}`);
    
    // Check for error boundaries
    const errorBoundaries = await page.locator('[data-testid="error-boundary"]').count();
    console.log(`🛡️ Error boundaries: ${errorBoundaries}`);
    
  } catch (error) {
    console.log(`❌ Critical error during testing: ${error.message}`);
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`Page Errors: ${pageErrors.length}`);
  console.log(`Total Errors: ${consoleErrors.length + pageErrors.length}`);
  
  // Print all errors
  if (consoleErrors.length > 0) {
    console.log('\n🚨 CONSOLE ERRORS:');
    consoleErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.type.toUpperCase()}: ${error.text}`);
      if (error.location) {
        console.log(`   Location: ${error.location.url}:${error.location.lineNumber}`);
      }
    });
  }
  
  if (pageErrors.length > 0) {
    console.log('\n💥 PAGE ERRORS:');
    pageErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.message}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack.substring(0, 200)}...`);
      }
    });
  }
  
  await browser.close();
  
  return {
    consoleErrors,
    pageErrors,
    totalErrors: consoleErrors.length + pageErrors.length
  };
}

// Run the test
testPersonaWallet().catch(console.error);