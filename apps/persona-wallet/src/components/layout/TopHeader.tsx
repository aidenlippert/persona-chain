import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Shield,
  ChevronDown 
} from 'lucide-react';
import { useWalletStore, useNotifications } from '../../stores/walletStore';
import { cn } from '../../lib/utils';

export const TopHeader: React.FC = () => {
  const { 
    walletState, 
    identity, 
    navigationState,
    pushModal,
    updateConnectivity 
  } = useWalletStore();
  const { unreadCount } = useNotifications();

  const getPageTitle = () => {
    switch (navigationState.currentTab) {
      case 'home':
        return 'PersonaPass';
      case 'credentials':
        return 'My Credentials';
      case 'proofs':
        return 'Proof History';
      case 'sharing':
        return 'Share Identity';
      case 'settings':
        return 'Settings';
      default:
        return 'PersonaPass';
    }
  };

  const getConnectivityIcon = () => {
    switch (walletState.connectivity) {
      case 'online':
        return <Wifi size={16} className="text-green-500" />;
      case 'offline':
        return <WifiOff size={16} className="text-red-500" />;
      case 'syncing':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={16} className="text-blue-500" />
          </motion.div>
        );
      default:
        return <WifiOff size={16} className="text-gray-400" />;
    }
  };

  const handleNotificationsPress = () => {
    pushModal('notifications');
  };

  const handleProfilePress = () => {
    pushModal('profile');
  };

  const handleRetryConnection = () => {
    updateConnectivity('syncing');
    // Simulate reconnection attempt
    setTimeout(() => {
      updateConnectivity('online');
    }, 2000);
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Title */}
          <div className="flex items-center space-x-3">
            <motion.h1 
              className="text-lg font-bold text-gray-900 dark:text-white"
              key={navigationState.currentTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {getPageTitle()}
            </motion.h1>
            
            {/* Security indicator */}
            {walletState.isUnlocked && (
              <motion.div
                className="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              >
                <Shield size={12} className="text-green-600 dark:text-green-400" />
              </motion.div>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-3">
            {/* Connectivity status */}
            <motion.button
              onClick={walletState.connectivity === 'offline' ? handleRetryConnection : undefined}
              className={cn(
                'p-2 rounded-lg transition-colors duration-200',
                walletState.connectivity === 'offline' 
                  ? 'hover:bg-red-50 dark:hover:bg-red-900/30' 
                  : 'cursor-default'
              )}
              whileTap={walletState.connectivity === 'offline' ? { scale: 0.95 } : {}}
            >
              {getConnectivityIcon()}
            </motion.button>

            {/* Notifications */}
            <motion.button
              onClick={handleNotificationsPress}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              whileTap={{ scale: 0.95 }}
            >
              <Bell size={20} className="text-gray-600 dark:text-gray-300" />
              
              {/* Notification badge */}
              {unreadCount > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}
            </motion.button>

            {/* Profile */}
            {identity && (
              <motion.button
                onClick={handleProfilePress}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                whileTap={{ scale: 0.95 }}
              >
                {/* Avatar */}
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {identity.avatar ? (
                    <img 
                      src={identity.avatar} 
                      alt={identity.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {identity.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Dropdown indicator */}
                <ChevronDown size={14} className="text-gray-400" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Sync status bar */}
        {walletState.connectivity === 'syncing' && (
          <motion.div
            className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}

        {/* Last sync indicator */}
        {walletState.lastSync && walletState.connectivity === 'online' && (
          <motion.div
            className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            Last synced: {new Date(walletState.lastSync).toLocaleTimeString()}
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};