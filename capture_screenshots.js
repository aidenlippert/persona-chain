import { chromium } from 'playwright';
import fs from 'fs';

async function captureWebsiteScreenshot(url, filename, width = 1920, height = 1080) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { width, height }
    });
    
    try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Wait for content to load
        await page.waitForTimeout(3000);
        
        // Take full page screenshot
        await page.screenshot({ 
            path: filename, 
            fullPage: true 
        });
        
        console.log(`Screenshot saved as ${filename}`);
        
        const title = await page.title();
        console.log(`Page title: ${title}`);
        
        return filename;
        
    } catch (error) {
        console.error(`Error capturing ${url}: ${error.message}`);
        return null;
    } finally {
        await browser.close();
    }
}

async function captureAllScreenshots() {
    const websites = [
        {
            url: 'https://metamask.io/',
            filename: 'metamask_landing_page.png',
            name: 'MetaMask'
        },
        {
            url: 'https://rainbow.me/',
            filename: 'rainbow_landing_page.png',
            name: 'Rainbow'
        },
        {
            url: 'https://www.coinbase.com/wallet',
            filename: 'coinbase_wallet_landing_page.png',
            name: 'Coinbase Wallet'
        },
        {
            url: 'https://cosmos.network/',
            filename: 'cosmos_landing_page.png',
            name: 'Cosmos'
        }
    ];

    console.log('Starting Web3 landing page screenshot capture...\n');
    
    for (const site of websites) {
        console.log(`\n=== Capturing ${site.name} ===`);
        const result = await captureWebsiteScreenshot(site.url, site.filename);
        if (result) {
            console.log(`✅ Successfully captured ${site.name}`);
        } else {
            console.log(`❌ Failed to capture ${site.name}`);
        }
        
        // Small delay between captures
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 Screenshot capture complete!');
}

captureAllScreenshots().catch(console.error);