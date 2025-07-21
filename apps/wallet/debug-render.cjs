const { chromium } = require('playwright');

async function debugRender() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const messages = [];
    page.on('console', (msg) => {
        const text = msg.text();
        messages.push(text);
        if (text.includes('Error boundary') || text.includes('Suppressing')) {
            console.log(`📝 ${text}`);
        }
    });
    
    console.log("🔍 Debugging render logic...");
    
    try {
        await page.goto('https://wallet-oojl75o98-aiden-lipperts-projects.vercel.app/credentials', {
            waitUntil: 'networkidle',
            timeout: 20000
        });
        
        await page.waitForTimeout(5000);
        
        const errorElements = await page.locator('text="Something went wrong"').all();
        
        console.log(`\n📋 Console Messages Analysis:`);
        const suppressionMessages = messages.filter(m => m.includes('Suppressed') || m.includes('Suppressing'));
        const renderMessages = messages.filter(m => m.includes('render') && m.includes('Suppress'));
        
        console.log(`   Total messages: ${messages.length}`);
        console.log(`   Suppression messages: ${suppressionMessages.length}`);
        console.log(`   Render suppression messages: ${renderMessages.length}`);
        
        if (renderMessages.length > 0) {
            console.log(`\n🎯 Render suppression messages found:`);
            renderMessages.forEach(msg => console.log(`   - ${msg}`));
        } else {
            console.log(`\n⚠️  No render suppression messages - the render logic may not be triggering`);
        }
        
        console.log(`\n📊 Result: ${errorElements.length} error UI elements found`);
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    }
    
    await browser.close();
}

debugRender().catch(console.error);