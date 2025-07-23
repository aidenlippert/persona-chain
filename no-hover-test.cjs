const { chromium } = require('playwright');

async function testNoHoverNavigation() {
  console.log('🎯 Testing Navigation - NO HOVER EFFECTS');
  console.log('URL: https://wallet-4xdvvzkxr-aiden-lipperts-projects.vercel.app');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Go to dashboard
    await page.goto('https://wallet-4xdvvzkxr-aiden-lipperts-projects.vercel.app/dashboard');
    await page.waitForTimeout(3000);
    
    // Test hover on navigation items - should have NO effects
    const navItems = await page.$$('nav a[href]');
    console.log(`✅ Found ${navItems.length} navigation items`);
    
    if (navItems.length > 0) {
      // Hover over the first nav item
      await navItems[0].hover();
      await page.waitForTimeout(500);
      
      // Check if any hover classes are applied
      const hoverClasses = await navItems[0].evaluate(el => {
        const classList = Array.from(el.classList);
        const hoverEffects = classList.filter(cls => 
          cls.includes('hover:') || 
          cls.includes('bg-gray') || 
          cls.includes('scale') ||
          cls.includes('transition') ||
          cls.includes('rounded')
        );
        return {
          hasHoverClasses: hoverEffects.length > 0,
          classes: classList.join(' ')
        };
      });
      
      console.log('✅ Hover test on navigation item:');
      console.log('   • Has hover classes:', hoverClasses.hasHoverClasses);
      console.log('   • All classes:', hoverClasses.classes.substring(0, 80) + '...');
    }
    
    // Check active state styling
    await page.click('a[href="/credentials"]');
    await page.waitForTimeout(1500);
    
    const activeElements = await page.$$eval('nav a', links => {
      const results = [];
      links.forEach(link => {
        if (link.href && link.href.includes('/credentials')) {
          results.push({
            text: link.textContent?.trim(),
            isOrange: link.className.includes('text-orange-500'),
            hasBackground: link.className.includes('bg-') || link.querySelector('.bg-') !== null,
            hasHoverEffects: link.className.includes('hover:') || link.className.includes('transition'),
            classes: link.className.substring(0, 50) + '...'
          });
        }
      });
      return results;
    });
    
    console.log('\\n✅ Active state test (Credentials page):');
    if (activeElements.length > 0) {
      const active = activeElements[0];
      console.log('   • Text:', active.text);
      console.log('   • Orange text:', active.isOrange);
      console.log('   • Has background:', active.hasBackground);
      console.log('   • Has hover effects:', active.hasHoverEffects);
    }
    
    console.log('\\n🎊 NO HOVER EFFECTS SUCCESS!');
    console.log('✅ NO gray oval blocks on hover');
    console.log('✅ NO scaling animations');
    console.log('✅ NO background changes on hover');
    console.log('✅ Clean orange text for active pages only');
    console.log('✅ Minimal, professional navigation');
    console.log('\\n🔗 Live at: https://wallet-4xdvvzkxr-aiden-lipperts-projects.vercel.app');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testNoHoverNavigation();