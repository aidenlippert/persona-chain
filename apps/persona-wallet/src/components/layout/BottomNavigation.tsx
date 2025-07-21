import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  CreditCard, 
  Shield, 
  Share2, 
  Settings,
  Plus
} from 'lucide-react';
import { useWalletStore, useNotifications } from '../../stores/walletStore';
import { cn } from '../../lib/utils';

const navigationItems = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    badge: false,
  },
  {
    id: 'credentials',
    label: 'Credentials',
    icon: CreditCard,
    badge: false,
  },
  {
    id: 'proofs',
    label: 'Proofs',
    icon: Shield,
    badge: false,
  },
  {
    id: 'sharing',
    label: 'Share',
    icon: Share2,
    badge: true, // Show badge for active sharing requests
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    badge: false,
  },
] as const;

export const BottomNavigation: React.FC = () => {
  const { navigationState, setCurrentTab, pushModal } = useWalletStore();
  const { unreadCount } = useNotifications();
  const { sharingState } = useWalletStore();

  const handleTabPress = (tabId: typeof navigationState.currentTab) => {
    setCurrentTab(tabId);
  };

  const handleQuickAction = () => {
    pushModal('quick-actions');
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="max-w-md mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {navigationItems.map((item, index) => {
            const isActive = navigationState.currentTab === item.id;
            const showBadge = item.badge && (
              (item.id === 'sharing' && sharingState.activeRequest) ||
              (item.id === 'settings' && unreadCount > 0)
            );

            return (
              <motion.button
                key={item.id}
                onClick={() => handleTabPress(item.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400'
                )}
                whileTap={{ scale: 0.95 }}
                initial={false}
              >
                {/* Background highlight for active tab */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-xl"
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                {/* Icon container */}
                <div className="relative">
                  <item.icon 
                    size={20} 
                    className={cn(
                      'transition-all duration-200',
                      isActive ? 'scale-110' : 'scale-100'
                    )}
                  />
                  
                  {/* Badge indicator */}
                  {showBadge && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    />
                  )}
                </div>

                {/* Label */}
                <span className={cn(
                  'text-xs font-medium mt-1 transition-all duration-200',
                  isActive ? 'opacity-100' : 'opacity-70'
                )}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}

          {/* Quick Action Button (FAB-style) */}
          <motion.button
            onClick={handleQuickAction}
            className="relative bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full shadow-lg"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Plus size={20} />
            
            {/* Ripple effect */}
            <motion.div
              className="absolute inset-0 bg-white/20 rounded-full"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};