/**
 * Simplified Serena Analysis - Works without browser installation
 * Focuses on static code analysis and basic URL testing
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class SimplifiedSerenaAnalyzer {
  constructor() {
    this.baseUrl = 'https://wallet-3it1qd0z1-aiden-lipperts-projects.vercel.app';
    this.errors = [];
    this.warnings = [];
    this.codeIssues = [];
    this.recommendations = [];
  }

  async analyzeApplication() {
    console.log('🔍 Serena: Starting simplified application analysis...\n');
    
    // Test URL accessibility
    await this.testUrlAccessibility();
    
    // Analyze source code
    await this.analyzeSourceCode();
    
    // Check build artifacts
    await this.checkBuildArtifacts();
    
    // Generate report
    this.generateReport();
  }

  async testUrlAccessibility() {
    console.log('🌐 Testing URL accessibility...');
    
    const urls = [
      '',
      '/credentials',
      '/dashboard', 
      '/onboarding',
      '/proofs'
    ];

    for (const url of urls) {
      const fullUrl = this.baseUrl + url;
      try {
        const result = await this.checkUrl(fullUrl);
        if (result.status === 200) {
          console.log(`✅ ${url || 'Landing'}: ${result.status} - ${result.contentLength} bytes`);
        } else {
          this.warnings.push(`${url || 'Landing'}: HTTP ${result.status}`);
        }
      } catch (error) {
        this.errors.push(`${url || 'Landing'}: ${error.message}`);
      }
    }
  }

  checkUrl(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          resolve({
            status: response.statusCode,
            contentLength: data.length,
            headers: response.headers
          });
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async analyzeSourceCode() {
    console.log('🔍 Analyzing source code...');
    
    try {
      await this.scanFiles('./src');
      console.log(`✅ Analyzed source code - found ${this.codeIssues.length} potential issues`);
    } catch (error) {
      this.errors.push(`Source code analysis failed: ${error.message}`);
    }
  }

  async scanFiles(dir) {
    if (!fs.existsSync(dir)) {
      this.warnings.push('Source directory not found - using current directory');
      dir = '.';
    }

    const files = fs.readdirSync(dir);
    let fileCount = 0;
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
          await this.scanFiles(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          await this.analyzeFile(filePath);
          fileCount++;
        }
      } catch (error) {
        // Skip files that can't be accessed
      }
    }

    if (fileCount > 0) {
      console.log(`  📁 Analyzed ${fileCount} TypeScript/React files`);
    }
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      // Check for critical issues
      if (content.includes('alert(') && !content.includes('// TODO')) {
        this.codeIssues.push(`${fileName}: Uses alert() which can be blocked by browsers`);
      }
      
      if (content.includes('console.error') && filePath.includes('production')) {
        this.codeIssues.push(`${fileName}: Contains console.error in production code`);
      }
      
      // Check for potential BigInt issues
      if (content.includes('BigInt(') && content.includes('**')) {
        this.codeIssues.push(`${fileName}: Potential BigInt exponentiation issue`);
      }

      // Check for localStorage without error handling
      if (content.includes('localStorage.') && !content.includes('try') && !content.includes('catch')) {
        this.warnings.push(`${fileName}: localStorage usage without error handling`);
      }

      // Check for missing imports
      if (content.includes('useState') && !content.includes('import') && !content.includes('from')) {
        this.codeIssues.push(`${fileName}: Potential missing React import`);
      }

      // Check for TODO/FIXME comments
      const todos = (content.match(/TODO|FIXME|XXX/g) || []).length;
      if (todos > 0) {
        this.warnings.push(`${fileName}: ${todos} TODO/FIXME comments found`);
      }

      // Check for long functions (basic heuristic)
      const functionMatches = content.match(/function\s+\w+\([^)]*\)\s*{|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{|\w+\([^)]*\)\s*{/g);
      if (functionMatches && functionMatches.length > 10) {
        this.warnings.push(`${fileName}: Contains many functions (${functionMatches.length}) - consider splitting`);
      }

    } catch (error) {
      this.warnings.push(`Failed to analyze ${filePath}: ${error.message}`);
    }
  }

  async checkBuildArtifacts() {
    console.log('📦 Checking build artifacts...');
    
    const distPath = './dist';
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      const jsFiles = files.filter(f => f.endsWith('.js'));
      const cssFiles = files.filter(f => f.endsWith('.css'));
      
      console.log(`  📄 Found ${jsFiles.length} JavaScript files and ${cssFiles.length} CSS files`);
      
      // Check for source maps
      const sourceMaps = files.filter(f => f.endsWith('.map'));
      if (sourceMaps.length === 0) {
        this.warnings.push('No source maps found - debugging may be difficult');
      }

      // Check for large bundle sizes
      for (const file of jsFiles) {
        try {
          const filePath = path.join(distPath, file);
          const stat = fs.statSync(filePath);
          const sizeKB = Math.round(stat.size / 1024);
          
          if (sizeKB > 1000) { // > 1MB
            this.warnings.push(`Large bundle: ${file} (${sizeKB}KB)`);
          } else {
            console.log(`  ✅ ${file}: ${sizeKB}KB`);
          }
        } catch (error) {
          // Skip files we can't stat
        }
      }
    } else {
      this.warnings.push('No dist/ directory found - application may not be built');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 SERENA SIMPLIFIED ANALYSIS REPORT');
    console.log('='.repeat(80));

    // Error Summary
    console.log('\n❌ CRITICAL ERRORS:');
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
      this.warnings.slice(0, 10).forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
      if (this.warnings.length > 10) {
        console.log(`... and ${this.warnings.length - 10} more warnings`);
      }
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
    const totalIssues = this.errors.length + this.warnings.length + this.codeIssues.length;
    const healthScore = Math.max(0, 100 - (this.errors.length * 10 + this.warnings.length * 3 + this.codeIssues.length * 5));
    
    console.log('\n🏆 OVERALL HEALTH SCORE:');
    console.log(`${healthScore}/100 ${this.getHealthEmoji(healthScore)}`);

    // Key Recommendations
    console.log('\n💡 KEY RECOMMENDATIONS:');
    if (totalIssues === 0) {
      console.log('🎉 Excellent! Your application appears to be running well.');
      console.log('📝 Consider running full browser testing for complete verification.');
    } else {
      if (this.errors.length > 0) {
        console.log('🚨 Priority: Fix critical errors first');
      }
      if (this.codeIssues.length > 0) {
        console.log('🔧 Review code issues for potential runtime problems');
      }
      if (this.warnings.length > 5) {
        console.log('⚠️ Address warnings to improve code quality');
      }
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run full browser testing: npx playwright install && node serena-test-analysis.js');
    console.log('2. Fix any identified critical errors');
    console.log('3. Test credentials page functionality manually');
    console.log('4. Verify all form interactions work correctly');

    console.log('\n' + '='.repeat(80));
    console.log(`Analysis completed at ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    // Save report
    this.saveReport();
  }

  getHealthEmoji(score) {
    if (score >= 90) return '🟢 Excellent';
    if (score >= 70) return '🟡 Good';
    if (score >= 50) return '🟠 Fair';
    return '🔴 Needs Attention';
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      errors: this.errors,
      warnings: this.warnings,
      codeIssues: this.codeIssues,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        totalCodeIssues: this.codeIssues.length,
        healthScore: Math.max(0, 100 - (this.errors.length * 10 + this.warnings.length * 3 + this.codeIssues.length * 5))
      }
    };

    try {
      fs.writeFileSync('serena-simplified-report.json', JSON.stringify(report, null, 2));
      console.log('\n📄 Report saved to: serena-simplified-report.json');
    } catch (error) {
      console.log('\n⚠️ Could not save report file');
    }
  }
}

// Run the analysis
async function main() {
  const analyzer = new SimplifiedSerenaAnalyzer();
  await analyzer.analyzeApplication();
}

main().catch(console.error);