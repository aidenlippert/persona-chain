import { chromium } from 'playwright';
import fs from 'fs';

async function captureUIIssues() {
  console.log('🎭 Starting UI Analysis with Playwright...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  try {
    // Navigate to the deployed app
    console.log('📱 Navigating to PersonaPass...');
    await page.goto('https://wallet-c6kxp2t9r-aiden-lipperts-projects.vercel.app/');
    await page.waitForTimeout(3000);
    
    // Take homepage screenshot
    await page.screenshot({ 
      path: 'ui-analysis/01-homepage.png', 
      fullPage: true 
    });
    console.log('✅ Homepage screenshot captured');
    
    // Navigate to credentials page
    console.log('🎫 Analyzing Credentials page...');
    await page.goto('https://wallet-c6kxp2t9r-aiden-lipperts-projects.vercel.app/credentials');
    await page.waitForTimeout(3000);
    
    // Take credentials page screenshot
    await page.screenshot({ 
      path: 'ui-analysis/02-credentials-page.png', 
      fullPage: true 
    });
    console.log('✅ Credentials page screenshot captured');
    
    // Analyze credentials page layout
    const credentialsAnalysis = await page.evaluate(() => {
      const elements = {
        cards: document.querySelectorAll('[class*="card"], [class*="credential"]').length,
        buttons: document.querySelectorAll('button').length,
        containers: document.querySelectorAll('[class*="container"], [class*="wrapper"]').length,
        grids: document.querySelectorAll('[class*="grid"], [class*="flex"]').length,
        text: document.querySelectorAll('p, span, div').length
      };
      
      // Check for common layout issues
      const issues = [];
      const bodyWidth = document.body.scrollWidth;
      const viewportWidth = window.innerWidth;
      
      if (bodyWidth > viewportWidth) {
        issues.push('Horizontal overflow detected');
      }
      
      // Check for overlapping elements
      const allElements = document.querySelectorAll('*');
      let overlapping = 0;
      for (let i = 0; i < Math.min(allElements.length, 50); i++) {
        const rect = allElements[i].getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) overlapping++;
      }
      
      if (overlapping > 10) {
        issues.push('Many elements have zero dimensions');
      }
      
      return { elements, issues, bodyWidth, viewportWidth };
    });
    
    console.log('📊 Credentials page analysis:', credentialsAnalysis);
    
    // Navigate to proofs page
    console.log('🔐 Analyzing ZK Proofs page...');
    await page.goto('https://wallet-c6kxp2t9r-aiden-lipperts-projects.vercel.app/proofs');
    await page.waitForTimeout(3000);
    
    // Take proofs page screenshot
    await page.screenshot({ 
      path: 'ui-analysis/03-proofs-page.png', 
      fullPage: true 
    });
    console.log('✅ Proofs page screenshot captured');
    
    // Analyze proofs page layout
    const proofsAnalysis = await page.evaluate(() => {
      const elements = {
        cards: document.querySelectorAll('[class*="card"], [class*="proof"]').length,
        buttons: document.querySelectorAll('button').length,
        forms: document.querySelectorAll('form, [class*="form"]').length,
        containers: document.querySelectorAll('[class*="container"], [class*="wrapper"]').length
      };
      
      const issues = [];
      const bodyWidth = document.body.scrollWidth;
      const viewportWidth = window.innerWidth;
      
      if (bodyWidth > viewportWidth) {
        issues.push('Horizontal overflow detected');
      }
      
      return { elements, issues, bodyWidth, viewportWidth };
    });
    
    console.log('📊 Proofs page analysis:', proofsAnalysis);
    
    // Test mobile responsiveness
    console.log('📱 Testing mobile responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto('https://wallet-c6kxp2t9r-aiden-lipperts-projects.vercel.app/credentials');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'ui-analysis/04-credentials-mobile.png', 
      fullPage: true 
    });
    
    await page.goto('https://wallet-c6kxp2t9r-aiden-lipperts-projects.vercel.app/proofs');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'ui-analysis/05-proofs-mobile.png', 
      fullPage: true 
    });
    
    console.log('✅ Mobile screenshots captured');
    
    // Generate analysis report
    const report = {
      timestamp: new Date().toISOString(),
      credentials: credentialsAnalysis,
      proofs: proofsAnalysis,
      recommendations: [
        'Fix horizontal overflow if detected',
        'Improve card layout and spacing',
        'Add proper responsive design',
        'Implement better visual hierarchy',
        'Add loading states and error handling',
        'Improve typography and readability'
      ]
    };
    
    fs.writeFileSync('ui-analysis/analysis-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Analysis report saved');
    
  } catch (error) {
    console.error('❌ Error during UI analysis:', error);
  } finally {
    await browser.close();
  }
}

// Create analysis directory
if (!fs.existsSync('ui-analysis')) {
  fs.mkdirSync('ui-analysis');
}

// Run analysis
captureUIIssues().catch(console.error);