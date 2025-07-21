const { chromium } = require('./apps/wallet/node_modules/playwright');

async function captureInspiration() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const sites = [
    'https://stripe.com',
    'https://vercel.com',
    'https://linear.app',
    'https://notion.so',
    'https://tailwindcss.com',
    'https://framer.com',
    'https://figma.com',
    'https://github.com',
    'https://resend.com',
    'https://planetscale.com'
  ];

  for (const [index, url] of sites.entries()) {
    try {
      const page = await context.newPage();
      console.log(`Capturing ${url}...`);
      
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000); // Let animations finish
      
      await page.screenshot({
        path: `inspiration-${index + 1}-${url.replace(/[^a-z0-9]/gi, '-')}.png`,
        fullPage: false
      });
      
      console.log(`✅ Captured ${url}`);
      await page.close();
    } catch (error) {
      console.log(`❌ Failed to capture ${url}: ${error.message}`);
    }
  }

  await browser.close();
}

captureInspiration();