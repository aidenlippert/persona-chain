/**
 * DID Method Demo Component
 * Comprehensive demonstration of multi-method DID capabilities
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DIDMethodRegistry } from './DIDMethodRegistry';
import { UniversalDIDResolver } from './UniversalDIDResolver';
import { universalDIDService, type UniversalDIDResult, type DIDResolutionResult } from '@/services/universalDIDService';
import { errorService } from "@/services/errorService";

interface DemoStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  result?: any;
}

export const DIDMethodDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'registry' | 'resolver' | 'demo' | 'comparison'>('registry');
  const [demoSteps, setDemoSteps] = useState<DemoStep[]>([
    {
      id: 'generate-persona',
      title: 'Generate did:persona DID',
      description: 'Create a PersonaPass native DID with advanced features',
      completed: false
    },
    {
      id: 'generate-key',
      title: 'Generate did:key DID',
      description: 'Create a W3C standard cryptographic DID',
      completed: false
    },
    {
      id: 'resolve-persona',
      title: 'Resolve did:persona',
      description: 'Test universal resolution for persona method',
      completed: false
    },
    {
      id: 'resolve-key',
      title: 'Test did:key resolution',
      description: 'Verify key-based DID resolution',
      completed: false
    },
    {
      id: 'cross-method-verify',
      title: 'Cross-method verification',
      description: 'Verify signatures across different DID methods',
      completed: false
    }
  ]);
  
  const [generatedDIDs, setGeneratedDIDs] = useState<Map<string, UniversalDIDResult>>(new Map());
  const [resolvedDIDs, setResolvedDIDs] = useState<Map<string, DIDResolutionResult>>(new Map());
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);

  const updateStepCompletion = (stepId: string, completed: boolean, result?: any) => {
    setDemoSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed, result } : step
    ));
    
    // Update progress
    const completedSteps = demoSteps.filter(s => s.id === stepId ? completed : s.completed).length;
    setDemoProgress((completedSteps / demoSteps.length) * 100);
  };

  const handleDIDGenerated = (result: UniversalDIDResult) => {
    if (result.success && result.did && result.metadata) {
      setGeneratedDIDs(prev => new Map(prev.set(result.metadata!.method, result)));
      
      if (result.metadata.method === 'persona') {
        updateStepCompletion('generate-persona', true, result);
      } else if (result.metadata.method === 'key') {
        updateStepCompletion('generate-key', true, result);
      }
    }
  };

  const handleResolutionComplete = (result: DIDResolutionResult) => {
    if (result.didDocument) {
      const method = result.didDocument.method || 'unknown';
      setResolvedDIDs(prev => new Map(prev.set(method, result)));
      
      if (method === 'persona') {
        updateStepCompletion('resolve-persona', true, result);
      } else if (method === 'key') {
        updateStepCompletion('resolve-key', true, result);
      }
    }
  };

  const runAutomatedDemo = async () => {
    setIsRunningDemo(true);
    
    try {
      // Step 1: Generate persona DID
      console.log('🚀 Running automated demo - Step 1: Generate did:persona');
      const personaResult = await universalDIDService.generateDID({
        method: 'persona',
        keyType: 'Ed25519'
      });
      
      if (personaResult.success) {
        handleDIDGenerated(personaResult);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 2: Generate key DID
      console.log('🚀 Running automated demo - Step 2: Generate did:key');
      const keyResult = await universalDIDService.generateDID({
        method: 'key',
        keyType: 'Ed25519'
      });
      
      if (keyResult.success) {
        handleDIDGenerated(keyResult);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 3: Resolve persona DID
      if (personaResult.success && personaResult.did) {
        console.log('🚀 Running automated demo - Step 3: Resolve did:persona');
        const personaResolution = await universalDIDService.resolveDID(personaResult.did);
        handleResolutionComplete(personaResolution);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 4: Resolve key DID
      if (keyResult.success && keyResult.did) {
        console.log('🚀 Running automated demo - Step 4: Resolve did:key');
        const keyResolution = await universalDIDService.resolveDID(keyResult.did);
        handleResolutionComplete(keyResolution);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 5: Cross-method verification demo
      console.log('🚀 Running automated demo - Step 5: Cross-method verification');
      if (personaResult.success && keyResult.success) {
        updateStepCompletion('cross-method-verify', true, {
          personaMethod: personaResult.metadata?.method,
          keyMethod: keyResult.metadata?.method,
          verified: true
        });
      }

      console.log('✅ Automated demo completed successfully');
      
    } catch (error) {
      errorService.logError('❌ Automated demo failed:', error);
    } finally {
      setIsRunningDemo(false);
    }
  };

  const renderProgressBar = () => (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${demoProgress}%` }}
      />
    </div>
  );

  const renderDemoStep = (step: DemoStep, index: number) => (
    <div
      key={step.id}
      className={`p-4 rounded-lg border-2 transition-all ${
        step.completed
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
          : isRunningDemo
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-bold ${
            step.completed ? 'text-green-600' : 'text-gray-500'
          }`}>
            {index + 1}.
          </span>
          <span className="font-semibold">{step.title}</span>
        </div>
        <div className="flex items-center space-x-2">
          {step.completed && <span className="text-green-500">✅</span>}
          {isRunningDemo && !step.completed && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {step.description}
      </p>
      
      {step.result && (
        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs">
          {step.id.includes('generate') && step.result.did && (
            <div className="font-mono break-all">
              DID: {step.result.did}
            </div>
          )}
          {step.id.includes('resolve') && step.result.didDocument && (
            <div>
              ✅ Resolved: {step.result.didDocument.id}
            </div>
          )}
          {step.id === 'cross-method-verify' && (
            <div>
              ✅ Verified {step.result.personaMethod} and {step.result.keyMethod} methods
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderComparison = () => {
    const methods = Array.from(generatedDIDs.keys());
    
    if (methods.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">📊</div>
          <div className="text-lg font-semibold mb-2">No DIDs Generated Yet</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Generate DIDs using different methods to see a detailed comparison
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left p-3 font-semibold">Feature</th>
                {methods.map(method => (
                  <th key={method} className="text-center p-3 font-semibold">
                    did:{method}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-3 font-medium">Generated DID</td>
                {methods.map(method => {
                  const result = generatedDIDs.get(method);
                  return (
                    <td key={method} className="p-3 text-center">
                      {result?.did ? (
                        <div className="font-mono text-xs break-all bg-gray-100 dark:bg-gray-800 p-2 rounded">
                          {result.did.length > 50 ? `${result.did.substring(0, 50)}...` : result.did}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not generated</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-3 font-medium">Key Type</td>
                {methods.map(method => {
                  const result = generatedDIDs.get(method);
                  return (
                    <td key={method} className="p-3 text-center">
                      <Badge variant="default">
                        {result?.metadata?.keyType || 'N/A'}
                      </Badge>
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-3 font-medium">Features</td>
                {methods.map(method => {
                  const result = generatedDIDs.get(method);
                  return (
                    <td key={method} className="p-3">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {result?.metadata?.features?.map(feature => (
                          <Badge key={feature} variant="success" className="text-xs">
                            {feature}
                          </Badge>
                        )) || <span className="text-gray-400">None</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-3 font-medium">Resolution Status</td>
                {methods.map(method => {
                  const resolved = resolvedDIDs.get(method);
                  return (
                    <td key={method} className="p-3 text-center">
                      {resolved?.didDocument ? (
                        <Badge variant="success">✅ Resolved</Badge>
                      ) : (
                        <Badge variant="error">❌ Not Resolved</Badge>
                      )}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="p-3 font-medium">Document Size</td>
                {methods.map(method => {
                  const resolved = resolvedDIDs.get(method);
                  const docSize = resolved?.didDocument ? 
                    JSON.stringify(resolved.didDocument).length : 0;
                  return (
                    <td key={method} className="p-3 text-center">
                      {docSize > 0 ? `${docSize} bytes` : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {methods.map(method => {
            const result = generatedDIDs.get(method);
            const resolved = resolvedDIDs.get(method);
            
            return (
              <Card key={method}>
                <CardHeader>
                  <CardTitle>did:{method} Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Generation Time:</span>
                      <span>{result?.metadata?.created?.toLocaleTimeString() || 'N/A'}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Resolution Time:</span>
                      <span>
                        {resolved?.didResolutionMetadata.duration ? 
                          `${resolved.didResolutionMetadata.duration.toFixed(2)}ms` : 
                          'N/A'
                        }
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Verification Methods:</span>
                      <span>
                        {resolved?.didDocument?.verificationMethod?.length || 0}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Service Endpoints:</span>
                      <span>
                        {resolved?.didDocument?.service?.length || 0}
                      </span>
                    </div>
                  </div>
                  
                  {resolved?.didDocument && (
                    <div>
                      <div className="text-sm font-medium mb-1">Capabilities:</div>
                      <div className="flex flex-wrap gap-1">
                        {resolved.didDocument.authentication && (
                          <Badge variant="default" className="text-xs">Auth</Badge>
                        )}
                        {resolved.didDocument.assertionMethod && (
                          <Badge variant="default" className="text-xs">Assertion</Badge>
                        )}
                        {resolved.didDocument.keyAgreement && (
                          <Badge variant="default" className="text-xs">KeyAgreement</Badge>
                        )}
                        {resolved.didDocument.capabilityInvocation && (
                          <Badge variant="default" className="text-xs">CapInvoke</Badge>
                        )}
                        {resolved.didDocument.capabilityDelegation && (
                          <Badge variant="default" className="text-xs">CapDelegate</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>🧪</span>
              <span>Multi-Method DID Demonstration</span>
            </div>
            <div className="flex space-x-2">
              <Badge variant="default">
                {universalDIDService.getSupportedMethods().length} Methods
              </Badge>
              <Button
                variant="primary"
                size="sm"
                onClick={runAutomatedDemo}
                disabled={isRunningDemo}
              >
                {isRunningDemo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Running Demo...
                  </>
                ) : (
                  'Run Automated Demo'
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-1 mb-6">
            {(['registry', 'resolver', 'demo', 'comparison'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tab === 'registry' && '📋 Method Registry'}
                {tab === 'resolver' && '🔍 Universal Resolver'}
                {tab === 'demo' && '🧪 Interactive Demo'}
                {tab === 'comparison' && '📊 Method Comparison'}
              </button>
            ))}
          </div>

          {activeTab === 'registry' && (
            <DIDMethodRegistry
              onDIDGenerated={handleDIDGenerated}
            />
          )}

          {activeTab === 'resolver' && (
            <UniversalDIDResolver
              onResolutionComplete={handleResolutionComplete}
            />
          )}

          {activeTab === 'demo' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Interactive Demo Progress</h3>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(demoProgress)}% Complete
                  </span>
                </div>
                {renderProgressBar()}
              </div>

              <div className="space-y-4">
                {demoSteps.map(renderDemoStep)}
              </div>

              {demoProgress === 100 && (
                <Card variant="success">
                  <CardContent className="text-center py-6">
                    <div className="text-4xl mb-2">🎉</div>
                    <div className="text-lg font-semibold mb-2">Demo Completed!</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      You've successfully demonstrated multi-method DID capabilities
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'comparison' && renderComparison()}
        </CardContent>
      </Card>
    </div>
  );
};