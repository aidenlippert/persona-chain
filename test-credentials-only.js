import { chromium } from 'playwright';

async function testCredentialsPage() {
  console.log('🎫 Testing credentials page specifically...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Go directly to credentials page
    await page.goto('https://wallet-xksjy7lbo-aiden-lipperts-projects.vercel.app/credentials', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    // Wait briefly for page to settle
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'credentials-final-test.png', fullPage: true });
    
    // Check for any Create buttons
    const buttons = await page.$$('button');
    const buttonCount = buttons.length;
    
    console.log(`✅ Credentials page loaded successfully`);
    console.log(`🔘 Found ${buttonCount} buttons on page`);
    console.log(`📸 Screenshot saved: credentials-final-test.png`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  } finally {
    await browser.close();
  }
}

testCredentialsPage().then(success => {
  console.log(`Result: ${success ? 'SUCCESS' : 'FAILED'}`);
}).catch(console.error);