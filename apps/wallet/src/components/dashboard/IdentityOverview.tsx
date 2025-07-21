/**
 * Identity Overview Component
 * Comprehensive identity status and quick actions
 */

import React, { useState, useEffect } from 'react';
import { notify } from '../../utils/notifications';
import { personaChainService } from '../../services/personaChainService';
import { logger } from '../../services/monitoringService';

interface IdentityOverviewProps {
  didKeyPair: any;
}

export const IdentityOverview: React.FC<IdentityOverviewProps> = ({ didKeyPair }) => {
  const [blockchainStatus, setBlockchainStatus] = useState<{
    isHealthy: boolean;
    blockHeight: number;
    isLoading: boolean;
  }>({
    isHealthy: false,
    blockHeight: 0,
    isLoading: true,
  });

  const [identityStats, setIdentityStats] = useState({
    credentialCount: 0,
    proofsGenerated: 0,
    verificationsCompleted: 0,
    lastActivity: new Date().toISOString(),
  });

  useEffect(() => {
    checkBlockchainStatus();
    loadIdentityStats();
  }, [didKeyPair]);

  const checkBlockchainStatus = async () => {
    try {
      const isHealthy = await personaChainService.checkBlockchainHealth();
      const blockHeight = await personaChainService.getCurrentBlockHeight();
      
      setBlockchainStatus({
        isHealthy,
        blockHeight,
        isLoading: false,
      });
      
      logger.info('Blockchain status checked', { isHealthy, blockHeight });
    } catch (error) {
      logger.error('Failed to check blockchain status', { error });
      setBlockchainStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const loadIdentityStats = async () => {
    try {
      // Mock stats - in production, load from services
      setIdentityStats({
        credentialCount: 3,
        proofsGenerated: 7,
        verificationsCompleted: 12,
        lastActivity: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to load identity stats', { error });
    }
  };

  const handleExportIdentity = () => {
    const exportData = {
      did: didKeyPair.did,
      document: didKeyPair.document,
      created: new Date().toISOString(),
      type: 'PersonaPass Identity Export',
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `identity-${didKeyPair.did.slice(-8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logger.info('Identity exported', { did: didKeyPair.did });
  };

  const handleVerifyIdentity = async () => {
    try {
      const didDoc = await personaChainService.queryDID(didKeyPair.did);
      if (didDoc) {
        logger.info('Identity verified on blockchain', { did: didKeyPair.did });
        notify.success('Identity successfully verified on PersonaChain!');
      } else {
        logger.warn('Identity not found on blockchain', { did: didKeyPair.did });
        notify.info('Identity not found on blockchain. Please try anchoring it first.');
      }
    } catch (error) {
      logger.error('Identity verification failed', { error });
      notify.error('Failed to verify identity. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Identity Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Identity Status</h2>
            <p className="text-gray-600">Your decentralized identity overview</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-700">Active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Decentralized Identifier (DID)
              </label>
              <div className="bg-gray-50 rounded-lg p-3">
                <code className="text-sm text-gray-800 break-all">
                  {didKeyPair.did}
                </code>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Level
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full w-[85%]"></div>
                </div>
                <span className="text-sm font-medium text-green-600">
                  {didKeyPair.hsmBacked ? 'Enterprise' : 'Standard'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blockchain Status
              </label>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${
                  blockchainStatus.isLoading 
                    ? 'bg-yellow-500' 
                    : blockchainStatus.isHealthy 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-700">
                  {blockchainStatus.isLoading 
                    ? 'Checking...' 
                    : blockchainStatus.isHealthy 
                    ? `Connected (Block #${blockchainStatus.blockHeight})` 
                    : 'Disconnected'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created
              </label>
              <span className="text-sm text-gray-700">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Credentials</p>
              <p className="text-2xl font-semibold text-gray-900">{identityStats.credentialCount}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ZK Proofs</p>
              <p className="text-2xl font-semibold text-gray-900">{identityStats.proofsGenerated}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verifications</p>
              <p className="text-2xl font-semibold text-gray-900">{identityStats.verificationsCompleted}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Trust Score</p>
              <p className="text-2xl font-semibold text-gray-900">95%</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleVerifyIdentity}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Verify Identity</p>
              <p className="text-sm text-gray-600">Check blockchain status</p>
            </div>
          </button>

          <button
            onClick={handleExportIdentity}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Export Identity</p>
              <p className="text-sm text-gray-600">Download backup file</p>
            </div>
          </button>

          <button
            onClick={() => window.open('/docs/identity', '_blank')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Learn More</p>
              <p className="text-sm text-gray-600">View documentation</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Identity created successfully</p>
              <p className="text-xs text-gray-500">Just now</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Connected to PersonaChain</p>
              <p className="text-xs text-gray-500">2 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentityOverview;