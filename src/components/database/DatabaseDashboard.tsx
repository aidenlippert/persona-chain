/**
 * Database Dashboard Component
 * Provides monitoring and management interface for production database
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { databaseService } from '../../services/database/DatabaseService';
import { databaseInit, InitializationResult, InitializationStep } from '../../services/database/DatabaseInit';

interface DatabaseDashboardState {
  isInitializing: boolean;
  initResult: InitializationResult | null;
  healthStatus: any;
  stats: any;
  isLoadingStats: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export const DatabaseDashboard: React.FC = () => {
  const [state, setState] = useState<DatabaseDashboardState>({
    isInitializing: false,
    initResult: null,
    healthStatus: null,
    stats: null,
    isLoadingStats: false,
    error: null,
    lastUpdated: null
  });

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingStats: true, error: null }));

    try {
      const [healthCheck, databaseStats] = await Promise.all([
        databaseService.healthCheck(),
        databaseService.getDatabaseStats()
      ]);

      setState(prev => ({
        ...prev,
        healthStatus: healthCheck,
        stats: databaseStats,
        isLoadingStats: false,
        lastUpdated: new Date().toISOString()
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data',
        isLoadingStats: false
      }));
    }
  }, []);

  const handleInitializeDatabase = useCallback(async () => {
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      const result = await databaseInit.initialize();
      setState(prev => ({ ...prev, initResult: result, isInitializing: false }));
      
      // Refresh dashboard data after initialization
      if (result.success) {
        await loadDashboardData();
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Database initialization failed',
        isInitializing: false
      }));
    }
  }, [loadDashboardData]);

  const handleCreateSampleData = useCallback(async () => {
    try {
      await databaseInit.createSampleData();
      await loadDashboardData();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create sample data'
      }));
    }
  }, [loadDashboardData]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '🔄';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🗄️ Database Infrastructure
        </h2>
        <p className="text-gray-600">
          Production-grade database monitoring and management
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Health Status</p>
              <p className={`text-lg font-bold px-3 py-1 rounded-full border text-center mt-2 ${
                state.healthStatus ? getHealthStatusColor(state.healthStatus.healthy ? 'healthy' : 'unhealthy') : 'text-gray-600 bg-gray-100 border-gray-200'
              }`}>
                {state.healthStatus ? (state.healthStatus.healthy ? 'Healthy' : 'Unhealthy') : 'Unknown'}
              </p>
            </div>
            <div className="text-3xl">
              {state.healthStatus ? (state.healthStatus.healthy ? '✅' : '❌') : '❓'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.stats?.totalUsers || 0}
              </p>
            </div>
            <div className="text-3xl">👤</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Credentials</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.stats?.totalCredentials || 0}
              </p>
            </div>
            <div className="text-3xl">🏆</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.healthStatus?.latency || 0}ms
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>
      </motion.div>

      {/* Database Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-6 shadow-lg border"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-4">Database Management</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleInitializeDatabase}
            disabled={state.isInitializing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {state.isInitializing ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Initializing...
              </>
            ) : (
              <>
                🚀 Initialize Database
              </>
            )}
          </button>

          <button
            onClick={loadDashboardData}
            disabled={state.isLoadingStats}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {state.isLoadingStats ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Loading...
              </>
            ) : (
              <>
                🔄 Refresh Stats
              </>
            )}
          </button>

          <button
            onClick={handleCreateSampleData}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg flex items-center justify-center gap-2"
          >
            📝 Create Sample Data
          </button>
        </div>
      </motion.div>

      {/* Initialization Results */}
      <AnimatePresence>
        {state.initResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl p-6 shadow-lg border ${
              state.initResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${
                state.initResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {state.initResult.success ? '✅ Database Initialized' : '❌ Initialization Failed'}
              </h3>
              <div className="text-sm text-gray-600">
                Duration: {state.initResult.durationMs}ms
              </div>
            </div>

            <p className={`mb-4 ${
              state.initResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {state.initResult.message}
            </p>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Initialization Steps:</h4>
              {state.initResult.steps.map((step: InitializationStep, index: number) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    step.status === 'completed' ? 'bg-green-50 border-green-200' :
                    step.status === 'failed' ? 'bg-red-50 border-red-200' :
                    step.status === 'running' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="text-2xl">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{step.name}</h5>
                    {step.message && (
                      <p className="text-sm text-gray-600">{step.message}</p>
                    )}
                    {step.error && (
                      <p className="text-sm text-red-600">{step.error}</p>
                    )}
                  </div>
                  {step.startTime && step.endTime && (
                    <div className="text-xs text-gray-500">
                      {Math.round((new Date(step.endTime).getTime() - new Date(step.startTime).getTime()))}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Health Details */}
        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Health Details</h3>
          
          {state.healthStatus ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Connection Status</span>
                <span className={`font-medium ${
                  state.healthStatus.healthy ? 'text-green-600' : 'text-red-600'
                }`}>
                  {state.healthStatus.healthy ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Latency</span>
                <span className="font-medium text-gray-900">
                  {state.healthStatus.latency}ms
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Message</span>
                <span className="font-medium text-gray-900 text-right max-w-xs truncate">
                  {state.healthStatus.message}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🔄</div>
              <p className="text-gray-600">Loading health status...</p>
            </div>
          )}
        </div>

        {/* Database Statistics */}
        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Database Statistics</h3>
          
          {state.stats ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Users</span>
                <span className="font-bold text-blue-600">{state.stats.totalUsers}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Credentials</span>
                <span className="font-bold text-green-600">{state.stats.totalCredentials}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">API Integrations</span>
                <span className="font-bold text-purple-600">{state.stats.totalIntegrations}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ZK Proofs</span>
                <span className="font-bold text-orange-600">{state.stats.totalProofs}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Overall Health</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  getHealthStatusColor(state.stats.healthStatus)
                }`}>
                  {state.stats.healthStatus.toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-600">Loading statistics...</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Last Updated */}
      {state.lastUpdated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-gray-500"
        >
          Last updated: {new Date(state.lastUpdated).toLocaleString()}
        </motion.div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="text-red-600 text-xl">❌</div>
              <div>
                <h4 className="font-medium text-red-800">Database Error</h4>
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, error: null }))}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};