/**
 * Automation System Initializer for PersonaPass
 * Activates the complete automated API integration system
 */

import { UnifiedAutomationManager } from './UnifiedAutomationManager';
import { RapidAPIConnector } from './RapidAPIConnector';
import { AutomatedAPIIntegrator } from './AutomatedAPIIntegrator';
import { WorkflowAutomationEngine } from './WorkflowAutomationEngine';
import { errorService } from "@/services/errorService";

export interface AutomationInitResult {
  success: boolean;
  rapidApiConnected: boolean;
  apisDiscovered: number;
  apisIntegrated: number;
  workflowsCreated: number;
  error?: string;
  recommendations: string[];
}

export class AutomationSystemInit {
  private static initialized = false;
  private static initResult: AutomationInitResult | null = null;

  /**
   * Initialize the complete automation system
   */
  static async initialize(): Promise<AutomationInitResult> {
    if (this.initialized && this.initResult) {
      return this.initResult;
    }

    console.log('🚀 PersonaPass Automation System - INITIALIZING...');
    console.log('🔑 RapidAPI Key:', process.env.VITE_RAPIDAPI_KEY ? 'CONFIGURED ✅' : 'MISSING ❌');

    const result: AutomationInitResult = {
      success: false,
      rapidApiConnected: false,
      apisDiscovered: 0,
      apisIntegrated: 0,
      workflowsCreated: 0,
      recommendations: []
    };

    try {
      // Step 1: Initialize core services
      console.log('📡 Initializing core automation services...');
      const automationManager = UnifiedAutomationManager.getInstance();
      const rapidApiConnector = RapidAPIConnector.getInstance();
      const apiIntegrator = AutomatedAPIIntegrator.getInstance();
      const workflowEngine = WorkflowAutomationEngine.getInstance();

      // Step 2: Test RapidAPI connectivity
      console.log('🔌 Testing RapidAPI connectivity...');
      try {
        const identityAPIs = await rapidApiConnector.getIdentityVerificationAPIs();
        result.rapidApiConnected = identityAPIs.length > 0;
        console.log(`✅ RapidAPI connected - Found ${identityAPIs.length} identity APIs`);
      } catch (error) {
        console.log('⚠️ RapidAPI connection failed - using fallback APIs');
        result.rapidApiConnected = false;
      }

      // Step 3: Initialize automation manager
      console.log('⚙️ Initializing automation manager...');
      await automationManager.initialize();

      // Step 4: Auto-discover and integrate APIs
      console.log('🔍 Starting automated API discovery...');
      const discoveryResult = await automationManager.autoDiscoverAndIntegrateAPIs();
      
      result.apisDiscovered = discoveryResult.discovered.length;
      result.apisIntegrated = discoveryResult.integrated.length;

      console.log(`📊 Discovery Results:`);
      console.log(`   • Discovered: ${result.apisDiscovered} APIs`);
      console.log(`   • Integrated: ${result.apisIntegrated} APIs`);
      console.log(`   • Failed: ${discoveryResult.failed.length} APIs`);

      // Step 5: Setup popular workflows
      console.log('🔄 Setting up automated workflows...');
      const workflows = await automationManager.setupPopularWorkflows();
      result.workflowsCreated = workflows.length;

      console.log(`✅ Created ${result.workflowsCreated} automated workflows:`);
      workflows.forEach(workflow => {
        console.log(`   • ${workflow.name}`);
      });

      // Step 6: Generate recommendations
      result.recommendations = await this.generateStartupRecommendations(result);

      result.success = true;
      console.log('🎉 AUTOMATION SYSTEM READY!');

    } catch (error) {
      result.error = (error as Error).message;
      errorService.logError('❌ Automation system initialization failed:', error);
    }

    this.initResult = result;
    this.initialized = true;
    
    return result;
  }

  /**
   * Quick test of the automation system
   */
  static async quickTest(): Promise<{
    automationWorking: boolean;
    sampleDiscovery: any[];
    sampleWorkflow: any;
    error?: string;
  }> {
    try {
      console.log('🧪 Running automation system quick test...');

      const automationManager = UnifiedAutomationManager.getInstance();
      const rapidApiConnector = RapidAPIConnector.getInstance();

      // Test 1: API Discovery
      console.log('🔍 Testing API discovery...');
      const identityAPIs = await rapidApiConnector.getIdentityVerificationAPIs();
      const financialAPIs = await rapidApiConnector.getFinancialVerificationAPIs();
      
      const sampleDiscovery = [...identityAPIs.slice(0, 2), ...financialAPIs.slice(0, 2)];

      // Test 2: Workflow Templates
      console.log('⚙️ Testing workflow templates...');
      const workflowEngine = WorkflowAutomationEngine.getInstance();
      const templates = workflowEngine.getWorkflowTemplates();
      const sampleWorkflow = templates[0];

      console.log('✅ Quick test completed successfully!');
      console.log(`   • Found ${identityAPIs.length} identity APIs`);
      console.log(`   • Found ${financialAPIs.length} financial APIs`);
      console.log(`   • Found ${templates.length} workflow templates`);

      return {
        automationWorking: true,
        sampleDiscovery,
        sampleWorkflow
      };
    } catch (error) {
      errorService.logError('❌ Quick test failed:', error);
      return {
        automationWorking: false,
        sampleDiscovery: [],
        sampleWorkflow: null,
        error: (error as Error).message
      };
    }
  }

  /**
   * Run a live API integration demo
   */
  static async runLiveDemo(apiType: 'identity' | 'financial' | 'communication'): Promise<{
    success: boolean;
    apiConnected: string;
    vcGenerated: boolean;
    workflowExecuted: boolean;
    results: any;
    error?: string;
  }> {
    console.log(`🎬 Running live ${apiType} integration demo...`);

    try {
      const rapidApiConnector = RapidAPIConnector.getInstance();
      const automationManager = UnifiedAutomationManager.getInstance();

      // Step 1: Get sample API
      let apis: any[] = [];
      switch (apiType) {
        case 'identity':
          apis = await rapidApiConnector.getIdentityVerificationAPIs();
          break;
        case 'financial':
          apis = await rapidApiConnector.getFinancialVerificationAPIs();
          break;
        case 'communication':
          apis = await rapidApiConnector.getCommunicationAPIs();
          break;
      }

      if (apis.length === 0) {
        throw new Error(`No ${apiType} APIs found`);
      }

      const testAPI = apis[0];
      console.log(`🔌 Testing connection to ${testAPI.name}...`);

      // Step 2: Test API connection
      const connectionTest = await rapidApiConnector.testAPIConnection(testAPI.id);
      
      // Step 3: Mock workflow execution
      const mockWorkflowData = {
        apiType,
        testMode: true,
        subjectDid: 'did:persona:demo-user'
      };

      const workflowResult = await automationManager.executeVerificationWorkflow(
        apiType as any,
        mockWorkflowData
      );

      console.log(`✅ Demo completed for ${testAPI.name}`);

      return {
        success: true,
        apiConnected: testAPI.name,
        vcGenerated: workflowResult.credentials?.length > 0,
        workflowExecuted: workflowResult.success,
        results: {
          api: testAPI,
          connectionTest,
          workflowResult
        }
      };
    } catch (error) {
      errorService.logError(`❌ ${apiType} demo failed:`, error);
      return {
        success: false,
        apiConnected: '',
        vcGenerated: false,
        workflowExecuted: false,
        results: null,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get current automation status
   */
  static async getStatus(): Promise<{
    initialized: boolean;
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
    stats: any;
    nextSteps: string[];
  }> {
    if (!this.initialized) {
      return {
        initialized: false,
        systemHealth: 'poor',
        stats: null,
        nextSteps: ['Run initialization first']
      };
    }

    try {
      const automationManager = UnifiedAutomationManager.getInstance();
      const status = await automationManager.getAutomationStatus();
      const report = await automationManager.generateAutomationReport();

      // Calculate system health
      let systemHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
      if (status.integratedAPIs >= 10 && status.successRate >= 0.9) {
        systemHealth = 'excellent';
      } else if (status.integratedAPIs >= 5 && status.successRate >= 0.8) {
        systemHealth = 'good';
      } else if (status.integratedAPIs >= 2 && status.successRate >= 0.6) {
        systemHealth = 'fair';
      }

      const nextSteps = this.generateNextSteps(status, report);

      return {
        initialized: true,
        systemHealth,
        stats: { status, report },
        nextSteps
      };
    } catch (error) {
      return {
        initialized: true,
        systemHealth: 'poor',
        stats: null,
        nextSteps: ['Check system configuration and retry']
      };
    }
  }

  // Private helper methods
  private static async generateStartupRecommendations(result: AutomationInitResult): Promise<string[]> {
    const recommendations: string[] = [];

    if (!result.rapidApiConnected) {
      recommendations.push('🔑 Verify RapidAPI key is correct and has proper permissions');
    }

    if (result.apisDiscovered < 10) {
      recommendations.push('🔍 Expand API discovery categories for better coverage');
    }

    if (result.apisIntegrated < result.apisDiscovered * 0.5) {
      recommendations.push('⚡ Review auto-integration settings to integrate more APIs');
    }

    if (result.workflowsCreated < 3) {
      recommendations.push('🔄 Set up additional workflow templates for comprehensive automation');
    }

    // Success recommendations
    if (result.success) {
      recommendations.push('🎯 Start with identity verification workflow for immediate value');
      recommendations.push('💰 Add financial verification APIs for banking use cases');
      recommendations.push('📱 Configure Twilio for phone verification workflows');
    }

    return recommendations;
  }

  private static generateNextSteps(status: any, report: any): string[] {
    const steps: string[] = [];

    if (status.integratedAPIs < 5) {
      steps.push('Integrate more high-value APIs for comprehensive coverage');
    }

    if (status.activeWorkflows === 0) {
      steps.push('Activate verification workflows for automated processing');
    }

    if (status.successRate < 0.8) {
      steps.push('Review and optimize failing workflow steps');
    }

    steps.push('Monitor automation performance and expand based on usage');
    steps.push('Consider adding custom workflow templates for specific use cases');

    return steps;
  }
}

export default AutomationSystemInit;