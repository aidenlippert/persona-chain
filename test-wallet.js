const puppeteer = require('puppeteer');

async function testWallet() {
  console.log('🚀 Testing PersonaPass wallet without CSP...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',  // Additional flag to bypass Mixed Content
      '--allow-running-insecure-content',  // Allow HTTP from HTTPS
      '--disable-features=VizDisplayCompositor'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Monitor console logs
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        console.log('❌ Console Error:', text);
      } else if (type === 'warn') {
        console.log('⚠️  Console Warning:', text);
      } else if (text.includes('BLOCKCHAIN') || text.includes('PersonaChain')) {
        console.log('🔗 Blockchain Log:', text);
      }
    });

    // Navigate to wallet
    console.log('📱 Loading wallet...');
    await page.goto('https://wallet-he1wki3z5-aiden-lipperts-projects.vercel.app', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for page to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Check for Mixed Content errors
    const title = await page.title();
    console.log('📄 Page title:', title);

    // Test if we can make an HTTP request from the page
    const testResult = await page.evaluate(async () => {
      try {
        console.log('🧪 Testing HTTP request to PersonaChain...');
        const response = await fetch('http://34.170.121.182:26657/health');
        console.log('✅ HTTP request successful! Status:', response.status);
        return { success: true, status: response.status };
      } catch (error) {
        console.log('❌ HTTP request failed:', error.message);
        return { success: false, error: error.message };
      }
    });

    console.log('🧪 HTTP Test Result:', testResult);

    if (testResult.success) {
      console.log('🎉 SUCCESS! Mixed Content error resolved - HTTP requests work from HTTPS page');
    } else {
      console.log('❌ FAILED! Mixed Content error still present:', testResult.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testWallet().catch(console.error);