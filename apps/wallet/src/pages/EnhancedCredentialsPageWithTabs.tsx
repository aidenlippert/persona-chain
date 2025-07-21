/**
 * Enhanced Credentials Page with Tabs - Create and Manage credentials
 * Features: Create tab, manage tab, real data integration, status tracking
 */

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import EnhancedAPICredentialsManager from '../components/credentials/EnhancedAPICredentialsManager';
import { credentialRecoveryService } from '../services/credentialRecoveryService';
import { ComponentErrorBoundary } from '../components/ui/ErrorBoundary';
import type { WalletCredential } from '../types/wallet';
import { errorService } from "@/services/errorService";

export const EnhancedCredentialsPageWithTabs = () => {
  const [credentials, setCredentials] = useState<WalletCredential[]>([]);
  const [isRecovering, setIsRecovering] = useState(true);
  const [recoveryStats, setRecoveryStats] = useState<any>(null);

  // Get user DID from localStorage
  const userDID = localStorage.getItem('user_did') || 'did:persona:cosmos17em1752791625853';
  const walletAddress = localStorage.getItem('wallet_address') || 'cosmos17em1752791625853';

  // Auto-recover credentials on page load
  useEffect(() => {
    const recoverCredentials = async () => {
      try {
        console.log('[LOADING] Starting automatic credential recovery...');
        setIsRecovering(true);
        
        const recoveredCredentials = await credentialRecoveryService.recoverCredentials(walletAddress, userDID);
        
        if (recoveredCredentials.length > 0) {
          setCredentials(recoveredCredentials);
          console.log(`[SUCCESS] Recovered ${recoveredCredentials.length} credentials successfully`);
          
          // Update localStorage for immediate use
          localStorage.setItem('credentials', JSON.stringify(recoveredCredentials));
        } else {
          console.log('[INFO] No credentials found - user may be new');
        }
        
        const stats = credentialRecoveryService.getRecoveryStats();
        setRecoveryStats(stats);
        
      } catch (error) {
        errorService.logError('[ERROR] Credential recovery failed:', error);
      } finally {
        setIsRecovering(false);
      }
    };

    recoverCredentials();
  }, [walletAddress, userDID]);

  // Callback to refresh credentials when needed
  const loadCredentials = useCallback(async () => {
    try {
      console.log('[LOADING] Manually refreshing credentials...');
      const refreshedCredentials = await credentialRecoveryService.recoverCredentials(walletAddress, userDID);
      setCredentials(refreshedCredentials);
      localStorage.setItem('credentials', JSON.stringify(refreshedCredentials));
      console.log(`[SUCCESS] Refreshed ${refreshedCredentials.length} credentials`);
    } catch (error) {
      errorService.logError('[ERROR] Failed to refresh credentials:', error);
    }
  }, [walletAddress, userDID]);

  // Save credentials with backup redundancy
  const saveCredentials = useCallback(async (newCredentials: WalletCredential[]) => {
    try {
      await credentialRecoveryService.saveCredentials(newCredentials, walletAddress, userDID);
      setCredentials(newCredentials);
      console.log(`[SAVE] Saved ${newCredentials.length} credentials with backup redundancy`);
    } catch (error) {
      errorService.logError('[ERROR] Failed to save credentials:', error);
    }
  }, [walletAddress, userDID]);

  return (
    <ComponentErrorBoundary 
      componentName="CredentialsPage"
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">🎫 Credential Management</h1>
            <p className="text-slate-400 mb-4">Loading your credentials...</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              🎫 Credential Management
            </h1>
            <p className="text-slate-400 text-lg">
              Create new credentials and manage your verifiable credential portfolio
            </p>
            
            {/* Recovery Status */}
            {(isRecovering || recoveryStats) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl"
              >
                {isRecovering ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
                    <span className="text-slate-300">[LOADING] Recovering your credentials from secure storage...</span>
                  </div>
                ) : recoveryStats && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span className="text-slate-300">
                        [SUCCESS] Recovered {recoveryStats.recoveredCredentials} credentials from backup
                      </span>
                    </div>
                    <button
                      onClick={loadCredentials}
                      className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors duration-300"
                    >
                      [LOADING] Refresh
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Show current credential count */}
          {credentials.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-400 font-semibold">{credentials.length}</span>
                  </div>
                  <div>
                    <h3 className="text-emerald-400 font-medium">Active Credentials</h3>
                    <p className="text-emerald-300/70 text-sm">Your verifiable credentials are safely stored</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 text-xs">Last Updated</p>
                  <p className="text-emerald-300/70 text-xs">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Enhanced API Credentials Manager */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ComponentErrorBoundary
              componentName="APICredentialsManager"
              fallback={
                <div className="p-8 bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Loading Credential Manager...</h3>
                  <p className="text-slate-400 mb-4">Setting up your credential management interface</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              }
            >
              <EnhancedAPICredentialsManager
                did={userDID}
                walletAddress={walletAddress}
                onCredentialCreated={loadCredentials}
              />
            </ComponentErrorBoundary>
          </motion.div>

        </div>
      </div>
    </ComponentErrorBoundary>
  );
};