/**
 * PersonaPass Identity Wallet - Production-Ready Application
 * Beautiful black/white/orange design system with organized navigation
 */

import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCardIcon,
  ShieldCheckIcon, 
  GiftIcon,
  TrophyIcon,
  LinkIcon,
  CheckCircleIcon,
  WalletIcon
} from '@heroicons/react/24/outline';

// Sprint 1.4: Analytics & Performance Monitoring
import { FeedbackTrigger } from "./components/ui/FeedbackSystem";
import { PageErrorBoundary } from "./components/ui/ErrorBoundary";
import { analyticsService } from "./services/analyticsService";
import { errorService } from "./services/errorService";
import { createDIDFromString } from "./utils/didUtils";
import { useCredentialCount } from "./hooks/useSecureCredentials";

// Lazy load heavy components
const StreamlinedOnboardingFlow = lazy(() => import("./components/onboarding/StreamlinedOnboardingFlow").then(m => ({ default: m.StreamlinedOnboardingFlow })));
// Removed unused SimpleDashboard component
const LoginPage = lazy(() => import("./components/auth/LoginPage").then(m => ({ default: m.LoginPage })));
const TopNavigation = lazy(() => import("./components/navigation/TopNavigation").then(m => ({ default: m.TopNavigation })));
const CredentialsPage = lazy(() => import("./pages/CredentialsPage").then(m => ({ default: m.CredentialsPage })));
const ProofsPage = lazy(() => import("./pages/EnhancedProofsPage").then(m => ({ default: m.EnhancedProofsPage })));
const OAuthCallback = lazy(() => import("./components/auth/OAuthCallback").then(m => ({ default: m.OAuthCallback })));
const TokenDashboard = lazy(() => import("./pages/TokenDashboard").then(m => ({ default: m.TokenDashboard })));
const ZKPDashboard = lazy(() => import("./components/zkp/ZKPDashboard").then(m => ({ default: m.ZKPDashboard })));
const IdentityVerificationPage = lazy(() => import("./pages/IdentityVerificationPage").then(m => ({ default: m.IdentityVerificationPage })));
// APIMarketplacePage is now integrated into CredentialsPage
// const APIMarketplacePage = lazy(() => import("./pages/APIMarketplacePage").then(m => ({ default: m.APIMarketplacePage })));

// Import storage service for wallet detection
import { storageService } from "./services/storageService";
// Removed duplicate errorService import

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Production Connections Management
const ConnectionsPage = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const storedConnections = await storageService.getConnections();
      setConnections(storedConnections || []);
    } catch (error) {
      errorService.logError('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-white mb-2">
              Trusted Connections
            </h1>
            <p className="text-gray-300 text-lg">
              Manage trusted issuers and verifiers in your identity network
            </p>
          </motion.div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center">
            <div className="inline-flex items-center space-x-3">
              <div className="w-6 h-6 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Loading connections...</span>
            </div>
          </div>
        ) : connections.length > 0 ? (
          <div className="grid gap-6">
            {connections.map((connection: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                    <LinkIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{connection.name}</h3>
                    <p className="text-gray-400">{connection.type} • {connection.status}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-12 text-center"
          >
            <LinkIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Connections Yet</h3>
            <p className="text-gray-400 mb-6">
              Connect to identity providers and verifiers to build your trust network
            </p>
            <button className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all">
              Add Connection
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Production Settings & Security Management
const SettingsPage = () => {
  const [settings, setSettings] = useState({
    biometricAuth: true,
    autoBackup: true,
    dataEncryption: true,
    notifications: true,
    analyticsOptOut: false,
    zkProofSharing: 'selective'
  });

  const handleSettingChange = async (key: string, value: any) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await storageService.updateSettings(newSettings);
      
      // Track settings changes for analytics
      analyticsService.trackEvent(
        'user_action',
        'settings',
        `${key}_changed`,
        createDIDFromString(localStorage.getItem('persona_user_id') || 'did:persona:anonymous'),
        { newValue: value, timestamp: Date.now() }
      );
    } catch (error) {
      errorService.logError('Failed to update settings:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-white mb-2">
              Security & Privacy Settings
            </h1>
            <p className="text-gray-300 text-lg">
              Configure your identity wallet security and privacy preferences
            </p>
          </motion.div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Security Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Biometric Authentication</p>
                  <p className="text-gray-400 text-sm">Use fingerprint or face recognition</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.biometricAuth}
                    onChange={(e) => handleSettingChange('biometricAuth', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Data Encryption</p>
                  <p className="text-gray-400 text-sm">Encrypt all stored credentials</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.dataEncryption}
                    onChange={(e) => handleSettingChange('dataEncryption', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          </motion.div>

          {/* Privacy Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Privacy</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Analytics Opt-Out</p>
                  <p className="text-gray-400 text-sm">Disable usage analytics collection</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.analyticsOptOut}
                    onChange={(e) => handleSettingChange('analyticsOptOut', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <div>
                <p className="text-white font-medium mb-2">ZK Proof Sharing</p>
                <p className="text-gray-400 text-sm mb-3">Control how your zero-knowledge proofs are shared</p>
                <select
                  value={settings.zkProofSharing}
                  onChange={(e) => handleSettingChange('zkProofSharing', e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
                >
                  <option value="public">Public - Anyone can verify</option>
                  <option value="selective">Selective - Choose per proof</option>
                  <option value="private">Private - Only you control</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Backup & Recovery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Backup & Recovery</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Automatic Backup</p>
                  <p className="text-gray-400 text-sm">Automatically backup to secure cloud storage</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoBackup}
                    onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
              
              <button className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all">
                Export Wallet Backup
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Modern Web3 Layout with dark theme and orange accents
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Modern gradient background with orange accents */}
      <div className="fixed inset-0 bg-gradient-to-br from-orange-900/15 via-gray-900 to-amber-900/10 pointer-events-none"></div>
      
      <Suspense fallback={<ComponentLoadingSpinner />}>
        <TopNavigation />
      </Suspense>
      <div className="relative z-10">
        <Suspense fallback={<ComponentLoadingSpinner />}>
          {children}
        </Suspense>
      </div>
    </div>
  );
};

// Modern Web3 Dashboard
const Dashboard = () => {
  const credentialCount = useCredentialCount();
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Modern orange gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/15 animate-pulse"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                Your Identity,
              </span>
              <br />
              <span className="text-white">
                Your Control
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Create, manage, and share verifiable credentials with zero-knowledge proofs. 
              Professional identity management for the modern web.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-orange-500/25">
                Create Credential
              </button>
              <button className="border border-gray-600 text-gray-300 px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 hover:text-white transition-all">
                Scan QR Code
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Credentials Card */}
          <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/70 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCardIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Credentials</h3>
            <p className="text-gray-400 mb-4">
              Manage your verifiable credentials and identity proofs
            </p>
            <div className="text-orange-400 text-sm font-medium">
              View All →
            </div>
          </div>

          {/* Proofs Card */}
          <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/70 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Zero-Knowledge Proofs</h3>
            <p className="text-gray-400 mb-4">
              Create and share privacy-preserving proofs
            </p>
            <div className="text-orange-400 text-sm font-medium">
              Create Proof →
            </div>
          </div>

          {/* Rewards Card */}
          <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/70 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrophyIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">PERS Rewards</h3>
            <p className="text-gray-400 mb-4">
              Earn tokens for verifying your identity
            </p>
            <div className="text-orange-400 text-sm font-medium">
              Claim Rewards →
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="mr-4">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">Active</div>
                <div className="text-gray-600">Identity Status</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="mr-4">
                <CreditCardIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">
                  {credentialCount}
                </div>
                <div className="text-gray-600">Credentials</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-500">
            <div className="flex items-center">
              <div className="mr-4">
                <ShieldCheckIcon className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">
                  {JSON.parse(localStorage.getItem('zk_proofs') || '[]').length}
                </div>
                <div className="text-gray-600">ZK Proofs</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <div className="mr-4">
                <LinkIcon className="h-8 w-8 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">0</div>
                <div className="text-gray-600">Connections</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Utility function to check if user has existing wallet
const checkExistingWallet = async () => {
  try {
    // Check for existing connections in storage
    const connections = await storageService.getConnections(true); // active only
    const config = await storageService.getConfig();
    
    return connections && connections.length > 0 && config;
  } catch (error) {
    console.warn('Error checking existing wallet:', error);
    return false;
  }
};

// Landing Page Component with smart wallet detection
const LandingPage = () => {
  const navigate = useNavigate();
  
  const handleStartJourney = async () => {
    try {
      // Check if user already has a connected wallet
      const hasExistingWallet = await checkExistingWallet();
      
      if (hasExistingWallet) {
        // User has existing wallet - sign them in directly
        console.log('[LOADING] Existing wallet detected, signing in...');
        navigate('/dashboard');
        
        // Track returning user analytics
        analyticsService.trackEvent(
          'user_action',
          'auth',
          'returning_user_signin',
          createDIDFromString(localStorage.getItem('persona_user_id') || 'did:persona:anonymous'),
          {
            timestamp: Date.now(),
            source: 'landing_page'
          }
        );
      } else {
        // New user - go through onboarding
        console.log('🆕 New user detected, starting onboarding...');
        navigate('/onboarding');
        
        // Track new user analytics
        analyticsService.trackEvent(
          'user_action',
          'auth',
          'new_user_onboarding',
          createDIDFromString(localStorage.getItem('persona_user_id') || 'did:persona:anonymous'),
          {
            timestamp: Date.now(),
            source: 'landing_page'
          }
        );
      }
    } catch (error) {
      errorService.logError('Error handling start journey:', error);
      // Fallback to onboarding on error
      navigate('/onboarding');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Modern Web3 gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800"></div>
      <div className="fixed inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-amber-500/5"></div>
      
      {/* Navigation */}
      <nav className="relative z-10 bg-gray-900/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                  <WalletIcon className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-orange-400 to-white bg-clip-text text-transparent">
                  PersonaPass
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="text-gray-300 hover:text-white px-4 py-2 text-sm font-medium transition-colors"
              >
                Login
              </button>
              <button
                onClick={handleStartJourney}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-orange-500/25"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-8">
              <span className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></span>
              Next-Generation Identity Platform
            </span>
          </motion.div>

          <motion.h1 
            className="text-6xl md:text-8xl font-bold text-white mb-8 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Own Your
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Digital Identity
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Create, manage, and share verifiable credentials with zero-knowledge proofs. 
            The most advanced identity wallet for the decentralized web.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <button
              onClick={handleStartJourney}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-orange-500/25"
            >
              Start Your Journey →
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 text-gray-300 hover:text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all duration-300 backdrop-blur-sm"
            >
              View Demo
            </button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-8 text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-400" />
              <span>W3C Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-400" />
              <span>Zero-Knowledge Proofs</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-400" />
              <span>Self-Sovereign Identity</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-400" />
              <span>Enterprise Ready</span>
            </div>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <motion.section 
          className="py-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Choose PersonaPass?
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Built for developers, designed for users, secured by mathematics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:bg-gray-800/70 transition-all duration-300 group"
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4 text-center">Zero-Knowledge Privacy</h3>
              <p className="text-gray-300 text-center leading-relaxed">
                Prove claims about yourself without revealing sensitive data. 
                Advanced cryptography ensures maximum privacy.
              </p>
            </motion.div>

            <motion.div 
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:bg-gray-800/70 transition-all duration-300 group"
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircleIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4 text-center">W3C Standards</h3>
              <p className="text-gray-300 text-center leading-relaxed">
                Fully compliant with global standards for verifiable credentials.
                Interoperable across the entire Web3 ecosystem.
              </p>
            </motion.div>

            <motion.div 
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:bg-gray-800/70 transition-all duration-300 group"
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GiftIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4 text-center">Universal Access</h3>
              <p className="text-gray-300 text-center leading-relaxed">
                Works seamlessly across all platforms, devices, and blockchain networks.
                Your identity, everywhere.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          className="py-20 text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-3xl border border-orange-500/20 p-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to take control?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of users who have already secured their digital identity with PersonaPass.
            </p>
            <button
              onClick={handleStartJourney}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-12 py-4 rounded-xl text-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-orange-500/25"
            >
              Get Started Now →
            </button>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

// Removed unused Web3LoadingSpinner component

// Lightweight Component Loading Spinner
const ComponentLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-32 p-8">
    <div className="flex items-center space-x-3">
      <div className="w-6 h-6 bg-orange-500 rounded-full animate-pulse"></div>
      <span className="text-gray-600 font-medium">Loading...</span>
    </div>
  </div>
);

// Page transition wrapper
const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Main App Component
const App = () => {
  // Removed unused showPerformanceMonitor state
  const [userId] = useState(() => {
    let id = localStorage.getItem('persona_user_id');
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('persona_user_id', id);
    }
    return id;
  });

  useEffect(() => {
    // Initialize analytics on app start
    analyticsService.trackEvent(
      'system_event',
      'app',
      'start',
      createDIDFromString(userId),
      {
        version: '1.4.0',
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }
    );

    // Track page views (defer to avoid race conditions)
    setTimeout(() => {
      analyticsService.trackPageView(window.location.pathname);
    }, 100);


    // A/B testing removed for performance optimization

    // Performance monitor disabled for production build

    // Track immediate app load completion
    analyticsService.trackEvent(
      'performance',
      'app_load',
      'complete',
      createDIDFromString(userId),
      {
        loadTime: 0, // Instant load
        timestamp: Date.now(),
      }
    );

    // Store session start time
    localStorage.setItem('persona_session_start', Date.now().toString());

    return () => {
      // Track session end
      analyticsService.trackEvent(
        'system_event',
        'app',
        'end',
        createDIDFromString(userId),
        {
          sessionDuration: Date.now() - parseInt(localStorage.getItem('persona_session_start') || '0'),
          timestamp: Date.now(),
        }
      );
    };
  }, [userId]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <PageErrorBoundary pageName="App">
          <div className="min-h-screen bg-white">
            <Suspense fallback={<ComponentLoadingSpinner />}>
              <PageTransition>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={
                    <PageErrorBoundary pageName="Landing">
                      <LandingPage />
                    </PageErrorBoundary>
                  } />
                  <Route path="/login" element={
                    <PageErrorBoundary pageName="Login">
                      <LoginPage />
                    </PageErrorBoundary>
                  } />
                  <Route path="/onboarding" element={
                    <PageErrorBoundary pageName="Onboarding">
                      <StreamlinedOnboardingFlow />
                    </PageErrorBoundary>
                  } />
                  
                  {/* OAuth Callbacks - GitHub handled by Railway backend, then redirected here */}
                  <Route path="/oauth/github/callback" element={
                    <PageErrorBoundary pageName="GitHubCallback">
                      <OAuthCallback platform="github" />
                    </PageErrorBoundary>
                  } />
                  <Route path="/oauth/linkedin/callback" element={
                    <PageErrorBoundary pageName="LinkedInCallback">
                      <OAuthCallback platform="linkedin" />
                    </PageErrorBoundary>
                  } />
                  <Route path="/oauth/plaid/callback" element={
                    <PageErrorBoundary pageName="PlaidCallback">
                      <OAuthCallback platform="plaid" />
                    </PageErrorBoundary>
                  } />
                  <Route path="/oauth/twitter/callback" element={
                    <PageErrorBoundary pageName="TwitterCallback">
                      <OAuthCallback platform="twitter" />
                    </PageErrorBoundary>
                  } />
                  
                  {/* Dashboard Routes */}
                  <Route path="/dashboard" element={
                    <PageErrorBoundary pageName="Dashboard">
                      <DashboardLayout>
                        <Dashboard />
                      </DashboardLayout>
                    </PageErrorBoundary>
                  } />
                  <Route path="/credentials" element={
                    <PageErrorBoundary pageName="Credentials">
                      <DashboardLayout>
                        <CredentialsPage />
                      </DashboardLayout>
                    </PageErrorBoundary>
                  } />
                  <Route path="/proofs" element={
                    <PageErrorBoundary pageName="Proofs">
                      <DashboardLayout>
                        <ProofsPage />
                      </DashboardLayout>
                    </PageErrorBoundary>
                  } />
                  <Route path="/connections" element={
                    <PageErrorBoundary pageName="Connections">
                      <DashboardLayout>
                        <ConnectionsPage />
                      </DashboardLayout>
                    </PageErrorBoundary>
                  } />
                  <Route path="/token" element={
                    <PageErrorBoundary pageName="Token">
                      <DashboardLayout>
                        <TokenDashboard />
                      </DashboardLayout>
                    </PageErrorBoundary>
                  } />
                  <Route path="/settings" element={
                    <PageErrorBoundary pageName="Settings">
                      <DashboardLayout>
                        <SettingsPage />
                      </DashboardLayout>
                    </PageErrorBoundary>
                  } />
                  <Route path="/zkp" element={
                    <PageErrorBoundary pageName="ZKP">
                      <DashboardLayout>
                        <ZKPDashboard />
                      </DashboardLayout>
                    </PageErrorBoundary>
                  } />
                  <Route path="/identity-verification" element={
                    <PageErrorBoundary pageName="IdentityVerification">
                      <DashboardLayout>
                        <IdentityVerificationPage />
                      </DashboardLayout>
                    </PageErrorBoundary>
                  } />
                  {/* API Marketplace is now integrated into /credentials */}
                </Routes>
              </PageTransition>
            </Suspense>

            {/* Sprint 1.4: Analytics & Feedback Components */}
            <FeedbackTrigger 
              variant="float"
              label="Feedback"
            />
          </div>
        </PageErrorBoundary>
      </Router>
    </QueryClientProvider>
  );
};

export default App;