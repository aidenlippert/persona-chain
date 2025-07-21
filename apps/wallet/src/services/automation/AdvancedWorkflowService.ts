/**
 * Advanced Workflow Automation Service
 * Orchestrates complex multi-API verification workflows with intelligent routing
 */

import { VerifiableCredential } from '../../types/identity';
import { databaseService } from '../database/DatabaseService';
import { linkedInAdvancedService, LinkedInVerificationRequest, LinkedInVerificationResult } from '../LinkedInAdvancedService';
import { gitHubAdvancedService, GitHubVerificationRequest, GitHubVerificationResult } from '../GitHubAdvancedService';
import { experianService, CreditScoreRequest, CreditVerificationResult } from '../ExperianService';
import { plaidAutomationService as plaidService, PlaidVerificationResult } from './PlaidAutomationService';
import { errorService } from "@/services/errorService";

// Mock interface for PlaidVerificationRequest since it's not exported from PlaidAutomationService
interface PlaidVerificationRequest {
  accessToken: string;
  [key: string]: any;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'financial' | 'identity' | 'developer' | 'comprehensive';
  steps: WorkflowStep[];
  parallelExecution: boolean;
  estimatedDuration: number; // minutes
  requiredPermissions: string[];
  outputCredentials: string[];
  complexity: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'api_call' | 'data_processing' | 'credential_generation' | 'validation' | 'storage';
  service: 'linkedin' | 'github' | 'experian' | 'plaid' | 'internal';
  config: Record<string, any>;
  dependencies: string[]; // Step IDs that must complete first
  optional: boolean;
  retryPolicy: RetryPolicy;
  timeout: number; // seconds
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential';
  baseDelay: number; // milliseconds
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userDid: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  progress: WorkflowProgress;
  results: WorkflowResults;
  errors: WorkflowError[];
  metadata: {
    totalSteps: number;
    completedSteps: number;
    estimatedTimeRemaining: number;
    actualDuration?: number;
  };
}

export interface WorkflowProgress {
  currentStep: string;
  currentStepName: string;
  completedSteps: string[];
  failedSteps: string[];
  overallProgress: number; // 0-100
  stepProgress: number; // 0-100
  message: string;
}

export interface WorkflowResults {
  credentials: VerifiableCredential[];
  verificationResults: {
    linkedin?: LinkedInVerificationResult;
    github?: GitHubVerificationResult;
    experian?: CreditVerificationResult;
    plaid?: PlaidVerificationResult;
  };
  aggregatedScores: {
    professionalScore: number;
    developerScore: number;
    financialScore: number;
    overallTrustScore: number;
  };
  insights: WorkflowInsight[];
}

export interface WorkflowInsight {
  type: 'strength' | 'opportunity' | 'recommendation' | 'warning';
  category: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions?: string[];
}

export interface WorkflowError {
  stepId: string;
  stepName: string;
  error: string;
  timestamp: string;
  recoverable: boolean;
  context?: Record<string, any>;
}

export interface WorkflowExecutionRequest {
  workflowId: string;
  userDid: string;
  config: Record<string, any>;
  tokens?: {
    linkedinToken?: string;
    githubToken?: string;
    plaidAccessToken?: string;
  };
  options?: {
    skipOptionalSteps?: boolean;
    allowPartialCompletion?: boolean;
    notifyOnProgress?: boolean;
  };
}

export class AdvancedWorkflowService {
  private static instance: AdvancedWorkflowService;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor() {
    this.initializeDefaultWorkflows();
    console.log('🚀 Advanced Workflow Service initialized');
  }

  static getInstance(): AdvancedWorkflowService {
    if (!AdvancedWorkflowService.instance) {
      AdvancedWorkflowService.instance = new AdvancedWorkflowService();
    }
    return AdvancedWorkflowService.instance;
  }

  /**
   * Initialize predefined workflow templates
   */
  private initializeDefaultWorkflows(): void {
    // Professional Verification Workflow
    const professionalWorkflow: WorkflowDefinition = {
      id: 'professional_verification',
      name: 'Complete Professional Verification',
      description: 'Comprehensive professional identity verification using LinkedIn and employment data',
      category: 'professional',
      parallelExecution: false,
      estimatedDuration: 8,
      requiredPermissions: ['linkedin:read', 'profile:write'],
      outputCredentials: [
        'LinkedInProfessionalProfileCredential',
        'EmploymentHistoryCredential',
        'EducationCredential',
        'SkillsEndorsementCredential',
        'NetworkVerificationCredential'
      ],
      complexity: 'medium',
      tags: ['linkedin', 'professional', 'employment', 'education'],
      steps: [
        {
          id: 'linkedin_verification',
          name: 'LinkedIn Profile Verification',
          type: 'api_call',
          service: 'linkedin',
          config: { includeConnections: true, includeSkillEndorsements: true },
          dependencies: [],
          optional: false,
          retryPolicy: { maxAttempts: 3, backoffStrategy: 'exponential', baseDelay: 1000 },
          timeout: 30
        },
        {
          id: 'credential_generation',
          name: 'Generate Professional Credentials',
          type: 'credential_generation',
          service: 'internal',
          config: { types: ['professional', 'employment', 'education', 'skills', 'network'] },
          dependencies: ['linkedin_verification'],
          optional: false,
          retryPolicy: { maxAttempts: 2, backoffStrategy: 'linear', baseDelay: 500 },
          timeout: 15
        },
        {
          id: 'credential_storage',
          name: 'Store Credentials',
          type: 'storage',
          service: 'internal',
          config: { encrypt: true, backup: true },
          dependencies: ['credential_generation'],
          optional: false,
          retryPolicy: { maxAttempts: 3, backoffStrategy: 'linear', baseDelay: 500 },
          timeout: 10
        }
      ]
    };

    // Developer Portfolio Workflow
    const developerWorkflow: WorkflowDefinition = {
      id: 'developer_verification',
      name: 'Developer Portfolio Verification',
      description: 'Comprehensive developer verification using GitHub activity and code contributions',
      category: 'developer',
      parallelExecution: false,
      estimatedDuration: 6,
      requiredPermissions: ['github:read', 'repos:read'],
      outputCredentials: [
        'GitHubDeveloperProfileCredential',
        'RepositoryOwnershipCredential',
        'CodeContributionsCredential',
        'ProgrammingSkillsCredential',
        'OpenSourceActivityCredential',
        'CollaborationHistoryCredential'
      ],
      complexity: 'medium',
      tags: ['github', 'developer', 'coding', 'open-source'],
      steps: [
        {
          id: 'github_verification',
          name: 'GitHub Profile & Repository Analysis',
          type: 'api_call',
          service: 'github',
          config: { includePrivateRepos: false, analyzeCodeQuality: true },
          dependencies: [],
          optional: false,
          retryPolicy: { maxAttempts: 3, backoffStrategy: 'exponential', baseDelay: 1000 },
          timeout: 45
        },
        {
          id: 'code_analysis',
          name: 'Code Quality & Contribution Analysis',
          type: 'data_processing',
          service: 'internal',
          config: { analyzeLanguages: true, calculateComplexity: true },
          dependencies: ['github_verification'],
          optional: false,
          retryPolicy: { maxAttempts: 2, backoffStrategy: 'linear', baseDelay: 500 },
          timeout: 20
        },
        {
          id: 'developer_credentials',
          name: 'Generate Developer Credentials',
          type: 'credential_generation',
          service: 'internal',
          config: { types: ['profile', 'repositories', 'contributions', 'skills', 'opensource', 'collaboration'] },
          dependencies: ['code_analysis'],
          optional: false,
          retryPolicy: { maxAttempts: 2, backoffStrategy: 'linear', baseDelay: 500 },
          timeout: 15
        }
      ]
    };

    // Financial Profile Workflow
    const financialWorkflow: WorkflowDefinition = {
      id: 'financial_verification',
      name: 'Complete Financial Verification',
      description: 'Comprehensive financial verification using credit and banking data',
      category: 'financial',
      parallelExecution: true,
      estimatedDuration: 10,
      requiredPermissions: ['credit:read', 'banking:read'],
      outputCredentials: [
        'CreditVerificationCredential',
        'BankAccountVerificationCredential',
        'IncomeVerificationCredential',
        'FinancialStabilityCredential'
      ],
      complexity: 'high',
      tags: ['experian', 'plaid', 'credit', 'banking', 'income'],
      steps: [
        {
          id: 'experian_verification',
          name: 'Credit Score Verification',
          type: 'api_call',
          service: 'experian',
          config: { includeFullReport: true },
          dependencies: [],
          optional: false,
          retryPolicy: { maxAttempts: 3, backoffStrategy: 'exponential', baseDelay: 2000 },
          timeout: 60
        },
        {
          id: 'plaid_verification',
          name: 'Banking & Income Verification',
          type: 'api_call',
          service: 'plaid',
          config: { includeTransactions: true, includeIncome: true },
          dependencies: [],
          optional: false,
          retryPolicy: { maxAttempts: 3, backoffStrategy: 'exponential', baseDelay: 1500 },
          timeout: 45
        },
        {
          id: 'financial_analysis',
          name: 'Financial Profile Analysis',
          type: 'data_processing',
          service: 'internal',
          config: { calculateStability: true, assessRisk: true },
          dependencies: ['experian_verification', 'plaid_verification'],
          optional: false,
          retryPolicy: { maxAttempts: 2, backoffStrategy: 'linear', baseDelay: 500 },
          timeout: 20
        },
        {
          id: 'financial_credentials',
          name: 'Generate Financial Credentials',
          type: 'credential_generation',
          service: 'internal',
          config: { types: ['credit', 'banking', 'income', 'stability'] },
          dependencies: ['financial_analysis'],
          optional: false,
          retryPolicy: { maxAttempts: 2, backoffStrategy: 'linear', baseDelay: 500 },
          timeout: 15
        }
      ]
    };

    // Comprehensive Identity Workflow
    const comprehensiveWorkflow: WorkflowDefinition = {
      id: 'comprehensive_identity',
      name: 'Complete Identity Verification Suite',
      description: 'Full-spectrum identity verification across professional, financial, and technical domains',
      category: 'comprehensive',
      parallelExecution: true,
      estimatedDuration: 25,
      requiredPermissions: ['linkedin:read', 'github:read', 'credit:read', 'banking:read'],
      outputCredentials: [
        'ComprehensiveIdentityCredential',
        'LinkedInProfessionalProfileCredential',
        'GitHubDeveloperProfileCredential',
        'CreditVerificationCredential',
        'BankAccountVerificationCredential'
      ],
      complexity: 'high',
      tags: ['comprehensive', 'identity', 'multi-domain', 'verification'],
      steps: [
        {
          id: 'parallel_verifications',
          name: 'Parallel API Verifications',
          type: 'api_call',
          service: 'internal',
          config: { 
            parallel: true,
            services: ['linkedin', 'github', 'experian', 'plaid']
          },
          dependencies: [],
          optional: false,
          retryPolicy: { maxAttempts: 2, backoffStrategy: 'exponential', baseDelay: 1000 },
          timeout: 120
        },
        {
          id: 'cross_verification',
          name: 'Cross-Domain Data Validation',
          type: 'validation',
          service: 'internal',
          config: { validateConsistency: true, flagDiscrepancies: true },
          dependencies: ['parallel_verifications'],
          optional: false,
          retryPolicy: { maxAttempts: 2, backoffStrategy: 'linear', baseDelay: 500 },
          timeout: 30
        },
        {
          id: 'comprehensive_analysis',
          name: 'Comprehensive Identity Analysis',
          type: 'data_processing',
          service: 'internal',
          config: { generateInsights: true, calculateTrustScore: true },
          dependencies: ['cross_verification'],
          optional: false,
          retryPolicy: { maxAttempts: 2, backoffStrategy: 'linear', baseDelay: 500 },
          timeout: 25
        },
        {
          id: 'unified_credentials',
          name: 'Generate Unified Identity Credentials',
          type: 'credential_generation',
          service: 'internal',
          config: { unified: true, comprehensive: true },
          dependencies: ['comprehensive_analysis'],
          optional: false,
          retryPolicy: { maxAttempts: 2, backoffStrategy: 'linear', baseDelay: 500 },
          timeout: 20
        }
      ]
    };

    // Store workflows
    this.workflows.set(professionalWorkflow.id, professionalWorkflow);
    this.workflows.set(developerWorkflow.id, developerWorkflow);
    this.workflows.set(financialWorkflow.id, financialWorkflow);
    this.workflows.set(comprehensiveWorkflow.id, comprehensiveWorkflow);

    console.log(`✅ Initialized ${this.workflows.size} workflow templates`);
  }

  /**
   * Get all available workflows
   */
  getAvailableWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(request: WorkflowExecutionRequest): Promise<WorkflowExecution> {
    console.log(`🚀 Starting workflow execution: ${request.workflowId}`);

    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${request.workflowId}`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: request.workflowId,
      userDid: request.userDid,
      status: 'pending',
      startedAt: new Date().toISOString(),
      progress: {
        currentStep: '',
        currentStepName: '',
        completedSteps: [],
        failedSteps: [],
        overallProgress: 0,
        stepProgress: 0,
        message: 'Initializing workflow...'
      },
      results: {
        credentials: [],
        verificationResults: {},
        aggregatedScores: {
          professionalScore: 0,
          developerScore: 0,
          financialScore: 0,
          overallTrustScore: 0
        },
        insights: []
      },
      errors: [],
      metadata: {
        totalSteps: workflow.steps.length,
        completedSteps: 0,
        estimatedTimeRemaining: workflow.estimatedDuration * 60
      }
    };

    this.executions.set(executionId, execution);

    // Start execution asynchronously
    this.runWorkflowExecution(execution, workflow, request);

    return execution;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status === 'completed' || execution.status === 'failed') {
      return false;
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date().toISOString();
    console.log(`🛑 Workflow execution cancelled: ${executionId}`);
    return true;
  }

  /**
   * Run workflow execution (internal)
   */
  private async runWorkflowExecution(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    request: WorkflowExecutionRequest
  ): Promise<void> {
    try {
      execution.status = 'running';
      console.log(`▶️ Running workflow: ${workflow.name}`);

      if (workflow.parallelExecution) {
        await this.executeStepsInParallel(execution, workflow, request);
      } else {
        await this.executeStepsSequentially(execution, workflow, request);
      }

      // Generate final insights
      execution.results.insights = this.generateWorkflowInsights(execution.results);

      // Calculate aggregated scores
      execution.results.aggregatedScores = this.calculateAggregatedScores(execution.results);

      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      execution.metadata.actualDuration = Math.floor(
        (new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000 / 60
      );

      console.log(`✅ Workflow completed successfully: ${workflow.name}`);

    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date().toISOString();
      execution.errors.push({
        stepId: 'workflow',
        stepName: 'Workflow Execution',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        recoverable: false
      });

      errorService.logError(`❌ Workflow failed: ${workflow.name}`, error);
    }
  }

  /**
   * Execute steps sequentially
   */
  private async executeStepsSequentially(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    request: WorkflowExecutionRequest
  ): Promise<void> {
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      execution.progress.currentStep = step.id;
      execution.progress.currentStepName = step.name;
      execution.progress.overallProgress = Math.floor((i / workflow.steps.length) * 100);
      execution.progress.message = `Executing: ${step.name}`;

      try {
        await this.executeStep(step, execution, request);
        execution.progress.completedSteps.push(step.id);
        execution.metadata.completedSteps++;
      } catch (error) {
        if (!step.optional) {
          throw error;
        }
        execution.progress.failedSteps.push(step.id);
      }
    }

    execution.progress.overallProgress = 100;
    execution.progress.message = 'Workflow completed successfully';
  }

  /**
   * Execute steps in parallel (mock implementation)
   */
  private async executeStepsInParallel(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    request: WorkflowExecutionRequest
  ): Promise<void> {
    // For now, execute sequentially but with parallel simulation
    // In a real implementation, this would handle dependency graphs and true parallelism
    await this.executeStepsSequentially(execution, workflow, request);
  }

  /**
   * Execute individual step
   */
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    request: WorkflowExecutionRequest
  ): Promise<void> {
    console.log(`🔧 Executing step: ${step.name}`);

    switch (step.service) {
      case 'linkedin':
        await this.executeLinkedInStep(step, execution, request);
        break;
      case 'github':
        await this.executeGitHubStep(step, execution, request);
        break;
      case 'experian':
        await this.executeExperianStep(step, execution, request);
        break;
      case 'plaid':
        await this.executePlaidStep(step, execution, request);
        break;
      case 'internal':
        await this.executeInternalStep(step, execution, request);
        break;
      default:
        throw new Error(`Unknown service: ${step.service}`);
    }
  }

  /**
   * Execute LinkedIn step
   */
  private async executeLinkedInStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    request: WorkflowExecutionRequest
  ): Promise<void> {
    if (!request.tokens?.linkedinToken) {
      throw new Error('LinkedIn access token required');
    }

    const linkedinRequest: LinkedInVerificationRequest = {
      accessToken: request.tokens.linkedinToken,
      ...step.config
    };

    const result = await linkedInAdvancedService.performLinkedInVerification(
      linkedinRequest,
      request.userDid
    );

    execution.results.verificationResults.linkedin = result;
    execution.results.credentials.push(...result.credentials);
  }

  /**
   * Execute GitHub step
   */
  private async executeGitHubStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    request: WorkflowExecutionRequest
  ): Promise<void> {
    if (!request.tokens?.githubToken) {
      throw new Error('GitHub access token required');
    }

    const githubRequest: GitHubVerificationRequest = {
      accessToken: request.tokens.githubToken,
      ...step.config
    };

    const result = await gitHubAdvancedService.performGitHubVerification(
      githubRequest,
      request.userDid
    );

    execution.results.verificationResults.github = result;
    execution.results.credentials.push(...result.credentials);
  }

  /**
   * Execute Experian step
   */
  private async executeExperianStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    request: WorkflowExecutionRequest
  ): Promise<void> {
    const experianRequest: CreditScoreRequest = {
      ssn: request.config.ssn || 'mock-ssn',
      firstName: request.config.firstName || 'Mock',
      lastName: request.config.lastName || 'User',
      dateOfBirth: request.config.dateOfBirth || '1990-01-01',
      address: request.config.address || {
        street: '123 Mock St',
        city: 'Mock City',
        state: 'CA',
        zipCode: '12345'
      }
    };

    const result = await experianService.performCreditVerification(
      experianRequest,
      request.userDid
    );

    execution.results.verificationResults.experian = result;
    execution.results.credentials.push(result.credential);
  }

  /**
   * Execute Plaid step
   */
  private async executePlaidStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    request: WorkflowExecutionRequest
  ): Promise<void> {
    if (!request.tokens?.plaidAccessToken) {
      throw new Error('Plaid access token required');
    }

    const plaidRequest: PlaidVerificationRequest = {
      accessToken: request.tokens.plaidAccessToken,
      ...step.config
    };

    const result = await plaidService.performPeriodicVerification(request.userDid);

    execution.results.verificationResults.plaid = result;
    execution.results.credentials.push(...result.credentials);
  }

  /**
   * Execute internal step (data processing, credential generation, etc.)
   */
  private async executeInternalStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    request: WorkflowExecutionRequest
  ): Promise<void> {
    // Simulate internal processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`✅ Internal step completed: ${step.name}`);
  }

  /**
   * Generate workflow insights
   */
  private generateWorkflowInsights(results: WorkflowResults): WorkflowInsight[] {
    const insights: WorkflowInsight[] = [];

    // Professional insights
    if (results.verificationResults.linkedin) {
      const linkedin = results.verificationResults.linkedin;
      if (linkedin.metadata.verificationScore > 0.8) {
        insights.push({
          type: 'strength',
          category: 'professional',
          title: 'Strong Professional Profile',
          description: 'Your LinkedIn profile demonstrates excellent professional credentials.',
          impact: 'high',
          actionable: false
        });
      }
    }

    // Developer insights
    if (results.verificationResults.github) {
      const github = results.verificationResults.github;
      if (github.metadata.skillLevel === 'Expert') {
        insights.push({
          type: 'strength',
          category: 'technical',
          title: 'Expert Developer Status',
          description: 'Your GitHub activity indicates expert-level development skills.',
          impact: 'high',
          actionable: false
        });
      }
    }

    return insights;
  }

  /**
   * Calculate aggregated scores
   */
  private calculateAggregatedScores(results: WorkflowResults): WorkflowResults['aggregatedScores'] {
    let professionalScore = 0;
    let developerScore = 0;
    let financialScore = 0;

    if (results.verificationResults.linkedin) {
      professionalScore = results.verificationResults.linkedin.metadata.verificationScore * 100;
    }

    if (results.verificationResults.github) {
      developerScore = results.verificationResults.github.metadata.developerScore;
    }

    if (results.verificationResults.experian) {
      financialScore = results.verificationResults.experian.metadata.verificationScore * 100;
    }

    const overallTrustScore = (professionalScore + developerScore + financialScore) / 3;

    return {
      professionalScore,
      developerScore,
      financialScore,
      overallTrustScore
    };
  }
}

// Export singleton instance
export const advancedWorkflowService = AdvancedWorkflowService.getInstance();