/**
 * Dashboard Page - Complete Professional Dashboard
 * Full utility pages for DID, VC, and ZK proof management
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IdentificationIcon, 
  DocumentTextIcon, 
  ShieldCheckIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  BellIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import { PersonaWallet } from '../services/personaChainService';
import { IdentityOverview } from '../components/dashboard/IdentityOverview';
import DIDManager from '../components/dashboard/DIDManager';
import CredentialManager from '../components/dashboard/CredentialManager';
import ZKProofManager from '../components/dashboard/ZKProofManager';
import { VerificationDashboard } from '../components/verification/VerificationDashboard';
import { errorService } from "@/services/errorService";

type TabType = 'overview' | 'identity' | 'credentials' | 'zkproofs' | 'verification' | 'settings';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<PersonaWallet | null>(null);
  const [didKeyPair, setDidKeyPair] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    // Check if user is authenticated
    const savedWallet = localStorage.getItem('persona-wallet');
    const savedDidKeyPair = localStorage.getItem('persona-did-keypair');
    
    if (!savedWallet || !savedDidKeyPair) {
      navigate('/onboarding');
      return;
    }
    
    try {
      setWallet(JSON.parse(savedWallet));
      setDidKeyPair(JSON.parse(savedDidKeyPair));
    } catch (error) {
      errorService.logError('Failed to parse stored data:', error);
      navigate('/onboarding');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('persona-wallet');
    localStorage.removeItem('persona-did-keypair');
    localStorage.removeItem('persona-onboarding-complete');
    navigate('/');
  };

  if (!wallet || !didKeyPair) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'overview' as TabType,
      name: 'Overview',
      icon: UserCircleIcon,
      description: 'Identity status and quick actions'
    },
    {
      id: 'verification' as TabType,
      name: 'Verification',
      icon: ShieldCheckIcon,
      description: 'Complete identity and financial verification'
    },
    {
      id: 'identity' as TabType,
      name: 'Identity',
      icon: IdentificationIcon,
      description: 'DID management and verification'
    },
    {
      id: 'credentials' as TabType,
      name: 'Credentials',
      icon: DocumentTextIcon,
      description: 'Verifiable credentials management'
    },
    {
      id: 'zkproofs' as TabType,
      name: 'ZK Proofs',
      icon: ShieldCheckIcon,
      description: 'Zero-knowledge proof generation'
    },
    {
      id: 'settings' as TabType,
      name: 'Settings',
      icon: Cog6ToothIcon,
      description: 'Account and security settings'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <IdentityOverview didKeyPair={didKeyPair} />;
      case 'verification':
        return <VerificationDashboard didKeyPair={didKeyPair} />;
      case 'identity':
        return <DIDManager didKeyPair={didKeyPair} />;
      case 'credentials':
        return <CredentialManager didKeyPair={didKeyPair} />;
      case 'zkproofs':
        return <ZKProofManager didKeyPair={didKeyPair} />;
      case 'settings':
        return <SettingsPanel wallet={wallet} didKeyPair={didKeyPair} onLogout={handleLogout} />;
      default:
        return <IdentityOverview didKeyPair={didKeyPair} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PersonaPass</h1>
                <p className="text-sm text-gray-600">Professional Identity Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <BellIcon className="h-5 w-5" />
              </button>
              
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
              
              <div className="border-l border-gray-200 pl-4">
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
                    </p>
                    <p className="text-xs text-gray-500">Connected to PersonaChain</p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Description */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-sm text-gray-600">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

// Settings Panel Component
const SettingsPanel: React.FC<{
  wallet: PersonaWallet;
  didKeyPair: any;
  onLogout: () => void;
}> = ({ wallet, didKeyPair, onLogout }) => {
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  return (
    <div className="space-y-6">
      {/* Account Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Notifications</label>
              <p className="text-sm text-gray-500">Receive updates about your identity</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">Biometric Authentication</label>
              <p className="text-sm text-gray-500">Use fingerprint or face ID</p>
            </div>
            <button
              onClick={() => setBiometrics(!biometrics)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                biometrics ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  biometrics ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">Analytics</label>
              <p className="text-sm text-gray-500">Help improve PersonaPass</p>
            </div>
            <button
              onClick={() => setAnalytics(!analytics)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                analytics ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  analytics ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Wallet Address</p>
              <p className="text-sm text-gray-600">{wallet.address}</p>
            </div>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Connected
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">DID Status</p>
              <p className="text-sm text-gray-600">Identity verified on blockchain</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Encryption</p>
              <p className="text-sm text-gray-600">Ed25519 cryptographic keys</p>
            </div>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              Secure
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <p className="font-medium text-red-900">Reset Account</p>
              <p className="text-sm text-red-600">Clear all data and start over</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Reset
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <p className="font-medium text-red-900">Delete Account</p>
              <p className="text-sm text-red-600">Permanently delete your identity</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;