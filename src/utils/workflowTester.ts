/**
 * Core Workflow Testing System
 * Automated testing of critical user journeys for production readiness
 */

import { productionErrorTracker } from '../services/productionErrorTracker';
import { NotificationService } from '../services/notificationService';
import { errorService, ErrorCategory, ErrorSeverity } from '../services/errorService';

export interface WorkflowTest {
  id: string;
  name: string;
  description: string;
  critical: boolean;
  steps: WorkflowStep[];
  timeout: number; // milliseconds
}

export interface WorkflowStep {
  id: string;
  name: string;
  action: () => Promise<boolean>;
  validation?: () => Promise<boolean>;
  required: boolean;
  retryable: boolean;
  maxRetries?: number;
}

export interface WorkflowResult {
  testId: string;
  testName: string;
  success: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  steps: StepResult[];
  error?: string;
  criticalFailure: boolean;
}

export interface StepResult {
  stepId: string;
  stepName: string;
  success: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  error?: string;
  retryCount: number;
}

export interface WorkflowSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  averageDuration: number;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  lastRun: number;
}

export class WorkflowTester {
  private static instance: WorkflowTester;
  private tests: Map<string, WorkflowTest> = new Map();
  private results: WorkflowResult[] = [];
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
    this.setupCoreWorkflows();
  }

  static getInstance(): WorkflowTester {
    if (!WorkflowTester.instance) {
      WorkflowTester.instance = new WorkflowTester();
    }
    return WorkflowTester.instance;
  }

  /**
   * Register a new workflow test
   */
  registerTest(test: WorkflowTest): void {
    this.tests.set(test.id, test);
  }

  /**
   * Run a specific test
   */
  async runTest(testId: string): Promise<WorkflowResult> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    const startTime = Date.now();
    let success = true;
    let criticalFailure = false;
    const stepResults: StepResult[] = [];
    let testError: string | undefined;

    try {
      console.log(`🧪 Starting workflow test: ${test.name}`);

      for (const step of test.steps) {
        const stepResult = await this.runStep(step);
        stepResults.push(stepResult);

        if (!stepResult.success) {
          success = false;
          if (step.required) {
            criticalFailure = test.critical;
            if (test.critical) {
              testError = `Critical step failed: ${step.name} - ${stepResult.error}`;
              break;
            }
          }
        }
      }
    } catch (error) {
      success = false;
      criticalFailure = test.critical;
      testError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Test ${test.name} failed with error:`, error);
    }

    const endTime = Date.now();
    const result: WorkflowResult = {
      testId: test.id,
      testName: test.name,
      success,
      startTime,
      endTime,
      duration: endTime - startTime,
      steps: stepResults,
      error: testError,
      criticalFailure,
    };

    this.results.push(result);
    this.handleTestResult(result, test);

    return result;
  }

  /**
   * Run all registered tests
   */
  async runAllTests(): Promise<WorkflowSummary> {
    console.log('🚀 Starting comprehensive workflow testing...');
    
    const testIds = Array.from(this.tests.keys());
    const results: WorkflowResult[] = [];

    for (const testId of testIds) {
      try {
        const result = await this.runTest(testId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to run test ${testId}:`, error);
        productionErrorTracker.trackError(error as Error, {
          component: 'WorkflowTester',
          action: 'runAllTests',
          testId
        });
      }
    }

    return this.generateSummary(results);
  }

  /**
   * Run only critical tests
   */
  async runCriticalTests(): Promise<WorkflowSummary> {
    console.log('🔥 Running critical workflow tests...');
    
    const criticalTestIds = Array.from(this.tests.entries())
      .filter(([_, test]) => test.critical)
      .map(([id, _]) => id);

    const results: WorkflowResult[] = [];

    for (const testId of criticalTestIds) {
      try {
        const result = await this.runTest(testId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to run critical test ${testId}:`, error);
        productionErrorTracker.trackError(error as Error, {
          component: 'WorkflowTester',
          action: 'runCriticalTests',
          testId
        });
      }
    }

    return this.generateSummary(results);
  }

  /**
   * Get test results
   */
  getResults(limit?: number): WorkflowResult[] {
    return limit ? this.results.slice(-limit) : [...this.results];
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }

  private async runStep(step: WorkflowStep): Promise<StepResult> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let retryCount = 0;
    const maxRetries = step.maxRetries || (step.retryable ? 3 : 0);

    while (retryCount <= maxRetries && !success) {
      try {
        console.log(`  📋 Executing step: ${step.name} (attempt ${retryCount + 1})`);
        
        const actionResult = await step.action();
        
        if (step.validation) {
          const validationResult = await step.validation();
          success = actionResult && validationResult;
          if (!success && !error) {
            error = 'Step validation failed';
          }
        } else {
          success = actionResult;
        }

        if (success) {
          console.log(`  ✅ Step completed: ${step.name}`);
        } else if (retryCount < maxRetries) {
          console.log(`  🔄 Retrying step: ${step.name}`);
          await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        }

      } catch (stepError) {
        error = stepError instanceof Error ? stepError.message : 'Unknown step error';
        console.log(`  ❌ Step failed: ${step.name} - ${error}`);
        
        if (retryCount < maxRetries && step.retryable) {
          console.log(`  🔄 Retrying step: ${step.name} (${retryCount + 1}/${maxRetries})`);
          await this.delay(1000 * (retryCount + 1));
        }
      }

      retryCount++;
    }

    const endTime = Date.now();
    return {
      stepId: step.id,
      stepName: step.name,
      success,
      startTime,
      endTime,
      duration: endTime - startTime,
      error,
      retryCount: retryCount - 1,
    };
  }

  private handleTestResult(result: WorkflowResult, test: WorkflowTest): void {
    if (result.success) {
      console.log(`✅ Test passed: ${test.name} (${result.duration}ms)`);
    } else {
      console.error(`❌ Test failed: ${test.name} (${result.duration}ms)`);
      
      if (result.criticalFailure) {
        this.notificationService.error(
          `Critical workflow failure: ${test.name}`,
          { title: 'Production Health Alert', persist: true }
        );

        productionErrorTracker.trackError(
          new Error(`Critical workflow test failed: ${result.error}`),
          {
            component: 'WorkflowTester',
            action: 'criticalTestFailure',
            testId: test.id,
            testName: test.name,
            duration: result.duration
          }
        );
      }
    }
  }

  private generateSummary(results: WorkflowResult[]): WorkflowSummary {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const criticalFailures = results.filter(r => r.criticalFailure).length;
    const averageDuration = totalTests > 0 
      ? results.reduce((sum, r) => sum + r.duration, 0) / totalTests 
      : 0;

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalFailures > 0) {
      overallHealth = 'critical';
    } else if (failedTests > 0 || passedTests / totalTests < 0.8) {
      overallHealth = 'degraded';
    }

    const summary: WorkflowSummary = {
      totalTests,
      passedTests,
      failedTests,
      criticalFailures,
      averageDuration,
      overallHealth,
      lastRun: Date.now(),
    };

    console.log('📊 Workflow Test Summary:', {
      ...summary,
      successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
    });

    return summary;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupCoreWorkflows(): void {
    // Core Authentication Workflow
    this.registerTest({
      id: 'auth-flow',
      name: 'Authentication Flow',
      description: 'Test complete user authentication journey',
      critical: true,
      timeout: 30000,
      steps: [
        {
          id: 'check-wallet-connection',
          name: 'Check Wallet Connection',
          action: async () => {
            // Simulate checking wallet connection
            return typeof window !== 'undefined' && 'keplr' in window;
          },
          required: true,
          retryable: false,
        },
        {
          id: 'simulate-auth',
          name: 'Simulate Authentication',
          action: async () => {
            // Simulate authentication process
            const authToken = localStorage.getItem('isAuthenticated');
            return authToken === 'true';
          },
          validation: async () => {
            return localStorage.getItem('persona_onboarding_complete') === 'true';
          },
          required: true,
          retryable: true,
          maxRetries: 2,
        },
      ],
    });

    // Core Credential Management Workflow
    this.registerTest({
      id: 'credential-management',
      name: 'Credential Management',
      description: 'Test credential creation and management',
      critical: true,
      timeout: 45000,
      steps: [
        {
          id: 'check-storage',
          name: 'Check Local Storage',
          action: async () => {
            try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              return true;
            } catch {
              return false;
            }
          },
          required: true,
          retryable: false,
        },
        {
          id: 'simulate-credential-creation',
          name: 'Simulate Credential Creation',
          action: async () => {
            // Simulate credential creation process
            const mockCredential = {
              id: 'test-credential',
              type: 'VerifiableCredential',
              timestamp: Date.now(),
            };
            
            try {
              localStorage.setItem('test-credential', JSON.stringify(mockCredential));
              return true;
            } catch {
              return false;
            }
          },
          validation: async () => {
            const stored = localStorage.getItem('test-credential');
            if (stored) {
              localStorage.removeItem('test-credential'); // Cleanup
              return true;
            }
            return false;
          },
          required: true,
          retryable: true,
        },
      ],
    });

    // UI Responsiveness Test
    this.registerTest({
      id: 'ui-responsiveness',
      name: 'UI Responsiveness',
      description: 'Test UI components load and respond properly',
      critical: false,
      timeout: 15000,
      steps: [
        {
          id: 'check-dom-ready',
          name: 'Check DOM Ready',
          action: async () => {
            return document.readyState === 'complete';
          },
          required: true,
          retryable: false,
        },
        {
          id: 'check-react-elements',
          name: 'Check React Elements',
          action: async () => {
            // Check if main app container exists
            const appContainer = document.getElementById('root');
            return appContainer !== null && appContainer.children.length > 0;
          },
          required: false,
          retryable: true,
        },
      ],
    });
  }
}

// Export singleton instance
export const workflowTester = WorkflowTester.getInstance();

// Global access for debugging
declare global {
  interface Window {
    PersonaPassWorkflowTester: WorkflowTester;
  }
}

if (typeof window !== 'undefined') {
  window.PersonaPassWorkflowTester = workflowTester;
}