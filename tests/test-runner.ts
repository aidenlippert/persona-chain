/**
 * @file Comprehensive Test Runner
 * @description Orchestrates all test suites and generates consolidated reports
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestSuite {
  name: string;
  file: string;
  tags: string[];
  timeout: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface TestResults {
  testSuite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  coverage?: number;
  metrics?: any;
}

class ComprehensiveTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'DID Lifecycle Testing',
      file: 'did-lifecycle.spec.ts',
      tags: ['@did', '@performance'],
      timeout: 300000, // 5 minutes
      priority: 'critical'
    },
    {
      name: 'VC Management Testing',
      file: 'vc-management.spec.ts',
      tags: ['@vc', '@performance'],
      timeout: 300000, // 5 minutes
      priority: 'critical'
    },
    {
      name: 'ZK Proof Testing',
      file: 'zk-proof.spec.ts',
      tags: ['@zkproof', '@performance'],
      timeout: 600000, // 10 minutes
      priority: 'high'
    },
    {
      name: 'Security Penetration Testing',
      file: 'security-penetration.spec.ts',
      tags: ['@security'],
      timeout: 600000, // 10 minutes
      priority: 'critical'
    },
    {
      name: 'User Experience and Accessibility Testing',
      file: 'user-experience-accessibility.spec.ts',
      tags: ['@ux', '@accessibility'],
      timeout: 300000, // 5 minutes
      priority: 'high'
    },
    {
      name: 'Comprehensive Frontend Testing',
      file: 'comprehensive-frontend-test.spec.ts',
      tags: ['@frontend', '@performance'],
      timeout: 300000, // 5 minutes
      priority: 'medium'
    }
  ];

  private results: TestResults[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor() {
    this.setupTestEnvironment();
  }

  private setupTestEnvironment() {
    // Ensure test results directory exists
    const testResultsDir = path.join(__dirname, '..', 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    // Create test configuration
    const testConfig = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
        targetUrl: process.env.TARGET_URL || 'http://localhost:3000'
      },
      testSuites: this.testSuites
    };

    fs.writeFileSync(
      path.join(testResultsDir, 'test-config.json'),
      JSON.stringify(testConfig, null, 2)
    );
  }

  async runSuite(suite: TestSuite): Promise<TestResults> {
    console.log(`\n🚀 Running ${suite.name}...`);
    console.log(`   File: ${suite.file}`);
    console.log(`   Tags: ${suite.tags.join(', ')}`);
    console.log(`   Timeout: ${suite.timeout / 1000}s`);

    const startTime = Date.now();
    
    try {
      // Build playwright command
      const grepPattern = suite.tags.length > 0 ? `--grep "${suite.tags.join('|')}"` : '';
      const command = `npx playwright test tests/e2e/${suite.file} ${grepPattern} --timeout=${suite.timeout}`;
      
      console.log(`   Command: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: path.join(__dirname, '..'),
        timeout: suite.timeout + 30000 // Add 30s buffer
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parse results (simplified - would need more sophisticated parsing)
      const testsPassed = (stdout.match(/✓/g) || []).length;
      const testsFailed = (stderr.match(/✗/g) || []).length;
      const testsRun = testsPassed + testsFailed;

      const result: TestResults = {
        testSuite: suite.name,
        status: testsFailed > 0 ? 'failed' : 'passed',
        duration,
        testsRun,
        testsPassed,
        testsFailed
      };

      console.log(`✅ ${suite.name} completed in ${duration}ms`);
      console.log(`   Tests: ${testsRun}, Passed: ${testsPassed}, Failed: ${testsFailed}`);

      return result;

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`❌ ${suite.name} failed after ${duration}ms`);
      console.log(`   Error: ${error}`);

      return {
        testSuite: suite.name,
        status: 'failed',
        duration,
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 1
      };
    }
  }

  async runAllSuites(options: { parallel?: boolean; priority?: string } = {}): Promise<void> {
    console.log('🎯 Starting PersonaPass Comprehensive Testing Suite');
    console.log('=' .repeat(60));

    this.startTime = Date.now();
    
    // Filter suites by priority if specified
    let suitesToRun = this.testSuites;
    if (options.priority) {
      suitesToRun = this.testSuites.filter(suite => suite.priority === options.priority);
    }

    // Sort by priority
    const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    suitesToRun.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    if (options.parallel) {
      // Run tests in parallel (be careful with resource usage)
      console.log('🔄 Running tests in parallel...');
      
      const promises = suitesToRun.map(suite => this.runSuite(suite));
      this.results = await Promise.all(promises);
    } else {
      // Run tests sequentially
      console.log('🔄 Running tests sequentially...');
      
      for (const suite of suitesToRun) {
        const result = await this.runSuite(suite);
        this.results.push(result);
      }
    }

    this.endTime = Date.now();
    await this.generateReport();
  }

  private async generateReport(): Promise<void> {
    const totalDuration = this.endTime - this.startTime;
    const totalTests = this.results.reduce((sum, result) => sum + result.testsRun, 0);
    const totalPassed = this.results.reduce((sum, result) => sum + result.testsPassed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.testsFailed, 0);
    const successRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    // Load individual test metrics
    const testResultsDir = path.join(__dirname, '..', 'test-results');
    const metricsFiles = [
      'did-lifecycle-metrics.json',
      'vc-management-metrics.json',
      'zk-proof-metrics.json',
      'security-penetration-report.json',
      'ux-accessibility-report.json'
    ];

    const detailedMetrics: any = {};
    
    for (const file of metricsFiles) {
      const filePath = path.join(testResultsDir, file);
      if (fs.existsSync(filePath)) {
        const metrics = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        detailedMetrics[file.replace('.json', '')] = metrics;
      }
    }

    // Generate comprehensive report
    const comprehensiveReport = {
      testRun: {
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          ci: !!process.env.CI,
          targetUrl: process.env.TARGET_URL || 'http://localhost:3000'
        }
      },
      summary: {
        totalSuites: this.results.length,
        totalTests: totalTests,
        totalPassed: totalPassed,
        totalFailed: totalFailed,
        successRate: successRate.toFixed(2),
        overallStatus: totalFailed === 0 ? 'PASSED' : 'FAILED'
      },
      suiteResults: this.results,
      detailedMetrics: detailedMetrics,
      recommendations: this.generateRecommendations()
    };

    // Save comprehensive report
    const reportFile = path.join(testResultsDir, 'COMPREHENSIVE_TEST_REPORT.json');
    fs.writeFileSync(reportFile, JSON.stringify(comprehensiveReport, null, 2));

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(comprehensiveReport);
    fs.writeFileSync(path.join(testResultsDir, 'COMPREHENSIVE_TEST_REPORT.md'), markdownReport);

    // Console summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 PersonaPass Comprehensive Testing Summary');
    console.log('=' .repeat(60));
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`🎭 Overall Status: ${comprehensiveReport.summary.overallStatus}`);
    console.log('\n📋 Suite Results:');
    
    this.results.forEach((result, index) => {
      const status = result.status === 'passed' ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.testSuite} (${(result.duration / 1000).toFixed(2)}s)`);
    });

    console.log(`\n📄 Detailed reports saved to: ${testResultsDir}/`);
    console.log('=' .repeat(60));
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze results and provide recommendations
    const failedSuites = this.results.filter(r => r.status === 'failed');
    const slowSuites = this.results.filter(r => r.duration > 180000); // > 3 minutes
    
    if (failedSuites.length > 0) {
      recommendations.push('Address failing test suites immediately');
      failedSuites.forEach(suite => {
        recommendations.push(`  - Fix issues in ${suite.testSuite}`);
      });
    }
    
    if (slowSuites.length > 0) {
      recommendations.push('Optimize performance of slow test suites');
      slowSuites.forEach(suite => {
        recommendations.push(`  - Optimize ${suite.testSuite} (${(suite.duration / 1000).toFixed(2)}s)`);
      });
    }
    
    recommendations.push('Maintain test coverage above 80%');
    recommendations.push('Run security tests regularly');
    recommendations.push('Monitor performance metrics trends');
    recommendations.push('Update test scenarios based on new features');
    
    return recommendations;
  }

  private generateMarkdownReport(report: any): string {
    return `# PersonaPass Comprehensive Testing Report

## Summary
- **Test Run**: ${report.testRun.timestamp}
- **Duration**: ${(report.testRun.duration / 1000).toFixed(2)}s
- **Environment**: ${report.testRun.environment.platform} (Node ${report.testRun.environment.nodeVersion})
- **Target URL**: ${report.testRun.environment.targetUrl}

## Results
- **Total Suites**: ${report.summary.totalSuites}
- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.totalPassed}
- **Failed**: ${report.summary.totalFailed}
- **Success Rate**: ${report.summary.successRate}%
- **Overall Status**: ${report.summary.overallStatus}

## Test Suite Results

${report.suiteResults.map((result: TestResults, index: number) => `
### ${index + 1}. ${result.testSuite}
- **Status**: ${result.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${(result.duration / 1000).toFixed(2)}s
- **Tests Run**: ${result.testsRun}
- **Passed**: ${result.testsPassed}
- **Failed**: ${result.testsFailed}
`).join('')}

## Recommendations

${report.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## Detailed Metrics

Detailed performance metrics and security analysis are available in the individual test result files:
- \`did-lifecycle-metrics.json\` - DID lifecycle performance
- \`vc-management-metrics.json\` - VC management performance  
- \`zk-proof-metrics.json\` - ZK proof performance
- \`security-penetration-report.json\` - Security analysis
- \`ux-accessibility-report.json\` - UX and accessibility analysis

---
Generated on ${new Date().toISOString()}
`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: any = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--parallel':
        options.parallel = true;
        break;
      case '--priority':
        options.priority = args[i + 1];
        i++; // Skip next argument
        break;
      case '--help':
        console.log(`
PersonaPass Comprehensive Test Runner

Usage: npm run test:comprehensive [options]

Options:
  --parallel          Run test suites in parallel
  --priority <level>  Run only tests with specified priority (critical, high, medium, low)
  --help              Show this help message

Examples:
  npm run test:comprehensive
  npm run test:comprehensive -- --parallel
  npm run test:comprehensive -- --priority critical
        `);
        return;
    }
  }

  const runner = new ComprehensiveTestRunner();
  await runner.runAllSuites(options);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { ComprehensiveTestRunner };