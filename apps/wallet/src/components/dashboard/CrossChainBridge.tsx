/**
 * Cross-Chain Bridge Component - SPRINT 2
 * Advanced cross-chain identity operations using IBC protocol
 * 
 * Features:
 * - Cross-chain DID resolution and verification
 * - Credential attestation across blockchain networks
 * - ZK proof verification between chains
 * - Identity registration on multiple chains
 * - Real-time IBC channel and relayer monitoring
 * - Performance metrics and analytics
 */

import React, { useState, useEffect } from 'react';
import { 
  LinkIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  KeyIcon,
  // Removed unused CheckCircleIcon import
  XCircleIcon,
  // Removed unused ClockIcon import
  ArrowPathIcon,
  // Removed unused ChartBarIcon import
  // Removed unused CogIcon import
  EyeIcon,
  PlayIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ibcService } from '../../services/ibcService';
import { universalDIDService } from '../../services/universalDIDService';
import { enhancedZKProofService } from '../../services/enhancedZKProofService';
import type { 
  CrossChainDIDResolution, 
  CrossChainCredentialAttestation, 
  IBCChannel, 
  IBCRelayer 
} from '../../services/ibcService';
import type { VerifiableCredential } from '../../types/wallet';
import { errorService } from "@/services/errorService";

interface CrossChainBridgeProps {
  didKeyPair: any;
}

interface CrossChainOperation {
  id: string;
  type: 'did_resolution' | 'credential_attestation' | 'zk_verification' | 'identity_registration';
  status: 'pending' | 'relaying' | 'completed' | 'failed' | 'timeout';
  sourceChain: string;
  targetChain: string;
  channelId: string;
  createdAt: Date;
  completedAt?: Date;
  data: any;
  error?: string;
}

export const CrossChainBridge: React.FC<CrossChainBridgeProps> = ({ didKeyPair }) => {
  const [operations, setOperations] = useState<CrossChainOperation[]>([]);
  // Removed unused channels state
  // Removed unused relayers state
  const [statistics, setStatistics] = useState<any>(null);
  // Removed unused isLoading state
  const [selectedOperation, setSelectedOperation] = useState<CrossChainOperation | null>(null);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoResults, setDemoResults] = useState<any>(null);

  useEffect(() => {
    loadCrossChainData();
    const interval = setInterval(loadCrossChainData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadCrossChainData = async () => {
    try {
      // Load IBC statistics
      const stats = ibcService.getIBCStatistics();
      setStatistics(stats);

      // Load existing operations from localStorage
      const storedOps = localStorage.getItem(`crosschain_ops_${didKeyPair.did}`);
      if (storedOps) {
        const parsed = JSON.parse(storedOps);
        setOperations(parsed);
      }

      console.log('📊 Cross-chain data loaded:', {
        statistics: stats,
        operations: operations.length
      });
    } catch (error) {
      errorService.logError('❌ Failed to load cross-chain data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runCrossChainDemo = async () => {
    setIsDemoRunning(true);
    setDemoResults(null);
    
    try {
      console.log('🚀 Starting Cross-Chain Bridge Demo...');
      const results: any = {};

      // Demo 1: Cross-chain DID resolution
      console.log('🔍 Demo 1: Cross-chain DID resolution...');
      const didResolution = await ibcService.resolveDIDCrossChain(
        didKeyPair.did,
        'persona-1',
        'cosmoshub-4'
      );
      results.didResolution = didResolution;

      // Demo 2: Cross-chain credential attestation
      console.log('📋 Demo 2: Cross-chain credential attestation...');
      const mockCredential: VerifiableCredential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "demo-credential-crosschain",
        type: ["VerifiableCredential"],
        issuer: "did:persona:demo-issuer",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: didKeyPair.did,
          name: "Cross-Chain Demo User",
          dateOfBirth: "1990-01-01",
          nationality: "Demo"
        },
        proof: {
          type: "Ed25519Signature2020",
          created: new Date().toISOString(),
          verificationMethod: "did:persona:demo-issuer#key1",
          proofPurpose: "assertionMethod",
          proofValue: "demo-proof-value-crosschain"
        }
      };

      const credentialAttestation = await ibcService.attestCredentialCrossChain(
        mockCredential,
        'persona-1',
        'ethereum-1',
        true
      );
      results.credentialAttestation = credentialAttestation;

      // Demo 3: ZK proof verification across chains
      console.log('🔐 Demo 3: Cross-chain ZK proof verification...');
      const zkProof = await enhancedZKProofService.generateOptimizedProof(
        mockCredential,
        'age_verification',
        [18, Date.now()],
        { useCache: true, optimizationLevel: 'enterprise' }
      );

      const zkVerification = await ibcService.verifyZKProofCrossChain(
        zkProof.proof,
        zkProof.publicSignals,
        'age_verification',
        'persona-1',
        'polygon-137'
      );
      results.zkVerification = zkVerification;

      // Demo 4: Identity registration across multiple chains
      console.log('📝 Demo 4: Multi-chain identity registration...');
      const didDocument = await universalDIDService.resolveDID(didKeyPair.did);
      const identityRegistration = await ibcService.registerIdentityCrossChain(
        didKeyPair.did,
        didDocument.didDocument,
        'persona-1',
        ['cosmoshub-4', 'ethereum-1', 'polygon-137']
      );
      results.identityRegistration = identityRegistration;

      // Create operation records
      const newOperations: CrossChainOperation[] = [
        {
          id: didResolution.requestId,
          type: 'did_resolution',
          status: 'pending',
          sourceChain: 'persona-1',
          targetChain: 'cosmoshub-4',
          channelId: didResolution.channelId,
          createdAt: new Date(),
          data: didResolution
        },
        {
          id: credentialAttestation.attestationId,
          type: 'credential_attestation',
          status: 'pending',
          sourceChain: 'persona-1',
          targetChain: 'ethereum-1',
          channelId: credentialAttestation.channelId,
          createdAt: new Date(),
          data: credentialAttestation
        },
        {
          id: zkVerification.verificationId,
          type: 'zk_verification',
          status: 'completed',
          sourceChain: 'persona-1',
          targetChain: 'polygon-137',
          channelId: 'channel-2',
          createdAt: new Date(),
          completedAt: new Date(),
          data: zkVerification
        },
        {
          id: identityRegistration.registrationId,
          type: 'identity_registration',
          status: 'pending',
          sourceChain: 'persona-1',
          targetChain: 'multiple',
          channelId: 'multi-channel',
          createdAt: new Date(),
          data: identityRegistration
        }
      ];

      const updatedOperations = [...operations, ...newOperations];
      setOperations(updatedOperations);
      localStorage.setItem(`crosschain_ops_${didKeyPair.did}`, JSON.stringify(updatedOperations));

      setDemoResults(results);
      
      // Update statistics
      const updatedStats = ibcService.getIBCStatistics();
      setStatistics(updatedStats);

      console.log('🎉 Cross-Chain Bridge Demo completed successfully!');

    } catch (error) {
      errorService.logError('❌ Cross-Chain Bridge Demo failed:', error);
      setDemoResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsDemoRunning(false);
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'did_resolution':
        return KeyIcon;
      case 'credential_attestation':
        return DocumentTextIcon;
      case 'zk_verification':
        return ShieldCheckIcon;
      case 'identity_registration':
        return GlobeAltIcon;
      default:
        return LinkIcon;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case 'did_resolution':
        return 'bg-blue-100 text-blue-600';
      case 'credential_attestation':
        return 'bg-green-100 text-green-600';
      case 'zk_verification':
        return 'bg-purple-100 text-purple-600';
      case 'identity_registration':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'relaying':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'timeout':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getChainColor = (chain: string) => {
    switch (chain) {
      case 'persona-1':
        return 'bg-purple-100 text-purple-700';
      case 'cosmoshub-4':
        return 'bg-blue-100 text-blue-700';
      case 'ethereum-1':
        return 'bg-gray-100 text-gray-700';
      case 'polygon-137':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>🌐</span>
              <span>Cross-Chain Bridge & IBC Integration</span>
              <Badge variant="success">SPRINT 2</Badge>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadCrossChainData}
                className="text-sm"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowDemoModal(true)}
                disabled={isDemoRunning}
              >
                {isDemoRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Running Demo...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Cross-Chain Demo
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Seamlessly transfer identity data, credentials, and ZK proofs across blockchain networks using IBC protocol.
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{statistics.channels.open}</div>
                  <div className="text-sm text-gray-600">Open Channels</div>
                </div>
                <LinkIcon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{statistics.relayers.active}</div>
                  <div className="text-sm text-gray-600">Active Relayers</div>
                </div>
                <GlobeAltIcon className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{statistics.crossChainOperations.didResolutions}</div>
                  <div className="text-sm text-gray-600">DID Resolutions</div>
                </div>
                <KeyIcon className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{statistics.crossChainOperations.credentialAttestations}</div>
                  <div className="text-sm text-gray-600">Attestations</div>
                </div>
                <DocumentTextIcon className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cross-Chain Operations */}
      <Card>
        <CardHeader>
          <CardTitle>🔄 Cross-Chain Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-8">
              <LinkIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No cross-chain operations yet</p>
              <Button
                variant="primary"
                onClick={() => setShowDemoModal(true)}
              >
                Start Cross-Chain Demo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {operations.map((operation) => {
                const Icon = getOperationIcon(operation.type);
                return (
                  <Card key={operation.id} variant="default">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getOperationColor(operation.type)}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{operation.type.replace('_', ' ').toUpperCase()}</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span className={`px-2 py-1 rounded-full text-xs ${getChainColor(operation.sourceChain)}`}>
                                {operation.sourceChain}
                              </span>
                              <span>→</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${getChainColor(operation.targetChain)}`}>
                                {operation.targetChain}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {operation.createdAt.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <Badge 
                            variant={
                              operation.status === 'completed' ? 'success' :
                              operation.status === 'failed' ? 'error' :
                              'default'
                            }
                          >
                            {operation.status}
                          </Badge>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOperation(operation);
                              setShowOperationModal(true);
                            }}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IBC Network Status */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle>📊 IBC Network Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium mb-2">Channel Status</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Channels:</span>
                    <span className="font-semibold">{statistics.channels.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Open Channels:</span>
                    <span className="font-semibold text-green-600">{statistics.channels.open}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending Channels:</span>
                    <span className="font-semibold text-yellow-600">{statistics.channels.pending}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Relayer Network</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Relayers:</span>
                    <span className="font-semibold">{statistics.relayers.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Active Relayers:</span>
                    <span className="font-semibold text-green-600">{statistics.relayers.active}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Reliability:</span>
                    <span className="font-semibold">{statistics.relayers.avgReliability.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">Packet Statistics</div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.packets.pending}</div>
                  <div className="text-sm text-gray-600">Pending Packets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{statistics.packets.totalSent}</div>
                  <div className="text-sm text-gray-600">Total Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{statistics.crossChainOperations.activeResolutions + statistics.crossChainOperations.activeAttestations}</div>
                  <div className="text-sm text-gray-600">Active Operations</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Cross-Chain Bridge Demo</h3>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">Demo Overview</span>
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p>• Cross-chain DID resolution from PersonaChain to Cosmos Hub</p>
                  <p>• Credential attestation with ZK proofs from PersonaChain to Ethereum</p>
                  <p>• ZK proof verification across PersonaChain and Polygon</p>
                  <p>• Multi-chain identity registration across 3 networks</p>
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                <Button
                  variant="primary"
                  onClick={runCrossChainDemo}
                  disabled={isDemoRunning}
                  className="px-6 py-3"
                >
                  {isDemoRunning ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Running Cross-Chain Demo...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Start Demo
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowDemoModal(false)}
                >
                  Close
                </Button>
              </div>
              
              {demoResults && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-semibold">Demo Results:</h4>
                  
                  {demoResults.error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-900 dark:text-red-100">Demo Failed</span>
                      </div>
                      <div className="text-sm text-red-800 dark:text-red-200 mt-2">
                        {demoResults.error}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {Object.entries(demoResults).map(([key, result]: [string, any]) => (
                        <Card key={key} variant="default">
                          <CardContent className="p-4">
                            <h5 className="font-semibold mb-2">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h5>
                            <div className="text-sm text-gray-600 space-y-1">
                              {result.requestId && <div>ID: {result.requestId}</div>}
                              {result.attestationId && <div>ID: {result.attestationId}</div>}
                              {result.verificationId && <div>ID: {result.verificationId}</div>}
                              {result.registrationId && <div>ID: {result.registrationId}</div>}
                              {result.status && <div>Status: {result.status}</div>}
                              {result.isValid !== undefined && <div>Valid: {result.isValid ? '✅' : '❌'}</div>}
                              {result.channelId && <div>Channel: {result.channelId}</div>}
                              {result.sourceChain && <div>From: {result.sourceChain}</div>}
                              {result.targetChain && <div>To: {result.targetChain}</div>}
                              {result.registrations && <div>Chains: {result.registrations.length}</div>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Operation Details Modal */}
      {showOperationModal && selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Operation Details</h3>
              <button
                onClick={() => setShowOperationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <p className="text-sm">{selectedOperation.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Badge variant={selectedOperation.status === 'completed' ? 'success' : 'default'}>
                    {selectedOperation.status}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Source Chain</label>
                  <span className={`px-2 py-1 rounded-full text-xs ${getChainColor(selectedOperation.sourceChain)}`}>
                    {selectedOperation.sourceChain}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Chain</label>
                  <span className={`px-2 py-1 rounded-full text-xs ${getChainColor(selectedOperation.targetChain)}`}>
                    {selectedOperation.targetChain}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Channel ID</label>
                  <p className="text-sm font-mono">{selectedOperation.channelId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Created</label>
                  <p className="text-sm">{selectedOperation.createdAt.toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Operation Data</label>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedOperation.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossChainBridge;