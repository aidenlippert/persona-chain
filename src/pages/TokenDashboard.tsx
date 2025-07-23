/**
 * Token Dashboard Page
 * Main interface for PERS token management
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TokenBalance } from '../components/token/TokenBalance';
import { StakingInterface } from '../components/token/StakingInterface';
import { RewardsClaimInterface } from '../components/token/RewardsClaimInterface';
import { 
  CurrencyDollarIcon, 
  LockClosedIcon, 
  GiftIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  WalletIcon
} from '@heroicons/react/24/outline';

type TabType = 'overview' | 'staking' | 'rewards';

export const TokenDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: ChartBarIcon },
    { id: 'staking' as TabType, name: 'Staking', icon: LockClosedIcon },
    { id: 'rewards' as TabType, name: 'Rewards', icon: GiftIcon },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'staking':
        return <StakingInterface />;
      case 'rewards':
        return <RewardsClaimInterface />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  PERS Token Dashboard
                </h1>
              </div>
              <TokenBalance showDecimals showUSD className="text-right" />
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <Icon className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${activeTab === tab.id
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      }
                    `} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Supply"
          value="1,000,000,000"
          unit="PERS"
          change="+0%"
          icon={CurrencyDollarIcon}
          color="blue"
        />
        <StatCard
          title="Market Cap"
          value="$50,000,000"
          unit="USD"
          change="+12.5%"
          icon={ChartBarIcon}
          color="green"
        />
        <StatCard
          title="Holders"
          value="12,543"
          unit="Wallets"
          change="+5.2%"
          icon={WalletIcon}
          color="purple"
        />
      </div>

      {/* Token Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Token Distribution
        </h3>
        <div className="space-y-4">
          <DistributionItem label="Credential Rewards" percentage={30} color="bg-blue-500" />
          <DistributionItem label="Staking Rewards" percentage={20} color="bg-green-500" />
          <DistributionItem label="Ecosystem Fund" percentage={15} color="bg-purple-500" />
          <DistributionItem label="Team (Vested)" percentage={15} color="bg-yellow-500" />
          <DistributionItem label="Public Sale" percentage={10} color="bg-red-500" />
          <DistributionItem label="Liquidity Pool" percentage={10} color="bg-gray-500" />
        </div>
      </div>

      {/* Token Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          title="Staking Rewards"
          description="Earn up to 25% APY by staking your PERS tokens. Higher tiers unlock better rates and increased trust scores."
          icon={LockClosedIcon}
          benefits={[
            'Bronze Tier: 12% APY (100+ PERS)',
            'Silver Tier: 15% APY (1,000+ PERS)',
            'Gold Tier: 20% APY (10,000+ PERS)',
            'Platinum Tier: 25% APY (100,000+ PERS)'
          ]}
        />
        <FeatureCard
          title="Verification Rewards"
          description="Earn PERS tokens for verifying your credentials. Bonus rewards for ZK proofs and cross-chain verifications."
          icon={GiftIcon}
          benefits={[
            'Base rewards for each credential',
            'ZK proof bonuses (+50%)',
            'Cross-chain bonuses (+30%)',
            'Daily limit: 1,000 PERS'
          ]}
        />
      </div>

      {/* Coming Soon */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold mb-1">PersonaDAO Governance</h4>
            <p className="text-sm opacity-90">Vote on protocol upgrades and treasury management</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Credential Marketplace</h4>
            <p className="text-sm opacity-90">Buy and sell verified credentials with PERS</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Enterprise Staking</h4>
            <p className="text-sm opacity-90">Special rates for institutional holders</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, change, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <span className={`text-sm font-medium ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500">{unit}</p>
    </div>
  );
};

// Distribution Item Component
interface DistributionItemProps {
  label: string;
  percentage: number;
  color: string;
}

const DistributionItem: React.FC<DistributionItemProps> = ({ label, percentage, color }) => {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Feature Card Component
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  benefits: string[];
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, benefits }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Icon className="h-8 w-8 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      <ul className="space-y-2">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-start space-x-2 text-sm">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mt-0.5" />
            <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};