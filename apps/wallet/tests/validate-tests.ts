/**
 * @file Test Suite Validation
 * @description Validates all test files for proper configuration and dependencies
 */

import * as fs from 'fs';
import * as path from 'path';

const __dirname = process.cwd() + '/tests';

interface ValidationResult {
  file: string;
  valid: boolean;
  issues: string[];
  warnings: string[];
}

class TestValidator {
  private testFiles: string[] = [
    'did-lifecycle.spec.ts',
    'vc-management.spec.ts',
    'zk-proof.spec.ts',
    'security-penetration.spec.ts',
    'user-experience-accessibility.spec.ts',
    'comprehensive-frontend-test.spec.ts'
  ];

  private requiredImports = [
    'import { test, expect, Page } from \'@playwright/test\'',
    'import { performance } from \'perf_hooks\''
  ];

  private requiredStructure = [
    'test.describe',
    'test.beforeEach',
    'test.afterAll'
  ];

  async validateAllTests(): Promise<ValidationResult[]> {
    console.log('🔍 Validating PersonaPass test suite...');
    
    const results: ValidationResult[] = [];
    
    for (const file of this.testFiles) {
      const result = await this.validateTestFile(file);
      results.push(result);
      
      const status = result.valid ? '✅' : '❌';
      console.log(`${status} ${file}`);
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => console.log(`   ❌ ${issue}`));
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
      }
    }
    
    return results;
  }

  private async validateTestFile(fileName: string): Promise<ValidationResult> {
    const filePath = path.join(__dirname, 'e2e', fileName);
    const result: ValidationResult = {
      file: fileName,
      valid: true,
      issues: [],
      warnings: []
    };

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      result.valid = false;
      result.issues.push('File does not exist');
      return result;
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');

    // Validate file structure
    this.validateFileStructure(content, result);
    
    // Validate imports
    this.validateImports(content, result);
    
    // Validate test structure
    this.validateTestStructure(content, result);
    
    // Validate performance metrics
    this.validatePerformanceMetrics(content, result);
    
    // Validate tags
    this.validateTags(content, result);

    return result;
  }

  private validateFileStructure(content: string, result: ValidationResult): void {
    // Check for file header
    if (!content.includes('/**') || !content.includes('* @file')) {
      result.warnings.push('Missing file header documentation');
    }

    // Check for TypeScript
    if (!content.includes('interface') && !content.includes('type')) {
      result.warnings.push('No TypeScript interfaces or types defined');
    }

    // Check for metrics interface
    if (!content.includes('Metrics') && !content.includes('metrics')) {
      result.warnings.push('No performance metrics interface found');
    }
  }

  private validateImports(content: string, result: ValidationResult): void {
    // Check for required Playwright imports
    if (!content.includes('import { test, expect') || !content.includes('@playwright/test')) {
      result.issues.push('Missing required Playwright imports');
    }

    // Check for performance imports
    if (!content.includes('import { performance }') && !content.includes('performance.now()')) {
      result.warnings.push('No performance monitoring imports found');
    }
  }

  private validateTestStructure(content: string, result: ValidationResult): void {
    // Check for test.describe
    if (!content.includes('test.describe(')) {
      result.issues.push('Missing test.describe block');
    }

    // Check for test.beforeEach
    if (!content.includes('test.beforeEach(')) {
      result.warnings.push('Missing test.beforeEach setup');
    }

    // Check for test.afterAll
    if (!content.includes('test.afterAll(')) {
      result.warnings.push('Missing test.afterAll cleanup');
    }

    // Check for async/await patterns
    if (!content.includes('async') || !content.includes('await')) {
      result.issues.push('Missing async/await patterns');
    }

    // Check for page navigation
    if (!content.includes('page.goto(')) {
      result.issues.push('Missing page navigation');
    }
  }

  private validatePerformanceMetrics(content: string, result: ValidationResult): void {
    // Check for performance timing
    if (!content.includes('performance.now()') && !content.includes('Date.now()')) {
      result.warnings.push('No performance timing found');
    }

    // Check for metrics collection
    if (!content.includes('testMetrics') && !content.includes('metrics')) {
      result.warnings.push('No metrics collection found');
    }

    // Check for performance thresholds
    if (!content.includes('toBeLessThan') && !content.includes('expect(')) {
      result.warnings.push('No performance thresholds defined');
    }
  }

  private validateTags(content: string, result: ValidationResult): void {
    // Check for test tags
    if (!content.includes('@') || !content.includes('test.describe(')) {
      result.warnings.push('Missing test tags for filtering');
    }

    // Check for common tags
    const commonTags = ['@performance', '@security', '@accessibility', '@ux'];
    const hasCommonTags = commonTags.some(tag => content.includes(tag));
    
    if (!hasCommonTags) {
      result.warnings.push('Missing common test tags');
    }
  }

  async validateConfiguration(): Promise<void> {
    console.log('\n🔧 Validating test configuration...');
    
    // Check playwright.config.ts
    const playwrightConfig = path.join(__dirname, '..', 'playwright.config.ts');
    if (!fs.existsSync(playwrightConfig)) {
      console.log('❌ playwright.config.ts not found');
      return;
    }

    const configContent = fs.readFileSync(playwrightConfig, 'utf-8');
    
    // Validate configuration
    const configChecks = [
      { check: 'globalSetup', required: true },
      { check: 'globalTeardown', required: true },
      { check: 'reporter', required: true },
      { check: 'projects', required: true },
      { check: 'timeout', required: false }
    ];

    for (const { check, required } of configChecks) {
      if (configContent.includes(check)) {
        console.log(`✅ ${check} configured`);
      } else {
        const status = required ? '❌' : '⚠️';
        console.log(`${status} ${check} ${required ? 'missing' : 'not configured'}`);
      }
    }
  }

  async validateDependencies(): Promise<void> {
    console.log('\n📦 Validating dependencies...');
    
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log('❌ package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    const requiredDependencies = [
      '@playwright/test',
      'typescript',
      'tsx'
    ];

    for (const dep of requiredDependencies) {
      if (packageJson.devDependencies?.[dep] || packageJson.dependencies?.[dep]) {
        console.log(`✅ ${dep} installed`);
      } else {
        console.log(`❌ ${dep} missing`);
      }
    }

    // Check test scripts
    const testScripts = [
      'test:comprehensive',
      'test:did-lifecycle',
      'test:vc-management',
      'test:zk-proof',
      'test:security-penetration',
      'test:ux-accessibility'
    ];

    for (const script of testScripts) {
      if (packageJson.scripts?.[script]) {
        console.log(`✅ ${script} script configured`);
      } else {
        console.log(`❌ ${script} script missing`);
      }
    }
  }

  async generateReport(results: ValidationResult[]): Promise<void> {
    const totalTests = results.length;
    const validTests = results.filter(r => r.valid).length;
    const invalidTests = results.filter(r => !r.valid).length;
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        validTests,
        invalidTests,
        totalIssues,
        totalWarnings,
        validationScore: Math.round((validTests / totalTests) * 100)
      },
      results: results,
      recommendations: this.generateRecommendations(results)
    };

    // Save report
    const reportPath = path.join(__dirname, '..', 'test-results', 'test-validation-report.json');
    const testResultsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Console summary
    console.log('\n📊 Test Validation Summary');
    console.log('=' .repeat(40));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Valid Tests: ${validTests}`);
    console.log(`Invalid Tests: ${invalidTests}`);
    console.log(`Total Issues: ${totalIssues}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Validation Score: ${report.summary.validationScore}%`);
    console.log(`Report saved to: ${reportPath}`);
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    const invalidTests = results.filter(r => !r.valid);
    if (invalidTests.length > 0) {
      recommendations.push('Fix all invalid test files before running comprehensive tests');
    }

    const testsWithIssues = results.filter(r => r.issues.length > 0);
    if (testsWithIssues.length > 0) {
      recommendations.push('Address critical issues in test files');
    }

    const testsWithWarnings = results.filter(r => r.warnings.length > 0);
    if (testsWithWarnings.length > 0) {
      recommendations.push('Consider addressing warnings to improve test quality');
    }

    recommendations.push('Run validation before each test suite execution');
    recommendations.push('Keep test files updated with latest Playwright patterns');
    recommendations.push('Maintain comprehensive performance metrics');

    return recommendations;
  }
}

// CLI interface
async function main() {
  const validator = new TestValidator();
  
  console.log('🚀 PersonaPass Test Suite Validation');
  console.log('=' .repeat(50));
  
  const results = await validator.validateAllTests();
  await validator.validateConfiguration();
  await validator.validateDependencies();
  await validator.generateReport(results);
  
  console.log('\n✅ Validation completed');
}

// Run if called directly
main().catch(console.error);

export { TestValidator };