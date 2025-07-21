/**
 * Comprehensive Dashboard - SPRINT 2 Integration
 * Main dashboard with tabbed interface for all PersonaPass features
 * Including Cross-Chain Bridge, ZK Proof Management, and DID Management
 */

import React, { useState, useEffect } from 'react';
import { 
  IdentificationIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CogIcon,
  ChartBarIcon,
  UserIcon,
  // Removed unused KeyIcon import
  LinkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { storageService } from '../../services/storageService';
import { DIDKeyPair } from '../../services/didService';
import { ibcService } from '../../services/ibcService';
import { enhancedZKProofService } from '../../services/enhancedZKProofService';
import { universalDIDService } from '../../services/universalDIDService';
import { DIDManager } from './DIDManager';
import { ZKProofManager } from './ZKProofManager';
import { ZKOptimizationDemo } from './ZKOptimizationDemo';
import { CrossChainBridge } from './CrossChainBridge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { VerifiableCredential } from '../../types/wallet';
import { errorService } from "@/services/errorService";

interface ComprehensiveDashboardProps {
  wallet: any;
}

interface DashboardStats {
  totalCredentials: number;
  activeConnections: number;
  crossChainOperations: number;
  zkProofs: number;
  securityScore: number;
  didMethods: number;
  ibcChannels: number;
  relayerReliability: number;
}

interface ActivityItem {
  id: string;
  type: 'did' | 'credential' | 'zk_proof' | 'cross_chain' | 'security';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

type TabType = 'overview' | 'identity' | 'credentials' | 'zk_proofs' | 'cross_chain' | 'analytics' | 'settings';

export const ComprehensiveDashboard: React.FC<ComprehensiveDashboardProps> = ({ wallet }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [didKeyPair, setDidKeyPair] = useState<DIDKeyPair | null>(null);
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalCredentials: 0,
    activeConnections: 0,
    crossChainOperations: 0,
    zkProofs: 0,
    securityScore: 95,
    didMethods: 0,
    ibcChannels: 0,
    relayerReliability: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load DID
      const currentDID = await storageService.getCurrentDID();
      if (currentDID) {
        const did = await storageService.getDID(currentDID);
        if (did) {
          setDidKeyPair(did);
        }
      }

      // Load credentials
      const storedCreds = await storageService.getCredentials();
      setCredentials(storedCreds);

      // Load IBC statistics
      const ibcStats = ibcService.getIBCStatistics();
      
      // Load ZK proof statistics
      const zkStats = enhancedZKProofService.getPerformanceStats();
      
      // Load DID method statistics
      const didMethodStats = universalDIDService.getMethodStatistics();

      // Calculate dashboard statistics
      const stats: DashboardStats = {
        totalCredentials: storedCreds.length,
        activeConnections: ibcStats.channels.open,
        crossChainOperations: ibcStats.crossChainOperations.didResolutions + ibcStats.crossChainOperations.credentialAttestations,
        zkProofs: zkStats.circuitRegistry?.totalCircuits || 0,
        securityScore: 95,
        didMethods: didMethodStats.supportedMethods.length,
        ibcChannels: ibcStats.channels.total,
        relayerReliability: ibcStats.relayers.avgReliability
      };
      
      setDashboardStats(stats);

      // Generate recent activity
      const activity: ActivityItem[] = [
        {
          id: '1',
          type: 'did',
          title: 'DID Created',
          description: 'Universal DID created with multi-method support',
          timestamp: new Date().toISOString(),
          status: 'success',
          icon: IdentificationIcon
        },
        {
          id: '2',
          type: 'cross_chain',
          title: 'Cross-Chain Bridge Active',
          description: `${ibcStats.channels.open} IBC channels operational`,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          status: 'success',
          icon: GlobeAltIcon
        },
        {
          id: '3',
          type: 'zk_proof',
          title: 'ZK Circuits Optimized',
          description: `${zkStats.circuitRegistry?.optimizedCircuits || 0} circuits with 50-70% reduction`,
          timestamp: new Date(Date.now() - 600000).toISOString(),
          status: 'success',
          icon: ShieldCheckIcon
        },
        {
          id: '4',
          type: 'credential',
          title: 'Credentials Synced',
          description: `${storedCreds.length} credentials available`,
          timestamp: new Date(Date.now() - 900000).toISOString(),
          status: 'success',
          icon: DocumentTextIcon
        }
      ];

      setRecentActivity(activity);
      
      console.log('📊 Dashboard data loaded:', {
        stats,
        activity: activity.length,
        credentials: storedCreds.length
      });

    } catch (error) {
      errorService.logError('❌ Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'identity', label: 'Identity', icon: IdentificationIcon },
    { id: 'credentials', label: 'Credentials', icon: DocumentTextIcon },
    { id: 'zk_proofs', label: 'ZK Proofs', icon: ShieldCheckIcon },
    { id: 'cross_chain', label: 'Cross-Chain', icon: GlobeAltIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return CheckCircleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'error':
        return ExclamationTriangleIcon;
      case 'pending':
        return ClockIcon;
      default:
        return CheckCircleIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      case 'pending':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{dashboardStats.totalCredentials}</div>
                <div className="text-sm text-gray-600">Total Credentials</div>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{dashboardStats.activeConnections}</div>
                <div className="text-sm text-gray-600">Active Connections</div>
              </div>
              <LinkIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{dashboardStats.crossChainOperations}</div>
                <div className="text-sm text-gray-600">Cross-Chain Ops</div>
              </div>
              <GlobeAltIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{dashboardStats.zkProofs}</div>
                <div className="text-sm text-gray-600">ZK Circuits</div>
              </div>
              <ShieldCheckIcon className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              onClick={() => setActiveTab('identity')}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <IdentificationIcon className="h-6 w-6" />
              <span>Manage Identity</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab('zk_proofs')}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <ShieldCheckIcon className="h-6 w-6" />
              <span>Generate ZK Proof</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab('cross_chain')}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <GlobeAltIcon className="h-6 w-6" />
              <span>Cross-Chain Bridge</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = getStatusIcon(activity.status);
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${getStatusColor(activity.status)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <Badge variant={activity.status === 'success' ? 'success' : 'default'}>
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{dashboardStats.securityScore}%</div>
              <div className="text-sm text-gray-600">Security Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dashboardStats.relayerReliability.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Relayer Reliability</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{dashboardStats.didMethods}</div>
              <div className="text-sm text-gray-600">DID Methods</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      );
    }

    if (!didKeyPair) {
      return (
        <div className="text-center py-12">
          <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No DID found. Please create your identity first.</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'identity':
        return <DIDManager didKeyPair={didKeyPair} />;
      case 'credentials':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Verifiable Credentials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Advanced credential management coming soon</p>
                  <p className="text-sm text-gray-400">Current credentials: {credentials.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'zk_proofs':
        return (
          <div className="space-y-6">
            <ZKProofManager didKeyPair={didKeyPair} />
            <ZKOptimizationDemo />
          </div>
        );
      case 'cross_chain':
        return <CrossChainBridge didKeyPair={didKeyPair} />;
      case 'analytics':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Advanced analytics coming soon</p>
                  <p className="text-sm text-gray-400">Performance metrics and usage insights</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CogIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Advanced settings coming soon</p>
                  <p className="text-sm text-gray-400">Customize your PersonaPass experience</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-8 w-8 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PersonaPass</h1>
              </div>
              <Badge variant="success">SPRINT 2</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {wallet?.address?.slice(0, 8)}...{wallet?.address?.slice(-6)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDashboardData}
                disabled={isLoading}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ComprehensiveDashboard;