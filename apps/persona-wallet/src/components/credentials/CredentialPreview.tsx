import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Zap,
  MoreHorizontal
} from 'lucide-react';
import { Credential } from '../../types/wallet';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CredentialPreviewProps {
  credential: Credential;
  onAction?: (action: string, credential: Credential) => void;
  className?: string;
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

export const CredentialPreview: React.FC<CredentialPreviewProps> = ({
  credential,
  onAction,
  className,
}) => {
  const getStatusIcon = () => {
    switch (credential.status) {
      case 'active':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'expired':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'revoked':
        return <AlertCircle size={14} className="text-gray-500" />;
      case 'pending':
        return <Clock size={14} className="text-yellow-500" />;
      default:
        return <AlertCircle size={14} className="text-gray-400" />;
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

  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    if (onAction) {
      onAction(action, credential);
    }
  };

  const handleCardClick = () => {
    if (onAction) {
      onAction('view-details', credential);
    }
  };

  const gradientClass = domainColors[credential.domain] || 'from-gray-500 to-gray-600';

  return (
    <motion.div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-all duration-200',
        credential.status !== 'active' && 'opacity-75',
        className
      )}
      whileHover={{ y: -1, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      layout
    >
      <div className="flex items-center justify-between">
        {/* Left side - credential info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Domain icon */}
          <div className={cn(
            'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-sm flex-shrink-0',
            gradientClass
          )}>
            {domainIcons[credential.domain]}
          </div>

          {/* Credential details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {credential.type}
              </h4>
              <div className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                getStatusColor()
              )}>
                {credential.status}
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {credential.issuer.name}
            </p>
            
            <div className="flex items-center space-x-3 mt-1">
              <div className="flex items-center space-x-1">
                {getStatusIcon()}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(credential.issuedAt), { addSuffix: true })}
                </span>
              </div>
              
              {credential.metadata.verified && (
                <div className="flex items-center space-x-1">
                  <Shield size={12} className="text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Verified
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side - actions */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Trust score indicator */}
          <div className="text-center mr-2">
            <div className="text-xs font-medium text-gray-900 dark:text-white">
              {credential.metadata.trustScore}%
            </div>
            <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
          </div>

          {/* Quick proof generation */}
          {credential.status === 'active' && (
            <motion.button
              onClick={(e) => handleAction(e, 'generate-proof')}
              className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
              whileTap={{ scale: 0.95 }}
              title="Generate proof"
            >
              <Zap size={16} />
            </motion.button>
          )}

          {/* Options menu */}
          <motion.button
            onClick={(e) => handleAction(e, 'menu')}
            className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 transition-colors"
            whileTap={{ scale: 0.95 }}
            title="More options"
          >
            <MoreHorizontal size={16} />
          </motion.button>
        </div>
      </div>

      {/* Verification indicator overlay */}
      {credential.metadata.verified && (
        <motion.div
          className="absolute top-2 left-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
        >
          <CheckCircle size={8} className="text-white" />
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
          <AlertCircle size={10} />
          <span>Expires soon</span>
        </motion.div>
      )}
    </motion.div>
  );
};