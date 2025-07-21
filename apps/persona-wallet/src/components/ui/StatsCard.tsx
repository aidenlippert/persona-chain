import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  total?: number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
  className?: string;
}

const colorClasses = {
  blue: {
    bg: 'from-blue-500 to-blue-600',
    text: 'text-blue-600',
    lightBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  green: {
    bg: 'from-green-500 to-green-600',
    text: 'text-green-600',
    lightBg: 'bg-green-50 dark:bg-green-900/20',
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    text: 'text-purple-600',
    lightBg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  orange: {
    bg: 'from-orange-500 to-orange-600',
    text: 'text-orange-600',
    lightBg: 'bg-orange-50 dark:bg-orange-900/20',
  },
  red: {
    bg: 'from-red-500 to-red-600',
    text: 'text-red-600',
    lightBg: 'bg-red-50 dark:bg-red-900/20',
  },
  gray: {
    bg: 'from-gray-500 to-gray-600',
    text: 'text-gray-600',
    lightBg: 'bg-gray-50 dark:bg-gray-900/20',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  total,
  icon: Icon,
  color,
  trend,
  trendValue,
  subtitle,
  className,
}) => {
  const colors = colorClasses[color];

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={12} className="text-green-500" />;
      case 'down':
        return <TrendingDown size={12} className="text-red-500" />;
      case 'neutral':
      default:
        return <Minus size={12} className="text-gray-400" />;
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toString();
    }
    return val;
  };

  return (
    <motion.div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700',
        className
      )}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            {title}
          </p>
          
          <div className="flex items-baseline space-x-2 mb-2">
            <motion.span
              className="text-2xl font-bold text-gray-900 dark:text-white"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            >
              {formatValue(value)}
            </motion.span>
            
            {total && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                / {formatValue(total)}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {subtitle}
            </p>
          )}

          {(trend || trendValue) && (
            <div className="flex items-center space-x-1">
              {trend && getTrendIcon()}
              {trendValue && (
                <span className={cn(
                  'text-xs font-medium',
                  trend === 'up' ? 'text-green-600' :
                  trend === 'down' ? 'text-red-600' :
                  'text-gray-500'
                )}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>

        <motion.div
          className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center',
            colors.bg
          )}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
        >
          <Icon size={20} className="text-white" />
        </motion.div>
      </div>

      {/* Progress bar for value vs total */}
      {total && typeof value === 'number' && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <motion.div
              className={cn('h-1.5 rounded-full bg-gradient-to-r', colors.bg)}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((value / total) * 100, 100)}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};