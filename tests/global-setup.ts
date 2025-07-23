import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up PersonaPass comprehensive testing suite...');
  
  // Ensure test results directory exists
  const fs = require('fs');
  const path = require('path');
  
  const testResultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }
  
  // Initialize test metrics
  const testMetrics = {
    startTime: Date.now(),
    testSuites: [
      'DID Lifecycle',
      'VC Management',
      'ZK Proof Testing',
      'Security Penetration',
      'User Experience',
      'Cross-Browser Compatibility',
      'Performance Benchmarks',
      'Accessibility Compliance'
    ],
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      baseURL: config.projects[0].use.baseURL,
      ci: !!process.env.CI
    }
  };
  
  fs.writeFileSync(
    path.join(testResultsDir, 'test-metrics.json'),
    JSON.stringify(testMetrics, null, 2)
  );
  
  console.log('✅ Global setup completed');
}

export default globalSetup;