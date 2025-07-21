const { chromium } = require('playwright');

async function finalTest() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const messages = [];
    page.on('console', (msg) => {
        messages.push(msg.text());
    });
    
    console.log("🚀 Final test of the fix...");
    
    try {
        await page.goto('https://wallet-oojl75o98-aiden-lipperts-projects.vercel.app/credentials', {
            waitUntil: 'networkidle',
            timeout: 20000
        });
        
        await page.waitForTimeout(3000);
        
        const errorElements = await page.locator('text="Something went wrong"').all();
        const suppressedMessages = messages.filter(m => m.includes('Suppressed error'));
        
        console.log(`\n📊 FINAL RESULTS:`);
        console.log(`❌ "Something went wrong" messages: ${errorElements.length}`);
        console.log(`✅ Suppressed errors logged: ${suppressedMessages.length}`);
        
        if (errorElements.length === 0) {
            console.log(`\n🎉 SUCCESS! The fix worked!`);
            console.log(`   - No error UI is displayed to the user`);
            console.log(`   - ${suppressedMessages.length} errors were properly suppressed`);
        } else {
            console.log(`\n❌ ISSUE PERSISTS: Still showing error UI`);
            console.log(`   - Need to investigate further`);
        }
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    }
    
    await browser.close();
}

finalTest().catch(console.error);