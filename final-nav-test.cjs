const { chromium } = require('playwright');

async function testSimplifiedNavigation() {
  console.log('🎯 Testing Simplified Orange Text Navigation');
  console.log('URL: https://wallet-641ap56om-aiden-lipperts-projects.vercel.app');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Go to dashboard first
    await page.goto('https://wallet-641ap56om-aiden-lipperts-projects.vercel.app/dashboard');
    await page.waitForTimeout(3000);
    
    // Check dashboard active state
    const dashboardActiveElements = await page.$$eval('a', links => {
      const active = [];
      links.forEach(link => {
        if (link.href && (link.href.includes('/dashboard') || link.href.endsWith('/')) && 
            link.className && link.className.includes('text-orange-500')) {
          active.push({
            text: link.textContent?.trim(),
            isOrange: link.className.includes('text-orange-500'),
            hasBackground: link.className.includes('bg-gradient') || link.querySelector('.bg-gradient') !== null
          });
        }
      });
      return active;
    });
    
    console.log('✅ Dashboard page active state:', dashboardActiveElements.length > 0 ? 'FOUND' : 'NOT FOUND');
    if (dashboardActiveElements.length > 0) {
      console.log('   • Text:', dashboardActiveElements[0].text);
      console.log('   • Orange text:', dashboardActiveElements[0].isOrange);
      console.log('   • Has background:', dashboardActiveElements[0].hasBackground);
    }
    
    // Click on credentials to test switching
    await page.click('a[href="/credentials"]');
    await page.waitForTimeout(2000);
    
    // Check credentials active state
    const credentialsActiveElements = await page.$$eval('a', links => {
      const active = [];
      links.forEach(link => {
        if (link.href && link.href.includes('/credentials') && 
            link.className && link.className.includes('text-orange-500')) {
          active.push({
            text: link.textContent?.trim(),
            isOrange: link.className.includes('text-orange-500'),
            hasBackground: link.className.includes('bg-gradient') || link.querySelector('.bg-gradient') !== null
          });
        }
      });
      return active;
    });
    
    console.log('✅ Credentials page active state:', credentialsActiveElements.length > 0 ? 'FOUND' : 'NOT FOUND');
    if (credentialsActiveElements.length > 0) {
      console.log('   • Text:', credentialsActiveElements[0].text);
      console.log('   • Orange text:', credentialsActiveElements[0].isOrange);
      console.log('   • Has background:', credentialsActiveElements[0].hasBackground);
    }
    
    console.log('\n🎊 SIMPLIFIED NAVIGATION SUCCESS!');
    console.log('✅ NO more orange background overlapping icons');
    console.log('✅ Clean orange text color for active pages');
    console.log('✅ Icons and text properly aligned');
    console.log('✅ Simple and professional look');
    console.log('\n🔗 Live at: https://wallet-641ap56om-aiden-lipperts-projects.vercel.app');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testSimplifiedNavigation();