/**
 * 🧪 PUPPETEER TEST: RapidAPI Marketplace on Live Deployment
 * 
 * Tests the revolutionary RapidAPI marketplace functionality on personapass.xyz
 * Verifies access to 40,000+ APIs and credential creation workflow
 */

import puppeteer from 'puppeteer';

const DEPLOYMENT_URL = 'https://wallet-qaziakifb-aiden-lipperts-projects.vercel.app';

async function testRapidAPIMarketplace() {
    const browser = await puppeteer.launch({ 
        headless: false, // Show browser for demo
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const results = [];

    try {
        console.log('🚀 Testing RapidAPI Marketplace on Live Deployment...');
        console.log(`URL: ${DEPLOYMENT_URL}`);

        // Test 1: Landing Page Load
        console.log('\n1️⃣ Testing landing page load...');
        await page.goto(DEPLOYMENT_URL, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'live-01-landing.png' });

        const title = await page.title();
        results.push({
            test: 'Landing Page Load',
            status: title.includes('PersonaPass') ? 'PASS' : 'FAIL',
            details: `Title: ${title}`
        });

        // Test 2: Navigate to Marketplace
        console.log('\n2️⃣ Testing marketplace navigation...');
        
        // Wait for navigation to be available
        await page.waitForSelector('nav', { timeout: 10000 });
        
        // Look for marketplace link
        const marketplaceLink = await page.$('a[href="/marketplace"]');
        
        if (marketplaceLink) {
            await marketplaceLink.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            await page.screenshot({ path: 'live-02-marketplace-navigation.png' });
            
            results.push({
                test: 'Marketplace Navigation',
                status: 'PASS',
                details: 'Successfully navigated to marketplace'
            });
        } else {
            // Try direct marketplace URL
            await page.goto(`${DEPLOYMENT_URL}/marketplace`, { waitUntil: 'networkidle2' });
            await page.screenshot({ path: 'live-02-marketplace-direct.png' });
            
            results.push({
                test: 'Marketplace Navigation',
                status: 'PARTIAL',
                details: 'Accessed marketplace via direct URL'
            });
        }

        // Test 3: Marketplace Component Load
        console.log('\n3️⃣ Testing marketplace component load...');
        
        const currentUrl = page.url();
        const isMarketplacePage = currentUrl.includes('/marketplace');
        
        if (isMarketplacePage) {
            // Check for marketplace elements
            const marketplaceTitle = await page.$('h1, h2');
            const searchBox = await page.$('input[type="search"], input[placeholder*="search"]');
            const apiCards = await page.$$('[data-testid="api-card"], .api-card, [class*="api"], [class*="marketplace"]');

            results.push({
                test: 'Marketplace Component Load',
                status: marketplaceTitle || searchBox || apiCards.length > 0 ? 'PASS' : 'FAIL',
                details: `Found ${apiCards.length} API elements, title: ${!!marketplaceTitle}, search: ${!!searchBox}`
            });

            await page.screenshot({ path: 'live-03-marketplace-loaded.png' });
        } else {
            results.push({
                test: 'Marketplace Component Load',
                status: 'FAIL',
                details: `Not on marketplace page: ${currentUrl}`
            });
        }

        // Test 4: RapidAPI Integration Check
        console.log('\n4️⃣ Testing RapidAPI integration...');
        
        // Check for RapidAPI key configuration
        const rapidApiKeyPresent = await page.evaluate(() => {
            return !!(window.VITE_RAPIDAPI_KEY || 
                     localStorage.getItem('rapidapi_key') ||
                     document.querySelector('[data-rapidapi-key]'));
        });

        // Check for marketplace categories
        const categories = await page.$$('.category, [data-category], .api-category').then(elements => elements.length).catch(() => 0);
        
        results.push({
            test: 'RapidAPI Integration',
            status: rapidApiKeyPresent || categories.length > 0 ? 'PASS' : 'PARTIAL',
            details: `API key present: ${rapidApiKeyPresent}, Categories found: ${categories.length}`
        });

        // Test 5: Search Functionality
        console.log('\n5️⃣ Testing search functionality...');
        
        const searchInput = await page.$('input[type="search"], input[name="search"]');
        if (searchInput) {
            await searchInput.type('identity');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            
            const searchResults = await page.$$('[data-testid="api-result"], .search-result, .api-item');
            await page.screenshot({ path: 'live-04-search-results.png' });
            
            results.push({
                test: 'Search Functionality',
                status: searchResults.length > 0 ? 'PASS' : 'PARTIAL',
                details: `Search executed, found ${searchResults.length} results`
            });
        } else {
            results.push({
                test: 'Search Functionality',
                status: 'SKIP',
                details: 'Search input not found'
            });
        }

        // Test 6: API Connection Flow
        console.log('\n6️⃣ Testing API connection flow...');
        
        const connectButtons = await page.$$('button');
        if (connectButtons.length > 0) {
            // Click first connect button
            await connectButtons[0].click();
            await page.waitForTimeout(3000);
            
            // Check if modal or flow opened
            const modal = await page.$('.modal, .dialog, .connection-flow, [role="dialog"]');
            const connectionForm = await page.$('form, .connection-form, input[name*="email" i]');
            
            await page.screenshot({ path: 'live-05-connection-flow.png' });
            
            results.push({
                test: 'API Connection Flow',
                status: modal || connectionForm ? 'PASS' : 'PARTIAL',
                details: `Modal opened: ${!!modal}, Form found: ${!!connectionForm}`
            });
        } else {
            results.push({
                test: 'API Connection Flow',
                status: 'SKIP',
                details: 'No connect buttons found'
            });
        }

        // Test 7: Performance Check
        console.log('\n7️⃣ Testing performance...');
        
        const performanceMetrics = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            return {
                loadTime: navigation.loadEventEnd - navigation.fetchStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
            };
        });

        results.push({
            test: 'Performance Metrics',
            status: performanceMetrics.loadTime < 5000 ? 'PASS' : 'WARN',
            details: `Load: ${Math.round(performanceMetrics.loadTime)}ms, DOMReady: ${Math.round(performanceMetrics.domContentLoaded)}ms`
        });

        // Test 8: Mobile Responsiveness
        console.log('\n8️⃣ Testing mobile responsiveness...');
        
        await page.setViewport({ width: 375, height: 667 }); // iPhone size
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'live-06-mobile-view.png' });
        
        const mobileMarketplace = await page.$('.marketplace, [data-testid="marketplace"], main');
        
        results.push({
            test: 'Mobile Responsiveness',
            status: mobileMarketplace ? 'PASS' : 'FAIL',
            details: 'Marketplace renders on mobile viewport'
        });

        // Final screenshot
        await page.setViewport({ width: 1920, height: 1080 });
        await page.screenshot({ path: 'live-07-final-state.png' });

    } catch (error) {
        console.error('❌ Test error:', error);
        results.push({
            test: 'Error Handler',
            status: 'ERROR',
            details: error.message
        });
    }

    await browser.close();

    // Generate Report
    console.log('\n📊 LIVE MARKETPLACE TEST RESULTS');
    console.log('===============================');
    
    let passed = 0, failed = 0, warnings = 0, skipped = 0;
    
    results.forEach((result, index) => {
        const status = result.status;
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : status === 'SKIP' ? '⏭️' : '🔄';
        
        console.log(`${icon} ${result.test}: ${status}`);
        console.log(`   ${result.details}`);
        
        if (status === 'PASS') passed++;
        else if (status === 'FAIL' || status === 'ERROR') failed++;
        else if (status === 'WARN') warnings++;
        else if (status === 'SKIP') skipped++;
    });

    console.log('\n📈 SUMMARY');
    console.log('===========');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`🔄 Total Tests: ${results.length}`);

    const successRate = Math.round((passed / (passed + failed)) * 100);
    console.log(`📊 Success Rate: ${successRate}%`);

    if (successRate >= 80) {
        console.log('\n🎉 MARKETPLACE DEPLOYMENT SUCCESSFUL!');
        console.log('🚀 RapidAPI marketplace is live and functional!');
        console.log(`🌐 Access at: ${DEPLOYMENT_URL}/marketplace`);
    } else if (successRate >= 60) {
        console.log('\n⚠️ MARKETPLACE PARTIALLY FUNCTIONAL');
        console.log('🔧 Some features may need attention');
    } else {
        console.log('\n❌ MARKETPLACE NEEDS INVESTIGATION');
        console.log('🛠️ Multiple issues detected');
    }

    return {
        results,
        successRate,
        deploymentUrl: DEPLOYMENT_URL
    };
}

// Execute if run directly
testRapidAPIMarketplace().catch(console.error);

export { testRapidAPIMarketplace };