/**
 * Script to run comprehensive API tests
 * Tests all APIs and generates detailed report
 */

import { apiTester } from '../tests/api-integration-tests';
import { errorService } from "@/services/errorService";

async function runAPITests() {
  try {
    console.log('🚀 Starting comprehensive API integration tests...');
    console.log('This will test all APIs for VC creation capability.\n');

    // Run full test suite
    const testResults = await apiTester.runFullTestSuite();
    
    // Test specific problematic APIs individually
    console.log('\n🔧 Testing problematic APIs individually...');
    
    const problemAPIs = [
      'rapidapi_trulioo_global',
      'rapidapi_yodlee_fastlink', 
      'rapidapi_twilio_verify',
      'linkedin_advanced',
      'github_advanced'
    ];

    for (const apiId of problemAPIs) {
      try {
        console.log(`\n🔍 Individual test for ${apiId}:`);
        const result = await apiTester.testSpecificAPI(apiId);
        
        if (!result.success || !result.credentialCreated) {
          console.log(`❌ ${apiId} failed: ${result.error}`);
          
          // Attempt to fix
          console.log(`🔧 Attempting to fix ${apiId}...`);
          const fixResult = await apiTester.fixBrokenAPI(apiId);
          console.log(`Fix result: ${fixResult.success ? '✅' : '❌'} ${fixResult.message}`);
        } else {
          console.log(`✅ ${apiId} working correctly`);
        }
      } catch (error) {
        console.log(`❌ Error testing ${apiId}: ${error}`);
      }
    }

    // Generate final report
    console.log('\n' + '='.repeat(100));
    console.log('🏁 FINAL TEST SUMMARY');
    console.log('='.repeat(100));
    
    const workingAPIs = testResults.results.filter(r => r.success && r.credentialCreated);
    const brokenAPIs = testResults.results.filter(r => !r.success || !r.credentialCreated);
    
    console.log(`\n📊 RESULTS:`);
    console.log(`   ✅ Working APIs: ${workingAPIs.length}`);
    console.log(`   ❌ Broken APIs: ${brokenAPIs.length}`);
    console.log(`   📈 Success Rate: ${(workingAPIs.length / testResults.totalAPIs * 100).toFixed(1)}%`);
    
    if (workingAPIs.length > 0) {
      console.log(`\n✅ WORKING APIS:`);
      workingAPIs.forEach(api => {
        console.log(`   • ${api.apiName} (${api.category}) - ${api.responseTime}ms`);
      });
    }
    
    if (brokenAPIs.length > 0) {
      console.log(`\n❌ BROKEN APIS THAT NEED FIXING:`);
      brokenAPIs.forEach(api => {
        console.log(`   • ${api.apiName} (${api.category}) - Error: ${api.error}`);
      });
      
      console.log(`\n🔧 FIXES NEEDED:`);
      brokenAPIs.forEach(api => {
        console.log(`   • ${api.apiName}: ${getFixSuggestion(api.error || '')}`);
      });
    }
    
    console.log('\n' + '='.repeat(100));
    
    return testResults;
    
  } catch (error) {
    errorService.logError('❌ Error running API tests:', error);
    throw error;
  }
}

function getFixSuggestion(error: string): string {
  if (error.includes('authentication') || error.includes('401') || error.includes('403')) {
    return 'Update authentication credentials in environment variables';
  }
  if (error.includes('404') || error.includes('endpoint')) {
    return 'Verify and update API endpoint URLs';
  }
  if (error.includes('400') || error.includes('bad request')) {
    return 'Fix request payload format and parameters';
  }
  if (error.includes('rate limit') || error.includes('429')) {
    return 'Implement rate limiting and retry logic';
  }
  if (error.includes('network') || error.includes('timeout')) {
    return 'Add network timeout handling and retry mechanism';
  }
  if (error.includes('undefined') || error.includes('null')) {
    return 'Add missing environment variables and configuration';
  }
  return 'Review API integration and fix implementation';
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runAPITests()
    .then(() => {
      console.log('\n🎉 API testing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      errorService.logError('\n💥 API testing failed:', error);
      process.exit(1);
    });
}

export { runAPITests };