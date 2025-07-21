import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ExternalLink,
  MoreVertical,
  Zap
} from 'lucide-react';
import { Credential } from '../../types/wallet';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CredentialCardProps {
  credential: Credential;
  onSelect?: (credential: Credential) => void;
  onAction?: (action: string, credential: Credential) => void;
  selected?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

const domainColors = {
  academic: 'from-blue-500 to-indigo-600',
  financial: 'from-green-500 to-emerald-600',
  health: 'from-red-500 to-pink-600',
  social: 'from-purple-500 to-violet-600',
  government: 'from-orange-500 to-amber-600',
  iot: 'from-cyan-500 to-teal-600',
};

const domainIcons = {
  academic: '🎓',
  financial: '💰',
  health: '🏥',
  social: '👥',
  government: '🏛️',
  iot: '📱',
};

export const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onSelect,
  onAction,
  selected = false,
  showActions = true,
  compact = false,
}) => {
  const getStatusIcon = () => {
    switch (credential.status) {
      case 'active':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'expired':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'revoked':
        return <AlertCircle size={16} className="text-gray-500" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (credential.status) {
      case 'active':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'expired':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'revoked':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(credential);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    if (onAction) {
      onAction(action, credential);
    }
  };

  const gradientClass = domainColors[credential.domain] || 'from-gray-500 to-gray-600';

  return (
    <motion.div
      className={cn(
        'relative bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 cursor-pointer',
        selected 
          ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        compact ? 'p-4' : 'p-6',
        credential.status !== 'active' && 'opacity-75'
      )}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      layout
    >
      {/* Selection indicator */}
      {selected && (
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <CheckCircle size={16} className="text-white" />
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Domain icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xl',
            gradientClass
          )}>
            {domainIcons[credential.domain]}
          </div>

          {/* Credential info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {credential.type}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {credential.issuer.name}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusIcon()}
              <span className={cn(
                'text-xs font-medium px-2 py-1 rounded-full',
                getStatusColor()
              )}>
                {credential.status}
              </span>
            </div>
          </div>
        </div>

        {/* Actions menu */}
        {showActions && (
          <motion.button
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={(e) => handleActionClick(e, 'menu')}
            whileTap={{ scale: 0.95 }}
          >
            <MoreVertical size={16} className="text-gray-400" />
          </motion.button>
        )}
      </div>

      {/* Credential details */}
      {!compact && (
        <div className="space-y-3">
          {/* Key claims preview */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(credential.claims).slice(0, 4).map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="text-gray-500 dark:text-gray-400 truncate capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </dt>
                <dd className="font-medium text-gray-900 dark:text-white truncate">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            ))}
          </div>

          {/* Trust score */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Shield size={14} className="text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Trust Score
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    credential.metadata.trustScore >= 80 ? 'bg-green-500' :
                    credential.metadata.trustScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${credential.metadata.trustScore}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {credential.metadata.trustScore}%
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <Clock size={12} />
              <span>
                Updated {formatDistanceToNow(new Date(credential.metadata.lastUpdated), { addSuffix: true })}
              </span>
            </div>

            {/* Quick actions */}
            <div className="flex items-center space-x-1">
              <motion.button
                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                onClick={(e) => handleActionClick(e, 'generate-proof')}
                whileTap={{ scale: 0.95 }}
                title="Generate proof"
              >
                <Zap size={14} />
              </motion.button>

              <motion.button
                className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                onClick={(e) => handleActionClick(e, 'view-details')}
                whileTap={{ scale: 0.95 }}
                title="View details"
              >
                <ExternalLink size={14} />
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Verification indicator */}
      {credential.metadata.verified && (
        <motion.div
          className="absolute top-2 left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
        >
          <CheckCircle size={12} className="text-white" />
        </motion.div>
      )}

      {/* Expiration warning */}
      {credential.expiresAt && new Date(credential.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
        <motion.div
          className="absolute bottom-2 right-2 flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AlertCircle size={12} />
          <span>Expires soon</span>
        </motion.div>
      )}
    </motion.div>
  );
};