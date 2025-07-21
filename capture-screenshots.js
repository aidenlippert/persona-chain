const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureWebsiteScreenshots() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
    });
    
    const page = await context.newPage();
    
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    const websites = [
        { name: 'litheum', url: 'https://litheum.com' },
        { name: 'stripe', url: 'https://stripe.com' },
        { name: 'linear', url: 'https://linear.app' },
        { name: 'vercel', url: 'https://vercel.com' },
        { name: 'supabase', url: 'https://supabase.com' },
        { name: 'clerk', url: 'https://clerk.com' },
        { name: 'planetscale', url: 'https://planetscale.com' },
        { name: 'railway', url: 'https://railway.app' }
    ];
    
    const results = [];
    
    for (const site of websites) {
        try {
            console.log(`\n📸 Capturing ${site.name}...`);
            
            // Navigate to homepage
            await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(3000); // Wait for animations
            
            // Take homepage screenshot
            const homepageFile = path.join(screenshotsDir, `${site.name}_homepage.png`);
            await page.screenshot({ 
                path: homepageFile, 
                fullPage: true,
                type: 'png'
            });
            
            console.log(`✅ ${site.name} homepage captured`);
            
            results.push({
                site: site.name,
                url: site.url,
                status: 'success'
            });
            
        } catch (error) {
            console.error(`❌ Error capturing ${site.name}:`, error.message);
            results.push({
                site: site.name,
                url: site.url,
                status: 'error',
                error: error.message
            });
        }
    }
    
    await browser.close();
    
    console.log('\n📊 Capture Summary:');
    results.forEach(result => {
        if (result.status === 'success') {
            console.log(`✅ ${result.site}: Screenshots captured successfully`);
        } else {
            console.log(`❌ ${result.site}: ${result.error}`);
        }
    });
    
    return results;
}

captureWebsiteScreenshots().catch(console.error);