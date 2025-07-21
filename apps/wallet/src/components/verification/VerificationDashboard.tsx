/**
 * Comprehensive Verification Dashboard
 * Integrates Plaid financial verification and Stripe Identity verification
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XMarkIcon,
  ArrowRightIcon,
  CreditCardIcon,
  IdentificationIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  EyeIcon,
  ShareIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { StripeIdentityVerification } from '../identity/StripeIdentityVerification';
import { PlaidLinkComponent } from '../financial/PlaidLinkComponent';
import { BrutallyBeautifulButton } from '../ui/BrutallyBeautifulButton';
import { MasterfulCard } from '../ui/MasterfulCard';
import { StunningGradientBackground } from '../ui/StunningGradientBackground';
import { errorService } from "@/services/errorService";

interface VerificationStatus {
  id: string;
  type: 'identity' | 'financial' | 'income' | 'credit' | 'employment';
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';
  completedAt?: string;
  expiresAt?: string;
  provider: string;
  icon: React.ComponentType<any>;
  color: string;
  data?: any;
}

interface VerificationDashboardProps {
  didKeyPair: any;
}

export const VerificationDashboard: React.FC<VerificationDashboardProps> = ({ didKeyPair }) => {
  const [verifications, setVerifications] = useState<VerificationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVerification, setActiveVerification] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    loadVerificationStatus();
  }, [didKeyPair]);

  const loadVerificationStatus = async () => {
    setIsLoading(true);
    try {
      // Load verification statuses from localStorage
      const storedVerifications = localStorage.getItem(`verifications_${didKeyPair.did}`);
      
      const defaultVerifications: VerificationStatus[] = [
        {
          id: 'stripe_identity',
          type: 'identity',
          name: 'Government ID Verification',
          description: 'Verify your identity with government-issued documents',
          status: 'not_started',
          provider: 'Stripe Identity',
          icon: IdentificationIcon,
          color: 'blue'
        },
        {
          id: 'plaid_banking',
          type: 'financial',
          name: 'Bank Account Verification',
          description: 'Connect and verify your bank accounts',
          status: 'not_started',
          provider: 'Plaid',
          icon: BanknotesIcon,
          color: 'green'
        },
        {
          id: 'plaid_income',
          type: 'income',
          name: 'Income Verification',
          description: 'Verify your employment and income',
          status: 'not_started',
          provider: 'Plaid',
          icon: ChartBarIcon,
          color: 'purple'
        },
        {
          id: 'plaid_assets',
          type: 'financial',
          name: 'Asset Verification',
          description: 'Verify your financial assets and holdings',
          status: 'not_started',
          provider: 'Plaid',
          icon: CreditCardIcon,
          color: 'indigo'
        },
        {
          id: 'employment_verification',
          type: 'employment',
          name: 'Employment Verification',
          description: 'Verify your current employment status',
          status: 'not_started',
          provider: 'WorkNumber',
          icon: BuildingOfficeIcon,
          color: 'orange'
        }
      ];

      if (storedVerifications) {
        const parsed = JSON.parse(storedVerifications);
        setVerifications(parsed);
      } else {
        setVerifications(defaultVerifications);
      }
    } catch (error) {
      errorService.logError('Failed to load verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateVerificationStatus = (id: string, updates: Partial<VerificationStatus>) => {
    setVerifications(prev => {
      const updated = prev.map(v => 
        v.id === id ? { ...v, ...updates } : v
      );
      localStorage.setItem(`verifications_${didKeyPair.did}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleStartVerification = (verification: VerificationStatus) => {
    setActiveVerification(verification.id);
    updateVerificationStatus(verification.id, { status: 'in_progress' });
  };

  const handleVerificationComplete = (id: string, data?: any) => {
    updateVerificationStatus(id, { 
      status: 'completed', 
      completedAt: new Date().toISOString(),
      data 
    });
    setActiveVerification(null);
  };

  const handleVerificationFailed = (id: string, error?: string) => {
    updateVerificationStatus(id, { status: 'failed' });
    setActiveVerification(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckBadgeIcon;
      case 'in_progress':
        return ClockIcon;
      case 'failed':
        return XMarkIcon;
      case 'expired':
        return ExclamationTriangleIcon;
      default:
        return ClockIcon;
    }
  };

  const completedVerifications = verifications.filter(v => v.status === 'completed');
  const inProgressVerifications = verifications.filter(v => v.status === 'in_progress');
  const failedVerifications = verifications.filter(v => v.status === 'failed');

  const renderVerificationForm = (verification: VerificationStatus) => {
    switch (verification.id) {
      case 'stripe_identity':
        return (
          <StripeIdentityVerification
            onVerificationComplete={(sessionId) => handleVerificationComplete(verification.id, { sessionId })}
            onError={(error) => handleVerificationFailed(verification.id, error)}
          />
        );
      case 'plaid_banking':
      case 'plaid_income':
      case 'plaid_assets':
        return (
          <PlaidLinkComponent
            userId={didKeyPair.did}
            onSuccess={(data) => handleVerificationComplete(verification.id, data)}
            onError={(error) => handleVerificationFailed(verification.id, error)}
          />
        );
      default:
        return (
          <div className="text-center p-8">
            <p className="text-gray-600 mb-4">This verification is coming soon!</p>
            <button
              onClick={() => setActiveVerification(null)}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Stunning Background */}
      <StunningGradientBackground 
        variant="aurora" 
        animated={true}
        className="fixed inset-0 z-0"
      />
      
      <div className="relative z-10 space-y-8 p-6">
        {/* Masterful Header */}
        <MasterfulCard variant="glass" size="lg" className="backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <SparklesIcon className="h-8 w-8 text-purple-600" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
                  Identity Verification
                </h1>
              </div>
              <p className="text-gray-700 text-lg font-medium">Complete your identity verification to unlock all features</p>
            </div>
            <div className="text-right">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                <p className="text-4xl font-bold">
                  {completedVerifications.length}/{verifications.length}
                </p>
                <p className="text-sm font-semibold text-gray-600">Completed</p>
              </div>
            </div>
          </div>
          
          {/* Beautiful Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-3">
              <span>Verification Progress</span>
              <span className="text-purple-600 font-bold">{Math.round((completedVerifications.length / verifications.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200/50 rounded-full h-3 shadow-inner">
              <div 
                className="bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 h-3 rounded-full transition-all duration-1000 ease-out shadow-lg"
                style={{ width: `${(completedVerifications.length / verifications.length) * 100}%` }}
              />
            </div>
          </div>
        </MasterfulCard>

        {/* Beautiful Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { 
              label: 'Completed', 
              value: completedVerifications.length, 
              icon: CheckBadgeIcon, 
              color: 'green',
              gradient: 'from-green-400 to-emerald-500'
            },
            { 
              label: 'In Progress', 
              value: inProgressVerifications.length, 
              icon: ClockIcon, 
              color: 'blue',
              gradient: 'from-blue-400 to-cyan-500'
            },
            { 
              label: 'Failed', 
              value: failedVerifications.length, 
              icon: XMarkIcon, 
              color: 'red',
              gradient: 'from-red-400 to-pink-500'
            },
            { 
              label: 'Remaining', 
              value: verifications.length - completedVerifications.length, 
              icon: ExclamationTriangleIcon, 
              color: 'gray',
              gradient: 'from-gray-400 to-slate-500'
            }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <MasterfulCard key={index} variant="glass" size="md" hoverable={true} className="group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-gray-800 transition-colors">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform">{stat.value}</p>
                  </div>
                  <div className={`h-14 w-14 rounded-xl flex items-center justify-center bg-gradient-to-r ${stat.gradient} shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                </div>
              </MasterfulCard>
            );
          })}
        </div>

        {/* Masterful Verification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {verifications.map((verification) => {
            const Icon = verification.icon;
            const StatusIcon = getStatusIcon(verification.status);
            
            return (
              <MasterfulCard 
                key={verification.id} 
                variant="elevated" 
                size="lg" 
                hoverable={true}
                className="group transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center bg-gradient-to-r from-${verification.color}-400 to-${verification.color}-500 shadow-lg group-hover:shadow-xl transition-shadow`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-800">{verification.name}</h3>
                      <p className="text-sm font-medium text-gray-600">{verification.provider}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border-2 ${getStatusColor(verification.status)} shadow-sm`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {verification.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6 leading-relaxed">{verification.description}</p>
                
                {verification.status === 'completed' && (
                  <div className="text-sm text-green-600 mb-6 font-medium bg-green-50 p-3 rounded-lg border border-green-200">
                    ✓ Completed on {new Date(verification.completedAt!).toLocaleDateString()}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {verification.status === 'completed' && (
                      <>
                        <BrutallyBeautifulButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDetails(verification.id)}
                          icon={<EyeIcon className="h-4 w-4" />}
                        >
                          View Details
                        </BrutallyBeautifulButton>
                        <BrutallyBeautifulButton
                          variant="ghost"
                          size="sm"
                          icon={<ShareIcon className="h-4 w-4" />}
                        >
                          Share Proof
                        </BrutallyBeautifulButton>
                      </>
                    )}
                  </div>
                  
                  <div>
                    {verification.status === 'not_started' && (
                      <BrutallyBeautifulButton
                        variant="primary"
                        size="md"
                        onClick={() => handleStartVerification(verification)}
                        icon={<ArrowRightIcon className="h-4 w-4" />}
                        iconPosition="right"
                      >
                        Start Verification
                      </BrutallyBeautifulButton>
                    )}
                    
                    {verification.status === 'in_progress' && (
                      <BrutallyBeautifulButton
                        variant="primary"
                        size="md"
                        onClick={() => handleStartVerification(verification)}
                        icon={<ArrowRightIcon className="h-4 w-4" />}
                        iconPosition="right"
                      >
                        Continue
                      </BrutallyBeautifulButton>
                    )}
                    
                    {verification.status === 'failed' && (
                      <BrutallyBeautifulButton
                        variant="danger"
                        size="md"
                        onClick={() => handleStartVerification(verification)}
                        icon={<ArrowRightIcon className="h-4 w-4" />}
                        iconPosition="right"
                      >
                        Retry
                      </BrutallyBeautifulButton>
                    )}
                    
                    {verification.status === 'completed' && (
                      <div className="text-lg text-green-600 font-bold flex items-center space-x-2">
                        <CheckBadgeIcon className="h-6 w-6" />
                        <span>✓ Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </MasterfulCard>
            );
          })}
        </div>

        {/* Beautiful Active Verification Modal */}
        {activeVerification && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <MasterfulCard variant="glass" size="xl" className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-8 border-b border-gray-200/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {verifications.find(v => v.id === activeVerification)?.name}
                  </h3>
                  <BrutallyBeautifulButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveVerification(null)}
                    icon={<XMarkIcon className="h-5 w-5" />}
                  >
                    Close
                  </BrutallyBeautifulButton>
                </div>
              </div>
              
              <div className="p-8">
                {renderVerificationForm(verifications.find(v => v.id === activeVerification)!)}
              </div>
            </MasterfulCard>
          </div>
        )}

        {/* Gorgeous Details Modal */}
        {showDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <MasterfulCard variant="glass" size="xl" className="max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-8 border-b border-gray-200/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    Verification Details
                  </h3>
                  <BrutallyBeautifulButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(null)}
                    icon={<XMarkIcon className="h-5 w-5" />}
                  >
                    Close
                  </BrutallyBeautifulButton>
                </div>
              </div>
              
              <div className="p-8">
                {(() => {
                  const verification = verifications.find(v => v.id === showDetails);
                  if (!verification) return null;
                  
                  return (
                    <div className="space-y-6">
                      <MasterfulCard variant="minimal" size="md">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Verification Type
                          </label>
                          <p className="text-lg text-gray-900 font-semibold">{verification.name}</p>
                        </div>
                      </MasterfulCard>
                      
                      <MasterfulCard variant="minimal" size="md">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Provider
                          </label>
                          <p className="text-lg text-gray-900 font-semibold">{verification.provider}</p>
                        </div>
                      </MasterfulCard>
                      
                      <MasterfulCard variant="minimal" size="md">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Status
                          </label>
                          <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-full ${getStatusColor(verification.status)} shadow-lg`}>
                            {verification.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </MasterfulCard>
                      
                      {verification.completedAt && (
                        <MasterfulCard variant="minimal" size="md">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Completed At
                            </label>
                            <p className="text-lg text-gray-900 font-semibold">
                              {new Date(verification.completedAt).toLocaleString()}
                            </p>
                          </div>
                        </MasterfulCard>
                      )}
                      
                      {verification.data && (
                        <MasterfulCard variant="minimal" size="md">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Verification Data
                            </label>
                            <pre className="text-sm text-gray-900 bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl overflow-x-auto border-2 border-gray-200 shadow-inner">
                              {JSON.stringify(verification.data, null, 2)}
                            </pre>
                          </div>
                        </MasterfulCard>
                      )}
                    </div>
                  );
                })()}
              </div>
            </MasterfulCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationDashboard;