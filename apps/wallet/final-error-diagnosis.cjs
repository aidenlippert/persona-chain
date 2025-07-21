const { chromium } = require('playwright');

async function finalDiagnosis() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Final diagnosis of the syntax error...');
    
    await page.goto('https://personapass.xyz/credentials', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Get the exact problematic line content
    const detailedAnalysis = await page.evaluate(async () => {
      try {
        const response = await fetch('https://personapass.xyz/assets/react-CPII59be.js');
        const text = await response.text();
        const lines = text.split('\n');
        
        // Get line 31 (index 30)
        const line31 = lines[30] || '';
        
        // The error is at column 160, let's examine that area closely
        const problemArea = line31.substring(150, 170);
        const charAtError = line31.charAt(159); // 0-indexed, so position 160 is index 159
        const charCode = line31.charCodeAt(159);
        
        // Look for the template literal issue
        const templateLiteralMatch = line31.match(/`[^`]*`/g);
        const backtickPositions = [];
        
        for (let i = 0; i < line31.length; i++) {
          if (line31[i] === '`') {
            backtickPositions.push(i);
          }
        }
        
        return {
          line31Full: line31,
          line31Length: line31.length,
          problemArea,
          charAtError,
          charCode,
          backtickPositions,
          templateLiteralMatch,
          // Check if it's the exact issue mentioned in the error
          errorContext: line31.substring(145, 175)
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    if (detailedAnalysis.error) {
      console.log(`❌ Error: ${detailedAnalysis.error}`);
    } else {
      console.log('\n🎯 EXACT ERROR ANALYSIS:');
      console.log(`Line 31 length: ${detailedAnalysis.line31Length} characters`);
      console.log(`Character at position 160: "${detailedAnalysis.charAtError}" (ASCII: ${detailedAnalysis.charCode})`);
      console.log(`Problem area (chars 150-170): "${detailedAnalysis.problemArea}"`);
      console.log(`Error context (chars 145-175): "${detailedAnalysis.errorContext}"`);
      console.log(`Backtick positions: [${detailedAnalysis.backtickPositions.join(', ')}]`);
      console.log(`Template literals found: ${detailedAnalysis.templateLiteralMatch ? detailedAnalysis.templateLiteralMatch.length : 0}`);
      
      // The problem is clearly visible now - let's check the exact string
      console.log('\n🔍 FULL LINE 31:');
      console.log(detailedAnalysis.line31Full);
      
      // Check if this is indeed the template literal issue
      if (detailedAnalysis.errorContext.includes('Error generating stack: `+o.message+`')) {
        console.log('\n✅ CONFIRMED: Found the template literal syntax error!');
        console.log('The issue is in the error message template literal construction.');
        console.log('The code is trying to concatenate strings with + inside a template literal context.');
      }
    }
    
    // Also check if this is coming from a specific React component
    console.log('\n🔍 Checking component stack trace...');
    const componentAnalysis = await page.evaluate(() => {
      // Look for any React error boundaries or lazy loading components
      const reactErrors = [];
      const originalError = console.error;
      
      console.error = function(...args) {
        if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('componentStack')) {
          reactErrors.push(args);
        }
        return originalError.apply(console, args);
      };
      
      // Trigger any pending React errors
      setTimeout(() => {
        window.dispatchEvent(new Event('test'));
      }, 100);
      
      return {
        hasLazyComponents: document.querySelector('[data-lazy]') !== null,
        hasErrorBoundaries: document.querySelector('[data-error-boundary]') !== null,
        reactVersion: window.React ? window.React.version : 'unknown'
      };
    });
    
    console.log('\n🔍 Component Analysis:');
    console.log(`Has lazy components: ${componentAnalysis.hasLazyComponents}`);
    console.log(`Has error boundaries: ${componentAnalysis.hasErrorBoundaries}`);
    console.log(`React version: ${componentAnalysis.reactVersion}`);
    
  } catch (error) {
    console.log(`❌ Diagnosis failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

finalDiagnosis().catch(console.error);