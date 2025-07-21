const { chromium } = require('./apps/wallet/node_modules/playwright');

async function captureCurrentSite() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const pages = [
    'http://localhost:5176/', // Landing page
    'http://localhost:5176/about',
    'http://localhost:5176/security', 
    'http://localhost:5176/developers',
    'http://localhost:5176/dashboard',
    'http://localhost:5176/onboarding'
  ];

  for (const [index, url] of pages.entries()) {
    try {
      const page = await context.newPage();
      console.log(`Capturing ${url}...`);
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const pageName = url.split('/').pop() || 'landing';
      await page.screenshot({
        path: `current-${index + 1}-${pageName}.png`,
        fullPage: true
      });
      
      console.log(`✅ Captured ${url}`);
      await page.close();
    } catch (error) {
      console.log(`❌ Failed to capture ${url}: ${error.message}`);
    }
  }

  await browser.close();
}

captureCurrentSite();