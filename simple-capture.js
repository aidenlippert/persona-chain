const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

async function captureWebsite(site) {
    return new Promise((resolve, reject) => {
        const outputFile = path.join(screenshotsDir, `${site.name}_homepage.png`);
        const script = `
            const { chromium } = require('playwright');
            (async () => {
                const browser = await chromium.launch({ headless: true });
                const page = await browser.newPage();
                await page.setViewportSize({ width: 1920, height: 1080 });
                await page.goto('${site.url}', { waitUntil: 'networkidle' });
                await page.waitForTimeout(3000);
                await page.screenshot({ path: '${outputFile}', fullPage: true });
                await browser.close();
                console.log('✅ ${site.name} captured');
            })().catch(err => {
                console.error('❌ Error:', err.message);
                process.exit(1);
            });
        `;
        
        const child = spawn('npx', ['playwright@latest', 'test', '--headed=false'], {
            stdio: 'pipe',
            shell: true,
            input: script
        });
        
        child.stdin.write(script);
        child.stdin.end();
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ site: site.name, status: 'success' });
            } else {
                reject({ site: site.name, status: 'error', code });
            }
        });
    });
}

async function main() {
    for (const site of websites) {
        try {
            console.log(`📸 Capturing ${site.name}...`);
            await captureWebsite(site);
        } catch (error) {
            console.error(`❌ Failed to capture ${site.name}:`, error);
        }
    }
}

main().catch(console.error);