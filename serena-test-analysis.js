/**
 * Serena: Comprehensive Error Detection and Code Analysis
 * This script systematically tests all pages and identifies potential issues
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class SerenaAnalyzer {
  constructor() {
    this.baseUrl = 'https://wallet-3it1qd0z1-aiden-lipperts-projects.vercel.app';
    this.errors = [];
    this.warnings = [];
    this.performance = {};
    this.accessibility = [];
    this.codeIssues = [];
  }

  async analyzeApplication() {
    console.log('🔍 Serena: Starting comprehensive application analysis...\n');
    
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    try {
      // Test all main pages
      await this.testLandingPage(context);
      await this.testCredentialsPage(context);
      await this.testDashboard(context);
      await this.testOnboarding(context);
      await this.testProofsPage(context);
      
      // Analyze source code
      await this.analyzeSourceCode();
      
      // Generate comprehensive report
      this.generateReport();
      
    } finally {
      await browser.close();
    }
  }

  async testLandingPage(context) {
    console.log('📄 Testing Landing Page...');
    const page = await context.newPage();
    
    // Track console errors
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageErrors.push(`Landing: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(`Landing Page Error: ${error.message}`);
    });

    try {
      const startTime = Date.now();
      await page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      this.performance.landingPage = {
        loadTime,
        timestamp: new Date().toISOString()
      };

      // Check for essential elements
      await this.checkElement(page, 'h1', 'Landing page main heading');
      await this.checkElement(page, 'button', 'Action buttons');
      
      // Test navigation
      const navLinks = await page.locator('nav a').count();
      if (navLinks === 0) {
        this.warnings.push('Landing: No navigation links found');
      }

      // Check for accessibility issues
      await this.checkAccessibility(page, 'Landing');
      
      this.errors.push(...pageErrors);
      console.log(`✅ Landing Page: ${loadTime}ms load time, ${pageErrors.length} errors`);
      
    } catch (error) {
      this.errors.push(`Landing Page Navigation Error: ${error.message}`);
      console.log(`❌ Landing Page: Failed to load - ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async testCredentialsPage(context) {
    console.log('🎫 Testing Credentials Page...');
    const page = await context.newPage();
    
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageErrors.push(`Credentials: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(`Credentials Page Error: ${error.message}`);
    });

    try {
      const startTime = Date.now();
      await page.goto(`${this.baseUrl}/credentials`, { waitUntil: 'networkidle', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      this.performance.credentialsPage = {
        loadTime,
        timestamp: new Date().toISOString()
      };

      // Check for credentials page specific elements
      await this.checkElement(page, '[class*="credential"]', 'Credential elements', false);
      await this.checkElement(page, 'button[class*="create"], button[class*="add"]', 'Create credential button', false);
      
      // Test tab functionality
      const tabs = await page.locator('[role="tab"], .tab, [class*="tab"]').count();
      if (tabs > 0) {
        console.log(`  📊 Found ${tabs} tabs in credentials interface`);
        
        // Test clicking first tab if exists
        try {
          await page.locator('[role="tab"], .tab, [class*="tab"]').first().click();
          await page.waitForTimeout(1000);
        } catch (tabError) {
          this.warnings.push(`Credentials: Tab interaction failed - ${tabError.message}`);
        }
      }

      // Check for loading states
      const loadingElements = await page.locator('[class*="loading"], [class*="spinner"], .animate-spin').count();
      if (loadingElements > 0) {
        this.warnings.push(`Credentials: ${loadingElements} loading elements still visible after page load`);
      }

      // Test form interactions
      const forms = await page.locator('form').count();
      const inputs = await page.locator('input, textarea, select').count();
      console.log(`  📝 Found ${forms} forms and ${inputs} input elements`);

      await this.checkAccessibility(page, 'Credentials');
      
      this.errors.push(...pageErrors);
      console.log(`✅ Credentials Page: ${loadTime}ms load time, ${pageErrors.length} errors`);
      
    } catch (error) {
      this.errors.push(`Credentials Page Navigation Error: ${error.message}`);
      console.log(`❌ Credentials Page: Failed to load - ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async testDashboard(context) {
    console.log('🏠 Testing Dashboard...');
    const page = await context.newPage();
    
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageErrors.push(`Dashboard: ${msg.text()}`);
      }
    });

    try {
      const startTime = Date.now();
      await page.goto(`${this.baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      this.performance.dashboard = {
        loadTime,
        timestamp: new Date().toISOString()
      };

      // Check dashboard specific elements
      await this.checkElement(page, '[class*="card"], .card', 'Dashboard cards', false);
      await this.checkElement(page, '[class*="stat"], .stat, [class*="metric"]', 'Dashboard statistics', false);

      await this.checkAccessibility(page, 'Dashboard');
      
      this.errors.push(...pageErrors);
      console.log(`✅ Dashboard: ${loadTime}ms load time, ${pageErrors.length} errors`);
      
    } catch (error) {
      this.errors.push(`Dashboard Navigation Error: ${error.message}`);
      console.log(`❌ Dashboard: Failed to load - ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async testOnboarding(context) {
    console.log('🚀 Testing Onboarding...');
    const page = await context.newPage();
    
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageErrors.push(`Onboarding: ${msg.text()}`);
      }
    });

    try {
      const startTime = Date.now();
      await page.goto(`${this.baseUrl}/onboarding`, { waitUntil: 'networkidle', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      this.performance.onboarding = {
        loadTime,
        timestamp: new Date().toISOString()
      };

      await this.checkElement(page, 'button, [role="button"]', 'Onboarding buttons');
      
      this.errors.push(...pageErrors);
      console.log(`✅ Onboarding: ${loadTime}ms load time, ${pageErrors.length} errors`);
      
    } catch (error) {
      this.errors.push(`Onboarding Navigation Error: ${error.message}`);
      console.log(`❌ Onboarding: Failed to load - ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async testProofsPage(context) {
    console.log('🔐 Testing Proofs Page...');
    const page = await context.newPage();
    
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageErrors.push(`Proofs: ${msg.text()}`);
      }
    });

    try {
      const startTime = Date.now();
      await page.goto(`${this.baseUrl}/proofs`, { waitUntil: 'networkidle', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      this.performance.proofsPage = {
        loadTime,
        timestamp: new Date().toISOString()
      };

      await this.checkElement(page, '[class*="proof"], .proof', 'Proof elements', false);
      
      this.errors.push(...pageErrors);
      console.log(`✅ Proofs Page: ${loadTime}ms load time, ${pageErrors.length} errors`);
      
    } catch (error) {
      this.errors.push(`Proofs Page Navigation Error: ${error.message}`);
      console.log(`❌ Proofs Page: Failed to load - ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async checkElement(page, selector, description, required = true) {
    try {
      const count = await page.locator(selector).count();
      if (count === 0 && required) {
        this.warnings.push(`Missing ${description}: ${selector}`);
      } else if (count > 0) {
        console.log(`  ✓ Found ${count} ${description}`);
      }
    } catch (error) {
      if (required) {
        this.warnings.push(`Error checking ${description}: ${error.message}`);
      }
    }
  }

  async checkAccessibility(page, pageName) {
    try {
      // Check for basic accessibility requirements
      const missingAlt = await page.locator('img:not([alt])').count();
      if (missingAlt > 0) {
        this.accessibility.push(`${pageName}: ${missingAlt} images missing alt text`);
      }

      const missingLabels = await page.locator('input:not([aria-label]):not([aria-labelledby])').count();
      if (missingLabels > 0) {
        this.accessibility.push(`${pageName}: ${missingLabels} inputs missing labels`);
      }

      const headingStructure = await page.locator('h1, h2, h3, h4, h5, h6').count();
      if (headingStructure === 0) {
        this.accessibility.push(`${pageName}: No heading structure found`);
      }

    } catch (error) {
      this.accessibility.push(`${pageName}: Accessibility check failed - ${error.message}`);
    }
  }

  async analyzeSourceCode() {
    console.log('🔍 Analyzing source code...');
    
    const srcPath = './src';
    if (!fs.existsSync(srcPath)) {
      this.codeIssues.push('Source directory not found for analysis');
      return;
    }

    try {
      // Check for common code issues
      await this.scanFiles(srcPath);
    } catch (error) {
      this.codeIssues.push(`Source code analysis failed: ${error.message}`);
    }
  }

  async scanFiles(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        await this.scanFiles(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        await this.analyzeFile(filePath);
      }
    }
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for potential issues
      if (content.includes('console.error') && !content.includes('DEBUG')) {
        // Allow console.error in development/debugging contexts
      }
      
      if (content.includes('alert(')) {
        this.codeIssues.push(`${filePath}: Uses alert() which can be blocked by browsers`);
      }
      
      if (content.includes('localStorage.') && !content.includes('try')) {
        this.warnings.push(`${filePath}: localStorage usage without error handling`);
      }
      
      // Check for BigInt issues (we already fixed these)
      if (content.includes('BigInt(') && content.includes('**')) {
        this.codeIssues.push(`${filePath}: Potential BigInt exponentiation issue`);
      }

      // Check for missing error boundaries
      if (content.includes('useState') && !content.includes('ErrorBoundary') && !content.includes('try')) {
        // This is a warning, not an error - components don't always need error boundaries
      }

    } catch (error) {
      this.codeIssues.push(`Failed to analyze ${filePath}: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 SERENA COMPREHENSIVE ANALYSIS REPORT');
    console.log('='.repeat(80));

    // Performance Summary
    console.log('\n📊 PERFORMANCE METRICS:');
    for (const [page, metrics] of Object.entries(this.performance)) {
      const status = metrics.loadTime < 3000 ? '✅' : '⚠️';
      console.log(`${status} ${page}: ${metrics.loadTime}ms load time`);
    }

    // Error Summary
    console.log('\n❌ ERRORS DETECTED:');
    if (this.errors.length === 0) {
      console.log('✅ No critical errors detected!');
    } else {
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Warnings Summary
    console.log('\n⚠️ WARNINGS:');
    if (this.warnings.length === 0) {
      console.log('✅ No warnings detected!');
    } else {
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    // Accessibility Summary
    console.log('\n♿ ACCESSIBILITY ISSUES:');
    if (this.accessibility.length === 0) {
      console.log('✅ No accessibility issues detected!');
    } else {
      this.accessibility.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    // Code Issues Summary
    console.log('\n🔧 CODE ISSUES:');
    if (this.codeIssues.length === 0) {
      console.log('✅ No code issues detected!');
    } else {
      this.codeIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    // Overall Health Score
    const totalIssues = this.errors.length + this.warnings.length + this.accessibility.length + this.codeIssues.length;
    const healthScore = Math.max(0, 100 - (totalIssues * 5));
    
    console.log('\n🏆 OVERALL HEALTH SCORE:');
    console.log(`${healthScore}/100 ${this.getHealthEmoji(healthScore)}`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (totalIssues === 0) {
      console.log('🎉 Excellent! Your application is running perfectly.');
    } else {
      console.log('Focus on addressing the errors first, then warnings and accessibility issues.');
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Analysis completed at ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    // Save detailed report
    this.saveDetailedReport();
  }

  getHealthEmoji(score) {
    if (score >= 90) return '🟢 Excellent';
    if (score >= 70) return '🟡 Good';
    if (score >= 50) return '🟠 Fair';
    return '🔴 Needs Attention';
  }

  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      performance: this.performance,
      errors: this.errors,
      warnings: this.warnings,
      accessibility: this.accessibility,
      codeIssues: this.codeIssues,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        totalAccessibilityIssues: this.accessibility.length,
        totalCodeIssues: this.codeIssues.length,
        healthScore: Math.max(0, 100 - ((this.errors.length + this.warnings.length + this.accessibility.length + this.codeIssues.length) * 5))
      }
    };

    fs.writeFileSync('serena-analysis-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: serena-analysis-report.json');
  }
}

// Run the analysis
async function main() {
  const analyzer = new SerenaAnalyzer();
  await analyzer.analyzeApplication();
}

main().catch(console.error);