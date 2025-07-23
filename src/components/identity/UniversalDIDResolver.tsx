/**
 * Universal DID Resolver Component
 * Resolves and displays DID documents from multiple DID methods
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { universalDIDService, type DIDResolutionResult, type UniversalDIDDocument } from '@/services/universalDIDService';
import { errorService } from "@/services/errorService";

interface UniversalDIDResolverProps {
  initialDID?: string;
  onResolutionComplete?: (result: DIDResolutionResult) => void;
}

export const UniversalDIDResolver: React.FC<UniversalDIDResolverProps> = ({
  initialDID = '',
  onResolutionComplete
}) => {
  const [didInput, setDidInput] = useState(initialDID);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionResult, setResolutionResult] = useState<DIDResolutionResult | null>(null);
  const [resolvedDIDs, setResolvedDIDs] = useState<string[]>([]);
  const [cacheStats, setCacheStats] = useState({ size: 0, entries: [] as string[] });

  useEffect(() => {
    if (initialDID) {
      setDidInput(initialDID);
      handleResolveDID();
    }
    updateCacheStats();
  }, [initialDID]);

  const updateCacheStats = () => {
    const stats = universalDIDService.getCacheStats();
    setCacheStats(stats);
  };

  const handleResolveDID = async () => {
    if (!didInput.trim()) {
      return;
    }

    setIsResolving(true);
    
    try {
      const result = await universalDIDService.resolveDID(didInput.trim(), {
        noCache: false
      });
      
      setResolutionResult(result);
      onResolutionComplete?.(result);
      
      if (result.didDocument) {
        setResolvedDIDs(prev => {
          const newList = [didInput.trim(), ...prev.filter(d => d !== didInput.trim())];
          return newList.slice(0, 10); // Keep last 10 resolved DIDs
        });
      }
      
      updateCacheStats();
      
      if (result.didResolutionMetadata.error) {
        errorService.logError(`❌ DID resolution failed:`, result.didResolutionMetadata.error);
      } else {
        console.log(`✅ DID resolved successfully:`, result.didDocument?.id);
      }
    } catch (error) {
      errorService.logError(`❌ DID resolution error:`, error);
      setResolutionResult({
        didResolutionMetadata: {
          error: 'generalError',
          duration: 0
        }
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleQuickResolve = (did: string) => {
    setDidInput(did);
    setTimeout(() => handleResolveDID(), 100);
  };

  const handleClearCache = () => {
    universalDIDService.clearCache();
    updateCacheStats();
  };

  const getMethodFromDID = (did: string): string => {
    const match = did.match(/^did:([^:]+):/);
    return match ? match[1] : 'unknown';
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return 'N/A';
    return `${duration.toFixed(2)}ms`;
  };

  const renderVerificationMethod = (vm: any, index: number) => (
    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Verification Method #{index + 1}</span>
        <Badge variant="default">{vm.type}</Badge>
      </div>
      
      <div className="space-y-1 text-xs">
        <div>
          <span className="font-medium">ID:</span>
          <span className="ml-2 font-mono">{vm.id}</span>
        </div>
        <div>
          <span className="font-medium">Controller:</span>
          <span className="ml-2 font-mono">{vm.controller}</span>
        </div>
        
        {vm.publicKeyMultibase && (
          <div>
            <span className="font-medium">Public Key (Multibase):</span>
            <div className="mt-1 p-2 bg-white dark:bg-gray-900 rounded font-mono text-xs break-all">
              {vm.publicKeyMultibase}
            </div>
          </div>
        )}
        
        {vm.publicKeyJwk && (
          <div>
            <span className="font-medium">Public Key (JWK):</span>
            <div className="mt-1 p-2 bg-white dark:bg-gray-900 rounded">
              <pre className="text-xs">{JSON.stringify(vm.publicKeyJwk, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderServiceEndpoint = (service: any, index: number) => (
    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Service #{index + 1}</span>
        <Badge variant="default">{service.type}</Badge>
      </div>
      
      <div className="space-y-1 text-xs">
        <div>
          <span className="font-medium">ID:</span>
          <span className="ml-2 font-mono">{service.id}</span>
        </div>
        <div>
          <span className="font-medium">Endpoint:</span>
          <span className="ml-2 font-mono">
            {typeof service.serviceEndpoint === 'string' 
              ? service.serviceEndpoint 
              : JSON.stringify(service.serviceEndpoint)
            }
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🔍</span>
            <span>Universal DID Resolver</span>
            {cacheStats.size > 0 && (
              <Badge variant="default">{cacheStats.size} Cached</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={didInput}
              onChange={(e) => setDidInput(e.target.value)}
              placeholder="Enter DID to resolve (e.g., did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleResolveDID();
                }
              }}
            />
            <Button
              variant="primary"
              onClick={handleResolveDID}
              disabled={isResolving || !didInput.trim()}
            >
              {isResolving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Resolving...
                </>
              ) : (
                'Resolve'
              )}
            </Button>
          </div>

          {resolvedDIDs.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Recently Resolved DIDs</h4>
              <div className="flex flex-wrap gap-2">
                {resolvedDIDs.map((did, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickResolve(did)}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md font-mono transition-colors"
                  >
                    {did.length > 40 ? `${did.substring(0, 40)}...` : did}
                  </button>
                ))}
              </div>
            </div>
          )}

          {cacheStats.size > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Cache: {cacheStats.size} entries
              </span>
              <Button variant="error" size="sm" onClick={handleClearCache}>
                Clear Cache
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {resolutionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Resolution Result</span>
              <div className="flex space-x-2">
                {resolutionResult.didDocument && (
                  <Badge variant="success">✅ Resolved</Badge>
                )}
                {resolutionResult.didResolutionMetadata.error && (
                  <Badge variant="error">❌ {resolutionResult.didResolutionMetadata.error}</Badge>
                )}
                <Badge variant="default">
                  {formatDuration(resolutionResult.didResolutionMetadata.duration)}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resolutionResult.didDocument ? (
              <div className="space-y-4">
                {/* DID Document Header */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">DID:</span>
                      <code className="text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded">
                        {resolutionResult.didDocument.id}
                      </code>
                      <Badge variant="default">
                        {getMethodFromDID(resolutionResult.didDocument.id)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">Controller:</span>
                      <code className="text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded">
                        {Array.isArray(resolutionResult.didDocument.controller) 
                          ? resolutionResult.didDocument.controller.join(', ')
                          : resolutionResult.didDocument.controller
                        }
                      </code>
                    </div>

                    {resolutionResult.didDocument.created && (
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">Created:</span>
                        <span className="text-sm">
                          {new Date(resolutionResult.didDocument.created).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Methods */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <span>🔐 Verification Methods</span>
                    <Badge variant="default">
                      {resolutionResult.didDocument.verificationMethod?.length || 0}
                    </Badge>
                  </h4>
                  <div className="space-y-3">
                    {resolutionResult.didDocument.verificationMethod?.map(renderVerificationMethod)}
                  </div>
                </div>

                {/* Authentication Methods */}
                {resolutionResult.didDocument.authentication && (
                  <div>
                    <h4 className="font-semibold mb-2">🔒 Authentication</h4>
                    <div className="flex flex-wrap gap-2">
                      {resolutionResult.didDocument.authentication.map((auth, index) => (
                        <Badge key={index} variant="default" className="font-mono text-xs">
                          {typeof auth === 'string' ? auth : auth.id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service Endpoints */}
                {resolutionResult.didDocument.service && resolutionResult.didDocument.service.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center space-x-2">
                      <span>🌐 Service Endpoints</span>
                      <Badge variant="default">
                        {resolutionResult.didDocument.service.length}
                      </Badge>
                    </h4>
                    <div className="space-y-3">
                      {resolutionResult.didDocument.service.map(renderServiceEndpoint)}
                    </div>
                  </div>
                )}

                {/* Raw Document */}
                <div>
                  <h4 className="font-semibold mb-2">📄 Raw DID Document</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-auto">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(resolutionResult.didDocument, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Resolution Metadata */}
                {resolutionResult.didDocumentMetadata && (
                  <div>
                    <h4 className="font-semibold mb-2">📊 Metadata</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-auto">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(resolutionResult.didDocumentMetadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-red-500 text-lg mb-2">❌</div>
                <div className="font-semibold mb-2">Resolution Failed</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {resolutionResult.didResolutionMetadata.error === 'invalidDid' && 'Invalid DID format'}
                  {resolutionResult.didResolutionMetadata.error === 'methodNotSupported' && 'DID method not supported'}
                  {resolutionResult.didResolutionMetadata.error === 'notFound' && 'DID not found'}
                  {resolutionResult.didResolutionMetadata.error === 'generalError' && 'General resolution error'}
                </div>
                
                <div className="mt-4 text-xs text-gray-500">
                  Resolution time: {formatDuration(resolutionResult.didResolutionMetadata.duration)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};