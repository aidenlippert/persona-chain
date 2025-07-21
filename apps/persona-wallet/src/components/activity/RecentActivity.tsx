import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  Zap,
  Share2,
  Eye
} from 'lucide-react';
import { ProofHistory } from '../../types/wallet';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '../../lib/utils';

interface RecentActivityProps {
  activities: ProofHistory[];
  showDetails?: boolean;
  className?: string;
}

const domainIcons = {
  academic: '🎓',
  financial: '💰',
  health: '🏥',
  social: '👥',
  government: '🏛️',
  iot: '📱',
};

const getActivityIcon = (activity: ProofHistory) => {
  if (activity.proofVerified === true) {
    return <Check size={16} className="text-green-500" />;
  } else if (activity.proofVerified === false) {
    return <X size={16} className="text-red-500" />;
  } else {
    return <Clock size={16} className="text-yellow-500" />;
  }
};

const getActivityStatus = (activity: ProofHistory) => {
  if (activity.proofVerified === true) {
    return { text: 'Verified', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' };
  } else if (activity.proofVerified === false) {
    return { text: 'Failed', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' };
  } else {
    return { text: 'Pending', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' };
  }
};

interface ActivityItemProps {
  activity: ProofHistory;
  index: number;
  showDetails?: boolean;
  onViewDetails?: (activity: ProofHistory) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ 
  activity, 
  index, 
  showDetails = false,
  onViewDetails 
}) => {
  const status = getActivityStatus(activity);
  const isRecent = new Date(activity.sharedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -1 }}
      onClick={() => onViewDetails?.(activity)}
    >
      <div className="flex items-start justify-between">
        {/* Left side - activity info */}
        <div className="flex items-start space-x-3 flex-1">
          {/* Domain icon */}
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            {domainIcons[activity.domain] || '🔐'}
          </div>

          {/* Activity details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {activity.operation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h4>
              {isRecent && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  New
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Shared with {activity.verifierName}
            </p>

            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock size={12} />
                <span>{formatDistanceToNow(new Date(activity.sharedAt), { addSuffix: true })}</span>
              </div>
              
              {activity.sessionId && (
                <div className="flex items-center space-x-1">
                  <Share2 size={12} />
                  <span>Session {activity.sessionId.slice(-6)}</span>
                </div>
              )}
            </div>

            {/* Detailed view */}
            {showDetails && (
              <motion.div
                className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
              >
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Domain:</span>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {activity.domain}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Timestamp:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {format(new Date(activity.sharedAt), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  {activity.trustScore && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Trust Score:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {activity.trustScore}%
                      </p>
                    </div>
                  )}
                  {activity.proofSize && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Proof Size:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {activity.proofSize} bytes
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right side - status and actions */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Status badge */}
          <div className={cn(
            'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
            status.color
          )}>
            {getActivityIcon(activity)}
            <span>{status.text}</span>
          </div>

          {/* View details button */}
          {onViewDetails && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(activity);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
              whileTap={{ scale: 0.95 }}
              title="View details"
            >
              <Eye size={14} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Progress indicator for pending proofs */}
      {activity.proofVerified === null && (
        <motion.div
          className="mt-3 flex items-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <motion.div
              className="bg-yellow-500 h-1 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '60%' }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Processing...
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  showDetails = false,
  className,
}) => {
  const handleViewDetails = (activity: ProofHistory) => {
    // This would open a modal with detailed activity information
    console.log('View activity details:', activity);
  };

  if (activities.length === 0) {
    return (
      <motion.div
        className={cn("text-center py-8", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap size={24} className="text-gray-400" />
        </div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          No activity yet
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Your proof sharing activity will appear here
        </p>
      </motion.div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {activities.map((activity, index) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          index={index}
          showDetails={showDetails}
          onViewDetails={handleViewDetails}
        />
      ))}
    </div>
  );
};