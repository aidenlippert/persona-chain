import puppeteer from 'puppeteer';

const DEPLOYMENT_URL = 'https://wallet-m3le83i52-aiden-lipperts-projects.vercel.app';

async function testKeplrConnection() {
  console.log('🧪 Testing Keplr Connection Fix...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console for errors
    const errors = [];
    const successes = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Refused to connect') || text.includes('CSP') || text.includes('Failed to fetch')) {
        errors.push(text);
      } else if (text.includes('SUCCESS') || text.includes('Configuration created') || text.includes('PersonaChain RPC')) {
        successes.push(text);
      }
    });
    
    console.log('📱 Navigating to PersonaPass...');
    await page.goto(DEPLOYMENT_URL, { waitUntil: 'networkidle0' });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Looking for Keplr connect button...');
    
    // Check if we can find the Keplr connection elements
    let keplrButton = await page.$('button[data-testid="keplr-connect"]');
    
    if (!keplrButton) {
      keplrButton = await page.$('[class*="keplr"]');
    }
    
    if (!keplrButton) {
      // Try to find by text content
      keplrButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent.includes('Connect Keplr') || 
          btn.textContent.includes('Connect Wallet') ||
          btn.textContent.includes('Keplr')
        );
      });
      
      // Convert JSHandle to ElementHandle if found
      if (keplrButton && keplrButton.asElement) {
        keplrButton = keplrButton.asElement();
      }
    }
    
    if (keplrButton && keplrButton.click) {
      console.log('✅ Found Keplr connect button!');
      
      // Click the button to test connection
      console.log('🔗 Attempting Keplr connection...');
      await keplrButton.click();
      
      // Wait to see if errors occur
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } else {
      console.log('⚠️  Could not find Keplr connect button, checking for any wallet connection options...');
      
      // Try to find any wallet connection button
      const walletButtons = await page.$$('button');
      for (const button of walletButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text.toLowerCase().includes('connect') || text.toLowerCase().includes('wallet') || text.toLowerCase().includes('keplr')) {
          console.log(`🔗 Found potential wallet button: "${text}"`);
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
          break;
        }
      }
    }
    
    // Check results
    console.log('\n📊 TEST RESULTS:');
    console.log(`✅ Successes: ${successes.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    
    if (successes.length > 0) {
      console.log('\n🎉 SUCCESS MESSAGES:');
      successes.forEach(msg => console.log(`  ✅ ${msg}`));
    }
    
    if (errors.length > 0) {
      console.log('\n🚨 ERROR MESSAGES:');
      errors.forEach(msg => console.log(`  ❌ ${msg}`));
    }
    
    // Specific CSP and RPC connection checks
    const rpcErrors = errors.filter(e => e.includes('rpc.personachain.com'));
    const cspErrors = errors.filter(e => e.includes('Content Security Policy'));
    const fetchErrors = errors.filter(e => e.includes('Failed to fetch'));
    
    console.log('\n🔍 SPECIFIC CHECKS:');
    console.log(`🌐 RPC Connection Errors: ${rpcErrors.length}`);
    console.log(`🛡️  CSP Violations: ${cspErrors.length}`);
    console.log(`📡 Fetch Errors: ${fetchErrors.length}`);
    
    if (rpcErrors.length === 0 && cspErrors.length === 0 && fetchErrors.length === 0) {
      console.log('\n🎯 PERFECT! No RPC, CSP, or fetch errors detected!');
      console.log('✅ Keplr connection should work flawlessly now!');
    } else {
      console.log('\n⚠️  Some issues remain:');
      if (rpcErrors.length > 0) {
        console.log('  🔴 RPC connection still blocked');
        rpcErrors.forEach(e => console.log(`    ${e}`));
      }
      if (cspErrors.length > 0) {
        console.log('  🔴 CSP violations still occurring');
        cspErrors.forEach(e => console.log(`    ${e}`));
      }
      if (fetchErrors.length > 0) {
        console.log('  🔴 Fetch errors still happening');
        fetchErrors.forEach(e => console.log(`    ${e}`));
      }
    }
    
    console.log(`\n🌐 Test completed for: ${DEPLOYMENT_URL}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testKeplrConnection();