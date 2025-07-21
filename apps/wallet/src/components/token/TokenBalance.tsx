/**
 * Token Balance Component
 * Displays user's PERS token balance with real-time updates
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { persTokenService } from '../../services/persTokenService';
import { errorService, ErrorCategory } from '../../services/errorService';

interface TokenBalanceProps {
  className?: string;
  showDecimals?: boolean;
  showUSD?: boolean;
}

export const TokenBalance: React.FC<TokenBalanceProps> = ({
  className = '',
  showDecimals = true,
  showUSD = false,
}) => {
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usdValue, setUsdValue] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    const loadBalance = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize service if needed
        if (!persTokenService.isInitialized()) {
          await persTokenService.initialize();
        }

        // Get balance
        const userBalance = await persTokenService.getBalance();
        if (mounted) {
          setBalance(userBalance);
          
          // Mock USD calculation (in production, fetch from price oracle)
          const balanceNumber = Number(persTokenService.formatTokenAmount(userBalance, 2));
          setUsdValue(balanceNumber * 0.05); // Mock $0.05 per PERS
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error('Failed to load balance');
          errorService.logError(error, {
            category: ErrorCategory.BLOCKCHAIN,
            metadata: { component: 'TokenBalance' }
          });
          setError('Unable to load balance');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadBalance();

    // Set up auto-refresh
    const interval = setInterval(loadBalance, 30000); // Refresh every 30 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const formatBalance = () => {
    if (balance === BigInt(0)) return '0';
    return persTokenService.formatTokenAmount(balance, showDecimals ? 2 : 0);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <span className="text-sm text-gray-500">PERS</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-500 ${className}`}>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <motion.div
      className={`flex items-center space-x-2 ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col">
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatBalance()}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">PERS</span>
        </div>
        {showUSD && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ≈ ${usdValue.toFixed(2)} USD
          </span>
        )}
      </div>
    </motion.div>
  );
};