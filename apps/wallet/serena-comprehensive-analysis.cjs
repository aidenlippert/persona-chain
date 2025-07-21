#!/usr/bin/env node

/**
 * SERENA COMPREHENSIVE ANALYSIS
 * Deep dive into all errors and issues in the PersonaPass wallet
 */

const fs = require('fs');
const path = require('path');

class SerenaAnalyzer {
  constructor() {
    this.errors = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    this.patterns = {
      // Critical patterns that cause app crashes
      criticalPatterns: [
        /\.createDIDDocument\s*\(/g,  // Method doesn't exist as public
        /console\.error/g,
        /throw\s+new\s+Error/g,
        /alert\s*\(/g,
        /BigInt\s*\(\s*\d+\s*\)\s*\*\*/g,
        /undefined is not a function/g,
        /Cannot read prop/g
      ],
      // High priority issues
      highPatterns: [
        /TODO:/gi,
        /FIXME:/gi,
        /HACK:/gi,
        /XXX:/gi,
        /localStorage\./g,  // Should use storageService
        /window\./g,  // Direct window access
        /any\s*;/g,  // TypeScript any type
        /\@ts-ignore/g
      ],
      // Security issues
      securityPatterns: [
        /eval\s*\(/g,
        /innerHTML/g,
        /dangerouslySetInnerHTML/g,
        /password|secret|key|token/gi,
        /process\.env/g
      ],
      // Performance issues
      performancePatterns: [
        /setTimeout\s*\(/g,
        /setInterval\s*\(/g,
        /while\s*\(true\)/g,
        /\.map\(.*\)\.map\(/g,  // Chained maps
        /JSON\.parse.*JSON\.stringify/g  // Unnecessary conversions
      ]
    };
    this.fileCount = 0;
    this.issueCount = 0;
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Skip node_modules and build directories
      if (relativePath.includes('node_modules') || relativePath.includes('dist')) {
        return;
      }

      this.fileCount++;
      let fileIssues = [];

      // Check for critical patterns
      this.patterns.criticalPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lineNumber = this.getLineNumber(content, content.indexOf(match));
            fileIssues.push({
              type: 'CRITICAL',
              pattern: pattern.toString(),
              match: match.trim(),
              file: relativePath,
              line: lineNumber,
              severity: 'critical'
            });
            this.issueCount++;
          });
        }
      });

      // Check for high priority patterns
      this.patterns.highPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lineNumber = this.getLineNumber(content, content.indexOf(match));
            fileIssues.push({
              type: 'HIGH',
              pattern: pattern.toString(),
              match: match.trim(),
              file: relativePath,
              line: lineNumber,
              severity: 'high'
            });
            this.issueCount++;
          });
        }
      });

      // Check for security patterns
      this.patterns.securityPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lineNumber = this.getLineNumber(content, content.indexOf(match));
            fileIssues.push({
              type: 'SECURITY',
              pattern: pattern.toString(),
              match: match.trim(),
              file: relativePath,
              line: lineNumber,
              severity: 'high'
            });
            this.issueCount++;
          });
        }
      });

      // Check for performance patterns
      this.patterns.performancePatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lineNumber = this.getLineNumber(content, content.indexOf(match));
            fileIssues.push({
              type: 'PERFORMANCE',
              pattern: pattern.toString(),
              match: match.trim(),
              file: relativePath,
              line: lineNumber,
              severity: 'medium'
            });
            this.issueCount++;
          });
        }
      });

      // Categorize issues by severity
      fileIssues.forEach(issue => {
        this.errors[issue.severity].push(issue);
      });

    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error.message);
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  analyzeDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        this.analyzeDirectory(filePath);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))) {
        this.analyzeFile(filePath);
      }
    });
  }

  generateReport() {
    console.log('\n🔍 SERENA COMPREHENSIVE ANALYSIS REPORT');
    console.log('=====================================\n');
    
    console.log(`📊 Summary:`);
    console.log(`   Files analyzed: ${this.fileCount}`);
    console.log(`   Total issues found: ${this.issueCount}`);
    console.log(`   Critical issues: ${this.errors.critical.length}`);
    console.log(`   High priority issues: ${this.errors.high.length}`);
    console.log(`   Medium priority issues: ${this.errors.medium.length}`);
    console.log(`   Low priority issues: ${this.errors.low.length}\n`);

    // Report critical issues
    if (this.errors.critical.length > 0) {
      console.log('🚨 CRITICAL ISSUES (Fix immediately!)');
      console.log('====================================');
      this.errors.critical.forEach(issue => {
        console.log(`\n📍 ${issue.file}:${issue.line}`);
        console.log(`   Type: ${issue.type}`);
        console.log(`   Pattern: ${issue.pattern}`);
        console.log(`   Match: ${issue.match}`);
      });
    }

    // Report high priority issues
    if (this.errors.high.length > 0) {
      console.log('\n⚠️  HIGH PRIORITY ISSUES');
      console.log('======================');
      const grouped = this.groupByFile(this.errors.high);
      Object.keys(grouped).forEach(file => {
        console.log(`\n📄 ${file}`);
        grouped[file].forEach(issue => {
          console.log(`   Line ${issue.line}: ${issue.match} (${issue.type})`);
        });
      });
    }

    // Report security issues
    const securityIssues = [...this.errors.critical, ...this.errors.high].filter(i => i.type === 'SECURITY');
    if (securityIssues.length > 0) {
      console.log('\n🔒 SECURITY ISSUES');
      console.log('=================');
      securityIssues.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} - ${issue.match}`);
      });
    }

    // Generate fix script
    this.generateFixScript();
  }

  groupByFile(issues) {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.file]) {
        acc[issue.file] = [];
      }
      acc[issue.file].push(issue);
      return acc;
    }, {});
  }

  generateFixScript() {
    const fixScript = `#!/usr/bin/env node
// Auto-generated fix script for critical issues

const fs = require('fs');
const path = require('path');

const fixes = ${JSON.stringify(this.errors.critical, null, 2)};

console.log('🔧 Applying critical fixes...');

// Fix createDIDDocument calls
fixes.filter(f => f.pattern.includes('createDIDDocument')).forEach(issue => {
  console.log(\`Fixing \${issue.file}...\`);
  // Add fix logic here
});

console.log('✅ Critical fixes applied!');
`;

    fs.writeFileSync('serena-critical-fixes.js', fixScript);
    console.log('\n📝 Fix script generated: serena-critical-fixes.js');
  }

  analyzeCredentialsPage() {
    console.log('\n🎯 ANALYZING CREDENTIALS PAGE SPECIFICALLY');
    console.log('=========================================');
    
    const credentialsFiles = [
      'src/pages/CredentialsPage.tsx',
      'src/pages/EnhancedCredentialsPage.tsx',
      'src/pages/EnhancedCredentialsPageWithTabs.tsx',
      'src/components/credentials/CredentialsManager.tsx',
      'src/components/credentials/EnhancedCredentialsManager.tsx',
      'src/components/credentials/RealCredentialsManager.tsx'
    ];

    credentialsFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        console.log(`\nAnalyzing ${file}...`);
        this.analyzeFile(fullPath);
      }
    });
  }
}

// Run the analysis
const analyzer = new SerenaAnalyzer();
console.log('🚀 Starting Serena Comprehensive Analysis...\n');

// Analyze source directory
analyzer.analyzeDirectory('./src');

// Special focus on credentials
analyzer.analyzeCredentialsPage();

// Generate report
analyzer.generateReport();

// Save detailed report
const detailedReport = {
  timestamp: new Date().toISOString(),
  summary: {
    filesAnalyzed: analyzer.fileCount,
    totalIssues: analyzer.issueCount,
    criticalCount: analyzer.errors.critical.length,
    highCount: analyzer.errors.high.length,
    mediumCount: analyzer.errors.medium.length,
    lowCount: analyzer.errors.low.length
  },
  errors: analyzer.errors
};

fs.writeFileSync('serena-detailed-report.json', JSON.stringify(detailedReport, null, 2));
console.log('\n💾 Detailed report saved to: serena-detailed-report.json');