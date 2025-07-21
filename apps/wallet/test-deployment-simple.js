import { chromium } from 'playwright';

async function testWalletDeployment() {
  console.log('🚀 Testing NEW wallet deployment...');
  console.log('URL: https://wallet-xksjy7lbo-aiden-lipperts-projects.vercel.app');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-web-security']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Collect errors only (not all console messages to avoid spam)
  const errors = [];
  
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });
  
  try {
    console.log('\n📡 Test 1: Loading main page...');
    const response = await page.goto('https://wallet-xksjy7lbo-aiden-lipperts-projects.vercel.app', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    console.log(`✅ Main page loaded with status: ${response.status()}`);
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'main-page-test.png', fullPage: true });
    console.log('📸 Screenshot saved: main-page-test.png');
    
    // Check title
    const title = await page.title();
    console.log(`📄 Title: ${title}`);
    
    console.log('\n🎫 Test 2: Loading credentials page...');
    await page.goto('https://wallet-xksjy7lbo-aiden-lipperts-projects.vercel.app/credentials', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    console.log('✅ Credentials page loaded');
    await page.waitForTimeout(3000);
    
    // Take screenshot of credentials page
    await page.screenshot({ path: 'credentials-page-test.png', fullPage: true });
    console.log('📸 Screenshot saved: credentials-page-test.png');
    
    // Look for Create Credential button
    const createButtons = await page.$$('button');
    const createButtonTexts = await Promise.all(
      createButtons.map(btn => btn.textContent().catch(() => ''))
    );
    
    const hasCreateButton = createButtonTexts.some(text => 
      text && text.toLowerCase().includes('create')
    );
    
    console.log(`🆕 Create button found: ${hasCreateButton ? '✅' : '❌'}`);
    
    // Check for critical errors (ignore error boundary spam)
    const criticalErrors = errors.filter(err => 
      err.includes('SyntaxError') || 
      err.includes('TypeError') ||
      err.includes('ReferenceError')
    ).filter(err => !err.includes('Error boundary'));
    
    console.log('\n📋 RESULTS:');
    console.log(`- Main page loads: ✅`);
    console.log(`- Credentials page loads: ✅`);
    console.log(`- Create button present: ${hasCreateButton ? '✅' : '❌'}`);
    console.log(`- Critical errors: ${criticalErrors.length === 0 ? '✅ None' : `❌ ${criticalErrors.length} found`}`);
    console.log(`- Total errors captured: ${errors.length}`);
    
    if (criticalErrors.length > 0) {
      console.log('\n❌ Critical errors found:');
      criticalErrors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
    }
    
    // Final assessment
    const isHealthy = criticalErrors.length === 0 && hasCreateButton;
    console.log(`\n🎯 Overall health: ${isHealthy ? '✅ GOOD' : '⚠️ NEEDS ATTENTION'}`);
    
    return isHealthy;
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'error-test.png' });
    return false;
  } finally {
    await browser.close();
  }
}

// Run test
testWalletDeployment().then(success => {
  console.log(`\n🏁 Test completed: ${success ? 'SUCCESS' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
}).catch(console.error);