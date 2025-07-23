/**
 * Staking Interface Component
 * Allows users to stake PERS tokens and view staking information
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { persTokenService } from '../../services/persTokenService';
import { errorService, ErrorCategory } from '../../services/errorService';
import { analyticsService } from '../../services/analyticsService';

// Safe BigInt constants
const DECIMALS_18 = BigInt('1000000000000000000'); // 10^18


interface StakeInfo {
  amount: bigint;
  startTime: number;
  lockPeriod: number;
  tier: number;
  pendingRewards: bigint;
  trustScore: number;
}

export const StakingInterface: React.FC = () => {
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null);
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [stakeAmount, setStakeAmount] = useState('');
  const [lockPeriod, setLockPeriod] = useState(90); // days
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tier thresholds
  const TIERS = {
    BRONZE: { amount: 100, apy: 12, color: 'text-orange-600' },
    SILVER: { amount: 1000, apy: 15, color: 'text-gray-500' },
    GOLD: { amount: 10000, apy: 20, color: 'text-yellow-500' },
    PLATINUM: { amount: 100000, apy: 25, color: 'text-purple-600' },
  };

  useEffect(() => {
    loadStakingData();
  }, []);

  const loadStakingData = async () => {
    try {
      if (!persTokenService.isInitialized()) {
        await persTokenService.initialize();
      }

      const [userBalance, userStakeInfo] = await Promise.all([
        persTokenService.getBalance(),
        persTokenService.getStakeInfo(),
      ]);

      setBalance(userBalance);
      setStakeInfo(userStakeInfo);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load staking data');
      errorService.logError(error, {
        category: ErrorCategory.BLOCKCHAIN,
        metadata: { component: 'StakingInterface' }
      });
    }
  };

  const calculateTier = (amount: number): { name: string; apy: number; color: string } => {
    if (amount >= TIERS.PLATINUM.amount) return { name: 'Platinum', ...TIERS.PLATINUM };
    if (amount >= TIERS.GOLD.amount) return { name: 'Gold', ...TIERS.GOLD };
    if (amount >= TIERS.SILVER.amount) return { name: 'Silver', ...TIERS.SILVER };
    if (amount >= TIERS.BRONZE.amount) return { name: 'Bronze', ...TIERS.BRONZE };
    return { name: 'None', apy: 0, color: 'text-gray-400' };
  };

  const handleStake = async () => {
    try {
      setIsStaking(true);
      setError(null);

      const amountBigInt = persTokenService.parseTokenAmount(stakeAmount);
      
      if (amountBigInt < BigInt(100) * DECIMALS_18) {
        throw new Error('Minimum stake amount is 100 PERS');
      }

      if (amountBigInt > balance) {
        throw new Error('Insufficient balance');
      }

      const txHash = await persTokenService.stake(amountBigInt, lockPeriod);
      
      analyticsService.trackEvent(
        'staking',
        'stake',
        'completed',
        '',
        {
          amount: stakeAmount,
          lockPeriod,
          txHash,
        }
      );

      // Reload data
      await loadStakingData();
      setStakeAmount('');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Staking failed');
      setError(error.message);
      errorService.logError(error, {
        category: ErrorCategory.BLOCKCHAIN,
        metadata: { action: 'stake', amount: stakeAmount, lockPeriod }
      });
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    try {
      setIsUnstaking(true);
      setError(null);

      const txHash = await persTokenService.unstake();
      
      analyticsService.trackEvent(
        'staking',
        'unstake',
        'completed',
        '',
        { txHash }
      );

      // Reload data
      await loadStakingData();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unstaking failed');
      setError(error.message);
      errorService.logError(error, {
        category: ErrorCategory.BLOCKCHAIN,
        metadata: { action: 'unstake' }
      });
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleClaimRewards = async () => {
    try {
      setIsClaiming(true);
      setError(null);

      const txHash = await persTokenService.claimPendingRewards();
      
      analyticsService.trackEvent(
        'staking',
        'claim_rewards',
        'completed',
        '',
        { txHash }
      );

      // Reload data
      await loadStakingData();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Claiming rewards failed');
      setError(error.message);
      errorService.logError(error, {
        category: ErrorCategory.BLOCKCHAIN,
        metadata: { action: 'claim_rewards' }
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const currentTier = stakeInfo ? calculateTier(Number(persTokenService.formatTokenAmount(stakeInfo.amount, 0))) : calculateTier(0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          PERS Token Staking
        </h2>

        {/* Current Stake Info */}
        {stakeInfo && (
          <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Your Stake
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Staked Amount:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {persTokenService.formatTokenAmount(stakeInfo.amount, 2)} PERS
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Current Tier:</span>
                <p className={`font-semibold ${currentTier.color}`}>
                  {currentTier.name} ({currentTier.apy}% APY)
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Pending Rewards:</span>
                <p className="font-semibold text-green-600">
                  {persTokenService.formatTokenAmount(stakeInfo.pendingRewards, 2)} PERS
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Trust Score:</span>
                <p className="font-semibold text-blue-600">
                  {stakeInfo.trustScore}/100
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleUnstake}
                disabled={isUnstaking}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUnstaking ? 'Unstaking...' : 'Unstake'}
              </button>
              <button
                onClick={handleClaimRewards}
                disabled={isClaiming || stakeInfo.pendingRewards === BigInt(0)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClaiming ? 'Claiming...' : 'Claim Rewards'}
              </button>
            </div>
          </div>
        )}

        {/* New Stake Form */}
        {!stakeInfo && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stake Amount (min. 100 PERS)
              </label>
              <input
                type="text"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-sm text-gray-500 mt-1">
                Available: {persTokenService.formatTokenAmount(balance, 2)} PERS
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lock Period (days)
              </label>
              <select
                value={lockPeriod}
                onChange={(e) => setLockPeriod(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={90}>90 days (3 months)</option>
                <option value={180}>180 days (6 months)</option>
                <option value={365}>365 days (1 year)</option>
                <option value={730}>730 days (2 years)</option>
                <option value={1095}>1095 days (3 years)</option>
              </select>
            </div>

            {/* Tier Preview */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                Tier Preview
              </h4>
              {stakeAmount && (
                <div className="text-sm">
                  {(() => {
                    const amount = parseFloat(stakeAmount) || 0;
                    const tier = calculateTier(amount);
                    return (
                      <p className={tier.color}>
                        {tier.name} Tier - {tier.apy}% APY
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>

            <button
              onClick={handleStake}
              disabled={isStaking || !stakeAmount}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isStaking ? 'Staking...' : 'Stake PERS'}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Tier Information */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Staking Tiers
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(TIERS).map(([tierName, tierInfo]) => (
              <div key={tierName} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className={`font-semibold ${tierInfo.color}`}>{tierName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {tierInfo.amount.toLocaleString()} PERS
                </p>
                <p className="text-sm font-semibold">{tierInfo.apy}% APY</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};