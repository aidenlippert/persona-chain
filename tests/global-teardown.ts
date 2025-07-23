import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🏁 Tearing down PersonaPass comprehensive testing suite...');
  
  const fs = require('fs');
  const path = require('path');
  
  const testResultsDir = path.join(__dirname, '..', 'test-results');
  const metricsFile = path.join(testResultsDir, 'test-metrics.json');
  
  if (fs.existsSync(metricsFile)) {
    const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf-8'));
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    
    // Generate comprehensive test report
    const report = {
      ...metrics,
      summary: {
        totalDuration: `${(metrics.duration / 1000).toFixed(2)}s`,
        testSuitesCount: metrics.testSuites.length,
        environment: metrics.environment,
        completedAt: new Date().toISOString()
      }
    };
    
    fs.writeFileSync(
      path.join(testResultsDir, 'final-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`✅ Test suite completed in ${report.summary.totalDuration}`);
    console.log(`📊 Results saved to: ${testResultsDir}`);
  }
}

export default globalTeardown;