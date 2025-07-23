const { chromium } = require('playwright');

async function analyzeWalletErrors() {
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'],
    });
    
    const page = await browser.newPage();
    
    // Collect all console messages
    const consoleMessages = [];
    const networkFailures = [];
    const jsErrors = [];
    
    // Set up console listener
    page.on('console', (msg) => {
        const message = {
            type: msg.type(),
            text: msg.text(),
            location: msg.location(),
            timestamp: new Date().toISOString()
        };
        consoleMessages.push(message);
        console.log(`🟡 Console [${msg.type()}]: ${msg.text()}`);
    });
    
    // Set up page error listener
    page.on('pageerror', (error) => {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        jsErrors.push(errorInfo);
        console.log(`🔴 Page Error: ${error.message}`);
    });
    
    // Set up network failure listener
    page.on('response', (response) => {
        if (!response.ok()) {
            const failure = {
                url: response.url(),
                status: response.status(),
                statusText: response.statusText(),
                timestamp: new Date().toISOString()
            };
            networkFailures.push(failure);
            console.log(`🌐 Network Failure: ${response.status()} ${response.url()}`);
        }
    });
    
    console.log("🚀 Navigating to credentials page...");
    
    try {
        // Navigate to the credentials page
        await page.goto('https://wallet-oojl75o98-aiden-lipperts-projects.vercel.app/credentials', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        // Wait for potential React errors to surface
        await page.waitForTimeout(3000);
        
        console.log("📸 Taking screenshot...");
        await page.screenshot({ path: '/home/rocz/persona-chain/apps/wallet/wallet-error-analysis.png' });
        
        // Check for "Something went wrong" text in DOM
        const somethingWentWrongElements = await page.locator('text="Something went wrong"').all();
        
        console.log(`🔍 Found ${somethingWentWrongElements.length} 'Something went wrong' messages`);
        
        const errorDetails = [];
        for (let i = 0; i < somethingWentWrongElements.length; i++) {
            const element = somethingWentWrongElements[i];
            try {
                // Get the element's text content and surrounding context
                const text = await element.textContent();
                const parent = element.locator('..');
                const parentHTML = await parent.innerHTML();
                
                const detail = {
                    index: i,
                    text: text,
                    parentHTML: parentHTML.length > 500 ? parentHTML.substring(0, 500) + '...' : parentHTML
                };
                errorDetails.push(detail);
                
                console.log(`📍 Error message ${i + 1}:`);
                console.log(`   Text: ${text}`);
                console.log(`   Parent HTML: ${parentHTML.substring(0, 200)}...`);
                
                // Get component hierarchy
                const hierarchy = await element.evaluate((el) => {
                    const path = [];
                    let current = el;
                    while (current && current !== document.body) {
                        const info = {
                            tagName: current.tagName,
                            className: current.className,
                            id: current.id,
                            dataTestId: current.getAttribute('data-testid')
                        };
                        path.push(info);
                        current = current.parentElement;
                    }
                    return path.slice(0, 8); // Limit to 8 levels
                });
                
                console.log(`   Component hierarchy:`);
                hierarchy.forEach((comp, level) => {
                    const indent = "    ".repeat(level + 1);
                    const testId = comp.dataTestId ? ` data-testid='${comp.dataTestId}'` : "";
                    const classAttr = comp.className ? ` class='${comp.className}'` : "";
                    const idAttr = comp.id ? ` id='${comp.id}'` : "";
                    console.log(`${indent}<${comp.tagName}${idAttr}${classAttr}${testId}>`);
                });
                
            } catch (error) {
                console.log(`❌ Could not analyze error element ${i}: ${error.message}`);
            }
        }
        
        // Check for React Error Boundary components specifically
        const errorBoundaryElements = await page.locator('[data-testid*="error"], [class*="error"], [class*="Error"], [class*="ErrorBoundary"]').all();
        console.log(`🛡️ Found ${errorBoundaryElements.length} potential error boundary elements`);
        
        // Look for our specific ErrorBoundary component
        const ourErrorBoundaryElements = await page.locator('[data-testid="error-boundary"]').all();
        console.log(`🎯 Found ${ourErrorBoundaryElements.length} elements with our error boundary data-testid`);
        
        // Check if the error is coming from our ErrorBoundary
        for (let i = 0; i < ourErrorBoundaryElements.length; i++) {
            const element = ourErrorBoundaryElements[i];
            try {
                const innerHTML = await element.innerHTML();
                const textContent = await element.textContent();
                console.log(`🛡️ Our ErrorBoundary ${i + 1}:`);
                console.log(`   Text: ${textContent}`);
                console.log(`   HTML: ${innerHTML.substring(0, 300)}...`);
            } catch (error) {
                console.log(`❌ Could not analyze our ErrorBoundary element ${i}: ${error.message}`);
            }
        }
        
        // Check React DevTools if available
        try {
            const reactErrors = await page.evaluate(() => {
                // Try to access React DevTools or React Fiber
                const rootElement = document.querySelector('#root') || document.querySelector('#__next');
                if (rootElement && rootElement._reactInternalFiber) {
                    return 'React Fiber detected';
                }
                if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    return 'React DevTools detected';
                }
                return 'No React debugging info available';
            });
            console.log(`⚛️  React Debug Info: ${reactErrors}`);
        } catch (error) {
            console.log(`⚛️  React Debug Check Failed: ${error.message}`);
        }
        
        // Check for any elements with error-related classes or content
        const allErrorElements = await page.locator('text=/error|Error|failed|Failed|wrong|Wrong/i').all();
        console.log(`🔎 Found ${allErrorElements.length} elements containing error-related text`);
        
        // Check for Next.js specific errors
        const nextjsErrors = await page.locator('[data-nextjs-dialog], [data-nextjs-toast], .nextjs__container__errors').all();
        console.log(`▲ Found ${nextjsErrors.length} Next.js error elements`);
        
        // Wait a bit more to catch any delayed errors
        await page.waitForTimeout(2000);
        
    } catch (error) {
        console.log(`❌ Navigation failed: ${error.message}`);
    }
    
    // Analyze collected data
    console.log("\n" + "=".repeat(60));
    console.log("📊 ERROR ANALYSIS SUMMARY");
    console.log("=".repeat(60));
    
    console.log(`\n🟡 CONSOLE MESSAGES (${consoleMessages.length} total):`);
    consoleMessages.forEach(msg => {
        if (msg.type.toLowerCase().includes('error') || 
            msg.text.toLowerCase().includes('invalid') || 
            msg.text.toLowerCase().includes('token') ||
            msg.text.toLowerCase().includes('suppressed')) {
            console.log(`   [${msg.type}] ${msg.text}`);
        }
    });
    
    console.log(`\n🔴 JAVASCRIPT ERRORS (${jsErrors.length} total):`);
    jsErrors.forEach(error => {
        console.log(`   ${error.message}`);
        if (error.stack) {
            console.log(`   Stack: ${error.stack.substring(0, 200)}...`);
        }
    });
    
    console.log(`\n🌐 NETWORK FAILURES (${networkFailures.length} total):`);
    networkFailures.forEach(failure => {
        console.log(`   ${failure.status} ${failure.url}`);
    });
    
    // Final recommendations
    console.log("\n" + "=".repeat(60));
    console.log("💡 RECOMMENDATIONS");
    console.log("=".repeat(60));
    
    // Analyze patterns
    const suppressedErrors = consoleMessages.filter(msg => 
        msg.text.toLowerCase().includes('suppressed'));
    const genuineErrors = consoleMessages.filter(msg => 
        msg.type === 'error' && !msg.text.toLowerCase().includes('suppressed'));
    
    console.log(`\n✅ Suppressed Errors: ${suppressedErrors.length}`);
    console.log(`🚨 Genuine Errors: ${genuineErrors.length}`);
    
    if (genuineErrors.length > 0) {
        console.log("\n🎯 GENUINE ERRORS TO INVESTIGATE:");
        genuineErrors.forEach(error => {
            console.log(`   - ${error.text}`);
        });
    }
    
    const errorUICount = errorDetails.length;
    if (errorUICount > 0 && genuineErrors.length === 0) {
        console.log("\n🤔 ANALYSIS: 'Something went wrong' appears despite no genuine errors");
        console.log("   This suggests the ErrorBoundary is triggering even for suppressed errors");
        console.log("   Recommendation: Modify ErrorBoundary to not show UI for suppressed errors");
        console.log("   OR there may be a different error that's not being caught in console");
    }
    
    if (networkFailures.length > 0) {
        console.log("\n🌐 NETWORK ISSUES DETECTED:");
        networkFailures.forEach(failure => {
            console.log(`   - ${failure.status} ${failure.url}`);
        });
        console.log("   Recommendation: Check if network failures are causing the error UI");
    }
    
    // Check for patterns that might indicate the root cause
    const invalidTokenErrors = consoleMessages.filter(msg => 
        msg.text.toLowerCase().includes('invalid') && 
        msg.text.toLowerCase().includes('token'));
    
    if (invalidTokenErrors.length > 0 && errorUICount > 0) {
        console.log("\n🔍 HYPOTHESIS: ErrorBoundary triggers on 'Invalid token' errors");
        console.log("   Even though these errors are being suppressed in getDerivedStateFromError,");
        console.log("   the ErrorBoundary component might still be rendering error UI");
        console.log("   Check if componentDidCatch is also being called and update state");
    }
    
    await browser.close();
    
    return {
        consoleMessages: consoleMessages.length,
        jsErrors: jsErrors.length,
        networkFailures: networkFailures.length,
        errorUICount,
        suppressedCount: suppressedErrors.length,
        genuineErrorCount: genuineErrors.length
    };
}

async function main() {
    try {
        const result = await analyzeWalletErrors();
        console.log(`\n📈 Final Stats: ${result.genuineErrorCount} genuine errors, ${result.suppressedCount} suppressed, ${result.errorUICount} UI error messages`);
    } catch (error) {
        console.error('Analysis failed:', error);
    }
}

main();