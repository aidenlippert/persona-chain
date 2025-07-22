/**
 * Test API deployment after minimal config fix
 */

const https = require('https');

async function testAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://personapass.xyz${endpoint}`;
    console.log(`\n🧪 TESTING: ${url}`);
    
    const req = https.get(url, (res) => {
      let data = '';
      
      console.log(`📊 Status: ${res.statusCode}`);
      console.log(`📋 Content-Type: ${res.headers['content-type']}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const preview = data.substring(0, 200);
        console.log(`📄 Response Preview: ${preview}`);
        
        if (data.includes('html')) {
          console.log('❌ STILL HTML');
        } else {
          console.log('✅ NON-HTML RESPONSE!');
        }
        
        resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'],
          body: data,
          isHTML: data.includes('html')
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function main() {
  console.log('🚀 TESTING API DEPLOYMENT AFTER MINIMAL CONFIG FIX');
  
  // Wait a bit for deployment
  console.log('⏳ Waiting 30 seconds for deployment...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  try {
    await testAPI('/api/simple');
    await testAPI('/api/hello');
    await testAPI('/api/test');
    await testAPI('/api/connectors/github/auth');
    
    console.log('\n🎯 ANALYSIS:');
    console.log('If any endpoint returns JSON, the serverless functions are working!');
    console.log('If all still return HTML, we have a fundamental deployment issue.');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

main();