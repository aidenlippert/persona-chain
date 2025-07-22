/**
 * ULTIMATE CACHE BUSTER TEST v3
 */

const https = require('https');

function testCacheBust() {
  console.log('🚀 TESTING ULTIMATE CACHE BUSTER v3');
  console.log('⏰ Waiting 60 seconds for Vercel deployment...');
  
  setTimeout(() => {
    console.log('\n🧪 TESTING: https://personapass.xyz/');
    
    const req = https.get('https://personapass.xyz/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('📊 Response received, checking for cache bust markers...');
        
        if (data.includes('ULTIMATE CACHE BUSTER v3') || data.includes('CACHE BUST v3')) {
          console.log('✅ SUCCESS! New version deployed - cache busted!');
        } else if (data.includes('GitHubAPIService-BK2M6uJE.js')) {
          console.log('❌ STILL CACHED - old asset hash detected');
        } else {
          console.log('🔍 Checking for new asset hashes...');
          const hashMatches = data.match(/GitHubAPIService-[A-Za-z0-9_-]{8,}\.js/g);
          if (hashMatches) {
            console.log('📦 Found asset hashes:', hashMatches);
            if (hashMatches.some(hash => !hash.includes('BK2M6uJE'))) {
              console.log('✅ NEW ASSET HASH FOUND - Cache successfully busted!');
            } else {
              console.log('❌ Same old hash - still cached');
            }
          } else {
            console.log('🔍 No GitHubAPIService hash found in HTML');
          }
        }
        
        console.log('\n🎯 To test OAuth: Go to https://personapass.xyz/ and try GitHub OAuth');
        console.log('🔍 Check console for "ULTIMATE CACHE BUSTER v3" messages');
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ ERROR:', error.message);
    });
  }, 60000);
}

testCacheBust();