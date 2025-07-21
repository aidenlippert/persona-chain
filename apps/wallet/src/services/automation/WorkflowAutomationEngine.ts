/**
 * Workflow Automation Engine for PersonaPass
 * Zapier-like automation for API integrations and credential workflows
 */

import { AutomatedAPIIntegrator, DiscoveredAPI } from './AutomatedAPIIntegrator';
import { RapidAPIConnector } from './RapidAPIConnector';
import { ApiIntegrationOrchestrator } from '../api/ApiIntegrationOrchestrator';
import { VCGenerationFramework } from '../api/vc/VCGenerationFramework';

export interface WorkflowTrigger {
  id: string;
  type: 'webhook' | 'schedule' | 'manual' | 'api_event' | 'user_action';
  config: {
    url?: string;
    cron?: string;
    event?: string;
    conditions?: Record<string, any>;
  };
  active: boolean;
}

export interface WorkflowAction {
  id: string;
  type: 'api_call' | 'generate_vc' | 'send_notification' | 'create_zk_proof' | 'verify_credential';
  config: {
    apiId?: string;
    endpoint?: string;
    method?: string;
    data?: any;
    template?: string;
    recipient?: string;
    conditions?: Record<string, any>;
  };
  retries: number;
  timeout: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  action: WorkflowAction;
  dependencies: string[];
  conditions?: Record<string, any>;
  outputs: string[];
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  isActive: boolean;
  created: number;
  lastRun?: number;
  runCount: number;
  successRate: number;
  avgExecutionTime: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  stepResults: Map<string, {
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: any;
    error?: string;
    executionTime: number;
  }>;
  totalExecutionTime: number;
  error?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  workflow: Omit<AutomationWorkflow, 'id' | 'created' | 'lastRun' | 'runCount' | 'successRate' | 'avgExecutionTime'>;
  usageCount: number;
  rating: number;
}

export class WorkflowAutomationEngine {
  private static instance: WorkflowAutomationEngine;
  private workflows: Map<string, AutomationWorkflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  
  private apiIntegrator: AutomatedAPIIntegrator;
  private rapidApiConnector: RapidAPIConnector;
  private orchestrator: ApiIntegrationOrchestrator;
  private vcFramework: VCGenerationFramework;

  private constructor() {
    this.apiIntegrator = AutomatedAPIIntegrator.getInstance();
    this.rapidApiConnector = RapidAPIConnector.getInstance();
    this.orchestrator = ApiIntegrationOrchestrator.getInstance();
    this.vcFramework = VCGenerationFramework.getInstance();
    
    this.loadDefaultTemplates();
  }

  static getInstance(): WorkflowAutomationEngine {
    if (!WorkflowAutomationEngine.instance) {
      WorkflowAutomationEngine.instance = new WorkflowAutomationEngine();
    }
    return WorkflowAutomationEngine.instance;
  }

  /**
   * Create automated workflow from template
   */
  async createWorkflowFromTemplate(
    templateId: string, 
    customConfig?: Partial<AutomationWorkflow>
  ): Promise<AutomationWorkflow> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const workflowId = this.generateWorkflowId();
    const workflow: AutomationWorkflow = {
      ...template.workflow,
      id: workflowId,
      created: Date.now(),
      runCount: 0,
      successRate: 0,
      avgExecutionTime: 0,
      ...customConfig
    };

    this.workflows.set(workflowId, workflow);
    
    // Update template usage
    template.usageCount++;
    
    return workflow;
  }

  /**
   * Execute workflow automatically
   */
  async executeWorkflow(workflowId: string, triggerData?: any): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = this.generateExecutionId();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      startTime: Date.now(),
      stepResults: new Map(),
      totalExecutionTime: 0
    };

    this.executions.set(executionId, execution);

    try {
      // Execute workflow steps in dependency order
      const sortedSteps = this.sortStepsByDependencies(workflow.steps);
      
      for (const step of sortedSteps) {
        const stepResult = await this.executeWorkflowStep(step, execution, triggerData);
        execution.stepResults.set(step.id, stepResult);
        
        if (stepResult.status === 'failed') {
          execution.status = 'failed';
          execution.error = stepResult.error;
          break;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
      }

      execution.endTime = Date.now();
      execution.totalExecutionTime = execution.endTime - execution.startTime;

      // Update workflow statistics
      this.updateWorkflowStats(workflow, execution);

    } catch (error) {
      execution.status = 'failed';
      execution.error = (error as Error).message;
      execution.endTime = Date.now();
      execution.totalExecutionTime = execution.endTime - execution.startTime;
    }

    this.executions.set(executionId, execution);
    return execution;
  }

  /**
   * Execute individual workflow step
   */
  private async executeWorkflowStep(
    step: WorkflowStep, 
    execution: WorkflowExecution, 
    contextData?: any
  ): Promise<any> {
    const stepStart = Date.now();
    
    try {
      let result: any;

      switch (step.action.type) {
        case 'api_call':
          result = await this.executeApiCall(step.action, contextData);
          break;
        case 'generate_vc':
          result = await this.executeGenerateVC(step.action, contextData);
          break;
        case 'send_notification':
          result = await this.executeSendNotification(step.action, contextData);
          break;
        case 'create_zk_proof':
          result = await this.executeCreateZKProof(step.action, contextData);
          break;
        case 'verify_credential':
          result = await this.executeVerifyCredential(step.action, contextData);
          break;
        default:
          throw new Error(`Unknown action type: ${step.action.type}`);
      }

      return {
        status: 'completed',
        output: result,
        executionTime: Date.now() - stepStart
      };
    } catch (error) {
      return {
        status: 'failed',
        error: (error as Error).message,
        executionTime: Date.now() - stepStart
      };
    }
  }

  /**
   * Execute API call action
   */
  private async executeApiCall(action: WorkflowAction, contextData?: any): Promise<any> {
    if (!action.config.apiId) {
      throw new Error('API ID is required for api_call action');
    }

    // Use the orchestrator to handle the API call
    const result = await this.orchestrator.startVerification({
      type: action.config.endpoint as any,
      provider: action.config.apiId,
      data: { ...action.config.data, ...contextData },
      subjectDid: contextData?.subjectDid || 'did:persona:unknown'
    });

    if (!result.success) {
      throw new Error(result.error || 'API call failed');
    }

    return result;
  }

  /**
   * Execute VC generation action
   */
  private async executeGenerateVC(action: WorkflowAction, contextData?: any): Promise<any> {
    if (!action.config.template) {
      throw new Error('Template is required for generate_vc action');
    }

    const template = this.vcFramework.getTemplate(action.config.template);
    if (!template) {
      throw new Error(`VC template not found: ${action.config.template}`);
    }

    // Generate VC using framework
    const vc = await this.vcFramework.generateVC(
      { ...action.config.data, ...contextData },
      {
        template,
        mappings: [], // Would be configured in template
        issuer: {
          id: 'did:persona:automation-engine',
          name: 'PersonaPass Automation',
          url: 'https://personapass.org/automation'
        }
      },
      contextData?.subjectDid || 'did:persona:unknown'
    );

    return vc;
  }

  /**
   * Execute notification action
   */
  private async executeSendNotification(action: WorkflowAction, contextData?: any): Promise<any> {
    // Mock notification - in production would integrate with notification service
    console.log(`Notification sent to ${action.config.recipient}:`, action.config.data);
    return { success: true, sentAt: new Date().toISOString() };
  }

  /**
   * Execute ZK proof creation action
   */
  private async executeCreateZKProof(action: WorkflowAction, contextData?: any): Promise<any> {
    // This would integrate with the ZK proof infrastructure
    return { proofId: 'zk_proof_' + Date.now(), created: true };
  }

  /**
   * Execute credential verification action
   */
  private async executeVerifyCredential(action: WorkflowAction, contextData?: any): Promise<any> {
    // Mock verification - in production would verify credential signatures
    return { verified: true, timestamp: new Date().toISOString() };
  }

  /**
   * Create popular workflow templates
   */
  private loadDefaultTemplates(): void {
    // Complete Identity Verification Workflow
    this.templates.set('complete_identity_verification', {
      id: 'complete_identity_verification',
      name: 'Complete Identity Verification',
      description: 'Full identity verification with government ID, phone, and address verification',
      category: 'identity_verification',
      usageCount: 0,
      rating: 4.8,
      workflow: {
        name: 'Complete Identity Verification',
        description: 'Automated identity verification workflow',
        trigger: {
          id: 'manual_trigger',
          type: 'manual',
          config: {},
          active: true
        },
        steps: [
          {
            id: 'verify_phone',
            name: 'Verify Phone Number',
            action: {
              id: 'phone_verification',
              type: 'api_call',
              config: {
                apiId: 'twilio',
                endpoint: 'phone',
                method: 'POST'
              },
              retries: 3,
              timeout: 30000
            },
            dependencies: [],
            outputs: ['phoneVerified', 'phoneCredential']
          },
          {
            id: 'verify_address',
            name: 'Verify Address',
            action: {
              id: 'address_verification',
              type: 'api_call',
              config: {
                apiId: 'usps',
                endpoint: 'address',
                method: 'POST'
              },
              retries: 2,
              timeout: 20000
            },
            dependencies: [],
            outputs: ['addressVerified', 'addressCredential']
          },
          {
            id: 'verify_identity',
            name: 'Verify Government ID',
            action: {
              id: 'id_verification',
              type: 'api_call',
              config: {
                apiId: 'trulioo',
                endpoint: 'government_id',
                method: 'POST'
              },
              retries: 2,
              timeout: 45000
            },
            dependencies: ['verify_phone', 'verify_address'],
            outputs: ['idVerified', 'idCredential']
          },
          {
            id: 'create_bundle',
            name: 'Create Identity Bundle',
            action: {
              id: 'bundle_creation',
              type: 'create_zk_proof',
              config: {
                template: 'identity_bundle'
              },
              retries: 1,
              timeout: 10000
            },
            dependencies: ['verify_identity'],
            outputs: ['identityBundle']
          }
        ],
        isActive: true
      }
    });

    // Financial Verification Workflow
    this.templates.set('financial_verification', {
      id: 'financial_verification',
      name: 'Financial Verification',
      description: 'Complete financial verification with bank accounts, income, and credit',
      category: 'financial_verification',
      usageCount: 0,
      rating: 4.6,
      workflow: {
        name: 'Financial Verification',
        description: 'Automated financial verification workflow',
        trigger: {
          id: 'manual_trigger',
          type: 'manual',
          config: {},
          active: true
        },
        steps: [
          {
            id: 'connect_bank',
            name: 'Connect Bank Account',
            action: {
              id: 'bank_connection',
              type: 'api_call',
              config: {
                apiId: 'plaid',
                endpoint: 'bank_account',
                method: 'POST'
              },
              retries: 3,
              timeout: 60000
            },
            dependencies: [],
            outputs: ['bankConnected', 'accountData']
          },
          {
            id: 'verify_income',
            name: 'Verify Income',
            action: {
              id: 'income_verification',
              type: 'api_call',
              config: {
                apiId: 'plaid',
                endpoint: 'income',
                method: 'POST'
              },
              retries: 2,
              timeout: 30000
            },
            dependencies: ['connect_bank'],
            outputs: ['incomeVerified', 'incomeData']
          },
          {
            id: 'check_credit',
            name: 'Check Credit Score',
            action: {
              id: 'credit_check',
              type: 'api_call',
              config: {
                apiId: 'experian',
                endpoint: 'credit_score',
                method: 'POST'
              },
              retries: 2,
              timeout: 45000
            },
            dependencies: [],
            outputs: ['creditScore', 'creditReport']
          },
          {
            id: 'generate_financial_vc',
            name: 'Generate Financial VC',
            action: {
              id: 'financial_vc',
              type: 'generate_vc',
              config: {
                template: 'FinancialVerificationCredential'
              },
              retries: 1,
              timeout: 10000
            },
            dependencies: ['verify_income', 'check_credit'],
            outputs: ['financialCredential']
          }
        ],
        isActive: true
      }
    });

    // Professional Verification Workflow
    this.templates.set('professional_verification', {
      id: 'professional_verification',
      name: 'Professional Verification',
      description: 'Employment, education, and professional credentials verification',
      category: 'professional_verification',
      usageCount: 0,
      rating: 4.5,
      workflow: {
        name: 'Professional Verification',
        description: 'Automated professional verification workflow',
        trigger: {
          id: 'manual_trigger',
          type: 'manual',
          config: {},
          active: true
        },
        steps: [
          {
            id: 'verify_employment',
            name: 'Verify Employment',
            action: {
              id: 'employment_verification',
              type: 'api_call',
              config: {
                apiId: 'workday',
                endpoint: 'employment',
                method: 'POST'
              },
              retries: 2,
              timeout: 30000
            },
            dependencies: [],
            outputs: ['employmentVerified', 'employmentData']
          },
          {
            id: 'verify_education',
            name: 'Verify Education',
            action: {
              id: 'education_verification',
              type: 'api_call',
              config: {
                apiId: 'clearinghouse',
                endpoint: 'education',
                method: 'POST'
              },
              retries: 2,
              timeout: 45000
            },
            dependencies: [],
            outputs: ['educationVerified', 'degreeData']
          },
          {
            id: 'create_professional_bundle',
            name: 'Create Professional Bundle',
            action: {
              id: 'professional_bundle',
              type: 'create_zk_proof',
              config: {
                template: 'professional_bundle'
              },
              retries: 1,
              timeout: 10000
            },
            dependencies: ['verify_employment', 'verify_education'],
            outputs: ['professionalBundle']
          }
        ],
        isActive: true
      }
    });
  }

  /**
   * Get available workflow templates
   */
  getWorkflowTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values()).sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get workflow templates by category
   */
  getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.category === category)
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Get workflow execution status
   */
  getExecutionStatus(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Get all workflows
   */
  getWorkflows(): AutomationWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): AutomationWorkflow | null {
    return this.workflows.get(workflowId) || null;
  }

  // Private helper methods
  private sortStepsByDependencies(steps: WorkflowStep[]): WorkflowStep[] {
    const sorted: WorkflowStep[] = [];
    const remaining = [...steps];
    
    while (remaining.length > 0) {
      const canExecute = remaining.filter(step => 
        step.dependencies.every(dep => sorted.find(s => s.id === dep))
      );
      
      if (canExecute.length === 0) {
        throw new Error('Circular dependency detected in workflow steps');
      }
      
      sorted.push(...canExecute);
      canExecute.forEach(step => {
        const index = remaining.indexOf(step);
        remaining.splice(index, 1);
      });
    }
    
    return sorted;
  }

  private updateWorkflowStats(workflow: AutomationWorkflow, execution: WorkflowExecution): void {
    workflow.runCount++;
    workflow.lastRun = execution.startTime;
    
    const isSuccess = execution.status === 'completed';
    workflow.successRate = ((workflow.successRate * (workflow.runCount - 1)) + (isSuccess ? 1 : 0)) / workflow.runCount;
    workflow.avgExecutionTime = ((workflow.avgExecutionTime * (workflow.runCount - 1)) + execution.totalExecutionTime) / workflow.runCount;
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default WorkflowAutomationEngine;