import puppeteer from 'puppeteer';

const DEPLOYMENT_URL = 'https://wallet-oog7j5kso-aiden-lipperts-projects.vercel.app';

async function testCSPFix() {
  console.log('🧪 Testing RPC Connection with Working Polygon Endpoint...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console for specific errors
    const rpcErrors = [];
    const cspErrors = [];
    const successMessages = [];
    
    page.on('console', msg => {
      const text = msg.text();
      
      // Check for RPC connection errors
      if (text.includes('rpc.personachain.com') || text.includes('polygon-rpc.com')) {
        if (text.includes('Refused to connect') || text.includes('violates')) {
          rpcErrors.push(text);
        } else {
          successMessages.push(text);
        }
      }
      
      // Check for CSP violations
      if (text.includes('Content Security Policy') && text.includes('Refused')) {
        cspErrors.push(text);
      }
      
      // Check for success messages and RPC endpoint changes
      if (text.includes('SUCCESS') || text.includes('Configuration created') || text.includes('PersonaChain RPC endpoint') || text.includes('BLOCKCHAIN') || text.includes('polygon-rpc.com')) {
        successMessages.push(text);
      }
    });
    
    console.log('📱 Loading PersonaPass...');
    await page.goto(DEPLOYMENT_URL, { waitUntil: 'networkidle0' });
    
    // Wait for initial loading and any async operations
    console.log('⏳ Waiting for page initialization...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Try to trigger RPC connection by navigating or interacting
    console.log('🔍 Checking for RPC connection attempts...');
    
    // Check if there are any buttons or elements that might trigger RPC calls
    const buttons = await page.$$('button');
    if (buttons.length > 0) {
      console.log(`📱 Found ${buttons.length} buttons, checking for wallet-related ones...`);
      
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        try {
          const text = await page.evaluate(el => el.textContent, buttons[i]);
          console.log(`  Button ${i + 1}: "${text}"`);
          
          if (text.toLowerCase().includes('connect') || text.toLowerCase().includes('wallet')) {
            console.log(`    🎯 This looks like a wallet button, testing...`);
            await buttons[i].click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            break;
          }
        } catch (e) {
          // Skip buttons that can't be clicked
        }
      }
    }
    
    // Final wait to catch any delayed errors
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Report results
    console.log('\n📊 FINAL RESULTS:');
    console.log('================');
    
    console.log(`✅ Success Messages: ${successMessages.length}`);
    if (successMessages.length > 0) {
      console.log('   🎉 SUCCESS LOGS:');
      successMessages.forEach(msg => console.log(`     ✓ ${msg}`));
    }
    
    console.log(`\n🌐 RPC Connection Errors: ${rpcErrors.length}`);
    if (rpcErrors.length > 0) {
      console.log('   🚨 RPC ERRORS:');
      rpcErrors.forEach(msg => console.log(`     ❌ ${msg}`));
    }
    
    console.log(`\n🛡️  CSP Violations: ${cspErrors.length}`);
    if (cspErrors.length > 0) {
      console.log('   🚨 CSP ERRORS:');
      cspErrors.forEach(msg => console.log(`     ❌ ${msg}`));
    }
    
    // Overall assessment
    console.log('\n🎯 ASSESSMENT:');
    console.log('==============');
    
    if (rpcErrors.length === 0 && cspErrors.length === 0) {
      console.log('🎉 PERFECT! No RPC or CSP errors detected!');
      console.log('✅ PersonaChain RPC connection is now allowed by CSP');
      console.log('✅ Keplr wallet should connect without issues');
    } else if (rpcErrors.length === 0 && cspErrors.length > 0) {
      console.log('⚠️  No RPC errors, but some CSP violations remain');
    } else if (rpcErrors.length > 0) {
      console.log('🔴 RPC connection is still being blocked!');
      console.log('   Need to check CSP configuration');
    }
    
    console.log(`\n🌐 Tested URL: ${DEPLOYMENT_URL}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testCSPFix();