/**
 * DEBUG: Test API deployment with Playwright to figure out what's wrong
 */

const { chromium } = require('playwright');

async function debugAPIDeployment() {
  console.log('🚀 DEBUGGING API DEPLOYMENT WITH PLAYWRIGHT');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable request/response logging
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('📤 REQUEST:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('📥 RESPONSE:', response.status(), response.url());
      console.log('📋 HEADERS:', response.headers());
    }
  });
  
  try {
    console.log('\n🧪 TESTING: /api/simple');
    const simpleResponse = await page.goto('https://personapass.xyz/api/simple');
    console.log('📊 Status:', simpleResponse.status());
    console.log('📋 Headers:', simpleResponse.headers());
    
    const simpleText = await simpleResponse.text();
    console.log('📄 Response Body Preview:', simpleText.substring(0, 200));
    
    if (simpleText.includes('html')) {
      console.log('❌ STILL GETTING HTML - API FUNCTIONS NOT DEPLOYED');
    } else {
      console.log('✅ GOT NON-HTML RESPONSE');
    }
    
    console.log('\n🧪 TESTING: /api/hello');
    const helloResponse = await page.goto('https://personapass.xyz/api/hello');
    console.log('📊 Status:', helloResponse.status());
    
    const helloText = await helloResponse.text();
    console.log('📄 Response Body Preview:', helloText.substring(0, 200));
    
    console.log('\n🧪 TESTING: /api/test');
    const testResponse = await page.goto('https://personapass.xyz/api/test');
    console.log('📊 Status:', testResponse.status());
    
    const testText = await testResponse.text();
    console.log('📄 Response Body Preview:', testText.substring(0, 200));
    
    console.log('\n🧪 TESTING: /api/connectors/github/auth');
    const authResponse = await page.goto('https://personapass.xyz/api/connectors/github/auth');
    console.log('📊 Status:', authResponse.status());
    
    const authText = await authResponse.text();
    console.log('📄 Response Body Preview:', authText.substring(0, 200));
    
    // Test with POST request
    console.log('\n🧪 TESTING: POST to /api/connectors/github/auth');
    
    const postResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/connectors/github/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: 'test123',
            state: 'test456',
            userId: 'test-user'
          })
        });
        
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          text: await response.text()
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    console.log('📊 POST Status:', postResponse.status);
    console.log('📋 POST Headers:', postResponse.headers);
    console.log('📄 POST Response:', postResponse.text?.substring(0, 300));
    
    if (postResponse.error) {
      console.log('❌ POST Error:', postResponse.error);
    }
    
  } catch (error) {
    console.error('❌ ERROR during API testing:', error);
  }
  
  await browser.close();
  
  console.log('\n🔍 ANALYSIS:');
  console.log('If all responses contain HTML, the serverless functions are NOT deployed');
  console.log('If we get JSON responses, the functions ARE working');
  console.log('We need to fix the deployment configuration in vercel.json');
}

debugAPIDeployment().catch(console.error);