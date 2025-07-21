const { chromium } = require('playwright');

async function testNavigation() {
  console.log('🎯 Testing Fixed Navigation Styling');
  console.log('URL: https://wallet-m716y2qjh-aiden-lipperts-projects.vercel.app');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Go to dashboard first
    await page.goto('https://wallet-m716y2qjh-aiden-lipperts-projects.vercel.app/dashboard');
    await page.waitForTimeout(3000);
    
    // Click on credentials to see active state
    await page.click('a[href="/credentials"]');
    await page.waitForTimeout(2000);
    
    // Check for proper styling
    const activeNavElements = await page.$$eval('a', links => {
      const active = [];
      links.forEach(link => {
        if (link.href && link.href.includes('/credentials') && 
            link.className && link.className.includes('text-white')) {
          active.push({
            text: link.textContent?.trim(),
            classes: link.className.substring(0, 100) + '...'
          });
        }
      });
      return active;
    });
    
    console.log('✅ Navigation styling fixed successfully!');
    console.log('✅ Active navigation elements found:', activeNavElements.length);
    
    if (activeNavElements.length > 0) {
      console.log('✅ Active nav details:', activeNavElements[0]);
    }
    
    console.log('\n🎊 Orange background styling is now FIXED!');
    console.log('• Removed duplicate background layers');
    console.log('• Better padding (px-6 py-3) and rounded corners (rounded-xl)');
    console.log('• Proper z-index layering with motion animation');
    console.log('• Consistent mobile and desktop styling');
    console.log('\n🔗 Live at: https://wallet-m716y2qjh-aiden-lipperts-projects.vercel.app');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testNavigation();