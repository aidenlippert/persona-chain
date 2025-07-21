/**
 * Automation Dashboard Component for PersonaPass
 * Real-time monitoring and control of automated API integrations
 */

import React, { useState, useEffect } from 'react';
import { notify } from '../../utils/notifications';
import { AutomationSystemInit, AutomationInitResult } from '../../services/automation/AutomationSystemInit';
import { PlaidIntegrationDashboard } from '../financial/PlaidIntegrationDashboard';
import { ExperianCreditDashboard } from '../financial/ExperianCreditDashboard';
import { errorService } from "@/services/errorService";

interface AutomationStats {
  initialized: boolean;
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
  stats: any;
  nextSteps: string[];
}

type DashboardView = 'overview' | 'plaid' | 'experian' | 'apis';

export const AutomationDashboard: React.FC = () => {
  const [initResult, setInitResult] = useState<AutomationInitResult | null>(null);
  const [automationStats, setAutomationStats] = useState<AutomationStats | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [demoResults, setDemoResults] = useState<any>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('overview');

  // Initialize automation system on component mount
  useEffect(() => {
    initializeSystem();
    loadAutomationStats();
  }, []);

  const initializeSystem = async () => {
    setIsInitializing(true);
    try {
      const result = await AutomationSystemInit.initialize();
      setInitResult(result);
    } catch (error) {
      errorService.logError('Failed to initialize automation system:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const loadAutomationStats = async () => {
    try {
      const stats = await AutomationSystemInit.getStatus();
      setAutomationStats(stats);
    } catch (error) {
      errorService.logError('Failed to load automation stats:', error);
    }
  };

  const runQuickTest = async () => {
    try {
      const testResults = await AutomationSystemInit.quickTest();
      notify.info(`Quick Test Results:\n• APIs Working: ${testResults.automationWorking}\n• Sample APIs: ${testResults.sampleDiscovery.length}\n• Workflows: ${testResults.sampleWorkflow ? 'Ready' : 'None'}`);
    } catch (error) {
      notify.error(`Quick test failed: ${error}`);
    }
  };

  const runLiveDemo = async (apiType: 'identity' | 'financial' | 'communication') => {
    setIsRunningDemo(true);
    try {
      const results = await AutomationSystemInit.runLiveDemo(apiType);
      setDemoResults(results);
    } catch (error) {
      errorService.logError(`Demo failed:`, error);
    } finally {
      setIsRunningDemo(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">🤖 Automation Dashboard</h1>
        <p className="text-blue-100">Automated API Integration System - 40,000+ APIs Available</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-4 rounded-lg shadow-sm border">
        {[
          { id: 'overview', name: 'Overview', icon: '📊' },
          { id: 'plaid', name: 'Financial (Plaid)', icon: '🏦' },
          { id: 'experian', name: 'Credit (Experian)', icon: '📊' },
          { id: 'apis', name: 'API Management', icon: '🔧' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id as DashboardView)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              currentView === tab.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Content Views */}
      {currentView === 'overview' && (
        <>
          {/* Initialization Status */}
          {isInitializing && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-blue-800 font-medium">Initializing automation system...</span>
          </div>
        </div>
      )}

      {/* Initialization Results */}
      {initResult && (
        <div className={`p-4 rounded-lg border ${initResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className={`font-bold text-lg mb-3 ${initResult.success ? 'text-green-800' : 'text-red-800'}`}>
            {initResult.success ? '✅ Automation System Ready!' : '❌ Initialization Failed'}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{initResult.apisDiscovered}</div>
              <div className="text-sm text-gray-600">APIs Discovered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{initResult.apisIntegrated}</div>
              <div className="text-sm text-gray-600">APIs Integrated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{initResult.workflowsCreated}</div>
              <div className="text-sm text-gray-600">Workflows Created</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${initResult.rapidApiConnected ? 'text-green-600' : 'text-red-600'}`}>
                {initResult.rapidApiConnected ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-600">RapidAPI Status</div>
            </div>
          </div>

          {initResult.error && (
            <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded mb-4">
              <strong>Error:</strong> {initResult.error}
            </div>
          )}

          {initResult.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Recommendations:</h4>
              {initResult.recommendations.map((rec, index) => (
                <div key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                  <span className="text-blue-500">•</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Health Status */}
      {automationStats && (
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">System Health</h3>
          <div className="flex items-center space-x-4 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(automationStats.systemHealth)}`}>
              {automationStats.systemHealth.toUpperCase()}
            </span>
            <span className="text-gray-600">
              {automationStats.initialized ? 'System Operational' : 'System Not Initialized'}
            </span>
          </div>

          {automationStats.nextSteps.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Next Steps:</h4>
              {automationStats.nextSteps.map((step, index) => (
                <div key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                  <span className="text-orange-500">→</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={runQuickTest}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
        >
          🧪 Quick Test
        </button>
        
        <button
          onClick={() => runLiveDemo('identity')}
          disabled={isRunningDemo}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          🆔 Demo Identity APIs
        </button>
        
        <button
          onClick={() => runLiveDemo('financial')}
          disabled={isRunningDemo}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          💰 Demo Financial APIs
        </button>
        
        <button
          onClick={() => runLiveDemo('communication')}
          disabled={isRunningDemo}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          📱 Demo Communication APIs
        </button>
      </div>

      {/* Demo Results */}
      {demoResults && (
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Live Demo Results</h3>
          <div className={`p-4 rounded-lg ${demoResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-lg font-bold ${demoResults.success ? 'text-green-600' : 'text-red-600'}`}>
                  {demoResults.success ? '✅' : '❌'}
                </div>
                <div className="text-sm text-gray-600">API Connection</div>
                <div className="text-xs text-gray-500">{demoResults.apiConnected || 'Failed'}</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${demoResults.vcGenerated ? 'text-green-600' : 'text-gray-400'}`}>
                  {demoResults.vcGenerated ? '✅' : '⚪'}
                </div>
                <div className="text-sm text-gray-600">VC Generated</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${demoResults.workflowExecuted ? 'text-green-600' : 'text-gray-400'}`}>
                  {demoResults.workflowExecuted ? '✅' : '⚪'}
                </div>
                <div className="text-sm text-gray-600">Workflow Executed</div>
              </div>
            </div>
            
            {demoResults.error && (
              <div className="mt-4 bg-red-100 border border-red-300 text-red-700 p-3 rounded">
                <strong>Error:</strong> {demoResults.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Categories Available */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Available API Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { name: 'Identity Verification', icon: '🆔', count: '15+' },
            { name: 'Financial Data', icon: '💰', count: '12+' },
            { name: 'Communication', icon: '📱', count: '8+' },
            { name: 'Government', icon: '🏛️', count: '6+' },
            { name: 'Education', icon: '🎓', count: '5+' },
            { name: 'Healthcare', icon: '🏥', count: '4+' },
            { name: 'Real Estate', icon: '🏠', count: '3+' },
            { name: 'Employment', icon: '💼', count: '7+' }
          ].map((category, index) => (
            <div key={index} className="border border-gray-200 p-3 rounded-lg text-center hover:bg-gray-50 transition-colors">
              <div className="text-2xl mb-1">{category.icon}</div>
              <div className="font-medium text-sm text-gray-800">{category.name}</div>
              <div className="text-xs text-gray-500">{category.count} APIs</div>
            </div>
          ))}
        </div>
      </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-blue-800 mb-3">🚀 Getting Started</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p><strong>1. Quick Test:</strong> Verify the automation system is working correctly</p>
              <p><strong>2. Run Demos:</strong> Test live API integrations with real providers</p>
              <p><strong>3. Monitor Health:</strong> Check system status and follow recommendations</p>
              <p><strong>4. Scale Up:</strong> Add more API categories and custom workflows as needed</p>
            </div>
          </div>
        </>
      )}

      {/* Plaid Financial Integration View */}
      {currentView === 'plaid' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">🏦 Plaid Financial Integration</h2>
            <p className="text-green-100">Connect bank accounts and generate financial verification credentials</p>
          </div>
          <PlaidIntegrationDashboard />
        </div>
      )}

      {/* Experian Credit Verification View */}
      {currentView === 'experian' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-600 to-red-600 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">📊 Experian Credit Verification</h2>
            <p className="text-purple-100">Verify credit scores and generate credit verification credentials</p>
          </div>
          <ExperianCreditDashboard />
        </div>
      )}

      {/* API Management View */}
      {currentView === 'apis' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">🔧 API Management</h2>
            <p className="text-orange-100">Manage and configure automated API integrations</p>
          </div>
          
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Available API Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { name: 'Identity Verification', icon: '🆔', count: '15+' },
                { name: 'Financial Data', icon: '💰', count: '12+' },
                { name: 'Communication', icon: '📱', count: '8+' },
                { name: 'Government', icon: '🏛️', count: '6+' },
                { name: 'Education', icon: '🎓', count: '5+' },
                { name: 'Healthcare', icon: '🏥', count: '4+' },
                { name: 'Real Estate', icon: '🏠', count: '3+' },
                { name: 'Employment', icon: '💼', count: '7+' }
              ].map((category, index) => (
                <div key={index} className="border border-gray-200 p-3 rounded-lg text-center hover:bg-gray-50 transition-colors">
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="font-medium text-sm text-gray-800">{category.name}</div>
                  <div className="text-xs text-gray-500">{category.count} APIs</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-yellow-800 mb-3">🚧 Coming Soon</h3>
            <div className="space-y-2 text-sm text-yellow-700">
              <p><strong>API Discovery:</strong> Automatically discover and configure new APIs</p>
              <p><strong>Workflow Builder:</strong> Visual workflow creation and management</p>
              <p><strong>Rate Limiting:</strong> Intelligent rate limiting and retry strategies</p>
              <p><strong>Monitoring:</strong> Real-time API performance and health monitoring</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationDashboard;