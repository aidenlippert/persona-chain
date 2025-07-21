/**
 * Mobile Main Dashboard
 * Unified mobile interface combining all PWA and community features
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileNavigationTabs, { pwaFeatureTabs, NavigationTab } from './MobileNavigationTabs';
import MobileProofExplorer from './MobileProofExplorer';
import MobilePWADashboard from './MobilePWADashboard';
import MobileCommunityDashboard from './MobileCommunityDashboard';
import { 
  Home,
  Search,
  Users,
  Smartphone,
  BarChart3,
  Plus,
  Bell,
  Settings,
  Zap,
  Shield,
  CreditCard,
  User,
  Download,
  Share2,
  Star,
  TrendingUp,
  Award,
  Target,
  Wifi,
  Battery,
  Clock
} from 'lucide-react';
import { CommunityProof } from '../../services/community/CommunityProofLibrary';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
}

interface DashboardStats {
  totalCredentials: number;
  totalProofs: number;
  communityEndorsements: number;
  offlineReady: number;
  trustScore: number;
  lastActivity: string;
}

const MobileMainDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalCredentials: 8,
    totalProofs: 12,
    communityEndorsements: 24,
    offlineReady: 6,
    trustScore: 0.89,
    lastActivity: '2 minutes ago'
  });
  const [notifications, setNotifications] = useState(3);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: 'create_credential',
      title: 'New Credential',
      description: 'Verify and add credentials',
      icon: CreditCard,
      color: 'bg-blue-500',
      action: () => console.log('Create credential')
    },
    {
      id: 'generate_proof',
      title: 'Generate Proof',
      description: 'Create ZK proof',
      icon: Shield,
      color: 'bg-purple-500',
      action: () => console.log('Generate proof')
    },
    {
      id: 'share_community',
      title: 'Share to Community',
      description: 'Share with others',
      icon: Share2,
      color: 'bg-green-500',
      action: () => console.log('Share to community')
    },
    {
      id: 'explore_proofs',
      title: 'Explore Proofs',
      description: 'Browse community',
      icon: Search,
      color: 'bg-orange-500',
      action: () => setActiveTab('explore')
    }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleProofSelect = (proof: CommunityProof) => {
    console.log('Selected proof:', proof);
  };

  const handleProofShare = (proof: CommunityProof) => {
    console.log('Share proof:', proof);
  };

  const handleProofUse = (proof: CommunityProof) => {
    console.log('Use proof:', proof);
  };

  const handleCreateProof = () => {
    console.log('Create new proof');
  };

  const renderDashboardContent = () => {
    switch (activeTab) {
      case 'explore':
        return (
          <MobileProofExplorer
            onProofSelect={handleProofSelect}
            onProofShare={handleProofShare}
            onProofUse={handleProofUse}
          />
        );
      
      case 'community':
        return (
          <MobileCommunityDashboard
            onCreateProof={handleCreateProof}
            onShareProof={handleProofShare}
            onExploreProofs={() => setActiveTab('explore')}
          />
        );
      
      case 'pwa':
        return <MobilePWADashboard />;
      
      case 'stats':
        return (
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Performance Analytics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">89%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Zap className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">1.2s</div>
                  <div className="text-sm text-gray-600">Avg Speed</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">156</div>
                  <div className="text-sm text-gray-600">Interactions</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Award className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-600">Gold</div>
                  <div className="text-sm text-gray-600">Tier Level</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold">Welcome back!</h1>
                  <p className="text-sm opacity-80">
                    Your digital identity is {isOnline ? 'online' : 'offline'}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-green-300" />
                  ) : (
                    <div className="w-5 h-5 bg-orange-300 rounded-full" />
                  )}
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="relative p-2 bg-white bg-opacity-20 rounded-full"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {notifications}
                      </div>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold">{dashboardStats.totalCredentials}</div>
                  <div className="text-xs opacity-80">Credentials</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{dashboardStats.totalProofs}</div>
                  <div className="text-xs opacity-80">Proofs</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{(dashboardStats.trustScore * 100).toFixed(0)}%</div>
                  <div className="text-xs opacity-80">Trust</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={action.action}
                        className="p-4 bg-white border border-gray-200 rounded-xl text-left"
                      >
                        <div className={`inline-flex p-2 rounded-lg ${action.color} text-white mb-2`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {action.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {action.description}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Status Cards */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">System Status</h3>
                
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        isOnline ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {isOnline ? <Wifi className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {isOnline ? 'Online Mode' : 'Offline Mode'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {isOnline ? 'All features available' : `${dashboardStats.offlineReady} items cached`}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`w-3 h-3 rounded-full ${
                      isOnline ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Last Activity</h4>
                        <p className="text-sm text-gray-500">{dashboardStats.lastActivity}</p>
                      </div>
                    </div>
                    
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="text-blue-500 text-sm font-medium"
                    >
                      View All
                    </motion.button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Trust Score</h4>
                        <p className="text-sm text-gray-500">
                          {dashboardStats.communityEndorsements} community endorsements
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {(dashboardStats.trustScore * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">Excellent</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="text-blue-500 text-sm"
                  >
                    View All
                  </motion.button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Proof generated successfully</p>
                      <p className="text-xs text-gray-500">2 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Received community endorsement</p>
                      <p className="text-xs text-gray-500">1 hour ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">New credential verified</p>
                      <p className="text-xs text-gray-500">3 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // Update tabs with notification badges
  const tabsWithBadges: NavigationTab[] = pwaFeatureTabs.map(tab => {
    if (tab.id === 'community') {
      return { ...tab, badge: notifications };
    }
    return tab;
  });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderDashboardContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <MobileNavigationTabs
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showLabels={true}
        variant="bottom"
      />
    </div>
  );
};

export default MobileMainDashboard;