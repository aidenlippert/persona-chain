/**
 * 🔗 API CONNECTION MODAL
 * Beautiful modal for connecting to real APIs
 * GitHub OAuth + Steam profile input + Connection testing
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  LinkIcon,
  KeyIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { realAPIIntegrationService, APIProvider, APIConnection } from '../services/api-integrations/RealAPIIntegrationService';

interface APIConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAPI: {
    id: string;
    name: string;
    provider: string;
    description: string;
    authType: string;
    category: string;
    endpoints: Array<{
      name: string;
      description: string;
    }>;
  } | null;
  onConnectionSuccess?: (provider: APIProvider) => void;
}

export const APIConnectionModal: React.FC<APIConnectionModalProps> = ({
  isOpen,
  onClose,
  selectedAPI,
  onConnectionSuccess,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [steamProfile, setSteamProfile] = useState('');
  const [connections, setConnections] = useState<APIConnection[]>([]);
  const isConnectingRef = React.useRef(false);

  // Load connections on modal open and setup message listener
  React.useEffect(() => {
    if (isOpen) {
      const currentConnections = realAPIIntegrationService.getConnectionsStatus();
      setConnections(currentConnections);
      setConnectionStatus(null);
      
      // Setup message listener for OAuth popup
      const handleMessage = (event: MessageEvent) => {
        console.log('🎧 Received message in APIConnectionModal:', event.data);
        
        if (event.data.type === 'GITHUB_OAUTH_SUCCESS') {
          console.log('✅ GitHub OAuth success message received!');
          setConnectionStatus({
            success: true,
            message: `Successfully connected to GitHub as ${event.data.username}!`
          });
          
          // Update connection status
          const updatedConnections = realAPIIntegrationService.getConnectionsStatus();
          const githubConnection = updatedConnections.find(c => c.provider === 'github');
          if (githubConnection) {
            githubConnection.connected = true;
            githubConnection.username = event.data.username;
            githubConnection.connectedAt = new Date().toISOString();
          }
          setConnections(updatedConnections);
          onConnectionSuccess?.('github');
          setIsConnecting(false);
          isConnectingRef.current = false;
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [isOpen, onConnectionSuccess]);

  const handleGitHubConnect = async () => {
    setIsConnecting(true);
    isConnectingRef.current = true;
    setConnectionStatus(null);

    try {
      const result = await realAPIIntegrationService.connectGitHub();
      
      if (result.success && result.authUrl) {
        // Open GitHub OAuth in new window
        const popup = window.open(
          result.authUrl,
          'github-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Listen for popup closure (but don't assume failure)
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // Wait a moment for any final messages, then check if we're still connecting
            setTimeout(() => {
              // Only mark as failed if we're still in connecting state and no success message was received
              if (isConnectingRef.current) {
                console.log('🪟 Popup closed without success message - OAuth may have been cancelled');
                setConnectionStatus({
                  success: false,
                  error: 'GitHub OAuth was cancelled or completed in another tab'
                });
                setIsConnecting(false);
                isConnectingRef.current = false;
              }
            }, 2000); // Give more time for messages to arrive
          }
        }, 1000);
      } else {
        throw new Error(result.error || 'Failed to start GitHub OAuth');
      }
    } catch (error) {
      setConnectionStatus({
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  };

  const handleSteamConnect = async () => {
    if (!steamProfile.trim()) {
      setConnectionStatus({
        success: false,
        error: 'Please enter your Steam profile URL or custom ID'
      });
      return;
    }

    setIsConnecting(true);
    setConnectionStatus(null);

    try {
      const result = await realAPIIntegrationService.connectSteam(steamProfile.trim());
      
      if (result.success) {
        setConnectionStatus({
          success: true,
          message: `Successfully connected to Steam as ${result.username}!`
        });
        const updatedConnections = realAPIIntegrationService.getConnectionsStatus();
        setConnections(updatedConnections);
        onConnectionSuccess?.('steam');
      } else {
        throw new Error(result.error || 'Steam connection failed');
      }
    } catch (error) {
      setConnectionStatus({
        success: false,
        error: error instanceof Error ? error.message : 'Steam connection failed'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const renderConnectionInterface = () => {
    if (!selectedAPI) return null;

    const provider = selectedAPI.id.split('-')[0] as APIProvider;
    const connection = connections.find(c => c.provider === provider);

    if (connection?.connected) {
      return (
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
            <div>
              <h3 className="text-emerald-400 font-semibold">Connected Successfully!</h3>
              <p className="text-emerald-300 text-sm">
                Connected as: <span className="font-medium">{connection.username}</span>
              </p>
            </div>
          </div>
          <p className="text-emerald-200 text-sm">
            Connected: {new Date(connection.connectedAt!).toLocaleDateString()}
          </p>
        </div>
      );
    }

    switch (provider) {
      case 'github':
        return (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-2">GitHub OAuth Setup</h3>
              <p className="text-gray-300 text-sm mb-4">
                Connect your GitHub account to verify your developer profile and open source contributions.
              </p>
              <button
                onClick={handleGitHubConnect}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-5 w-5" />
                    Connect with GitHub
                    <ArrowRightIcon className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 'steam':
        return (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-2">Steam Profile Connection</h3>
              <p className="text-gray-300 text-sm mb-4">
                Enter your Steam profile URL or custom ID to verify your gaming achievements and library.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="steamcommunity.com/id/yourprofile OR steamcommunity.com/profiles/76561198... OR just 'yourprofile'"
                  value={steamProfile}
                  onChange={(e) => setSteamProfile(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-400">
                  <p><strong>Examples:</strong></p>
                  <p>• https://steamcommunity.com/id/yourprofile</p>
                  <p>• https://steamcommunity.com/profiles/76561198...</p>
                  <p>• yourprofile (custom URL only)</p>
                </div>
                <button
                  onClick={handleSteamConnect}
                  disabled={isConnecting || !steamProfile.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5" />
                      Connect Steam Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <KeyIcon className="h-6 w-6 text-amber-400" />
              <div>
                <h3 className="text-amber-400 font-semibold">API Integration Coming Soon</h3>
                <p className="text-amber-300 text-sm">
                  This API will be available in a future update. GitHub and Steam are ready for testing!
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Connect to {selectedAPI?.name}
                </h2>
                <p className="text-gray-400 text-sm">
                  {selectedAPI?.category} • {selectedAPI?.authType.toUpperCase()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* API Description */}
              <div className="mb-6">
                <p className="text-gray-300 leading-relaxed">
                  {selectedAPI?.description}
                </p>
              </div>

              {/* Connection Status */}
              {connectionStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-4 mb-6 border ${
                    connectionStatus.success
                      ? 'bg-emerald-500/20 border-emerald-500/30'
                      : 'bg-red-500/20 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {connectionStatus.success ? (
                      <CheckCircleIcon className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`font-semibold ${
                        connectionStatus.success ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {connectionStatus.success ? 'Success!' : 'Connection Failed'}
                      </p>
                      <p className={`text-sm ${
                        connectionStatus.success ? 'text-emerald-300' : 'text-red-300'
                      }`}>
                        {connectionStatus.message || connectionStatus.error}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Connection Interface */}
              {renderConnectionInterface()}

              {/* Available Endpoints */}
              {selectedAPI?.endpoints && (
                <div className="bg-gray-800/30 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">Available Data Points</h3>
                  <div className="space-y-3">
                    {selectedAPI.endpoints.map((endpoint, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                        <div>
                          <span className="text-white font-medium">{endpoint.name}</span>
                          <p className="text-gray-400">{endpoint.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default APIConnectionModal;