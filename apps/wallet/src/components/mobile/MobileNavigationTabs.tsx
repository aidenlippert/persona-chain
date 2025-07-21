/**
 * Mobile Navigation Tabs
 * Touch-optimized bottom navigation for mobile devices
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  CreditCard,
  Shield,
  Users,
  Settings,
  Search,
  Bell,
  Zap,
  Smartphone,
  BarChart3
} from 'lucide-react';

export interface NavigationTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isActive?: boolean;
}

interface MobileNavigationTabsProps {
  tabs: NavigationTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  showLabels?: boolean;
  variant?: 'bottom' | 'top';
}

const MobileNavigationTabs: React.FC<MobileNavigationTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  showLabels = true,
  variant = 'bottom'
}) => {
  const containerClasses = variant === 'bottom' 
    ? 'fixed bottom-0 left-0 right-0 z-50'
    : 'sticky top-0 z-50';

  return (
    <div className={`${containerClasses} bg-white border-t border-gray-200 px-4 py-2 safe-area-inset-bottom`}>
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 ${
                showLabels ? 'space-y-1' : ''
              }`}
            >
              {/* Icon Container */}
              <div className="relative">
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    color: isActive ? '#3B82F6' : '#6B7280'
                  }}
                  transition={{ duration: 0.2 }}
                  className={`p-2 rounded-xl ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </motion.div>

                {/* Badge */}
                {tab.badge && tab.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </motion.div>
                )}

                {/* Active Indicator Dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"
                  />
                )}
              </div>

              {/* Label */}
              {showLabels && (
                <motion.span
                  animate={{
                    color: isActive ? '#3B82F6' : '#6B7280',
                    fontWeight: isActive ? 600 : 400
                  }}
                  className="text-xs truncate max-w-full"
                >
                  {tab.label}
                </motion.span>
              )}

              {/* Ripple Effect */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={isActive ? { scale: 1, opacity: 0.1 } : { scale: 0, opacity: 0 }}
                className="absolute inset-0 bg-blue-600 rounded-xl"
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavigationTabs;

// Predefined tab configurations for common use cases
export const defaultTabs: NavigationTab[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home
  },
  {
    id: 'credentials',
    label: 'Credentials',
    icon: CreditCard
  },
  {
    id: 'proofs',
    label: 'Proofs',
    icon: Shield
  },
  {
    id: 'community',
    label: 'Community',
    icon: Users
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings
  }
];

export const pwaFeatureTabs: NavigationTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: Search
  },
  {
    id: 'community',
    label: 'Community',
    icon: Users
  },
  {
    id: 'pwa',
    label: 'PWA',
    icon: Smartphone
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: BarChart3
  }
];

export const communityTabs: NavigationTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: Search
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: Zap
  },
  {
    id: 'notifications',
    label: 'Updates',
    icon: Bell,
    badge: 3
  }
];