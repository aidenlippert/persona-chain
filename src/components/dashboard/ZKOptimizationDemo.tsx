/**
 * ZK Optimization Demo Component - SPRINT 1.3 Showcase
 * Demonstrates circuit optimization and batch verification capabilities
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { enhancedZKProofService } from '../../services/enhancedZKProofService';
import { errorService } from "@/services/errorService";
import type { 
  ZKCircuit, 
  ZKProofBatch, 
  ZKPerformanceMetrics 
} from '../../services/enhancedZKProofService';

export const ZKOptimizationDemo: React.FC = () => {
  const [circuits, setCircuits] = useState<ZKCircuit[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [batchResults, setBatchResults] = useState<ZKProofBatch | null>(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);

  useEffect(() => {
    loadOptimizationData();
  }, []);

  const loadOptimizationData = () => {
    try {
      // Load available optimized circuits
      const availableCircuits = enhancedZKProofService.getOptimizedCircuits();
      setCircuits(availableCircuits);

      // Get performance statistics
      const stats = enhancedZKProofService.getPerformanceStats();
      setPerformanceMetrics(stats);

      console.log('📊 ZK Optimization data loaded:', {
        circuits: availableCircuits.length,
        stats
      });
    } catch (error) {
      errorService.logError('❌ Failed to load optimization data:', error);
    }
  };

  const runOptimizationDemo = async () => {
    setIsDemoRunning(true);
    
    try {
      console.log('🚀 Starting ZK Circuit Optimization Demo...');

      // Demo 1: Circuit Analysis
      const ageOptimization = enhancedZKProofService.getCircuitOptimizations('age_verification');
      const incomeOptimization = enhancedZKProofService.getCircuitOptimizations('income_threshold');
      
      setOptimizationResults({
        age_verification: ageOptimization,
        income_threshold: incomeOptimization
      });

      // Demo 2: Generate single optimized proof
      console.log('📝 Generating single optimized proof...');
      const singleStartTime = performance.now();
      
      await enhancedZKProofService.generateOptimizedProof(
        {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          id: "demo-credential-1",
          type: ["VerifiableCredential"],
          issuer: "did:persona:demo",
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: "did:persona:holder",
            dateOfBirth: "1990-01-01"
          },
          proof: {
            type: "Ed25519Signature2020",
            created: new Date().toISOString(),
            verificationMethod: "did:persona:demo#key1",
            proofPurpose: "assertionMethod",
            proofValue: "demo-proof-value"
          }
        },
        'age_verification',
        [18, Date.now()],
        {
          useCache: true,
          optimizationLevel: 'enterprise'
        }
      );

      const singleTime = performance.now() - singleStartTime;
      console.log(`✅ Single proof generated in ${singleTime.toFixed(2)}ms`);

      // Demo 3: Generate batch proofs
      console.log('📦 Generating batch proofs...');
      const batchStartTime = performance.now();
      
      const credentials = Array.from({ length: 5 }, (_, i) => ({
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: `demo-credential-batch-${i + 1}`,
        type: ["VerifiableCredential"],
        issuer: "did:persona:demo",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: `did:persona:holder-${i + 1}`,
          dateOfBirth: `199${i}-01-01`
        },
        proof: {
          type: "Ed25519Signature2020",
          created: new Date().toISOString(),
          verificationMethod: "did:persona:demo#key1",
          proofPurpose: "assertionMethod",
          proofValue: `demo-proof-value-${i + 1}`
        }
      }));

      const publicInputsArray = credentials.map((_, i) => [18 + i, Date.now()]);

      const batchResult = await enhancedZKProofService.generateBatchProofs(
        credentials,
        'age_verification',
        publicInputsArray,
        {
          useCache: true,
          useAggregation: true,
          maxBatchSize: 10,
          optimizationLevel: 'enterprise'
        }
      );

      const batchTime = performance.now() - batchStartTime;
      console.log(`✅ Batch of ${batchResult.batchSize} proofs generated in ${batchTime.toFixed(2)}ms`);
      console.log(`📊 Average per proof: ${(batchTime / batchResult.batchSize).toFixed(2)}ms`);

      setBatchResults(batchResult);

      // Demo 4: Verify batch
      console.log('🔍 Verifying batch proofs...');
      const verificationStartTime = performance.now();
      
      const isValid = await enhancedZKProofService.verifyBatchProofs(batchResult);
      
      const verificationTime = performance.now() - verificationStartTime;
      console.log(`✅ Batch verification: ${isValid} in ${verificationTime.toFixed(2)}ms`);

      // Update performance metrics
      const updatedStats = enhancedZKProofService.getPerformanceStats();
      setPerformanceMetrics(updatedStats);

      console.log('🎉 ZK Optimization Demo completed successfully!');

    } catch (error) {
      errorService.logError('❌ ZK Optimization Demo failed:', error);
    } finally {
      setIsDemoRunning(false);
    }
  };

  const clearCaches = () => {
    enhancedZKProofService.clearOptimizationCaches();
    setPerformanceMetrics(enhancedZKProofService.getPerformanceStats());
    console.log('🧹 ZK optimization caches cleared');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>⚡</span>
              <span>ZK Circuit Optimization & Batch Verification</span>
              <Badge variant="success">SPRINT 1.3</Badge>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={clearCaches}
                className="text-sm"
              >
                🧹 Clear Caches
              </Button>
              <Button
                variant="primary"
                onClick={runOptimizationDemo}
                disabled={isDemoRunning}
              >
                {isDemoRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Running Demo...
                  </>
                ) : (
                  '🚀 Run Optimization Demo'
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Demonstrates enterprise-scale ZK proof optimization with constraint reduction, batch processing, and performance monitoring.
          </div>
        </CardContent>
      </Card>

      {/* Optimized Circuits */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Optimized Circuits Registry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {circuits.map(circuit => (
              <Card key={circuit.id} variant="default">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{circuit.name}</h4>
                      <Badge 
                        variant={
                          circuit.optimizationLevel === 'enterprise' ? 'success' :
                          circuit.optimizationLevel === 'optimized' ? 'default' : 'error'
                        }
                      >
                        {circuit.optimizationLevel}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {circuit.description}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium">Constraints:</span> {circuit.constraints}
                      </div>
                      <div>
                        <span className="font-medium">Version:</span> {circuit.version}
                      </div>
                      <div>
                        <span className="font-medium">Est. Time:</span> {circuit.estimatedGenerationTime}ms
                      </div>
                      <div>
                        <span className="font-medium">Memory:</span> {circuit.memoryRequirement}MB
                      </div>
                    </div>
                    
                    {circuit.constraintReduction && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs">
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          ⚡ {circuit.constraintReduction}% constraint reduction
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Results */}
      {optimizationResults && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Circuit Optimization Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(optimizationResults).map(([proofType, results]: [string, any]) => (
                <Card key={proofType} variant="default">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">{proofType.replace('_', ' ').toUpperCase()}</h4>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-sm font-medium mb-2">Available Circuits:</div>
                        <div className="space-y-2">
                          {results.availableCircuits?.map((circuit: any, index: number) => (
                            <div key={index} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                              <div className="font-medium">{circuit.name}</div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {circuit.constraintCount} constraints • {circuit.constraintReduction}% reduction
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-2">Recommended:</div>
                        {results.recommended && (
                          <div className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            <div className="font-medium text-blue-700 dark:text-blue-300">
                              {results.recommended.name}
                            </div>
                            <div className="text-blue-600 dark:text-blue-400">
                              {results.recommended.constraintCount} constraints • 
                              {results.recommended.estimatedTime}ms
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Results */}
      {batchResults && (
        <Card>
          <CardHeader>
            <CardTitle>📦 Batch Proof Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Batch Summary</div>
                <div className="text-xs space-y-1">
                  <div>ID: {batchResults.id}</div>
                  <div>Size: {batchResults.batchSize} proofs</div>
                  <div>Total Time: {batchResults.generationTime.toFixed(2)}ms</div>
                  <div>Avg/Proof: {(batchResults.generationTime / batchResults.batchSize).toFixed(2)}ms</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Optimization</div>
                <div className="text-xs space-y-1">
                  <div>Circuit: {batchResults.metadata?.circuitId}</div>
                  <div>Level: {batchResults.metadata?.optimizationUsed}</div>
                  <div>Memory: {batchResults.metadata?.memoryUsage}MB</div>
                  <div>Cache Hits: {(batchResults.metadata?.cacheHits || 0) * 100}%</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Performance</div>
                <div className="text-xs space-y-1">
                  <div>Constraints: {batchResults.totalConstraints}</div>
                  <div>Verification: {batchResults.verificationTime?.toFixed(2) || 'N/A'}ms</div>
                  <div>Aggregated: {batchResults.aggregatedProof ? '✅' : '❌'}</div>
                  <div>Created: {new Date(batchResults.created).toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>📈 Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium mb-2">Cache Performance</div>
                <div className="text-xs space-y-1">
                  <div>Proof Cache: {performanceMetrics.cache?.proofCacheSize || 0} entries</div>
                  <div>Batch Cache: {performanceMetrics.cache?.batchCacheSize || 0} entries</div>
                  <div>Hit Rate: {((performanceMetrics.cache?.hitRate || 0) * 100).toFixed(1)}%</div>
                  <div>Nullifiers: {performanceMetrics.nullifierRegistry?.size || 0}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Circuit Registry</div>
                <div className="text-xs space-y-1">
                  <div>Total Circuits: {performanceMetrics.circuitRegistry?.totalCircuits || 0}</div>
                  <div>Optimized: {performanceMetrics.circuitRegistry?.optimizedCircuits || 0}</div>
                  <div>Avg Reduction: {(performanceMetrics.circuitRegistry?.averageConstraintReduction || 0).toFixed(1)}%</div>
                  <div>Constraints Saved: {Math.round(performanceMetrics.circuitRegistry?.totalConstraintsSaved || 0)}</div>
                </div>
              </div>
            </div>
            
            {performanceMetrics.optimizationRecommendations?.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Recommendations</div>
                <div className="space-y-2">
                  {performanceMetrics.optimizationRecommendations.map((rec: any, index: number) => (
                    <div key={index} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                      <div className="font-medium text-yellow-700 dark:text-yellow-300">
                        {rec.type.toUpperCase()}: {rec.message}
                      </div>
                      <div className="text-yellow-600 dark:text-yellow-400">
                        Action: {rec.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ZKOptimizationDemo;