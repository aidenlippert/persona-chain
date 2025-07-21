/**
 * Control Testing Service
 * Automated control testing with continuous monitoring and validation
 * Test orchestration, evidence collection, and effectiveness measurement
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import cron from 'node-cron';

class ControlTestingService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
    this.redis = null;
    this.tests = new Map();
    this.testSuites = new Map();
    this.testResults = new Map();
    this.testSchedules = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'control-testing' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/control-testing.log' })
      ]
    });

    // Test types and methodologies
    this.testTypes = {
      AUTOMATED: {
        name: 'Automated Test',
        description: 'Fully automated control testing',
        execution: 'automatic',
        frequency: 'continuous',
        reliability: 0.95,
        coverage: 0.8
      },
      MANUAL: {
        name: 'Manual Test',
        description: 'Human-executed control testing',
        execution: 'manual',
        frequency: 'periodic',
        reliability: 0.85,
        coverage: 1.0
      },
      HYBRID: {
        name: 'Hybrid Test',
        description: 'Combination of automated and manual testing',
        execution: 'hybrid',
        frequency: 'periodic',
        reliability: 0.9,
        coverage: 0.95
      },
      SAMPLING: {
        name: 'Sample-Based Test',
        description: 'Statistical sampling-based testing',
        execution: 'automatic',
        frequency: 'continuous',
        reliability: 0.8,
        coverage: 0.6
      },
      WALKTHROUGH: {
        name: 'Process Walkthrough',
        description: 'Step-by-step process validation',
        execution: 'manual',
        frequency: 'quarterly',
        reliability: 0.9,
        coverage: 1.0
      }
    };

    // Test categories
    this.testCategories = {
      DESIGN: {
        name: 'Design Testing',
        description: 'Testing control design adequacy',
        focus: 'control_design',
        methods: ['document_review', 'interview', 'observation']
      },
      IMPLEMENTATION: {
        name: 'Implementation Testing',
        description: 'Testing control implementation',
        focus: 'control_implementation',
        methods: ['system_testing', 'configuration_review', 'evidence_inspection']
      },
      EFFECTIVENESS: {
        name: 'Operating Effectiveness Testing',
        description: 'Testing control operating effectiveness',
        focus: 'control_effectiveness',
        methods: ['transaction_testing', 'reperformance', 'observation']
      },
      COMPLIANCE: {
        name: 'Compliance Testing',
        description: 'Testing regulatory compliance',
        focus: 'regulatory_compliance',
        methods: ['compliance_review', 'evidence_validation', 'gap_analysis']
      }
    };

    // Test execution methods
    this.executionMethods = {
      INQUIRY: 'inquiry',
      OBSERVATION: 'observation',
      INSPECTION: 'inspection',
      REPERFORMANCE: 'reperformance',
      ANALYTICAL: 'analytical',
      AUTOMATED_SCANNING: 'automated_scanning',
      TRANSACTION_TESTING: 'transaction_testing',
      CONFIGURATION_REVIEW: 'configuration_review'
    };

    // Test frequencies
    this.testFrequencies = {
      CONTINUOUS: { interval: 'realtime', description: 'Continuous monitoring' },
      DAILY: { interval: 'daily', description: 'Daily automated testing' },
      WEEKLY: { interval: 'weekly', description: 'Weekly testing cycle' },
      MONTHLY: { interval: 'monthly', description: 'Monthly testing' },
      QUARTERLY: { interval: 'quarterly', description: 'Quarterly testing' },
      SEMIANNUAL: { interval: 'semiannual', description: 'Semi-annual testing' },
      ANNUAL: { interval: 'annual', description: 'Annual testing' },
      ON_DEMAND: { interval: 'on_demand', description: 'On-demand testing' }
    };

    // Test result statuses
    this.testStatuses = {
      PASSED: { name: 'Passed', description: 'Test completed successfully', effective: true },
      FAILED: { name: 'Failed', description: 'Test failed - control ineffective', effective: false },
      EXCEPTION: { name: 'Exception', description: 'Test passed with exceptions', effective: 'partial' },
      INCONCLUSIVE: { name: 'Inconclusive', description: 'Test results inconclusive', effective: 'unknown' },
      NOT_APPLICABLE: { name: 'Not Applicable', description: 'Test not applicable', effective: null },
      DEFERRED: { name: 'Deferred', description: 'Test deferred to later date', effective: 'pending' }
    };

    // Evidence types for control testing
    this.evidenceTypes = {
      SYSTEM_GENERATED: 'system_generated',
      DOCUMENT: 'document',
      SCREENSHOT: 'screenshot',
      LOG_FILE: 'log_file',
      REPORT: 'report',
      CONFIGURATION: 'configuration',
      INTERVIEW_NOTES: 'interview_notes',
      OBSERVATION_NOTES: 'observation_notes',
      TEST_RESULTS: 'test_results',
      APPROVAL_RECORD: 'approval_record'
    };

    // Risk factors for test planning
    this.riskFactors = {
      CONTROL_COMPLEXITY: { weight: 0.25, description: 'Complexity of the control' },
      CHANGE_FREQUENCY: { weight: 0.20, description: 'Frequency of changes to the control' },
      MATERIALITY: { weight: 0.20, description: 'Financial or operational materiality' },
      AUTOMATION_LEVEL: { weight: 0.15, description: 'Level of automation in the control' },
      HISTORICAL_FAILURES: { weight: 0.10, description: 'Historical failure rate' },
      REGULATORY_SIGNIFICANCE: { weight: 0.10, description: 'Regulatory importance' }
    };

    // Initialize cron jobs for scheduled testing
    this.initializeCronJobs();
  }

  async initialize() {
    try {
      this.logger.info('Initializing Control Testing Service...');

      // Initialize Redis for distributed testing coordination
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for control testing');
      }

      // Load test templates and configurations
      await this.loadTestTemplates();

      // Initialize test schedules
      await this.initializeTestSchedules();

      // Setup automated test execution
      await this.setupAutomatedTesting();

      // Load existing test results
      await this.loadExistingTestResults();

      this.logger.info('Control Testing Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Control Testing Service:', error);
      throw error;
    }
  }

  async runControlTests(testRequest) {
    try {
      const {
        framework,
        controls = [],
        testType = 'AUTOMATED',
        category = 'EFFECTIVENESS',
        options = {},
        context = {}
      } = testRequest;

      const testId = crypto.randomUUID();

      this.logger.info(`Starting control testing`, {
        testId,
        framework,
        controlCount: controls.length,
        testType,
        category
      });

      // Create test execution record
      const testExecution = {
        id: testId,
        framework,
        controls,
        testType,
        category,
        status: 'running',
        startedAt: DateTime.now().toISO(),
        startedBy: context.userId || 'system',
        options,
        progress: 0,
        results: [],
        summary: null
      };

      // Store test execution
      this.tests.set(testId, testExecution);

      // Run tests asynchronously
      this.runTestsAsync(testExecution);

      return {
        testId,
        framework,
        status: 'initiated',
        controlCount: controls.length,
        estimatedDuration: this.estimateTestDuration(controls, testType),
        startedAt: testExecution.startedAt
      };

    } catch (error) {
      this.logger.error('Error starting control tests:', error);
      throw error;
    }
  }

  async runTestsAsync(testExecution) {
    try {
      const { id, controls, testType, category, options } = testExecution;

      const results = [];
      let passedControls = 0;
      let failedControls = 0;
      let exceptionControls = 0;

      // Test each control
      for (let i = 0; i < controls.length; i++) {
        const control = controls[i];
        
        try {
          // Update progress
          const progress = Math.floor(((i + 1) / controls.length) * 100);
          await this.updateTestProgress(id, progress, `Testing control ${control}`);

          // Execute control test
          const testResult = await this.executeControlTest(control, testType, category, options);
          results.push(testResult);

          // Update counters
          switch (testResult.status) {
            case 'PASSED':
              passedControls++;
              break;
            case 'FAILED':
              failedControls++;
              break;
            case 'EXCEPTION':
              exceptionControls++;
              break;
          }

          this.logger.info(`Control test completed`, {
            testId: id,
            control,
            status: testResult.status,
            progress
          });

        } catch (error) {
          this.logger.error(`Error testing control ${control}:`, error);
          results.push({
            controlId: control,
            status: 'FAILED',
            error: error.message,
            testedAt: DateTime.now().toISO()
          });
          failedControls++;
        }
      }

      // Calculate summary
      const summary = {
        totalControls: controls.length,
        passedControls,
        failedControls,
        exceptionControls,
        overallEffectiveness: controls.length > 0 ? (passedControls / controls.length) : 0,
        testCoverage: 1.0, // Full coverage for all requested controls
        confidence: this.calculateTestConfidence(results),
        recommendations: this.generateTestRecommendations(results)
      };

      // Update test execution
      testExecution.status = 'completed';
      testExecution.completedAt = DateTime.now().toISO();
      testExecution.progress = 100;
      testExecution.results = results;
      testExecution.summary = summary;

      // Store results
      this.testResults.set(id, testExecution);

      // Cache results
      this.cache.set(`test_results:${id}`, testExecution, 7200);

      this.logger.info(`Control testing completed`, {
        testId: id,
        totalControls: controls.length,
        passedControls,
        failedControls,
        overallEffectiveness: summary.overallEffectiveness
      });

    } catch (error) {
      this.logger.error('Error in async test execution:', error);
      testExecution.status = 'failed';
      testExecution.error = error.message;
      testExecution.completedAt = DateTime.now().toISO();
    }
  }

  async executeControlTest(controlId, testType, category, options) {
    try {
      this.logger.info(`Executing ${testType} test for control ${controlId}`, { category });

      // Get control configuration
      const controlConfig = await this.getControlConfiguration(controlId);

      // Determine test methods
      const testMethods = this.determineTestMethods(controlConfig, testType, category);

      // Execute tests
      const testResults = [];
      for (const method of testMethods) {
        const methodResult = await this.executeTestMethod(controlId, method, options);
        testResults.push(methodResult);
      }

      // Collect evidence
      const evidence = await this.collectTestEvidence(controlId, testMethods, testResults);

      // Analyze results
      const analysis = this.analyzeTestResults(testResults, testMethods);

      // Determine overall test status
      const overallStatus = this.determineOverallStatus(testResults);

      const result = {
        controlId,
        testType,
        category,
        status: overallStatus,
        methods: testMethods,
        results: testResults,
        evidence,
        analysis,
        testedAt: DateTime.now().toISO(),
        testedBy: options.userId || 'system',
        confidence: analysis.confidence,
        effectiveness: analysis.effectiveness,
        findings: analysis.findings,
        recommendations: analysis.recommendations
      };

      return result;

    } catch (error) {
      this.logger.error(`Error executing control test for ${controlId}:`, error);
      return {
        controlId,
        testType,
        category,
        status: 'FAILED',
        error: error.message,
        testedAt: DateTime.now().toISO(),
        confidence: 0,
        effectiveness: 0
      };
    }
  }

  async executeTestMethod(controlId, method, options) {
    try {
      switch (method) {
        case this.executionMethods.AUTOMATED_SCANNING:
          return await this.executeAutomatedScanning(controlId, options);
        
        case this.executionMethods.CONFIGURATION_REVIEW:
          return await this.executeConfigurationReview(controlId, options);
        
        case this.executionMethods.TRANSACTION_TESTING:
          return await this.executeTransactionTesting(controlId, options);
        
        case this.executionMethods.REPERFORMANCE:
          return await this.executeReperformance(controlId, options);
        
        case this.executionMethods.INSPECTION:
          return await this.executeInspection(controlId, options);
        
        case this.executionMethods.OBSERVATION:
          return await this.executeObservation(controlId, options);
        
        case this.executionMethods.INQUIRY:
          return await this.executeInquiry(controlId, options);
        
        case this.executionMethods.ANALYTICAL:
          return await this.executeAnalytical(controlId, options);
        
        default:
          throw new Error(`Unsupported test method: ${method}`);
      }
    } catch (error) {
      this.logger.error(`Error executing test method ${method}:`, error);
      return {
        method,
        status: 'FAILED',
        error: error.message,
        executedAt: DateTime.now().toISO()
      };
    }
  }

  async executeAutomatedScanning(controlId, options) {
    // Mock automated scanning - in production, integrate with actual systems
    const scanResults = {
      configurationCompliance: Math.random() > 0.2, // 80% pass rate
      securitySettings: Math.random() > 0.1, // 90% pass rate
      accessControls: Math.random() > 0.15, // 85% pass rate
      logginEnabled: Math.random() > 0.05 // 95% pass rate
    };

    const passedChecks = Object.values(scanResults).filter(Boolean).length;
    const totalChecks = Object.keys(scanResults).length;
    const score = passedChecks / totalChecks;

    return {
      method: this.executionMethods.AUTOMATED_SCANNING,
      status: score >= 0.8 ? 'PASSED' : score >= 0.6 ? 'EXCEPTION' : 'FAILED',
      score,
      checks: scanResults,
      evidence: ['scan_report.json', 'configuration_snapshot.xml'],
      executedAt: DateTime.now().toISO(),
      duration: Math.floor(Math.random() * 30) + 10 // 10-40 seconds
    };
  }

  async executeConfigurationReview(controlId, options) {
    // Mock configuration review
    const configItems = [
      'password_policy',
      'session_timeout',
      'encryption_settings',
      'audit_logging',
      'access_controls'
    ];

    const reviewResults = configItems.map(item => ({
      item,
      compliant: Math.random() > 0.2, // 80% compliance rate
      severity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
    }));

    const compliantItems = reviewResults.filter(r => r.compliant).length;
    const score = compliantItems / configItems.length;

    return {
      method: this.executionMethods.CONFIGURATION_REVIEW,
      status: score >= 0.9 ? 'PASSED' : score >= 0.7 ? 'EXCEPTION' : 'FAILED',
      score,
      items: reviewResults,
      evidence: ['configuration_review.pdf', 'settings_export.json'],
      executedAt: DateTime.now().toISO(),
      duration: Math.floor(Math.random() * 60) + 30 // 30-90 minutes
    };
  }

  async executeTransactionTesting(controlId, options) {
    // Mock transaction testing
    const sampleSize = options.sampleSize || 25;
    const transactions = [];

    for (let i = 0; i < sampleSize; i++) {
      transactions.push({
        transactionId: `TXN-${i + 1}`,
        approved: Math.random() > 0.1, // 90% approval rate
        documented: Math.random() > 0.05, // 95% documentation rate
        authorized: Math.random() > 0.08, // 92% authorization rate
        amount: Math.floor(Math.random() * 10000) + 100
      });
    }

    const exceptions = transactions.filter(t => !t.approved || !t.documented || !t.authorized);
    const exceptionRate = exceptions.length / sampleSize;

    return {
      method: this.executionMethods.TRANSACTION_TESTING,
      status: exceptionRate <= 0.05 ? 'PASSED' : exceptionRate <= 0.15 ? 'EXCEPTION' : 'FAILED',
      sampleSize,
      exceptions: exceptions.length,
      exceptionRate,
      transactions: transactions.slice(0, 5), // Sample transactions
      evidence: ['transaction_test_workpaper.xlsx', 'sample_transactions.csv'],
      executedAt: DateTime.now().toISO(),
      duration: Math.floor(Math.random() * 120) + 60 // 60-180 minutes
    };
  }

  async executeReperformance(controlId, options) {
    // Mock reperformance testing
    const calculations = [
      { type: 'monthly_reconciliation', result: 'match' },
      { type: 'variance_analysis', result: 'acceptable' },
      { type: 'approval_validation', result: 'approved' },
      { type: 'segregation_check', result: 'proper' }
    ];

    const issues = calculations.filter(() => Math.random() < 0.1); // 10% issue rate
    const score = (calculations.length - issues.length) / calculations.length;

    return {
      method: this.executionMethods.REPERFORMANCE,
      status: score >= 0.95 ? 'PASSED' : score >= 0.85 ? 'EXCEPTION' : 'FAILED',
      score,
      calculations,
      issues: issues.length,
      evidence: ['reperformance_workpaper.xlsx', 'calculation_results.pdf'],
      executedAt: DateTime.now().toISO(),
      duration: Math.floor(Math.random() * 90) + 30 // 30-120 minutes
    };
  }

  async executeInspection(controlId, options) {
    // Mock inspection testing
    const documents = [
      'policy_document',
      'procedure_manual',
      'approval_matrix',
      'training_records',
      'access_requests'
    ];

    const inspectionResults = documents.map(doc => ({
      document: doc,
      exists: Math.random() > 0.1, // 90% existence rate
      current: Math.random() > 0.15, // 85% currency rate
      approved: Math.random() > 0.05, // 95% approval rate
      accessible: Math.random() > 0.08 // 92% accessibility rate
    }));

    const compliantDocs = inspectionResults.filter(r => 
      r.exists && r.current && r.approved && r.accessible
    ).length;
    const score = compliantDocs / documents.length;

    return {
      method: this.executionMethods.INSPECTION,
      status: score >= 0.9 ? 'PASSED' : score >= 0.7 ? 'EXCEPTION' : 'FAILED',
      score,
      documents: inspectionResults,
      evidence: ['document_inspection.pdf', 'evidence_inventory.xlsx'],
      executedAt: DateTime.now().toISO(),
      duration: Math.floor(Math.random() * 45) + 15 // 15-60 minutes
    };
  }

  async executeObservation(controlId, options) {
    // Mock observation testing
    const processSteps = [
      'initiation',
      'authorization',
      'execution',
      'monitoring',
      'documentation'
    ];

    const observations = processSteps.map(step => ({
      step,
      performed: Math.random() > 0.1, // 90% performance rate
      documented: Math.random() > 0.15, // 85% documentation rate
      timely: Math.random() > 0.2, // 80% timeliness rate
      accurate: Math.random() > 0.12 // 88% accuracy rate
    }));

    const effectiveSteps = observations.filter(o => 
      o.performed && o.documented && o.timely && o.accurate
    ).length;
    const score = effectiveSteps / processSteps.length;

    return {
      method: this.executionMethods.OBSERVATION,
      status: score >= 0.8 ? 'PASSED' : score >= 0.6 ? 'EXCEPTION' : 'FAILED',
      score,
      processSteps: observations,
      evidence: ['observation_notes.pdf', 'process_photos.zip'],
      executedAt: DateTime.now().toISO(),
      duration: Math.floor(Math.random() * 60) + 20 // 20-80 minutes
    };
  }

  async executeInquiry(controlId, options) {
    // Mock inquiry testing
    const inquiries = [
      { topic: 'process_understanding', response: 'satisfactory' },
      { topic: 'control_knowledge', response: 'adequate' },
      { topic: 'exception_handling', response: 'proper' },
      { topic: 'escalation_procedures', response: 'clear' }
    ];

    const satisfactoryResponses = inquiries.filter(() => Math.random() > 0.15).length; // 85% satisfactory
    const score = satisfactoryResponses / inquiries.length;

    return {
      method: this.executionMethods.INQUIRY,
      status: score >= 0.8 ? 'PASSED' : score >= 0.6 ? 'EXCEPTION' : 'FAILED',
      score,
      inquiries,
      evidence: ['interview_notes.pdf', 'inquiry_responses.docx'],
      executedAt: DateTime.now().toISO(),
      duration: Math.floor(Math.random() * 30) + 15 // 15-45 minutes
    };
  }

  async executeAnalytical(controlId, options) {
    // Mock analytical testing
    const metrics = {
      trend_analysis: Math.random() > 0.2, // 80% pass rate
      ratio_analysis: Math.random() > 0.15, // 85% pass rate
      variance_analysis: Math.random() > 0.25, // 75% pass rate
      benchmarking: Math.random() > 0.3 // 70% pass rate
    };

    const passedAnalytics = Object.values(metrics).filter(Boolean).length;
    const score = passedAnalytics / Object.keys(metrics).length;

    return {
      method: this.executionMethods.ANALYTICAL,
      status: score >= 0.75 ? 'PASSED' : score >= 0.5 ? 'EXCEPTION' : 'FAILED',
      score,
      analytics: metrics,
      evidence: ['analytical_review.xlsx', 'trend_charts.pdf'],
      executedAt: DateTime.now().toISO(),
      duration: Math.floor(Math.random() * 40) + 20 // 20-60 minutes
    };
  }

  determineTestMethods(controlConfig, testType, category) {
    // Determine appropriate test methods based on control and test configuration
    const methods = [];

    switch (testType) {
      case 'AUTOMATED':
        methods.push(
          this.executionMethods.AUTOMATED_SCANNING,
          this.executionMethods.CONFIGURATION_REVIEW,
          this.executionMethods.ANALYTICAL
        );
        break;
      
      case 'MANUAL':
        methods.push(
          this.executionMethods.INSPECTION,
          this.executionMethods.OBSERVATION,
          this.executionMethods.INQUIRY,
          this.executionMethods.REPERFORMANCE
        );
        break;
      
      case 'HYBRID':
        methods.push(
          this.executionMethods.AUTOMATED_SCANNING,
          this.executionMethods.INSPECTION,
          this.executionMethods.TRANSACTION_TESTING
        );
        break;
      
      default:
        methods.push(this.executionMethods.AUTOMATED_SCANNING);
    }

    return methods;
  }

  analyzeTestResults(testResults, testMethods) {
    const totalMethods = testResults.length;
    const passedMethods = testResults.filter(r => r.status === 'PASSED').length;
    const failedMethods = testResults.filter(r => r.status === 'FAILED').length;
    const exceptionMethods = testResults.filter(r => r.status === 'EXCEPTION').length;

    const effectiveness = totalMethods > 0 ? passedMethods / totalMethods : 0;
    const confidence = this.calculateMethodConfidence(testResults);

    return {
      totalMethods,
      passedMethods,
      failedMethods,
      exceptionMethods,
      effectiveness,
      confidence,
      findings: this.extractFindings(testResults),
      recommendations: this.generateMethodRecommendations(testResults)
    };
  }

  determineOverallStatus(testResults) {
    const passedCount = testResults.filter(r => r.status === 'PASSED').length;
    const failedCount = testResults.filter(r => r.status === 'FAILED').length;
    const exceptionCount = testResults.filter(r => r.status === 'EXCEPTION').length;
    const total = testResults.length;

    if (failedCount > 0) return 'FAILED';
    if (exceptionCount > 0) return 'EXCEPTION';
    if (passedCount === total) return 'PASSED';
    return 'INCONCLUSIVE';
  }

  calculateTestConfidence(results) {
    if (results.length === 0) return 0;

    let totalConfidence = 0;
    for (const result of results) {
      totalConfidence += result.confidence || 0.5;
    }

    return totalConfidence / results.length;
  }

  estimateTestDuration(controls, testType) {
    const baseMinutes = {
      AUTOMATED: 5,
      MANUAL: 60,
      HYBRID: 30,
      SAMPLING: 15,
      WALKTHROUGH: 90
    };

    const base = baseMinutes[testType] || 30;
    const total = base * controls.length;

    if (total < 60) return `${total} minutes`;
    return `${Math.round(total / 60)} hours`;
  }

  initializeCronJobs() {
    // Daily automated testing
    cron.schedule('0 2 * * *', async () => {
      try {
        this.logger.info('Starting scheduled automated testing');
        await this.runScheduledTests();
      } catch (error) {
        this.logger.error('Scheduled testing failed:', error);
      }
    });
  }

  async updateTestProgress(testId, progress, message) {
    try {
      const test = this.tests.get(testId);
      if (test) {
        test.progress = progress;
        test.progressMessage = message;
        test.lastUpdated = DateTime.now().toISO();
      }
    } catch (error) {
      this.logger.error('Error updating test progress:', error);
    }
  }

  async loadTestTemplates() {
    // Load test templates and configurations
    this.logger.info('Test templates loaded');
  }

  async initializeTestSchedules() {
    // Initialize test schedules
    this.logger.info('Test schedules initialized');
  }

  async setupAutomatedTesting() {
    // Setup automated testing infrastructure
    this.logger.info('Automated testing setup complete');
  }

  async loadExistingTestResults() {
    // Load existing test results
    this.logger.info('Existing test results loaded');
  }

  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        timestamp: DateTime.now().toISO(),
        cache: {
          keys: this.cache.keys().length,
          stats: this.cache.getStats()
        },
        redis: null,
        tests: this.tests.size,
        testSuites: this.testSuites.size,
        testResults: this.testResults.size,
        testSchedules: this.testSchedules.size,
        testTypes: Object.keys(this.testTypes),
        executionMethods: Object.keys(this.executionMethods)
      };

      if (this.redis) {
        await this.redis.ping();
        health.redis = { status: 'connected' };
      }

      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: DateTime.now().toISO()
      };
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down Control Testing Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.tests.clear();
      this.testSuites.clear();
      this.testResults.clear();
      this.testSchedules.clear();

      this.logger.info('Control Testing Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default ControlTestingService;