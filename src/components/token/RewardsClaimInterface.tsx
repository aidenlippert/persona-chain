/**
 * Rewards Claim Interface Component
 * Displays credential verification rewards and allows claiming
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { persTokenService } from '../../services/persTokenService';
import { errorService, ErrorCategory } from '../../services/errorService';
import { analyticsService } from '../../services/analyticsService';
import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

// Safe BigInt constants
const DECIMALS_18 = BigInt('1000000000000000000'); // 10^18


interface RewardInfo {
  totalEarned: bigint;
  totalClaimed: bigint;
  pendingRewards: bigint;
  dailyRewardsClaimed: bigint;
  canClaimRewards: boolean;
}

interface CredentialReward {
  credentialType: string;
  baseReward: bigint;
  zkProofBonus: bigint;
  crossChainBonus: bigint;
  totalReward: bigint;
}

export const RewardsClaimInterface: React.FC = () => {
  const [rewardInfo, setRewardInfo] = useState<RewardInfo | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<CredentialReward[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const DAILY_LIMIT = BigInt(1000) * DECIMALS_18; // 1000 PERS

  useEffect(() => {
    loadRewardData();
  }, []);

  const loadRewardData = async () => {
    try {
      setIsLoading(true);
      
      if (!persTokenService.isInitialized()) {
        await persTokenService.initialize();
      }

      const info = await persTokenService.getRewardInfo();
      setRewardInfo(info);

      // Mock recent verifications (in production, fetch from backend)
      const mockVerifications: CredentialReward[] = [
        await persTokenService.calculateCredentialReward('github_basic', true, false),
        await persTokenService.calculateCredentialReward('linkedin_professional', false, false),
        await persTokenService.calculateCredentialReward('plaid_income', true, true),
      ];
      setRecentVerifications(mockVerifications);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load reward data');
      errorService.logError(error, {
        category: ErrorCategory.BLOCKCHAIN,
        metadata: { component: 'RewardsClaimInterface' }
      });
      setError('Unable to load reward information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    try {
      setIsClaiming(true);
      setError(null);

      const txHash = await persTokenService.claimPendingRewards();
      
      analyticsService.trackEvent(
        'rewards',
        'claim',
        'completed',
        '',
        {
          amount: rewardInfo?.pendingRewards.toString(),
          txHash,
        }
      );

      // Reload data
      await loadRewardData();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to claim rewards');
      setError(error.message);
      errorService.logError(error, {
        category: ErrorCategory.BLOCKCHAIN,
        metadata: { action: 'claim_rewards' }
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const formatCredentialName = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getCredentialIcon = (type: string) => {
    if (type.includes('github')) return '🐙';
    if (type.includes('linkedin')) return '💼';
    if (type.includes('plaid')) return '🏦';
    if (type.includes('discord')) return '💬';
    if (type.includes('twitter')) return '🐦';
    if (type.includes('education')) return '🎓';
    if (type.includes('employment')) return '💻';
    return '📄';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!rewardInfo) {
    return (
      <div className="p-6 text-center text-gray-500">
        Unable to load reward information
      </div>
    );
  }

  const dailyProgress = (rewardInfo.dailyRewardsClaimed * BigInt(100)) / DAILY_LIMIT;
  const dailyProgressPercent = Number(dailyProgress);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Credential Verification Rewards
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Earn PERS tokens for verifying your credentials
          </p>
        </div>

        {/* Reward Stats */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Earned</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {persTokenService.formatTokenAmount(rewardInfo.totalEarned, 2)} PERS
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Claimed</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {persTokenService.formatTokenAmount(rewardInfo.totalClaimed, 2)} PERS
            </p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400">Pending Rewards</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {persTokenService.formatTokenAmount(rewardInfo.pendingRewards, 2)} PERS
            </p>
          </div>
        </div>

        {/* Daily Limit Progress */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Daily Reward Limit
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {persTokenService.formatTokenAmount(rewardInfo.dailyRewardsClaimed, 0)} / 1,000 PERS
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div 
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(dailyProgressPercent, 100)}%` }}
              />
            </div>
            {dailyProgressPercent >= 100 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Daily limit reached. Resets in 24 hours.
              </p>
            )}
          </div>
        </div>

        {/* Claim Button */}
        {rewardInfo.canClaimRewards && (
          <div className="px-6 pb-6">
            <button
              onClick={handleClaimRewards}
              disabled={isClaiming}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center space-x-2"
            >
              {isClaiming ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Claim {persTokenService.formatTokenAmount(rewardInfo.pendingRewards, 2)} PERS</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Recent Verifications */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Recent Verifications
          </h3>
          <div className="space-y-3">
            {recentVerifications.map((verification, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getCredentialIcon(verification.credentialType)}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatCredentialName(verification.credentialType)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Base: {persTokenService.formatTokenAmount(verification.baseReward, 0)}
                      {verification.zkProofBonus > BigInt(0) && 
                        ` + ZK: ${persTokenService.formatTokenAmount(verification.zkProofBonus, 0)}`}
                      {verification.crossChainBonus > BigInt(0) && 
                        ` + Cross-chain: ${persTokenService.formatTokenAmount(verification.crossChainBonus, 0)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    +{persTokenService.formatTokenAmount(verification.totalReward, 0)} PERS
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-6 pt-0">
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
              <ExclamationCircleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            How to Earn More PERS
          </h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Verify new credentials to earn base rewards</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Use zero-knowledge proofs for bonus rewards</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Perform cross-chain verifications for extra bonuses</span>
            </li>
            <li className="flex items-start space-x-2">
              <ClockIcon className="h-4 w-4 text-blue-500 mt-0.5" />
              <span>24-hour cooldown between same credential verifications</span>
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};