import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Zap, 
  Users, 
  ArrowRight,
  Play,
  CheckCircle
} from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}> = ({ icon, title, description, delay }) => (
  <motion.div
    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -2 }}
  >
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
          {title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {description}
        </p>
      </div>
    </div>
  </motion.div>
);

export const WelcomeCard: React.FC = () => {
  const { setupWallet, pushModal } = useWalletStore();

  const handleGetStarted = () => {
    pushModal('wallet-setup');
  };

  const handleTakeTour = () => {
    pushModal('welcome-tour');
  };

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <motion.div
        className="text-center py-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
        >
          <Shield size={32} className="text-white" />
        </motion.div>

        <motion.h1
          className="text-3xl font-bold text-gray-900 dark:text-white mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Welcome to PersonaPass
        </motion.h1>

        <motion.p
          className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Your secure, zero-knowledge digital identity wallet. Prove who you are without revealing your data.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={handleGetStarted}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Get Started</span>
            <ArrowRight size={18} />
          </motion.button>

          <motion.button
            onClick={handleTakeTour}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play size={18} />
            <span>Take Tour</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Features overview */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-6">
          Why PersonaPass?
        </h2>

        <FeatureCard
          icon={<Shield size={20} className="text-blue-600" />}
          title="Zero-Knowledge Proofs"
          description="Prove your identity claims without revealing sensitive personal data"
          delay={0.7}
        />

        <FeatureCard
          icon={<Zap size={20} className="text-purple-600" />}
          title="Instant Verification"
          description="Share proofs instantly via QR codes or direct secure channels"
          delay={0.8}
        />

        <FeatureCard
          icon={<Users size={20} className="text-green-600" />}
          title="Universal Compatibility"
          description="Works with any service that needs identity verification"
          delay={0.9}
        />
      </motion.div>

      {/* How it works */}
      <motion.div
        className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
          How It Works
        </h3>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Connect Your Accounts</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Link your academic, financial, health, and social accounts securely
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
              2
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Generate Proofs</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Create cryptographic proofs that verify your claims without exposing data
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Share Securely</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Share proofs with verifiers while maintaining complete privacy
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security highlights */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <Shield size={18} className="text-green-600" />
          <span>Security First</span>
        </h3>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              End-to-end encryption for all data
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              No personal data stored on servers
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Cryptographically verifiable proofs
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Full user control over data sharing
            </span>
          </div>
        </div>
      </motion.div>

      {/* Call to action */}
      <motion.div
        className="text-center py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Ready to take control of your digital identity?
        </p>
        
        <motion.button
          onClick={handleGetStarted}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Shield size={18} />
          <span>Create Your Wallet</span>
          <ArrowRight size={18} />
        </motion.button>
      </motion.div>

      {/* Bottom spacing */}
      <div className="h-4" />
    </div>
  );
};