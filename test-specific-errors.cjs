const { chromium } = require('playwright');

async function analyzeCredentialsErrors() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  const syntaxErrors = [];
  const nodeErrors = [];
  const networkFailures = [];
  
  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const error = {
        text: msg.text(),
        location: msg.location()
      };
      
      if (error.text.toLowerCase().includes('syntaxerror') || 
          error.text.toLowerCase().includes('unexpected token')) {
        syntaxErrors.push(error);
      }
      
      if (error.text.toLowerCase().includes('node cannot be found') ||
          error.text.toLowerCase().includes('cannot find node')) {
        nodeErrors.push(error);
      }
      
      errors.push(error);
      console.log(`🔥 ERROR: ${error.text}`);
      if (error.location) {
        console.log(`   📍 Location: ${error.location.url}:${error.location.lineNumber}:${error.location.columnNumber}`);
      }
    }
  });
  
  // Capture page errors
  page.on('pageerror', (error) => {
    console.log(`💥 PAGE ERROR: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  });
  
  // Capture failed requests
  page.on('requestfailed', (request) => {
    const failure = {
      url: request.url(),
      method: request.method(),
      errorText: request.failure()?.errorText
    };
    networkFailures.push(failure);
    console.log(`❌ NETWORK FAILURE: ${failure.url} - ${failure.errorText}`);
  });
  
  try {
    console.log('🔍 Navigating to https://personapass.xyz/credentials...');
    await page.goto('https://personapass.xyz/credentials', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'credentials-error-analysis.png',
      fullPage: true 
    });
    
    // Try to fetch and analyze the problematic script
    console.log('\n🔍 Analyzing react-CPII59be.js file...');
    try {
      const reactScriptContent = await page.evaluate(async () => {
        const response = await fetch('https://personapass.xyz/assets/react-CPII59be.js');
        const text = await response.text();
        return {
          size: text.length,
          firstChars: text.substring(0, 500),
          line31: text.split('\n')[30] || 'Line 31 not found'
        };
      });
      
      console.log(`📄 React script size: ${reactScriptContent.size} chars`);
      console.log(`📄 First 500 chars: ${reactScriptContent.firstChars}`);
      console.log(`📄 Line 31 (where error occurs): ${reactScriptContent.line31}`);
      
    } catch (e) {
      console.log(`❌ Failed to analyze react script: ${e.message}`);
    }
    
    // Analyze the main index script
    console.log('\n🔍 Analyzing index-Br5pMQJ5.js file...');
    try {
      const indexScriptContent = await page.evaluate(async () => {
        const response = await fetch('https://personapass.xyz/assets/index-Br5pMQJ5.js');
        const text = await response.text();
        return {
          size: text.length,
          firstChars: text.substring(0, 500),
          around130740: text.substring(130730, 130750),
          around90702: text.substring(90692, 90712),
          around85238: text.substring(85228, 85248)
        };
      });
      
      console.log(`📄 Index script size: ${indexScriptContent.size} chars`);
      console.log(`📄 Around position 130740: ${indexScriptContent.around130740}`);
      console.log(`📄 Around position 90702: ${indexScriptContent.around90702}`);
      console.log(`📄 Around position 85238: ${indexScriptContent.around85238}`);
      
    } catch (e) {
      console.log(`❌ Failed to analyze index script: ${e.message}`);
    }
    
    // Check if it's a lazy loading issue
    console.log('\n🔍 Testing lazy component loading...');
    await page.evaluate(() => {
      // Try to trigger any lazy loading
      window.dispatchEvent(new Event('load'));
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 1000);
    });
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.log(`❌ Navigation failed: ${error.message}`);
  }
  
  // Final analysis
  console.log('\n📊 FINAL ANALYSIS:');
  console.log(`Total errors: ${errors.length}`);
  console.log(`Syntax errors: ${syntaxErrors.length}`);
  console.log(`Node errors: ${nodeErrors.length}`);
  console.log(`Network failures: ${networkFailures.length}`);
  
  if (syntaxErrors.length > 0) {
    console.log('\n🎯 SYNTAX ERRORS DETECTED:');
    syntaxErrors.forEach((error, i) => {
      console.log(`${i + 1}. ${error.text}`);
      if (error.location) {
        console.log(`   File: ${error.location.url}`);
        console.log(`   Line: ${error.location.lineNumber}, Column: ${error.location.columnNumber}`);
      }
    });
  }
  
  if (nodeErrors.length > 0) {
    console.log('\n🎯 NODE ERRORS DETECTED:');
    nodeErrors.forEach((error, i) => {
      console.log(`${i + 1}. ${error.text}`);
      if (error.location) {
        console.log(`   File: ${error.location.url}`);
        console.log(`   Line: ${error.location.lineNumber}, Column: ${error.location.columnNumber}`);
      }
    });
  }
  
  await browser.close();
  
  return {
    totalErrors: errors.length,
    syntaxErrors,
    nodeErrors,
    networkFailures
  };
}

analyzeCredentialsErrors().catch(console.error);