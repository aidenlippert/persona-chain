import puppeteer from 'puppeteer';

const DEPLOYMENT_URL = 'https://wallet-27q0ymnj7-aiden-lipperts-projects.vercel.app';

async function testRPCEndpoint() {
  console.log('🧪 Testing RPC Endpoint Configuration...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console for RPC endpoint logs
    const rpcLogs = [];
    const errors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      
      // Check for RPC endpoint logs
      if (text.includes('PersonaChain RPC endpoint') || text.includes('BLOCKCHAIN')) {
        rpcLogs.push(text);
      }
      
      // Check for Keplr connection errors
      if (text.includes('Failed to connect to Keplr') || text.includes('status does not exist')) {
        errors.push(text);
      }
      
      // Check for demo mode indicators
      if (text.includes('Demo mode') || text.includes('Simulating')) {
        rpcLogs.push(`DEMO: ${text}`);
      }
    });
    
    console.log('📱 Loading PersonaPass...');
    await page.goto(DEPLOYMENT_URL, { waitUntil: 'networkidle0' });
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Looking for Login button...');
    const loginButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Login'));
    });
    
    if (loginButton && loginButton.click) {
      console.log('🔗 Clicking Login button to trigger RPC connection...');
      await loginButton.click();
      
      // Wait to see RPC endpoint logs
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('⚠️ Could not find Login button, checking for any wallet buttons...');
      
      // Try to find any button that might trigger wallet connection
      const buttons = await page.$$('button');
      for (let i = 0; i < Math.min(buttons.length, 3); i++) {
        const text = await page.evaluate(el => el.textContent, buttons[i]);
        if (text.toLowerCase().includes('connect') || text.toLowerCase().includes('wallet') || text.toLowerCase().includes('keplr')) {
          console.log(`🎯 Found wallet button: "${text}", clicking...`);
          await buttons[i].click();
          await new Promise(resolve => setTimeout(resolve, 3000));
          break;
        }
      }
    }
    
    // Final wait to catch any delayed logs
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Report results
    console.log('\n📊 RPC ENDPOINT ANALYSIS:');
    console.log('=========================');
    
    if (rpcLogs.length > 0) {
      console.log('✅ RPC Endpoint Logs Found:');
      rpcLogs.forEach(log => {
        console.log(`  📍 ${log}`);
        
        // Check if it's using the correct endpoint
        if (log.includes('34.170.121.182:26657')) {
          console.log('  🎉 CORRECT: Using REAL PersonaChain on Google Cloud!');
        } else if (log.includes('localhost:26657')) {
          console.log('  ❌ WRONG: Still using localhost!');
        } else if (log.includes('polygon-rpc.com')) {
          console.log('  ❌ WRONG: Still using Polygon fallback!');
        } else if (log.includes('rpc.personachain.com')) {
          console.log('  ❌ WRONG: Using broken SSL endpoint!');
        }
      });
    } else {
      console.log('❌ No RPC endpoint logs detected');
    }
    
    console.log(`\n🔗 Connection Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('🚨 CONNECTION ERRORS:');
      errors.forEach(error => {
        console.log(`  ❌ ${error}`);
        
        // Analyze the error
        if (error.includes('status does not exist')) {
          console.log('     💡 This suggests wrong RPC endpoint (method not supported)');
        } else if (error.includes('Failed to fetch')) {
          console.log('     💡 This suggests connection/SSL issues');
        }
      });
    }
    
    console.log(`\n🌐 Tested URL: ${DEPLOYMENT_URL}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testRPCEndpoint();