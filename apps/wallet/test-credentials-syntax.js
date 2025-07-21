import { chromium } from 'playwright';

async function testCredentialsPage() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Collect all console messages and errors
    const logs = [];
    const errors = [];
    
    page.on('console', msg => {
        const log = {
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        };
        logs.push(log);
        console.log(`[${log.type.toUpperCase()}] ${log.text}`);
        if (log.location) {
            console.log(`  at ${log.location.url}:${log.location.lineNumber}:${log.location.columnNumber}`);
        }
    });
    
    page.on('pageerror', error => {
        const errorInfo = {
            message: error.message,
            name: error.name,
            stack: error.stack
        };
        errors.push(errorInfo);
        console.log(`[PAGE ERROR] ${error.name}: ${error.message}`);
        if (error.stack) {
            console.log(`Stack trace:\n${error.stack}`);
        }
    });
    
    // Listen for request failures
    page.on('requestfailed', request => {
        console.log(`[REQUEST FAILED] ${request.method()} ${request.url()} - ${request.failure().errorText}`);
    });
    
    try {
        console.log('Navigating to credentials page...');
        const response = await page.goto('https://wallet-qvobwwier-aiden-lipperts-projects.vercel.app/credentials', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        console.log(`Response status: ${response.status()}`);
        
        // Wait for page to fully load
        await page.waitForTimeout(5000);
        
        // Try to get the page title
        const title = await page.title();
        console.log(`Page title: ${title}`);
        
        // Check if there are any visible error messages
        const errorSelectors = [
            '[data-testid*="error"]',
            '.error',
            '[class*="error"]',
            '[role="alert"]',
            '.alert-error'
        ];
        
        for (const selector of errorSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
                console.log(`Found ${elements.length} error elements with selector: ${selector}`);
                for (let i = 0; i < Math.min(elements.length, 3); i++) {
                    const text = await elements[i].textContent();
                    console.log(`  Error ${i + 1}: ${text}`);
                }
            }
        }
        
        // Try to evaluate some JavaScript to check for React errors
        const jsErrors = await page.evaluate(() => {
            const errors = [];
            
            // Check if React is loaded
            if (typeof window.React !== 'undefined') {
                console.log('React is available');
            } else {
                errors.push('React is not available in global scope');
            }
            
            // Check for any syntax errors in console
            const originalError = console.error;
            const capturedErrors = [];
            console.error = (...args) => {
                capturedErrors.push(args.join(' '));
                originalError.apply(console, args);
            };
            
            // Try to access common React components that might have syntax errors
            try {
                // This will trigger any immediate JavaScript parsing errors
                eval('(() => {})()');
            } catch (e) {
                errors.push(`JavaScript eval error: ${e.message}`);
            }
            
            return { errors, capturedErrors };
        });
        
        if (jsErrors.errors.length > 0) {
            console.log('JavaScript evaluation errors:');
            jsErrors.errors.forEach(err => console.log(`  ${err}`));
        }
        
        // Check network tab for failed resource loads
        console.log('\nChecking for failed resource loads...');
        const failedRequests = [];
        page.on('response', response => {
            if (!response.ok()) {
                failedRequests.push({
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText()
                });
            }
        });
        
        // Reload to catch any additional errors
        console.log('\nReloading page to catch additional errors...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        
        // Try to interact with the page to trigger lazy-loaded components
        console.log('\nTrying to interact with page elements...');
        try {
            await page.click('body');
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log(`Could not click body: ${e.message}`);
        }
        
        // Take a screenshot for visual inspection
        await page.screenshot({ path: 'credentials-page-error-state.png', fullPage: true });
        console.log('Screenshot saved as credentials-page-error-state.png');
        
        // Summary
        console.log('\n=== SUMMARY ===');
        console.log(`Total console logs: ${logs.length}`);
        console.log(`Total page errors: ${errors.length}`);
        console.log(`Failed requests: ${failedRequests.length}`);
        
        if (errors.length > 0) {
            console.log('\nPage Errors:');
            errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error.name}: ${error.message}`);
                if (error.stack) {
                    console.log(`   Stack: ${error.stack.split('\n')[0]}`);
                }
            });
        }
        
        const syntaxErrors = logs.filter(log => 
            log.text.toLowerCase().includes('syntax') || 
            log.text.toLowerCase().includes('unexpected token')
        );
        
        if (syntaxErrors.length > 0) {
            console.log('\nSyntax-related errors:');
            syntaxErrors.forEach((error, i) => {
                console.log(`${i + 1}. [${error.type}] ${error.text}`);
                if (error.location) {
                    console.log(`   Location: ${error.location.url}:${error.location.lineNumber}:${error.location.columnNumber}`);
                }
            });
        }
        
        if (failedRequests.length > 0) {
            console.log('\nFailed resource loads:');
            failedRequests.forEach((req, i) => {
                console.log(`${i + 1}. ${req.status} ${req.statusText}: ${req.url}`);
            });
        }
        
        return {
            logs,
            errors,
            syntaxErrors,
            failedRequests,
            hasSyntaxErrors: syntaxErrors.length > 0 || errors.some(e => e.message.toLowerCase().includes('syntax'))
        };
        
    } catch (error) {
        console.error('Test failed:', error);
        return { error: error.message, logs, errors };
    } finally {
        await browser.close();
    }
}

// Run the test
testCredentialsPage().then(result => {
    console.log('\n=== TEST COMPLETED ===');
    if (result.hasSyntaxErrors) {
        console.log('❌ SYNTAX ERRORS DETECTED');
        process.exit(1);
    } else {
        console.log('✅ No syntax errors detected');
        process.exit(0);
    }
}).catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
});