const { chromium } = require('playwright');

async function testWithClearCache() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Clear all cache and storage
    await context.clearCookies();
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    
    const messages = [];
    page.on('console', (msg) => {
        const text = msg.text();
        messages.push(text);
        if (text.includes('Error boundary') || text.includes('Suppressing')) {
            console.log(`📝 ${text}`);
        }
    });
    
    console.log("🧹 Testing with cleared cache...");
    
    try {
        // Navigate with cache disabled
        await page.goto('https://wallet-oojl75o98-aiden-lipperts-projects.vercel.app/credentials', {
            waitUntil: 'networkidle',
            timeout: 25000
        });
        
        await page.waitForTimeout(4000);
        
        const errorElements = await page.locator('text="Something went wrong"').all();
        const suppressionMessages = messages.filter(m => m.includes('Suppressed') || m.includes('Suppressing'));
        
        console.log(`\n📊 CACHE-CLEARED TEST RESULTS:`);
        console.log(`❌ "Something went wrong" messages: ${errorElements.length}`);
        console.log(`✅ Suppression messages: ${suppressionMessages.length}`);
        
        if (errorElements.length === 0) {
            console.log(`\n🎉 SUCCESS! Cache clearing fixed the issue!`);
        } else {
            console.log(`\n⚠️  Issue persists even with cache cleared`);
            
            // Try to get more details about the error element
            if (errorElements.length > 0) {
                const parentHTML = await errorElements[0].locator('..').innerHTML();
                console.log(`\n🔍 Error element context:`);
                console.log(parentHTML.substring(0, 200) + '...');
            }
        }
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    }
    
    await browser.close();
}

testWithClearCache().catch(console.error);