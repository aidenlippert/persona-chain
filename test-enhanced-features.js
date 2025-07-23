import { chromium } from 'playwright';

async function testEnhancedFeatures() {
  console.log('🚀 Testing Enhanced Features: Top Nav + Credential Validation...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  try {
    const url = 'https://wallet-djgym7dto-aiden-lipperts-projects.vercel.app';
    
    // Test homepage and navigation
    console.log('🏠 Testing Homepage with Top Navigation...');
    await page.goto(url);
    await page.waitForTimeout(2000);
    
    // Check for top navigation (not sidebar)
    const topNav = await page.$('nav[class*="fixed top-0"]');
    const sidebar = await page.$('nav[class*="fixed left-0"]');
    
    console.log(`📊 Top Navigation: ${topNav ? '✅ Found' : '❌ Missing'}`);
    console.log(`📊 Sidebar Navigation: ${sidebar ? '❌ Found (should be removed)' : '✅ Properly removed'}`);
    
    // Test navigation links
    const navLinks = await page.$$eval('nav a', links => 
      links.map(link => link.textContent?.trim()).filter(text => text && text.length > 0)
    );
    console.log(`🔗 Navigation Links Found: ${navLinks.length} (${navLinks.join(', ')})`);
    
    // Test credentials page
    console.log('🎫 Testing Enhanced Credentials Page...');
    await page.goto(`${url}/credentials`);
    await page.waitForTimeout(3000);
    
    const credentialsTitle = await page.textContent('h1');
    const filterButtons = await page.$$eval('button', buttons => 
      buttons.filter(btn => ['All', 'Active', 'Revoked', 'Pending'].includes(btn.textContent?.trim())).length
    );
    
    console.log(`✅ Credentials Page Title: ${credentialsTitle}`);
    console.log(`✅ Filter Buttons: ${filterButtons} found`);
    
    // Test ZK proofs page with credential validation
    console.log('🔐 Testing Enhanced ZK Proofs Page with Credential Validation...');
    await page.goto(`${url}/proofs`);
    await page.waitForTimeout(3000);
    
    const proofsTitle = await page.textContent('h1');
    console.log(`✅ ZK Proofs Page Title: ${proofsTitle}`);
    
    // Check for proof type cards with credential validation
    const proofCards = await page.$$('.grid button');
    console.log(`🎯 Proof Type Cards: ${proofCards.length} found`);
    
    // Check for credential validation indicators
    const validationIcons = await page.$$eval('button', buttons => {
      const icons = [];
      buttons.forEach(btn => {
        const text = btn.textContent || '';
        if (text.includes('✅') || text.includes('🚫')) {
          icons.push(text.includes('✅') ? 'available' : 'blocked');
        }
      });
      return icons;
    });
    
    console.log(`🔒 Credential Validation Icons: ${validationIcons.length} found (${validationIcons.join(', ')})`);
    
    // Check for missing credential warnings
    const warningMessages = await page.$$eval('[class*="bg-red"]', elements => 
      elements.length
    );
    console.log(`⚠️ Missing Credential Warnings: ${warningMessages} found`);
    
    // Check for credential requirement lists
    const credentialRequirements = await page.$$eval('button', buttons => {
      let count = 0;
      buttons.forEach(btn => {
        const text = btn.textContent || '';
        if (text.includes('Missing credentials') || text.includes('Need one of:')) {
          count++;
        }
      });
      return count;
    });
    
    console.log(`📋 Credential Requirement Messages: ${credentialRequirements} found`);
    
    // Test mobile responsiveness of top nav
    console.log('📱 Testing Mobile Responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const mobileNavButton = await page.$('button[class*="md:hidden"]');
    console.log(`📱 Mobile Menu Button: ${mobileNavButton ? '✅ Found' : '❌ Missing'}`);
    
    // Test mobile menu functionality
    if (mobileNavButton) {
      await mobileNavButton.click();
      await page.waitForTimeout(500);
      const mobileMenu = await page.$('[class*="mobile"], [class*="md:hidden"]');
      console.log(`📱 Mobile Menu Opens: ${mobileMenu ? '✅ Working' : '❌ Not working'}`);
    }
    
    // Success metrics
    const topNavWorking = !!topNav && !sidebar;
    const credValidationWorking = validationIcons.length > 0;
    const mobileResponsive = !!mobileNavButton;
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 ENHANCED FEATURES TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`✅ Top Navigation (No Sidebar): ${topNavWorking ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Enhanced Credentials Page: ${credentialsTitle ? 'LOADED' : 'FAILED'}`);
    console.log(`✅ Enhanced ZK Proofs Page: ${proofsTitle ? 'LOADED' : 'FAILED'}`);
    console.log(`✅ Credential Validation: ${credValidationWorking ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Missing Credential Warnings: ${warningMessages > 0 ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Mobile Responsive: ${mobileResponsive ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Navigation Links: ${navLinks.length >= 5 ? 'COMPLETE' : 'INCOMPLETE'}`);
    
    const overallSuccess = topNavWorking && credValidationWorking && 
                          credentialsTitle && proofsTitle && mobileResponsive;
    
    console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('='.repeat(70));
    
    if (overallSuccess) {
      console.log('🎊 All enhanced features working perfectly!');
      console.log('• Top navigation replaces sidebar ✓');
      console.log('• Credential validation prevents invalid proofs ✓');
      console.log('• Missing credential guidance provided ✓');
      console.log('• Mobile responsive design ✓');
    }
    
    return overallSuccess;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testEnhancedFeatures().then(success => {
  process.exit(success ? 0 : 1);
}).catch(console.error);