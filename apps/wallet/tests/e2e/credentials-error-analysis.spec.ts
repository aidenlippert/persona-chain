/**
 * Comprehensive Error Analysis for PersonaPass Credentials Page
 * Identifies exact sources of "SyntaxError: Invalid or unexpected token" and "Node cannot be found" errors
 */

import { test, expect, Page, ConsoleMessage } from '@playwright/test';

interface ErrorLog {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
  url?: string;
}

interface NetworkLog {
  timestamp: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  size: number;
  mimeType: string;
  failed: boolean;
  errorText?: string;
}

test.describe('PersonaPass Credentials Page Error Analysis', () => {
  let errorLogs: ErrorLog[] = [];
  let networkLogs: NetworkLog[] = [];
  let consoleMessages: ConsoleMessage[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset logs for each test
    errorLogs = [];
    networkLogs = [];
    consoleMessages = [];

    // Enable console logging
    page.on('console', (msg) => {
      consoleMessages.push(msg);
      console.log(`Console ${msg.type()}: ${msg.text()}`);
    });

    // Capture JavaScript errors
    page.on('pageerror', (error) => {
      const errorLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: error.message,
        stack: error.stack,
      };
      errorLogs.push(errorLog);
      console.log(`Page Error: ${error.message}`);
    });

    // Monitor network requests
    page.on('response', async (response) => {
      const request = response.request();
      const networkLog: NetworkLog = {
        timestamp: new Date().toISOString(),
        url: response.url(),
        method: request.method(),
        status: response.status(),
        statusText: response.statusText(),
        size: (await response.body().catch(() => Buffer.alloc(0))).length,
        mimeType: response.headers()['content-type'] || '',
        failed: !response.ok(),
      };
      
      if (!response.ok()) {
        networkLog.errorText = `${response.status()} ${response.statusText()}`;
        console.log(`Network Error: ${networkLog.url} - ${networkLog.errorText}`);
      }
      
      networkLogs.push(networkLog);
    });

    // Capture failed network requests
    page.on('requestfailed', (request) => {
      const networkLog: NetworkLog = {
        timestamp: new Date().toISOString(),
        url: request.url(),
        method: request.method(),
        status: 0,
        statusText: 'FAILED',
        size: 0,
        mimeType: '',
        failed: true,
        errorText: request.failure()?.errorText || 'Unknown network error',
      };
      networkLogs.push(networkLog);
      console.log(`Request Failed: ${request.url()} - ${networkLog.errorText}`);
    });
  });

  test('Analyze credentials page with clean browser (no extensions)', async ({ page }) => {
    console.log('🧪 Testing with clean browser - no extensions');

    try {
      // Navigate to credentials page
      console.log('📍 Navigating to https://personapass.xyz/credentials');
      await page.goto('https://personapass.xyz/credentials', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for page to fully load
      await page.waitForTimeout(3000);

      // Take initial screenshot
      await page.screenshot({ 
        path: 'test-results/credentials-clean-browser.png',
        fullPage: true 
      });

      // Check for specific JavaScript errors
      await page.evaluate(() => {
        // Force any lazy-loaded scripts to execute
        window.dispatchEvent(new Event('load'));
        
        // Try to access common objects that might cause "Node cannot be found" errors
        try {
          if (typeof document !== 'undefined') {
            console.log('✅ Document object accessible');
          }
          if (typeof window !== 'undefined') {
            console.log('✅ Window object accessible');
          }
          if (typeof navigator !== 'undefined') {
            console.log('✅ Navigator object accessible');
          }
        } catch (e) {
          console.error('❌ Error accessing browser objects:', e);
        }
      });

      // Wait for any async errors to surface
      await page.waitForTimeout(2000);

      // Log all collected errors
      console.log('\n📊 ERROR ANALYSIS - Clean Browser:');
      console.log(`Total Errors: ${errorLogs.length}`);
      console.log(`Failed Network Requests: ${networkLogs.filter(log => log.failed).length}`);
      console.log(`Console Messages: ${consoleMessages.length}`);

    } catch (error) {
      console.error('❌ Navigation failed:', error);
      await page.screenshot({ path: 'test-results/credentials-navigation-failed.png' });
    }
  });

  test('Analyze credentials page with extensions simulation', async ({ page, context }) => {
    console.log('🧪 Testing with browser extensions simulation');

    // Add common extension-like behavior
    await context.addInitScript(() => {
      // Simulate common extension injections that might cause issues
      window.__EXTENSION_INJECTED__ = true;
      
      // Common extension patterns that might interfere
      if (!window.chrome) {
        (window as any).chrome = {
          runtime: {
            sendMessage: () => console.log('Extension runtime access'),
            onMessage: { addListener: () => {} }
          }
        };
      }
    });

    try {
      await page.goto('https://personapass.xyz/credentials', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'test-results/credentials-with-extensions.png',
        fullPage: true 
      });

      console.log('\n📊 ERROR ANALYSIS - With Extensions:');
      console.log(`Total Errors: ${errorLogs.length}`);
      console.log(`Failed Network Requests: ${networkLogs.filter(log => log.failed).length}`);

    } catch (error) {
      console.error('❌ Navigation with extensions failed:', error);
    }
  });

  test('Deep JavaScript analysis - inspect all scripts', async ({ page }) => {
    console.log('🔍 Deep JavaScript analysis');

    await page.goto('https://personapass.xyz/credentials', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Get all script sources
    const scripts = await page.evaluate(() => {
      const scriptElements = Array.from(document.querySelectorAll('script'));
      return scriptElements.map(script => ({
        src: script.src,
        inline: !script.src,
        content: !script.src ? script.textContent?.substring(0, 200) + '...' : null,
        type: script.type,
        async: script.async,
        defer: script.defer
      }));
    });

    console.log('\n📜 SCRIPT ANALYSIS:');
    scripts.forEach((script, index) => {
      console.log(`Script ${index + 1}:`);
      console.log(`  Source: ${script.src || 'INLINE'}`);
      console.log(`  Type: ${script.type || 'text/javascript'}`);
      console.log(`  Async: ${script.async}, Defer: ${script.defer}`);
      if (script.inline && script.content) {
        console.log(`  Content preview: ${script.content}`);
      }
    });

    // Check for syntax errors in inline scripts
    await page.evaluate(() => {
      const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'));
      inlineScripts.forEach((script, index) => {
        try {
          // Try to parse the script content
          if (script.textContent) {
            new Function(script.textContent);
            console.log(`✅ Inline script ${index + 1} syntax OK`);
          }
        } catch (e) {
          console.error(`❌ Syntax error in inline script ${index + 1}:`, e);
        }
      });
    });

    await page.waitForTimeout(3000);
  });

  test('Network resource analysis', async ({ page }) => {
    console.log('🌐 Network resource analysis');

    await page.goto('https://personapass.xyz/credentials', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    await page.waitForTimeout(5000);

    // Analyze failed network requests
    const failedRequests = networkLogs.filter(log => log.failed);
    
    console.log('\n🚨 FAILED NETWORK REQUESTS:');
    failedRequests.forEach((log, index) => {
      console.log(`Failed Request ${index + 1}:`);
      console.log(`  URL: ${log.url}`);
      console.log(`  Method: ${log.method}`);
      console.log(`  Error: ${log.errorText}`);
      console.log(`  Timestamp: ${log.timestamp}`);
    });

    // Check for specific asset types that commonly cause issues
    const jsRequests = networkLogs.filter(log => 
      log.url.includes('.js') || log.mimeType.includes('javascript')
    );
    
    console.log('\n📦 JAVASCRIPT RESOURCE ANALYSIS:');
    jsRequests.forEach((log, index) => {
      console.log(`JS Resource ${index + 1}:`);
      console.log(`  URL: ${log.url}`);
      console.log(`  Status: ${log.status} ${log.statusText}`);
      console.log(`  Size: ${log.size} bytes`);
      console.log(`  Failed: ${log.failed ? '❌ YES' : '✅ NO'}`);
    });
  });

  test('Console error categorization', async ({ page }) => {
    console.log('📝 Console error categorization');

    await page.goto('https://personapass.xyz/credentials', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    await page.waitForTimeout(5000);

    // Categorize console messages
    const errors = consoleMessages.filter(msg => msg.type() === 'error');
    const warnings = consoleMessages.filter(msg => msg.type() === 'warning');
    const logs = consoleMessages.filter(msg => msg.type() === 'log');

    console.log('\n🔥 CONSOLE ERRORS:');
    errors.forEach((error, index) => {
      console.log(`Error ${index + 1}: ${error.text()}`);
      if (error.location()) {
        console.log(`  Location: ${error.location().url}:${error.location().lineNumber}:${error.location().columnNumber}`);
      }
    });

    console.log('\n⚠️ CONSOLE WARNINGS:');
    warnings.forEach((warning, index) => {
      console.log(`Warning ${index + 1}: ${warning.text()}`);
    });

    // Look for specific error patterns
    const syntaxErrors = errors.filter(error => 
      error.text().toLowerCase().includes('syntaxerror') ||
      error.text().toLowerCase().includes('unexpected token')
    );

    const nodeErrors = errors.filter(error => 
      error.text().toLowerCase().includes('node cannot be found') ||
      error.text().toLowerCase().includes('cannot find node')
    );

    console.log('\n🎯 SPECIFIC ERROR PATTERNS:');
    console.log(`Syntax Errors: ${syntaxErrors.length}`);
    syntaxErrors.forEach((error, index) => {
      console.log(`  Syntax Error ${index + 1}: ${error.text()}`);
    });

    console.log(`Node Errors: ${nodeErrors.length}`);
    nodeErrors.forEach((error, index) => {
      console.log(`  Node Error ${index + 1}: ${error.text()}`);
    });
  });

  test.afterEach(async ({ page }) => {
    // Generate comprehensive error report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create detailed error report
    const errorReport = {
      timestamp,
      url: 'https://personapass.xyz/credentials',
      summary: {
        totalErrors: errorLogs.length,
        totalConsoleErrors: consoleMessages.filter(msg => msg.type() === 'error').length,
        totalNetworkFailures: networkLogs.filter(log => log.failed).length,
        syntaxErrors: errorLogs.filter(error => 
          error.message.toLowerCase().includes('syntaxerror') ||
          error.message.toLowerCase().includes('unexpected token')
        ).length,
        nodeErrors: errorLogs.filter(error => 
          error.message.toLowerCase().includes('node cannot be found') ||
          error.message.toLowerCase().includes('cannot find node')
        ).length,
      },
      detailedErrors: errorLogs,
      networkFailures: networkLogs.filter(log => log.failed),
      consoleErrors: consoleMessages.filter(msg => msg.type() === 'error').map(msg => ({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      }))
    };

    // Save error report
    await page.evaluate((report) => {
      console.log('\n📋 FINAL ERROR REPORT:');
      console.log(JSON.stringify(report, null, 2));
    }, errorReport);

    // Take final screenshot if there were errors
    if (errorLogs.length > 0 || networkLogs.some(log => log.failed)) {
      await page.screenshot({ 
        path: `test-results/credentials-errors-${timestamp}.png`,
        fullPage: true 
      });
    }
  });
});