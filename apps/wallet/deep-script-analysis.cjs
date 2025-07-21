const { chromium } = require('playwright');

async function deepScriptAnalysis() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Navigating to credentials page...');
    await page.goto('https://personapass.xyz/credentials', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Fetch and analyze the problematic React script
    console.log('\n📄 DETAILED ANALYSIS OF react-CPII59be.js:');
    
    const scriptAnalysis = await page.evaluate(async () => {
      try {
        const response = await fetch('https://personapass.xyz/assets/react-CPII59be.js');
        if (!response.ok) {
          return { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const text = await response.text();
        const lines = text.split('\n');
        
        // Find line 31 (the problematic line)
        const line31 = lines[30] || 'Line 31 not found';
        const line30 = lines[29] || 'Line 30 not found';
        const line32 = lines[31] || 'Line 32 not found';
        
        // Check around character 160 on line 31
        let problematicChar = '';
        let context = '';
        if (line31.length >= 160) {
          problematicChar = line31.charAt(159); // 0-indexed
          context = line31.substring(150, 170);
        }
        
        // Check for unusual characters
        const hasInvalidChars = /[^\x20-\x7E\n\r\t]/.test(text);
        const hasNullBytes = text.includes('\0');
        const hasBOM = text.charCodeAt(0) === 0xFEFF;
        
        // Check encoding
        const firstBytes = [];
        for (let i = 0; i < Math.min(10, text.length); i++) {
          firstBytes.push(text.charCodeAt(i));
        }
        
        return {
          fileSize: text.length,
          totalLines: lines.length,
          line30,
          line31,
          line32,
          line31Length: line31.length,
          problematicChar: problematicChar ? problematicChar.charCodeAt(0) : null,
          context,
          hasInvalidChars,
          hasNullBytes,
          hasBOM,
          firstBytes,
          encoding: 'UTF-8 (assumed)',
          contentType: response.headers.get('content-type')
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    if (scriptAnalysis.error) {
      console.log(`❌ Error analyzing script: ${scriptAnalysis.error}`);
    } else {
      console.log(`📊 File size: ${scriptAnalysis.fileSize} bytes`);
      console.log(`📊 Total lines: ${scriptAnalysis.totalLines}`);
      console.log(`📊 Content-Type: ${scriptAnalysis.contentType}`);
      console.log(`📊 Has BOM: ${scriptAnalysis.hasBOM}`);
      console.log(`📊 Has invalid chars: ${scriptAnalysis.hasInvalidChars}`);
      console.log(`📊 Has null bytes: ${scriptAnalysis.hasNullBytes}`);
      console.log(`📊 First bytes: [${scriptAnalysis.firstBytes.join(', ')}]`);
      
      console.log(`\n🎯 PROBLEMATIC AREA (Line 31, Column 160):`);
      console.log(`Line 30: ${scriptAnalysis.line30}`);
      console.log(`Line 31: ${scriptAnalysis.line31}`);
      console.log(`Line 32: ${scriptAnalysis.line32}`);
      
      if (scriptAnalysis.context) {
        console.log(`\n🔍 Context around column 160:`);
        console.log(`"${scriptAnalysis.context}"`);
        
        if (scriptAnalysis.problematicChar !== null) {
          console.log(`Character at position 160: "${String.fromCharCode(scriptAnalysis.problematicChar)}" (Code: ${scriptAnalysis.problematicChar})`);
        }
      }
    }
    
    // Also check the index script for the lazy loading issue
    console.log('\n📄 CHECKING INDEX SCRIPT FOR LAZY LOADING ISSUES:');
    
    const indexAnalysis = await page.evaluate(async () => {
      try {
        const response = await fetch('https://personapass.xyz/assets/index-Br5pMQJ5.js');
        const text = await response.text();
        
        // Look for lazy import patterns that might be causing issues
        const lazyPatterns = [
          /import\s*\(\s*["'][^"']*["']\s*\)/g,
          /React\.lazy\s*\(/g,
          /lazy\s*\(/g,
          /Suspense/g,
          /import.*credentials/gi
        ];
        
        const matches = {};
        lazyPatterns.forEach((pattern, index) => {
          const found = text.match(pattern) || [];
          matches[`pattern_${index}`] = found.length;
        });
        
        // Check around the error positions
        const errorPositions = [85238, 90702, 130740];
        const contexts = {};
        
        errorPositions.forEach(pos => {
          contexts[`pos_${pos}`] = text.substring(pos - 50, pos + 50);
        });
        
        return {
          fileSize: text.length,
          lazyMatches: matches,
          errorContexts: contexts,
          contentType: response.headers.get('content-type')
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    if (indexAnalysis.error) {
      console.log(`❌ Error analyzing index script: ${indexAnalysis.error}`);
    } else {
      console.log(`📊 Index file size: ${indexAnalysis.fileSize} bytes`);
      console.log(`📊 Lazy patterns found:`, indexAnalysis.lazyMatches);
      
      console.log(`\n🎯 ERROR CONTEXTS IN INDEX SCRIPT:`);
      Object.entries(indexAnalysis.errorContexts).forEach(([pos, context]) => {
        console.log(`${pos}: "${context}"`);
      });
    }
    
    // Test the actual error by trying to manually parse the script
    console.log('\n🧪 TESTING SCRIPT PARSING:');
    
    const parsingTest = await page.evaluate(() => {
      try {
        // Try to create a script element and see if it causes the same error
        const script = document.createElement('script');
        script.src = 'https://personapass.xyz/assets/react-CPII59be.js';
        
        return new Promise((resolve) => {
          script.onload = () => resolve({ success: true, message: 'Script loaded successfully' });
          script.onerror = (e) => resolve({ success: false, message: 'Script failed to load', error: e.toString() });
          
          // Set a timeout
          setTimeout(() => resolve({ success: false, message: 'Script loading timed out' }), 5000);
          
          document.head.appendChild(script);
        });
      } catch (e) {
        return { success: false, message: 'Failed to create script element', error: e.toString() };
      }
    });
    
    console.log(`🧪 Parsing test result:`, parsingTest);
    
    // Take a screenshot for reference
    await page.screenshot({ 
      path: 'detailed-error-analysis.png',
      fullPage: true 
    });
    
  } catch (error) {
    console.log(`❌ Analysis failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

deepScriptAnalysis().catch(console.error);