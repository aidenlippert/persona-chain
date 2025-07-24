/**
 * Enhanced API Credentials Manager
 * Combines the existing credentials manager with the new API marketplace
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { 
  Database, 
  Zap, 
  Plus, 
  CheckCircle, 
  Clock, 
  Star,
  ArrowRight,
  Settings,
  RefreshCw,
  TrendingUp,
  Shield
} from 'lucide-react';

// Removed unused notify import

// Import our new components
import APIMarketplaceCredentials from './APIMarketplaceCredentials';
import { EnhancedCredentialsManager } from './EnhancedCredentialsManager';
import { ProgressIndicator } from '../ui/ProgressIndicator';

// Import services
import { apiCredentialService } from '../../services/credentials/APICredentialService';
import RapidAPIConnector, { RapidAPIMetadata } from '../../services/automation/RapidAPIConnector';
import { errorService } from "@/services/errorService";

interface EnhancedAPICredentialsManagerProps {
  did: string;
  walletAddress: string;
  onCredentialCreated?: () => void;
}

interface APICredentialRequest {
  api: RapidAPIMetadata;
  userInputs: Record<string, any>;
  credentialType: string;
  userDID: string;
}

interface BatchCredentialCreation {
  isActive: boolean;
  progress: number;
  currentAPI: string;
  total: number;
  completed: number;
  failed: Array<{ api: string; error: string }>;
}

const EnhancedAPICredentialsManager: React.FC<EnhancedAPICredentialsManagerProps> = ({
  did,
  walletAddress,
  onCredentialCreated
}) => {
  const [activeTab, setActiveTab] = useState('credentials');
  const [selectedAPIs, setSelectedAPIs] = useState<RapidAPIMetadata[]>([]);
  const [batchCreation, setBatchCreation] = useState<BatchCredentialCreation>({
    isActive: false,
    progress: 0,
    currentAPI: '',
    total: 0,
    completed: 0,
    failed: []
  });
  const [apiStats, setApiStats] = useState({
    totalAPIs: 0,
    connectedAPIs: 0,
    lastUpdated: new Date().toISOString()
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    loadAPIStats();
  }, []);

  const loadAPIStats = async () => {
    setIsLoadingStats(true);
    try {
      const connector = RapidAPIConnector.getInstance();
      const identityAPIs = await connector.getIdentityVerificationAPIs();
      const financialAPIs = await connector.getFinancialVerificationAPIs();
      const commAPIs = await connector.getCommunicationAPIs();
      
      const totalAPIs = identityAPIs.length + financialAPIs.length + commAPIs.length;
      
      // Check for stored credentials to count connected APIs
      const stored = localStorage.getItem('credentials');
      const connectedAPIs = stored ? JSON.parse(stored).length : 0;
      
      // Add a small delay to show the loading animation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setApiStats({
        totalAPIs,
        connectedAPIs,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      errorService.logError('Failed to load API stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Removed unused handleAPISelection function

  const createCredentialsFromSelectedAPIs = async () => {
    console.log('[TARGET] Create credentials button clicked', { selectedAPIs: selectedAPIs.length });
    
    if (selectedAPIs.length === 0) {
      console.warn('[WARNING] No APIs selected for credential creation');
      // Replace alert with console message - alerts can be blocked by browsers
      return;
    }

    setBatchCreation({
      isActive: true,
      progress: 0,
      currentAPI: '',
      total: selectedAPIs.length,
      completed: 0,
      failed: []
    });

    const requests: APICredentialRequest[] = selectedAPIs.map(api => ({
      api,
      userInputs: getDefaultUserInputs(api),
      credentialType: getSuggestedCredentialType(api),
      userDID: did
    }));

    try {
      let completed = 0;
      const failed: Array<{ api: string; error: string }> = [];

      for (const request of requests) {
        setBatchCreation(prev => ({
          ...prev,
          currentAPI: request.api.name,
          progress: (completed / requests.length) * 100
        }));

        try {
          await apiCredentialService.createCredentialFromAPI(request);
          completed++;
          
          setBatchCreation(prev => ({
            ...prev,
            completed: completed,
            progress: (completed / requests.length) * 100
          }));

          // Add delay between API calls to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          failed.push({
            api: request.api.name,
            error: (error as Error).message
          });
          
          setBatchCreation(prev => ({
            ...prev,
            failed: [...prev.failed, { api: request.api.name, error: (error as Error).message }]
          }));
        }
      }

      // Complete the batch creation
      setBatchCreation(prev => ({
        ...prev,
        isActive: false,
        progress: 100,
        currentAPI: '',
        completed,
        failed
      }));

      // Show results
      const successCount = completed;
      const failureCount = failed.length;
      
      if (successCount > 0) {
        // Refresh the credentials list
        onCredentialCreated?.();
        
        // Log success message
        const message = failureCount > 0 
          ? `[SUCCESS] Successfully created ${successCount} credentials! [WARNING] ${failureCount} failed.`
          : `[SUCCESS] Successfully created all ${successCount} credentials!`;
        
        console.log('[SUCCESS] Credential creation completed:', message);
      }

      if (failureCount > 0) {
        errorService.logError('Failed API credential creations:', failed);
      }

      // Reset selection
      setSelectedAPIs([]);
      
    } catch (error) {
      errorService.logError('Batch credential creation failed:', error);
      setBatchCreation(prev => ({
        ...prev,
        isActive: false,
        currentAPI: 'Error occurred'
      }));
      console.log('[ERROR] Failed to create credentials. Please try again.');
    }
  };

  const getDefaultUserInputs = (api: RapidAPIMetadata): Record<string, any> => {
    // Return default/mock inputs based on API type
    switch (api.category) {
      case 'identity_verification':
        return {
          firstName: 'John',
          lastName: 'Doe',
          countryCode: 'US',
          personInfo: {
            FirstGivenName: 'John',
            FirstSurName: 'Doe',
            DayOfBirth: '1990-01-01'
          }
        };
        
      case 'financial_data':
        return {
          access_token: process.env.VITE_PLAID_ACCESS_TOKEN || 'demo_token',
          consumerInfo: {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            ssn: 'XXX-XX-XXXX'
          }
        };
        
      case 'communication':
        return {
          phoneNumber: '+1234567890',
          channel: 'sms'
        };
        
      case 'professional_verification':
        return {
          access_token: process.env.VITE_LINKEDIN_ACCESS_TOKEN || 'demo_token'
        };
        
      case 'developer_verification':
        return {
          access_token: process.env.VITE_GITHUB_ACCESS_TOKEN || 'demo_token'
        };
        
      default:
        return {
          userId: did,
          verification: true
        };
    }
  };

  const getSuggestedCredentialType = (api: RapidAPIMetadata): string => {
    const supportedTypes = apiCredentialService.getSupportedCredentialTypes(api);
    return supportedTypes[0] || 'DataVerificationCredential';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header with Stats */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credential Management</h1>
              <p className="text-gray-600 mt-1">Create verifiable credentials from trusted APIs</p>
            </div>
            
            {isLoadingStats ? (
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="w-16 h-8 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="text-xs text-gray-500">APIs Available</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-8 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="text-xs text-gray-500">Connected</div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-2xl font-bold text-blue-600">{apiStats.totalAPIs}</div>
                  <div className="text-xs text-gray-500">APIs Available</div>
                </motion.div>
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="text-2xl font-bold text-green-600">{apiStats.connectedAPIs}</div>
                  <div className="text-xs text-gray-500">Connected</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadAPIStats}
                    className="flex items-center space-x-2"
                    disabled={isLoadingStats}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Creation Progress */}
      <AnimatePresence>
        {batchCreation.isActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border-b border-orange-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Creating Credentials</h3>
                  <p className="text-sm text-gray-600">
                    Processing {batchCreation.total} APIs • {batchCreation.completed} completed • {batchCreation.failed.length} failed
                  </p>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {Math.round(batchCreation.progress)}% Complete
                </Badge>
              </div>
              
              <ProgressIndicator
                progress={batchCreation.progress}
                label={batchCreation.currentAPI ? `Processing ${batchCreation.currentAPI}...` : 'Initializing...'}
                showPercentage={true}
                theme="orange"
                size="lg"
                status="loading"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="credentials" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>My Credentials</span>
              <Badge variant="secondary">{apiStats.connectedAPIs}</Badge>
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Create New</span>
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>API Automation</span>
              <Badge variant="secondary">{apiStats.totalAPIs}</Badge>
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Batch Processing</span>
              {selectedAPIs.length > 0 && (
                <Badge variant="default">{selectedAPIs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* My Credentials Tab */}
          <TabsContent value="credentials">
            <EnhancedCredentialsManager
              did={did}
              walletAddress={walletAddress}
              onCredentialCreated={onCredentialCreated}
            />
          </TabsContent>

          {/* Create New Tab */}
          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Create Options */}
              <Card className="border-2 border-dashed border-blue-200 hover:border-blue-300 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span>Quick Templates</span>
                  </CardTitle>
                  <CardDescription>
                    Pre-built templates for common credential types
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Identity Verification', icon: Shield, color: 'blue' },
                      { name: 'Professional License', icon: CheckCircle, color: 'green' },
                      { name: 'Educational Certificate', icon: Star, color: 'purple' },
                      { name: 'Custom Credential', icon: Plus, color: 'gray' }
                    ].map((template, index) => {
                      const Icon = template.icon;
                      return (
                        <motion.button
                          key={template.name}
                          className={`w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-${template.color}-300 hover:bg-${template.color}-50 transition-all duration-200 group`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`w-10 h-10 bg-${template.color}-100 rounded-lg flex items-center justify-center group-hover:bg-${template.color}-200`}>
                            <Icon className={`w-5 h-5 text-${template.color}-600`} />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-gray-900">{template.name}</div>
                            <div className="text-sm text-gray-500">Ready-to-use template</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        </motion.button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Manual Form Builder */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                      <Settings className="w-5 h-5" />
                    </div>
                    <span>Custom Builder</span>
                  </CardTitle>
                  <CardDescription>
                    Build credentials from scratch with custom fields
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Credential Type
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select credential type...</option>
                        <option value="identity">Identity Verification</option>
                        <option value="professional">Professional License</option>
                        <option value="educational">Educational Certificate</option>
                        <option value="custom">Custom Type</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="Enter subject name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Claims
                      </label>
                      <textarea 
                        placeholder="Enter credential claims (JSON format)..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Button 
                        variant="primary"
                        className="flex-1"
                        glow
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create Credential
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription>
                    Your latest credential creation activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                    <p className="text-gray-600 mb-4">
                      Start creating credentials to see your activity here
                    </p>
                    <Button
                      onClick={() => setActiveTab('marketplace')}
                      variant="outline"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Explore API Automation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Automation Tab */}
          <TabsContent value="marketplace">
            <APIMarketplaceCredentials />
          </TabsContent>

          {/* Batch Creation Tab */}
          <TabsContent value="batch">
            <div className="space-y-6">
              {/* Selected APIs for Batch Creation */}
              {selectedAPIs.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white">
                        <Zap className="w-5 h-5" />
                      </div>
                      <span>Batch Credential Creation</span>
                      <Badge variant="default">{selectedAPIs.length} APIs Selected</Badge>
                    </CardTitle>
                    <CardDescription>
                      Create verifiable credentials from multiple APIs simultaneously
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Selected APIs List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedAPIs.map((api) => (
                          <div
                            key={api.id}
                            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{api.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {api.provider}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{api.description}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>[CHART] {api.reliability.uptime}% uptime</span>
                              <span>[FAST] {api.reliability.responseTime}ms</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Batch Creation Controls */}
                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Ready to Create Credentials</h4>
                            <p className="text-sm text-gray-600">
                              This will create {selectedAPIs.length} verifiable credentials from the selected APIs
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedAPIs([])}
                              disabled={batchCreation.isActive}
                            >
                              Clear Selection
                            </Button>
                            <Button
                              onClick={createCredentialsFromSelectedAPIs}
                              disabled={batchCreation.isActive || selectedAPIs.length === 0}
                              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                            >
                              {batchCreation.isActive ? (
                                <>
                                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Create {selectedAPIs.length} Credentials
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Previous Results */}
                      {!batchCreation.isActive && (batchCreation.completed > 0 || batchCreation.failed.length > 0) && (
                        <div className="border-t pt-6">
                          <h4 className="font-medium text-gray-900 mb-3">Last Batch Results</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {batchCreation.completed > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <span className="font-medium text-green-900">Successful</span>
                                </div>
                                <p className="text-sm text-green-700">
                                  {batchCreation.completed} credentials created successfully
                                </p>
                              </div>
                            )}
                            {batchCreation.failed.length > 0 && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Clock className="w-5 h-5 text-red-600" />
                                  <span className="font-medium text-red-900">Failed</span>
                                </div>
                                <p className="text-sm text-red-700 mb-2">
                                  {batchCreation.failed.length} credentials failed to create
                                </p>
                                <div className="space-y-1">
                                  {batchCreation.failed.slice(0, 3).map((failure, index) => (
                                    <p key={index} className="text-xs text-red-600">
                                      • {failure.api}: {failure.error}
                                    </p>
                                  ))}
                                  {batchCreation.failed.length > 3 && (
                                    <p className="text-xs text-red-600">
                                      ... and {batchCreation.failed.length - 3} more
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* No APIs Selected */
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-600 rounded-lg flex items-center justify-center text-white">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span>Batch Credential Creation</span>
                    </CardTitle>
                    <CardDescription>
                      Select multiple APIs from the marketplace to create credentials in bulk
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Database className="w-12 h-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No APIs Selected</h3>
                      <p className="text-gray-600 mb-6">
                        Go to the API Automation tab to select APIs for batch credential creation
                      </p>
                      <Button
                        onClick={() => setActiveTab('marketplace')}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Browse API Automation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAPICredentialsManager;