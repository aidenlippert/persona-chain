/**
 * DID Method Registry Component
 * Displays and manages supported DID methods with their capabilities
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { universalDIDService, type DIDMethodSpec, type UniversalDIDResult } from '@/services/universalDIDService';
import { errorService } from "@/services/errorService";

interface DIDMethodRegistryProps {
  onMethodSelect?: (method: string) => void;
  onDIDGenerated?: (result: UniversalDIDResult) => void;
}

export const DIDMethodRegistry: React.FC<DIDMethodRegistryProps> = ({
  onMethodSelect,
  onDIDGenerated
}) => {
  const [supportedMethods, setSupportedMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [methodSpecs, setMethodSpecs] = useState<Map<string, DIDMethodSpec>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState<Map<string, UniversalDIDResult>>(new Map());

  useEffect(() => {
    loadSupportedMethods();
  }, []);

  const loadSupportedMethods = () => {
    const methods = universalDIDService.getSupportedMethods();
    setSupportedMethods(methods);
    
    const specs = new Map<string, DIDMethodSpec>();
    methods.forEach(method => {
      const spec = universalDIDService.getMethodSpec(method);
      if (spec) {
        specs.set(method, spec);
      }
    });
    setMethodSpecs(specs);
    
    if (methods.length > 0 && !selectedMethod) {
      setSelectedMethod(methods[0]);
    }
  };

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    onMethodSelect?.(method);
  };

  const handleGenerateDID = async (method: string) => {
    setIsGenerating(true);
    
    try {
      const result = await universalDIDService.generateDID({
        method,
        keyType: 'Ed25519'
      });
      
      setGenerationResults(prev => new Map(prev.set(method, result)));
      onDIDGenerated?.(result);
      
      if (result.success) {
        console.log(`✅ Generated ${method} DID:`, result.did);
      } else {
        errorService.logError(`❌ Failed to generate ${method} DID:`, result.error);
      }
    } catch (error) {
      errorService.logError(`❌ DID generation error:`, error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getFeatureBadges = (spec: DIDMethodSpec) => {
    const badges = [];
    
    if (spec.features.supportsKeyRotation) {
      badges.push({ label: 'Key Rotation', variant: 'success' as const });
    }
    
    if (spec.features.supportsCrossChain) {
      badges.push({ label: 'Cross-Chain', variant: 'default' as const });
    }
    
    if (spec.features.supportsVerifiableCredentials) {
      badges.push({ label: 'Credentials', variant: 'default' as const });
    }
    
    if (spec.features.supportsOfflineVerification) {
      badges.push({ label: 'Offline', variant: 'success' as const });
    }
    
    if (spec.features.requiresBlockchain) {
      badges.push({ label: 'Blockchain', variant: 'error' as const });
    }
    
    return badges;
  };

  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'persona':
        return 'PersonaPass native DID method with advanced features including key rotation, cross-chain support, and enterprise security.';
      case 'key':
        return 'W3C standard did:key method for cryptographic key-based identities with offline verification capabilities.';
      case 'web':
        return 'Web-based DID method that resolves identities through HTTPS endpoints and domain ownership.';
      case 'ethr':
        return 'Ethereum-based DID method using smart contracts for decentralized identity management.';
      default:
        return 'Custom DID method with specialized capabilities and features.';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🌐</span>
            <span>Supported DID Methods</span>
            <Badge variant="default">{supportedMethods.length} Methods</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {supportedMethods.map(method => {
              const spec = methodSpecs.get(method);
              const result = generationResults.get(method);
              
              if (!spec) return null;

              return (
                <Card 
                  key={method}
                  variant={selectedMethod === method ? "gradient" : "default"}
                  className={`cursor-pointer transition-all ${
                    selectedMethod === method ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleMethodSelect(method)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg font-semibold">
                        did:{method}
                      </span>
                      <div className="flex space-x-1">
                        {getFeatureBadges(spec).map((badge, index) => (
                          <Badge key={index} variant={badge.variant} className="text-xs">
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getMethodDescription(method)}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">Key Types:</span>
                        <div className="flex space-x-1">
                          {spec.keyTypes.map(keyType => (
                            <Badge key={keyType} variant="default" className="text-xs">
                              {keyType}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">Prefix:</span>
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          {spec.prefix}
                        </code>
                      </div>
                    </div>

                    {result && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        {result.success ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-500">✅</span>
                              <span className="text-sm font-medium">DID Generated</span>
                            </div>
                            <div className="text-xs font-mono break-all bg-white dark:bg-gray-900 p-2 rounded">
                              {result.did}
                            </div>
                            <div className="text-xs text-gray-500">
                              Key Type: {result.metadata?.keyType} | 
                              Created: {result.metadata?.created?.toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-red-500">❌</span>
                              <span className="text-sm font-medium">Generation Failed</span>
                            </div>
                            <div className="text-xs text-red-600">
                              {result.error}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateDID(method);
                      }}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating && selectedMethod === method ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          🔐 Generate {method.toUpperCase()} DID
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedMethod && (
        <Card>
          <CardHeader>
            <CardTitle>Method Details: did:{selectedMethod}</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const spec = methodSpecs.get(selectedMethod);
              if (!spec) return null;

              return (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-2">Capabilities</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className={spec.features.supportsKeyRotation ? 'text-green-500' : 'text-gray-400'}>
                            {spec.features.supportsKeyRotation ? '✅' : '❌'}
                          </span>
                          <span className="text-sm">Key Rotation</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={spec.features.supportsCrossChain ? 'text-green-500' : 'text-gray-400'}>
                            {spec.features.supportsCrossChain ? '✅' : '❌'}
                          </span>
                          <span className="text-sm">Cross-Chain Support</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={spec.features.supportsVerifiableCredentials ? 'text-green-500' : 'text-gray-400'}>
                            {spec.features.supportsVerifiableCredentials ? '✅' : '❌'}
                          </span>
                          <span className="text-sm">Verifiable Credentials</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={spec.features.supportsOfflineVerification ? 'text-green-500' : 'text-gray-400'}>
                            {spec.features.supportsOfflineVerification ? '✅' : '❌'}
                          </span>
                          <span className="text-sm">Offline Verification</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Requirements</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className={spec.features.requiresBlockchain ? 'text-yellow-500' : 'text-green-500'}>
                            {spec.features.requiresBlockchain ? '⚠️' : '✅'}
                          </span>
                          <span className="text-sm">
                            {spec.features.requiresBlockchain ? 'Requires Blockchain' : 'No Blockchain Required'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Supported key types: {spec.keyTypes.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Use Cases</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {selectedMethod === 'persona' && (
                        <>
                          <div>• Enterprise identity with advanced security features</div>
                          <div>• Cross-chain credential verification</div>
                          <div>• Key rotation and recovery mechanisms</div>
                          <div>• High-security applications requiring HSM support</div>
                        </>
                      )}
                      {selectedMethod === 'key' && (
                        <>
                          <div>• Simple cryptographic identity verification</div>
                          <div>• Offline signature verification</div>
                          <div>• Lightweight applications with minimal dependencies</div>
                          <div>• W3C standards compliance</div>
                        </>
                      )}
                      {selectedMethod === 'web' && (
                        <>
                          <div>• Domain-based identity verification</div>
                          <div>• Web service integration</div>
                          <div>• HTTPS-based identity resolution</div>
                          <div>• Corporate and institutional identities</div>
                        </>
                      )}
                      {selectedMethod === 'ethr' && (
                        <>
                          <div>• Ethereum-based decentralized identity</div>
                          <div>• Smart contract integration</div>
                          <div>• On-chain identity verification</div>
                          <div>• DeFi and Web3 applications</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};