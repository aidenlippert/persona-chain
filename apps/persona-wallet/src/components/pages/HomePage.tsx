import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  ArrowRight,
  Plus,
  Activity,
  Users,
  Clock
} from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import { StatsCard } from '../ui/StatsCard';
import { CredentialPreview } from '../credentials/CredentialPreview';
import { RecentActivity } from '../activity/RecentActivity';
import { QuickActions } from '../actions/QuickActions';
import { WelcomeCard } from '../ui/WelcomeCard';

export const HomePage: React.FC = () => {
  const { 
    identity, 
    stats, 
    credentials, 
    proofHistory, 
    refreshStats,
    getActiveCredentials 
  } = useWalletStore();

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const activeCredentials = getActiveCredentials();
  const recentProofs = proofHistory.slice(0, 3);

  if (!identity) {
    return <WelcomeCard />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">
              Welcome back, {identity.name.split(' ')[0]}!
            </h2>
            <p className="text-blue-100 text-sm">
              Your digital identity is secure and ready to share
            </p>
          </div>
          <motion.div
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield size={24} className="text-white" />
          </motion.div>
        </div>

        {/* Security score */}
        <div className="mt-4 flex items-center space-x-2">
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <motion.div
              className="bg-white rounded-full h-2"
              initial={{ width: 0 }}
              animate={{ width: `${stats?.security.securityScore || 0}%` }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>
          <span className="text-sm font-medium">
            {stats?.security.securityScore || 0}% secure
          </span>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Overview */}
      {stats && (
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatsCard
            title="Credentials"
            value={stats.credentials.active}
            total={stats.credentials.total}
            icon={Shield}
            color="blue"
            trend={stats.credentials.active > 0 ? 'up' : 'neutral'}
          />
          <StatsCard
            title="Proofs Shared"
            value={stats.proofs.totalShared}
            icon={Zap}
            color="purple"
            trend={stats.proofs.recentActivity > 0 ? 'up' : 'neutral'}
          />
          <StatsCard
            title="Success Rate"
            value={`${stats.proofs.successRate}%`}
            icon={TrendingUp}
            color="green"
            trend={stats.proofs.successRate > 80 ? 'up' : 'neutral'}
          />
          <StatsCard
            title="Trust Score"
            value={stats.credentials.trustScoreAverage}
            icon={Users}
            color="orange"
            trend={stats.credentials.trustScoreAverage > 70 ? 'up' : 'neutral'}
          />
        </motion.div>
      )}

      {/* Recent Credentials */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Credentials
          </h3>
          <motion.button
            className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 text-sm font-medium"
            whileTap={{ scale: 0.95 }}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </motion.button>
        </div>

        <div className="space-y-3">
          {activeCredentials.slice(0, 3).map((credential, index) => (
            <motion.div
              key={credential.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              <CredentialPreview credential={credential} />
            </motion.div>
          ))}
          
          {activeCredentials.length === 0 && (
            <motion.div
              className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Plus size={32} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                No credentials yet. Start by connecting your accounts.
              </p>
              <motion.button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                whileTap={{ scale: 0.95 }}
              >
                Add Credential
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* Recent Activity */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Activity size={18} />
            <span>Recent Activity</span>
          </h3>
          <motion.button
            className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 text-sm font-medium"
            whileTap={{ scale: 0.95 }}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </motion.button>
        </div>

        <RecentActivity activities={recentProofs} />
      </motion.section>

      {/* Quick Insights */}
      <motion.section
        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp size={18} className="text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Insights
          </h3>
        </div>

        <div className="space-y-4">
          {/* Most requested domain */}
          {stats && stats.proofs.byDomain && Object.keys(stats.proofs.byDomain).length > 0 && (
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                Most requested domain
              </span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">
                {Object.entries(stats.proofs.byDomain)
                  .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
              </span>
            </div>
          )}

          {/* Average response time */}
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-600 dark:text-gray-300 text-sm">
              Average response time
            </span>
            <div className="flex items-center space-x-1">
              <Clock size={14} className="text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                {stats?.sharing.averageResponseTime || 0}s
              </span>
            </div>
          </div>

          {/* Trust level */}
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-600 dark:text-gray-300 text-sm">
              Overall trust level
            </span>
            <span className={`font-medium ${
              (stats?.credentials.trustScoreAverage || 0) > 80 
                ? 'text-green-600' 
                : (stats?.credentials.trustScoreAverage || 0) > 60 
                ? 'text-yellow-600' 
                : 'text-red-600'
            }`}>
              {(stats?.credentials.trustScoreAverage || 0) > 80 ? 'High' : 
               (stats?.credentials.trustScoreAverage || 0) > 60 ? 'Medium' : 'Low'}
            </span>
          </div>
        </div>
      </motion.section>

      {/* Bottom spacing for navigation */}
      <div className="h-4" />
    </div>
  );
};