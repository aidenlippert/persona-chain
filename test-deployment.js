import { chromium } from 'playwright';

async function testWalletDeployment() {
  console.log('🚀 Testing wallet application at NEW DEPLOYMENT URL...');
  console.log('URL: https://wallet-xksjy7lbo-aiden-lipperts-projects.vercel.app');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Collect console messages and errors
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    const message = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleMessages.push(message);
    console.log(message);
    
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(message);
    }
  });
  
  page.on('pageerror', error => {
    const errorMsg = `[PAGE ERROR] ${error.message}`;
    errors.push(errorMsg);
    console.log(errorMsg);
  });
  
  try {
    // Test 1: Navigate to the application
    console.log('\n📡 Test 1: Navigating to application...');
    const response = await page.goto('https://wallet-xksjy7lbo-aiden-lipperts-projects.vercel.app', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    console.log(`✅ Page loaded with status: ${response.status()}`);
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Test 2: Check page title and basic structure
    console.log('\n📄 Test 2: Checking page structure...');
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Take screenshot of initial load
    await page.screenshot({ path: 'initial-load.png', fullPage: true });
    console.log('📸 Screenshot saved: initial-load.png');
    
    // Test 3: Check for critical JavaScript errors
    console.log('\n🔍 Test 3: Checking for critical errors...');
    const criticalErrors = errors.filter(err => 
      err.includes('SyntaxError') || 
      err.includes('Uncaught') ||
      err.includes('TypeError') ||
      err.includes('ReferenceError')
    );
    
    if (criticalErrors.length > 0) {
      console.log('❌ Critical errors found:');
      criticalErrors.forEach(error => console.log(`  ${error}`));
    } else {
      console.log('✅ No critical JavaScript errors detected');
    }
    
    // Test 4: Navigate to credentials page specifically
    console.log('\n🎫 Test 4: Testing credentials page...');
    
    try {
      await page.goto('https://wallet-xksjy7lbo-aiden-lipperts-projects.vercel.app/credentials', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log('✅ Successfully navigated to credentials page');
      await page.waitForTimeout(3000);
      
      // Check for enhanced elements
      const credentialsTitle = await page.textContent('h1');
      console.log('📝 Credentials page title:', credentialsTitle);
      
      // Take screenshot of credentials page
      await page.screenshot({ path: 'credentials-page.png', fullPage: true });
      console.log('📸 Screenshot saved: credentials-page.png');
      
    } catch (e) {
      console.log(`⚠️ Could not navigate to credentials page: ${e.message}`);
    }
    
    // Test 5: Look for Create Credential button
    console.log('\n🆕 Test 5: Testing Create Credential functionality...');
    
    // Check for Create Credential button
    const createButton = page.locator('button:has-text("Create Credential"), button:has-text("Create"), [data-testid*="create"]');
    const createButtonCount = await createButton.count();
    
    console.log(`Found ${createButtonCount} potential Create Credential buttons`);
    
    if (createButtonCount > 0) {
      try {
        // Take screenshot before clicking
        await page.screenshot({ path: 'before-create-click.png' });
        
        await createButton.first().click();
        console.log('✅ Successfully clicked Create Credential button');
        
        // Wait for any modal or form to appear
        await page.waitForTimeout(2000);
        
        // Take screenshot after clicking
        await page.screenshot({ path: 'after-create-click.png' });
        console.log('📸 Screenshots saved: before-create-click.png, after-create-click.png');
        
      } catch (e) {
        console.log(`⚠️ Could not click Create Credential button: ${e.message}`);
      }
    } else {
      console.log('ℹ️ No Create Credential button found on current page');
    }
    
    // Test 6: Check for browser extension errors (should be suppressed)
    console.log('\n🧩 Test 6: Checking for browser extension error suppression...');
    const extensionErrors = errors.filter(err => 
      err.includes('extension') || 
      err.includes('chrome-extension') ||
      err.includes('moz-extension') ||
      err.includes('Non-Error promise rejection captured')
    );
    
    if (extensionErrors.length > 0) {
      console.log('⚠️ Browser extension related messages (should be suppressed):');
      extensionErrors.forEach(error => console.log(`  ${error}`));
    } else {
      console.log('✅ No browser extension errors detected (properly suppressed)');
    }
    
    // Test 7: Final page state check
    console.log('\n📊 Test 7: Final application state...');
    
    // Check if page is responsive
    const pageContent = await page.textContent('body');
    const hasContent = pageContent && pageContent.trim().length > 100;
    console.log(`Page has meaningful content: ${hasContent ? '✅' : '❌'}`);
    
    // Final screenshot
    await page.screenshot({ path: 'final-state.png', fullPage: true });
    console.log('📸 Final screenshot saved: final-state.png');
    
    // Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log(`- Page loaded successfully: ✅`);
    console.log(`- Critical JS errors: ${criticalErrors.length === 0 ? '✅ None' : `❌ ${criticalErrors.length} found`}`);
    console.log(`- Extension errors suppressed: ${extensionErrors.length === 0 ? '✅ Yes' : `⚠️ ${extensionErrors.length} found`}`);
    console.log(`- Create button functional: ${createButtonCount > 0 ? '✅ Found' : '⚠️ Not found'}`);
    console.log(`- Page has content: ${hasContent ? '✅ Yes' : '❌ No'}`);
    console.log(`- Total console messages: ${consoleMessages.length}`);
    console.log(`- Total errors/warnings: ${errors.length}`);
    
    // Keep browser open for manual inspection
    console.log('\n⏳ Browser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
    const isSuccess = criticalErrors.length === 0 && hasContent;
    return isSuccess;
    
  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`);
    await page.screenshot({ path: 'error-state.png' });
    return false;
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed');
  }
}

// Run the test
testWalletDeployment().then(success => {
  console.log(`\n🎯 Final Result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  process.exit(success ? 0 : 1);
}).catch(console.error);