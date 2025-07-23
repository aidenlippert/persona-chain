/**
 * Unified Automation Manager for PersonaPass
 * Central control for all automated API integrations and workflows
 */

import { AutomatedAPIIntegrator, DiscoveredAPI } from './AutomatedAPIIntegrator';
import { RapidAPIConnector, RapidAPIMetadata } from './RapidAPIConnector';
import { WorkflowAutomationEngine, AutomationWorkflow, WorkflowTemplate } from './WorkflowAutomationEngine';
import { ApiIntegrationOrchestrator } from '../api/ApiIntegrationOrchestrator';
import { errorService } from "@/services/errorService";

export interface AutomationConfig {
  enableAutoDiscovery: boolean;
  autoIntegrateAPIs: boolean;
  enableWorkflowAutomation: boolean;
  maxConcurrentIntegrations: number;
  retryAttempts: number;
  timeoutMs: number;
  categories: string[];
  regions: string[];
}

export interface AutomationStatus {
  discoveredAPIs: number;
  integratedAPIs: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  lastUpdate: number;
}

export interface AutomationReport {
  status: AutomationStatus;
  apisByCategory: Record<string, number>;
  workflowsByCategory: Record<string, number>;
  recentExecutions: Array<{
    workflowName: string;
    status: string;
    executionTime: number;
    timestamp: number;
  }>;
  recommendations: string[];
}

export class UnifiedAutomationManager {
  private static instance: UnifiedAutomationManager;
  private config: AutomationConfig;
  
  // Core automation services
  private apiIntegrator: AutomatedAPIIntegrator;
  private rapidApiConnector: RapidAPIConnector;
  private workflowEngine: WorkflowAutomationEngine;
  private orchestrator: ApiIntegrationOrchestrator;

  // State tracking
  private isRunning: boolean = false;
  private lastDiscovery: number = 0;
  private discoveryInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.config = this.getDefaultConfig();
    
    // Initialize automation services
    this.apiIntegrator = AutomatedAPIIntegrator.getInstance();
    this.rapidApiConnector = RapidAPIConnector.getInstance();
    this.workflowEngine = WorkflowAutomationEngine.getInstance();
    this.orchestrator = ApiIntegrationOrchestrator.getInstance();
  }

  static getInstance(): UnifiedAutomationManager {
    if (!UnifiedAutomationManager.instance) {
      UnifiedAutomationManager.instance = new UnifiedAutomationManager();
    }
    return UnifiedAutomationManager.instance;
  }

  /**
   * Initialize automation system
   */
  async initialize(): Promise<void> {
    console.log('🤖 Initializing PersonaPass Automation System...');
    
    try {
      // Start periodic API discovery
      if (this.config.enableAutoDiscovery) {
        await this.startAutoDiscovery();
      }

      // Initialize workflow automation
      if (this.config.enableWorkflowAutomation) {
        await this.initializeWorkflows();
      }

      this.isRunning = true;
      console.log('✅ Automation system initialized successfully');
    } catch (error) {
      errorService.logError('❌ Failed to initialize automation system:', error);
      throw error;
    }
  }

  /**
   * Discover and auto-integrate APIs based on verification needs
   */
  async autoDiscoverAndIntegrateAPIs(): Promise<{
    discovered: DiscoveredAPI[];
    integrated: string[];
    failed: string[];
  }> {
    console.log('🔍 Starting automated API discovery...');

    try {
      // Discover APIs using our integrator
      const discoveredAPIs = await this.apiIntegrator.discoverAPIs({
        categories: this.config.categories,
        verificationTypes: [
          'government_id', 'phone', 'address', 'bank_account', 
          'income', 'employment', 'education', 'credit_score'
        ],
        regions: this.config.regions,
        confidenceThreshold: 0.8
      });

      console.log(`📡 Discovered ${discoveredAPIs.length} APIs`);

      // Auto-integrate high-confidence APIs
      const integrated: string[] = [];
      const failed: string[] = [];

      if (this.config.autoIntegrateAPIs) {
        const highConfidenceAPIs = discoveredAPIs
          .filter(api => api.reliabilityScore >= 0.85)
          .slice(0, this.config.maxConcurrentIntegrations);

        for (const api of highConfidenceAPIs) {
          try {
            const result = await this.apiIntegrator.autoIntegrateAPI(api.id);
            if (result.success) {
              integrated.push(api.id);
              console.log(`✅ Integrated ${api.name}`);
            } else {
              failed.push(api.id);
              console.log(`❌ Failed to integrate ${api.name}: ${result.error}`);
            }
          } catch (error) {
            failed.push(api.id);
            console.log(`❌ Error integrating ${api.name}:`, error);
          }
        }
      }

      this.lastDiscovery = Date.now();

      return {
        discovered: discoveredAPIs,
        integrated,
        failed
      };
    } catch (error) {
      errorService.logError('Failed to discover APIs:', error);
      return { discovered: [], integrated: [], failed: [] };
    }
  }

  /**
   * Setup popular verification workflows automatically
   */
  async setupPopularWorkflows(): Promise<AutomationWorkflow[]> {
    console.log('⚙️ Setting up popular verification workflows...');

    const workflows: AutomationWorkflow[] = [];
    const popularTemplates = [
      'complete_identity_verification',
      'financial_verification',
      'professional_verification'
    ];

    for (const templateId of popularTemplates) {
      try {
        const workflow = await this.workflowEngine.createWorkflowFromTemplate(templateId, {
          isActive: true
        });
        workflows.push(workflow);
        console.log(`✅ Created workflow: ${workflow.name}`);
      } catch (error) {
        console.log(`❌ Failed to create workflow from template ${templateId}:`, error);
      }
    }

    return workflows;
  }

  /**
   * Execute verification workflow automatically
   */
  async executeVerificationWorkflow(
    workflowType: 'identity' | 'financial' | 'professional',
    userData: any
  ): Promise<{
    success: boolean;
    executionId: string;
    credentials?: any[];
    error?: string;
  }> {
    const workflowMap = {
      identity: 'complete_identity_verification',
      financial: 'financial_verification',
      professional: 'professional_verification'
    };

    const templateId = workflowMap[workflowType];
    
    try {
      // Create workflow from template
      const workflow = await this.workflowEngine.createWorkflowFromTemplate(templateId);
      
      // Execute workflow
      const execution = await this.workflowEngine.executeWorkflow(workflow.id, userData);
      
      if (execution.status === 'completed') {
        // Extract credentials from execution results
        const credentials = Array.from(execution.stepResults.values())
          .filter(result => result.output?.credential)
          .map(result => result.output.credential);

        return {
          success: true,
          executionId: execution.id,
          credentials
        };
      } else {
        return {
          success: false,
          executionId: execution.id,
          error: execution.error || 'Workflow execution failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        executionId: '',
        error: (error as Error).message
      };
    }
  }

  /**
   * Get comprehensive automation status
   */
  async getAutomationStatus(): Promise<AutomationStatus> {
    const discoveredAPIs = this.apiIntegrator.getDiscoveredAPIs();
    const integratedAPIs = this.apiIntegrator.getIntegratedAPIs();
    const workflows = this.workflowEngine.getWorkflows();
    
    return {
      discoveredAPIs: discoveredAPIs.length,
      integratedAPIs: integratedAPIs.length,
      activeWorkflows: workflows.filter(w => w.isActive).length,
      totalExecutions: workflows.reduce((sum, w) => sum + w.runCount, 0),
      successRate: workflows.length > 0 
        ? workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length 
        : 0,
      lastUpdate: this.lastDiscovery
    };
  }

  /**
   * Generate comprehensive automation report
   */
  async generateAutomationReport(): Promise<AutomationReport> {
    const status = await this.getAutomationStatus();
    const discoveredAPIs = this.apiIntegrator.getDiscoveredAPIs();
    const workflows = this.workflowEngine.getWorkflows();

    // Count APIs by category
    const apisByCategory: Record<string, number> = {};
    discoveredAPIs.forEach(api => {
      apisByCategory[api.category] = (apisByCategory[api.category] || 0) + 1;
    });

    // Count workflows by category
    const workflowsByCategory: Record<string, number> = {};
    const templates = this.workflowEngine.getWorkflowTemplates();
    templates.forEach(template => {
      workflowsByCategory[template.category] = (workflowsByCategory[template.category] || 0) + 1;
    });

    // Recent executions (mock data)
    const recentExecutions = workflows
      .filter(w => w.lastRun)
      .sort((a, b) => (b.lastRun || 0) - (a.lastRun || 0))
      .slice(0, 10)
      .map(w => ({
        workflowName: w.name,
        status: w.successRate > 0.8 ? 'success' : 'mixed',
        executionTime: w.avgExecutionTime,
        timestamp: w.lastRun || 0
      }));

    // Generate recommendations
    const recommendations = this.generateRecommendations(status, discoveredAPIs, workflows);

    return {
      status,
      apisByCategory,
      workflowsByCategory,
      recentExecutions,
      recommendations
    };
  }

  /**
   * Get available API categories for discovery
   */
  getAvailableCategories(): string[] {
    return [
      'identity_verification',
      'biometric_verification',
      'financial_data',
      'credit_verification',
      'communication',
      'phone_verification',
      'government',
      'education',
      'healthcare',
      'real_estate',
      'employment'
    ];
  }

  /**
   * Get available verification types
   */
  getAvailableVerificationTypes(): string[] {
    return [
      'government_id',
      'phone',
      'address', 
      'bank_account',
      'income',
      'employment',
      'education',
      'credit_score',
      'biometric',
      'document',
      'vaccination',
      'property_ownership'
    ];
  }

  /**
   * Update automation configuration
   */
  updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutomationConfig {
    return { ...this.config };
  }

  // Private methods
  private async startAutoDiscovery(): Promise<void> {
    // Run initial discovery
    await this.autoDiscoverAndIntegrateAPIs();

    // Set up periodic discovery
    setInterval(async () => {
      if (Date.now() - this.lastDiscovery > this.discoveryInterval) {
        await this.autoDiscoverAndIntegrateAPIs();
      }
    }, this.discoveryInterval);
  }

  private async initializeWorkflows(): Promise<void> {
    await this.setupPopularWorkflows();
  }

  private generateRecommendations(
    status: AutomationStatus,
    apis: DiscoveredAPI[],
    workflows: AutomationWorkflow[]
  ): string[] {
    const recommendations: string[] = [];

    // API recommendations
    if (status.discoveredAPIs < 10) {
      recommendations.push('Consider expanding API discovery to more categories for better coverage');
    }

    if (status.integratedAPIs / status.discoveredAPIs < 0.5) {
      recommendations.push('Many discovered APIs are not integrated - review and integrate high-value APIs');
    }

    // Workflow recommendations
    if (status.activeWorkflows === 0) {
      recommendations.push('No active workflows detected - set up automated verification workflows');
    }

    if (status.successRate < 0.8) {
      recommendations.push('Workflow success rate is below 80% - review and optimize failing workflows');
    }

    // Category recommendations
    const highValueCategories = ['identity_verification', 'financial_data', 'communication'];
    const missingCategories = highValueCategories.filter(cat => 
      !apis.some(api => api.category === cat)
    );

    if (missingCategories.length > 0) {
      recommendations.push(`Consider adding APIs for: ${missingCategories.join(', ')}`);
    }

    return recommendations;
  }

  private getDefaultConfig(): AutomationConfig {
    return {
      enableAutoDiscovery: true,
      autoIntegrateAPIs: true,
      enableWorkflowAutomation: true,
      maxConcurrentIntegrations: 5,
      retryAttempts: 3,
      timeoutMs: 30000,
      categories: [
        'identity_verification',
        'financial_data',
        'communication',
        'government',
        'education'
      ],
      regions: ['us', 'global']
    };
  }
}

export default UnifiedAutomationManager;