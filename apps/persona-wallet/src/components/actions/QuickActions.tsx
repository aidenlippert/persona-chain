import React from 'react';
import { motion } from 'framer-motion';
import { 
  QrCode, 
  Scan, 
  Plus, 
  Zap, 
  Share2, 
  Settings,
  ArrowRight
} from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
  delay: number;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  title,
  description,
  onClick,
  color,
  delay,
}) => (
  <motion.button
    onClick={onClick}
    className={`${color} text-white rounded-xl p-4 text-left hover:shadow-lg transition-all duration-200 group`}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <ArrowRight 
        size={16} 
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
      />
    </div>
    <h3 className="font-semibold mb-1">{title}</h3>
    <p className="text-sm opacity-90">{description}</p>
  </motion.button>
);

export const QuickActions: React.FC = () => {
  const { pushModal, toggleScanner, getActiveCredentials } = useWalletStore();
  
  const activeCredentials = getActiveCredentials();

  const actions = [
    {
      icon: <Scan size={20} />,
      title: 'Scan QR Code',
      description: 'Scan a verification request',
      onClick: () => toggleScanner(true),
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      delay: 0.1,
    },
    {
      icon: <QrCode size={20} />,
      title: 'Share Identity',
      description: 'Generate your QR code',
      onClick: () => pushModal('share-identity'),
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      delay: 0.2,
    },
    {
      icon: <Plus size={20} />,
      title: 'Add Credential',
      description: 'Connect new account',
      onClick: () => pushModal('add-credential'),
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      delay: 0.3,
    },
    {
      icon: <Zap size={20} />,
      title: 'Generate Proof',
      description: 'Create instant verification',
      onClick: () => pushModal('generate-proof'),
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      delay: 0.4,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quick Actions
        </h3>
        <motion.button
          onClick={() => pushModal('settings')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <Settings size={18} className="text-gray-600 dark:text-gray-300" />
        </motion.button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <QuickAction key={index} {...action} />
        ))}
      </div>

      {/* Additional contextual actions */}
      <motion.div
        className="mt-4 grid grid-cols-1 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {/* Recent sharing */}
        <motion.button
          onClick={() => pushModal('sharing-history')}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Share2 size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  View Sharing History
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  See all your proof sharing activity
                </p>
              </div>
            </div>
            <ArrowRight 
              size={16} 
              className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
            />
          </div>
        </motion.button>

        {/* Credential status overview */}
        {activeCredentials.length > 0 && (
          <motion.button
            onClick={() => pushModal('credentials')}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                    {activeCredentials.length}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Active Credentials
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Ready for verification
                  </p>
                </div>
              </div>
              <ArrowRight 
                size={16} 
                className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
              />
            </div>
          </motion.button>
        )}
      </motion.div>
    </motion.section>
  );
};