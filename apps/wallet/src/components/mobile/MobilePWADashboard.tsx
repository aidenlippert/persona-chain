/**
 * Mobile PWA Dashboard
 * Comprehensive mobile interface for PWA features and offline capabilities
 */

import React, { useState, useEffect } from 'react';
import { notify } from '../../utils/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Download,
  Bell,
  BellOff,
  Database,
  Sync,
  RefreshCw,
  Shield,
  Smartphone,
  Home,
  Zap,
  Cloud,
  CloudOff,
  Settings,
  Battery,
  Signal,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Users,
  Eye,
  Share2
} from 'lucide-react';
import { OfflineCapabilities, BackgroundSyncTask } from '../../services/pwa/AdvancedServiceWorker';
import { advancedServiceWorkerManager } from '../../services/pwa/AdvancedServiceWorker';
import { errorService } from "@/services/errorService";

interface PWAStatus {
  isInstalled: boolean;
  isOnline: boolean;
  notifications: 'granted' | 'denied' | 'default';
  lastSync: number;
  cacheSize: number;
  offlineCapabilities: OfflineCapabilities | null;
}

interface NetworkStats {
  speed: 'slow' | 'medium' | 'fast';
  type: '2g' | '3g' | '4g' | '5g' | 'wifi' | 'unknown';
  effectiveType: string;
}

const MobilePWADashboard: React.FC = () => {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstalled: false,
    isOnline: navigator.onLine,
    notifications: 'default',
    lastSync: 0,
    cacheSize: 0,
    offlineCapabilities: null
  });
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    speed: 'medium',
    type: 'unknown',
    effectiveType: 'unknown'
  });
  const [showOfflineCapabilities, setShowOfflineCapabilities] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState(0);

  useEffect(() => {
    initializePWAStatus();
    setupNetworkMonitoring();
    
    const interval = setInterval(updateStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const initializePWAStatus = async () => {
    try {
      // Check if app is installed
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone ||
                         document.referrer.includes('android-app://');

      // Get notification permission
      const notifications = 'Notification' in window 
        ? Notification.permission 
        : 'denied' as const;

      // Get offline capabilities
      const offlineCapabilities = await advancedServiceWorkerManager.getOfflineCapabilities();

      setPwaStatus({
        isInstalled,
        isOnline: navigator.onLine,
        notifications,
        lastSync: offlineCapabilities.lastSync,
        cacheSize: offlineCapabilities.cacheSize,
        offlineCapabilities
      });
    } catch (error) {
      errorService.logError('Failed to initialize PWA status:', error);
    }
  };

  const setupNetworkMonitoring = () => {
    // Monitor online/offline status
    const handleOnline = () => setPwaStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPwaStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get network information if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      const updateNetworkStats = () => {
        setNetworkStats({
          speed: connection.effectiveType === '4g' ? 'fast' : 
                 connection.effectiveType === '3g' ? 'medium' : 'slow',
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown'
        });
      };

      updateNetworkStats();
      connection.addEventListener('change', updateNetworkStats);
    }
  };

  const updateStatus = async () => {
    try {
      const offlineCapabilities = await advancedServiceWorkerManager.getOfflineCapabilities();
      setPwaStatus(prev => ({
        ...prev,
        offlineCapabilities,
        cacheSize: offlineCapabilities.cacheSize,
        lastSync: offlineCapabilities.lastSync
      }));
      setPendingUpdates(offlineCapabilities.syncPending.length);
    } catch (error) {
      errorService.logError('Failed to update status:', error);
    }
  };

  const handleInstallPWA = async () => {
    try {
      await advancedServiceWorkerManager.initializePWA();
      // Show install prompt (this would be handled by the browser)
      notify.info('PWA installation initiated. Follow browser prompts to install.');
    } catch (error) {
      errorService.logError('PWA installation failed:', error);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPwaStatus(prev => ({ ...prev, notifications: permission }));
    } catch (error) {
      errorService.logError('Notification permission failed:', error);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      // Queue a background sync
      await advancedServiceWorkerManager.queueBackgroundSync(
        'api_sync',
        { type: 'manual_sync', timestamp: Date.now() },
        'high'
      );
      
      // Update status after a short delay
      setTimeout(updateStatus, 2000);
    } catch (error) {
      errorService.logError('Force sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatLastSync = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getNetworkIcon = () => {
    if (!pwaStatus.isOnline) return WifiOff;
    
    switch (networkStats.type) {
      case 'wifi': return Wifi;
      case '5g':
      case '4g': return Signal;
      default: return Wifi;
    }
  };

  const getConnectionQuality = () => {
    if (!pwaStatus.isOnline) return { color: 'text-red-500', label: 'Offline' };
    
    switch (networkStats.speed) {
      case 'fast': return { color: 'text-green-500', label: 'Excellent' };
      case 'medium': return { color: 'text-yellow-500', label: 'Good' };
      case 'slow': return { color: 'text-orange-500', label: 'Slow' };
      default: return { color: 'text-gray-500', label: 'Unknown' };
    }
  };

  const NetworkIcon = getNetworkIcon();
  const connectionQuality = getConnectionQuality();

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">PWA Dashboard</h1>
          <div className="flex items-center space-x-2">
            <NetworkIcon className="w-5 h-5" />
            <span className={`text-sm ${connectionQuality.color.replace('text-', 'text-white opacity-')}`}>
              {connectionQuality.label}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{pwaStatus.cacheSize}</div>
            <div className="text-sm opacity-80">Cached Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{pendingUpdates}</div>
            <div className="text-sm opacity-80">Pending Syncs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {pwaStatus.offlineCapabilities?.cachedCredentials || 0}
            </div>
            <div className="text-sm opacity-80">Offline Ready</div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="p-4 space-y-4">
        {/* Installation Status */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                pwaStatus.isInstalled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">App Installation</h3>
                <p className="text-sm text-gray-500">
                  {pwaStatus.isInstalled ? 'Installed as PWA' : 'Web app version'}
                </p>
              </div>
            </div>
            
            {!pwaStatus.isInstalled && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleInstallPWA}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
              >
                Install
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                pwaStatus.notifications === 'granted' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {pwaStatus.notifications === 'granted' ? 
                  <Bell className="w-5 h-5" /> : 
                  <BellOff className="w-5 h-5" />
                }
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-500 capitalize">
                  {pwaStatus.notifications === 'granted' ? 'Enabled' : 
                   pwaStatus.notifications === 'denied' ? 'Disabled' : 'Not configured'}
                </p>
              </div>
            </div>
            
            {pwaStatus.notifications !== 'granted' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleEnableNotifications}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
              >
                Enable
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Sync Status */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                {isSyncing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Sync className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Background Sync</h3>
                <p className="text-sm text-gray-500">
                  Last sync: {formatLastSync(pwaStatus.lastSync)}
                </p>
              </div>
            </div>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleForceSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </motion.button>
          </div>
        </motion.div>

        {/* Offline Capabilities */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowOfflineCapabilities(!showOfflineCapabilities)}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                pwaStatus.isOnline ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
              }`}>
                {pwaStatus.isOnline ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Offline Mode</h3>
                <p className="text-sm text-gray-500">
                  {pwaStatus.isOnline ? 'Online - All features available' : 'Offline - Limited features'}
                </p>
              </div>
            </div>
            
            <motion.div
              animate={{ rotate: showOfflineCapabilities ? 180 : 0 }}
              className="text-gray-400"
            >
              <Settings className="w-5 h-5" />
            </motion.div>
          </div>

          <AnimatePresence>
            {showOfflineCapabilities && pwaStatus.offlineCapabilities && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-gray-100 space-y-3"
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cached Credentials:</span>
                    <span className="ml-2 font-medium">
                      {pwaStatus.offlineCapabilities.cachedCredentials}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Cached Proofs:</span>
                    <span className="ml-2 font-medium">
                      {pwaStatus.offlineCapabilities.cachedProofs}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Cache Size:</span>
                    <span className="ml-2 font-medium">
                      {pwaStatus.offlineCapabilities.cacheSize} items
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pending Syncs:</span>
                    <span className="ml-2 font-medium">
                      {pwaStatus.offlineCapabilities.syncPending.length}
                    </span>
                  </div>
                </div>

                {/* Pending Sync Tasks */}
                {pwaStatus.offlineCapabilities.syncPending.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Syncs:</h4>
                    <div className="space-y-2">
                      {pwaStatus.offlineCapabilities.syncPending.slice(0, 3).map((task, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600 capitalize">
                              {task.type.replace('_', ' ')}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            task.priority === 'high' ? 'bg-red-100 text-red-600' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      ))}
                      {pwaStatus.offlineCapabilities.syncPending.length > 3 && (
                        <div className="text-center text-sm text-gray-500">
                          +{pwaStatus.offlineCapabilities.syncPending.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Network Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Network Information</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Connection:</span>
              <span className={`ml-2 font-medium ${connectionQuality.color}`}>
                {networkStats.type.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Speed:</span>
              <span className={`ml-2 font-medium ${connectionQuality.color}`}>
                {connectionQuality.label}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Effective Type:</span>
              <span className="ml-2 font-medium capitalize">
                {networkStats.effectiveType}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 font-medium ${pwaStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {pwaStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Zap className="w-5 h-5 text-purple-500 mr-2" />
            Performance Tips
          </h3>
          
          <div className="space-y-2 text-sm">
            {!pwaStatus.isInstalled && (
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                <span className="text-gray-600">
                  Install as PWA for better performance and offline access
                </span>
              </div>
            )}
            
            {pwaStatus.notifications !== 'granted' && (
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                <span className="text-gray-600">
                  Enable notifications to get real-time updates
                </span>
              </div>
            )}
            
            {pendingUpdates > 0 && (
              <div className="flex items-start space-x-2">
                <Clock className="w-4 h-4 text-yellow-500 mt-0.5" />
                <span className="text-gray-600">
                  {pendingUpdates} pending sync tasks - connect to Wi-Fi for faster sync
                </span>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span className="text-gray-600">
                Your data is cached for offline access
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePWADashboard;