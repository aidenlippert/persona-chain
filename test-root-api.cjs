/**
 * Test ROOT LEVEL API deployment
 */

const https = require('https');

async function testEndpoint(url) {
  return new Promise((resolve) => {
    console.log(`\n🧪 TESTING: ${url}`);
    
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`);
        console.log(`📋 Content-Type: ${res.headers['content-type']}`);
        console.log(`📄 Response: ${data.substring(0, 200)}`);
        
        if (data.includes('html')) {
          console.log('❌ STILL HTML');
        } else {
          console.log('✅ SUCCESS - JSON RESPONSE!');
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ ERROR:', error.message);
      resolve();
    });
  });
}

async function main() {
  console.log('🚀 TESTING ROOT-LEVEL API FUNCTIONS');
  
  // Wait for deployment
  console.log('⏳ Waiting 45 seconds for Vercel deployment...');
  await new Promise(resolve => setTimeout(resolve, 45000));
  
  await testEndpoint('https://personapass.xyz/api/test');
  await testEndpoint('https://personapass.xyz/api/github-auth');
  
  console.log('\n🎯 FINAL TEST: If any endpoint returned JSON, ROOT LEVEL APIs WORK!');
}

main();