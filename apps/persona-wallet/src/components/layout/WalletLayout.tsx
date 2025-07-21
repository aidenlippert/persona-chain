import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '../../stores/walletStore';
import { BottomNavigation } from './BottomNavigation';
import { TopHeader } from './TopHeader';
import { NotificationBanner } from './NotificationBanner';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { OfflineBanner } from './OfflineBanner';
import { SecurityLockScreen } from '../security/SecurityLockScreen';

interface WalletLayoutProps {
  children: React.ReactNode;
}

export const WalletLayout: React.FC<WalletLayoutProps> = ({ children }) => {
  const { walletState, navigationState } = useWalletStore();

  // Show lock screen if wallet is locked
  if (!walletState.isUnlocked) {
    return <SecurityLockScreen />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
        {/* Offline indicator */}
        <AnimatePresence>
          {walletState.connectivity === 'offline' && <OfflineBanner />}
        </AnimatePresence>

        {/* Top header */}
        <TopHeader />

        {/* Notification banner */}
        <NotificationBanner />

        {/* Main content area */}
        <motion.main
          className="pb-20 pt-16 px-4 max-w-md mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={navigationState.currentTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.main>

        {/* Bottom navigation */}
        <BottomNavigation />

        {/* Loading overlay */}
        <AnimatePresence>
          {walletState.isLoading && <LoadingOverlay />}
        </AnimatePresence>

        {/* Background decorative elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl" />
        </div>
      </div>
    </ErrorBoundary>
  );
};