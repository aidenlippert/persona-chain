/**
 * Integration Tests for RapidAPI Marketplace Service
 * Comprehensive test suite covering all service integrations
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import ApiDiscoveryService from '../services/ApiDiscoveryService.js';
import DocumentValidationService from '../services/DocumentValidationService.js';
import CredentialGeneratorService from '../services/CredentialGeneratorService.js';
import ApiMapperService from '../services/ApiMapperService.js';
import QualityAssuranceService from '../services/QualityAssuranceService.js';
import AnalyticsService from '../services/AnalyticsService.js';

// Mock configuration
const mockConfig = {
    port: 3005,
    rapidApiKey: 'test-key',
    jwtSecret: 'test-secret',
    apiTimeout: 5000,
    environment: 'test',
    redis: {
        host: 'localhost',
        port: 6379,
    },
    mongodb: {
        url: 'mongodb://localhost:27017/test',
    },
};

describe('RapidAPI Marketplace Integration Tests', () => {
    let apiDiscovery;
    let documentValidation;
    let credentialGenerator;
    let apiMapper;
    let qualityAssurance;
    let analytics;

    beforeAll(async () => {
        // Initialize services
        apiDiscovery = new ApiDiscoveryService(mockConfig);
        documentValidation = new DocumentValidationService(mockConfig);
        credentialGenerator = new CredentialGeneratorService(mockConfig);
        apiMapper = new ApiMapperService(mockConfig);
        qualityAssurance = new QualityAssuranceService(mockConfig);
        analytics = new AnalyticsService(mockConfig);
    });

    describe('End-to-End Verification Workflow', () => {
        test('should complete full document verification flow', async () => {
            // Step 1: Discover appropriate APIs
            const discoveredApis = await apiDiscovery.discoverApis('IDENTITY_VERIFICATION', {
                country: 'US',
                document_type: 'passport',
                max_price: 1.0,
            });

            expect(discoveredApis).toHaveLength(10);
            expect(discoveredApis[0]).toHaveProperty('relevance_score');
            expect(discoveredApis[0].relevance_score).toBeGreaterThan(0.5);

            // Step 2: Select best API
            const selectedApi = discoveredApis[0];
            expect(selectedApi).toHaveProperty('id');
            expect(selectedApi).toHaveProperty('endpoint');
            expect(selectedApi).toHaveProperty('provider');

            // Step 3: Prepare document data
            const documentData = {
                document_image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
                document_type: 'passport',
                country: 'US',
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: '1990-01-15',
            };

            // Step 4: Map request to provider format
            const mappedRequest = await apiMapper.mapRequestToProvider(
                documentData,
                selectedApi.provider,
                selectedApi.endpoint
            );

            expect(mappedRequest).toHaveProperty('DocumentImage');
            expect(mappedRequest).toHaveProperty('DocumentType');
            expect(mappedRequest).toHaveProperty('CountryCode');

            // Step 5: Perform document verification
            const verificationResult = await documentValidation.verifyDocument(
                selectedApi,
                documentData,
                'passport',
                'US'
            );

            expect(verificationResult).toHaveProperty('verified');
            expect(verificationResult).toHaveProperty('confidence');
            expect(verificationResult).toHaveProperty('fraud_assessment');
            expect(verificationResult).toHaveProperty('ocr_analysis');
            expect(verificationResult).toHaveProperty('structural_validation');

            // Step 6: Map response to standard format
            const standardResponse = await apiMapper.mapResponseFromProvider(
                verificationResult.api_verification,
                selectedApi.provider,
                documentData
            );

            expect(standardResponse).toHaveProperty('verified');
            expect(standardResponse).toHaveProperty('confidence');
            expect(standardResponse).toHaveProperty('extracted_data');

            // Step 7: Quality assessment
            const qualityAssessment = await qualityAssurance.performQualityAssessment(
                standardResponse,
                {
                    api_provider: selectedApi.provider,
                    document_type: 'passport',
                    country: 'US',
                }
            );

            expect(qualityAssessment).toHaveProperty('overall_quality_score');
            expect(qualityAssessment).toHaveProperty('quality_level');
            expect(qualityAssessment).toHaveProperty('checks_performed');
            expect(qualityAssessment.overall_quality_score).toBeGreaterThan(0);

            // Step 8: Generate verifiable credential
            const credential = await credentialGenerator.generateCredential(
                standardResponse,
                'IdentityCredential',
                {
                    subject_did: 'did:persona:user:test',
                    api_provider: selectedApi.provider,
                    api_used: selectedApi.name,
                    verification_timestamp: new Date().toISOString(),
                }
            );

            expect(credential).toHaveProperty('@context');
            expect(credential).toHaveProperty('type');
            expect(credential).toHaveProperty('issuer');
            expect(credential).toHaveProperty('credentialSubject');
            expect(credential).toHaveProperty('proof');
            expect(credential.type).toContain('VerifiableCredential');
            expect(credential.type).toContain('IdentityCredential');

            // Step 9: Record analytics
            analytics.recordApiUsage(
                selectedApi.provider,
                selectedApi.endpoint,
                1200, // response time
                'success',
                {
                    user_id: 'test-user',
                    country: 'US',
                    document_type: 'passport',
                    cost: 0.05,
                }
            );

            analytics.recordVerificationResult({
                api_provider: selectedApi.provider,
                document_type: 'passport',
                country: 'US',
                verified: standardResponse.verified,
                confidence: standardResponse.confidence,
                fraud_score: verificationResult.fraud_assessment?.fraud_score || 0,
                processing_time: 1200,
                quality_score: qualityAssessment.overall_quality_score,
                cost: 0.05,
                user_id: 'test-user',
            });

            // Verify final result
            expect(credential.credentialSubject).toHaveProperty('fullName');
            expect(credential.credentialSubject).toHaveProperty('dateOfBirth');
            expect(credential.credentialSubject).toHaveProperty('documentNumber');
        }, 30000); // 30 second timeout for full workflow
    });

    describe('API Discovery Service Integration', () => {
        test('should discover APIs for different categories', async () => {
            const categories = [
                'IDENTITY_VERIFICATION',
                'DOCUMENT_VERIFICATION',
                'FINANCIAL_VERIFICATION',
                'BACKGROUND_CHECKS',
            ];

            for (const category of categories) {
                const apis = await apiDiscovery.discoverApis(category, {
                    country: 'US',
                    max_price: 2.0,
                });

                expect(apis).toBeInstanceOf(Array);
                expect(apis.length).toBeGreaterThan(0);
                expect(apis[0]).toHaveProperty('relevance_score');
                expect(apis[0]).toHaveProperty('provider');
                expect(apis[0]).toHaveProperty('endpoint');
            }
        });

        test('should handle API filtering correctly', async () => {
            const apis = await apiDiscovery.discoverApis('IDENTITY_VERIFICATION', {
                country: 'UK',
                document_type: 'drivers_license',
                min_reliability: 95,
            });

            expect(apis).toBeInstanceOf(Array);
            // All APIs should support UK
            apis.forEach(api => {
                if (api.supported_countries) {
                    expect(api.supported_countries).toContain('UK');
                }
            });
        });
    });

    describe('Document Validation Service Integration', () => {
        test('should validate different document types', async () => {
            const documentTypes = ['passport', 'drivers_license', 'national_id'];
            const mockApi = {
                id: 'test-api',
                provider: 'TestProvider',
                endpoint: 'https://test.com/verify',
            };

            for (const docType of documentTypes) {
                const documentData = {
                    document_image: 'data:image/jpeg;base64,test-image-data',
                    document_type: docType,
                    country: 'US',
                };

                const result = await documentValidation.verifyDocument(
                    mockApi,
                    documentData,
                    docType,
                    'US'
                );

                expect(result).toHaveProperty('verified');
                expect(result).toHaveProperty('confidence');
                expect(result).toHaveProperty('ocr_analysis');
                expect(result).toHaveProperty('fraud_assessment');
                expect(result).toHaveProperty('structural_validation');
            }
        });

        test('should handle OCR processing correctly', async () => {
            const documentData = {
                document_image: 'data:image/jpeg;base64,test-image-data',
            };

            const preprocessed = await documentValidation.preprocessDocument(documentData);

            expect(preprocessed).toHaveProperty('buffer');
            expect(preprocessed).toHaveProperty('base64');
            expect(preprocessed).toHaveProperty('metadata');
            expect(preprocessed.metadata).toHaveProperty('width');
            expect(preprocessed.metadata).toHaveProperty('height');
        });
    });

    describe('Credential Generator Service Integration', () => {
        test('should generate credentials for all supported types', async () => {
            const credentialTypes = [
                'IdentityCredential',
                'AgeCredential',
                'DocumentVerificationCredential',
                'FinancialCredential',
                'BackgroundCredential',
            ];

            const mockApiResponse = {
                verified: true,
                confidence: 95,
                extracted_data: {
                    full_name: 'John Doe',
                    date_of_birth: '1990-01-15',
                    document_number: 'P123456789',
                    nationality: 'US',
                },
            };

            for (const credType of credentialTypes) {
                const credential = await credentialGenerator.generateCredential(
                    mockApiResponse,
                    credType,
                    {
                        subject_did: 'did:persona:user:test',
                        api_provider: 'TestProvider',
                    }
                );

                expect(credential).toHaveProperty('@context');
                expect(credential).toHaveProperty('type');
                expect(credential).toHaveProperty('issuer');
                expect(credential).toHaveProperty('credentialSubject');
                expect(credential).toHaveProperty('proof');
                expect(credential.type).toContain('VerifiableCredential');
                expect(credential.type).toContain(credType);
            }
        });

        test('should validate required fields correctly', async () => {
            const incompleteResponse = {
                verified: true,
                // Missing confidence and extracted_data
            };

            await expect(
                credentialGenerator.generateCredential(
                    incompleteResponse,
                    'IdentityCredential',
                    { subject_did: 'did:persona:user:test' }
                )
            ).rejects.toThrow('Missing required fields');
        });
    });

    describe('API Mapper Service Integration', () => {
        test('should map requests for different providers', async () => {
            const providers = ['trulioo', 'onfido', 'jumio', 'lexisnexis'];
            const requestData = {
                document_image: 'base64-image-data',
                document_type: 'passport',
                country_code: 'US',
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: '1990-01-15',
            };

            for (const provider of providers) {
                const mapped = await apiMapper.mapRequestToProvider(
                    requestData,
                    provider,
                    'https://test.com/verify'
                );

                expect(mapped).toBeInstanceOf(Object);
                expect(Object.keys(mapped).length).toBeGreaterThan(0);
                
                // Check provider-specific mappings
                if (provider === 'trulioo') {
                    expect(mapped).toHaveProperty('DocumentImage');
                    expect(mapped).toHaveProperty('DocumentType');
                }
            }
        });

        test('should map responses from different providers', async () => {
            const providerResponses = {
                trulioo: {
                    Record: {
                        RecordStatus: 'match',
                        DatasourceResults: [{
                            DatasourceFields: {
                                FullName: 'John Doe',
                                DateOfBirth: '1990-01-15',
                            }
                        }]
                    }
                },
                onfido: {
                    result: 'clear',
                    properties: {
                        full_name: { value: 'John Doe' },
                        date_of_birth: { value: '1990-01-15' },
                    }
                }
            };

            for (const [provider, response] of Object.entries(providerResponses)) {
                const mapped = await apiMapper.mapResponseFromProvider(
                    response,
                    provider,
                    { document_type: 'passport' }
                );

                expect(mapped).toHaveProperty('verified');
                expect(mapped).toHaveProperty('confidence');
                expect(mapped).toHaveProperty('extracted_data');
                expect(typeof mapped.verified).toBe('boolean');
                expect(typeof mapped.confidence).toBe('number');
            }
        });
    });

    describe('Quality Assurance Service Integration', () => {
        test('should perform comprehensive quality assessment', async () => {
            const verificationResult = {
                verified: true,
                confidence: 95,
                extracted_data: {
                    full_name: 'John Doe',
                    date_of_birth: '1990-01-15',
                    document_number: 'P123456789',
                },
                verification_details: {
                    document_integrity: true,
                    photo_match: true,
                },
                fraud_assessment: {
                    fraud_score: 0.1,
                    risk_level: 'low',
                },
                processing_time: 1200,
            };

            const assessment = await qualityAssurance.performQualityAssessment(
                verificationResult,
                {
                    api_provider: 'TestProvider',
                    document_type: 'passport',
                    country: 'US',
                }
            );

            expect(assessment).toHaveProperty('overall_quality_score');
            expect(assessment).toHaveProperty('quality_level');
            expect(assessment).toHaveProperty('checks_performed');
            expect(assessment.checks_performed).toHaveLength(5); // 5 categories
            expect(assessment.overall_quality_score).toBeGreaterThanOrEqual(0);
            expect(assessment.overall_quality_score).toBeLessThanOrEqual(1);
        });
    });

    describe('Analytics Service Integration', () => {
        test('should record and retrieve analytics correctly', async () => {
            // Record some test data
            analytics.recordApiUsage('TestProvider', '/verify', 1000, 'success', {
                user_id: 'test-user',
                country: 'US',
                document_type: 'passport',
                cost: 0.05,
            });

            analytics.recordVerificationResult({
                api_provider: 'TestProvider',
                document_type: 'passport',
                country: 'US',
                verified: true,
                confidence: 95,
                fraud_score: 0.1,
                processing_time: 1000,
                quality_score: 0.9,
                cost: 0.05,
                user_id: 'test-user',
            });

            // Get dashboard data
            const dashboard = await analytics.getDashboardData('1h');

            expect(dashboard).toHaveProperty('summary');
            expect(dashboard).toHaveProperty('api_usage');
            expect(dashboard).toHaveProperty('performance');
            expect(dashboard).toHaveProperty('quality');
            expect(dashboard).toHaveProperty('errors');
            expect(dashboard).toHaveProperty('costs');
            expect(dashboard).toHaveProperty('trends');
            expect(dashboard).toHaveProperty('alerts');
            expect(dashboard).toHaveProperty('recommendations');
        });

        test('should generate business reports', async () => {
            const report = await analytics.generateBusinessReport('24h', 'executive');

            expect(report).toHaveProperty('report_id');
            expect(report).toHaveProperty('report_type');
            expect(report).toHaveProperty('executive_summary');
            expect(report).toHaveProperty('key_metrics');
            expect(report).toHaveProperty('recommendations');
            expect(report.report_type).toBe('executive');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle invalid API responses gracefully', async () => {
            const invalidResponse = {
                error: 'API Error',
                message: 'Invalid request',
            };

            const mapped = await apiMapper.mapResponseFromProvider(
                invalidResponse,
                'unknown-provider',
                { document_type: 'passport' }
            );

            expect(mapped).toHaveProperty('verified');
            expect(mapped).toHaveProperty('confidence');
            expect(mapped.verified).toBe(false);
            expect(mapped.confidence).toBe(0);
        });

        test('should handle network timeouts', async () => {
            // Mock a timeout scenario
            const slowApi = {
                id: 'slow-api',
                provider: 'SlowProvider',
                endpoint: 'https://slow.test.com/verify',
            };

            const documentData = {
                document_image: 'test-data',
                document_type: 'passport',
                country: 'US',
            };

            const result = await documentValidation.verifyDocument(
                slowApi,
                documentData,
                'passport',
                'US'
            );

            // Should fallback gracefully
            expect(result).toHaveProperty('verified');
            expect(result).toHaveProperty('confidence');
        });

        test('should validate input data properly', async () => {
            const invalidData = {
                // Missing required fields
                document_type: 'passport',
            };

            await expect(
                apiMapper.mapRequestToProvider(
                    invalidData,
                    'trulioo',
                    'https://test.com/verify'
                )
            ).rejects.toThrow();
        });
    });

    describe('API Endpoints Integration', () => {
        test('POST /api/discover should return relevant APIs', async () => {
            const response = await request(app)
                .post('/api/discover')
                .send({
                    category: 'IDENTITY_VERIFICATION',
                    filters: {
                        country: 'US',
                        document_type: 'passport',
                        max_price: 1.0,
                    },
                })
                .expect(200);

            expect(response.body).toHaveProperty('apis');
            expect(response.body.apis).toBeInstanceOf(Array);
            expect(response.body.apis.length).toBeGreaterThan(0);
        });

        test('POST /api/verify should complete verification workflow', async () => {
            const response = await request(app)
                .post('/api/verify')
                .send({
                    api_id: 'mock_identity_verification_0',
                    document_data: {
                        document_image: 'data:image/jpeg;base64,test-data',
                        document_type: 'passport',
                        country: 'US',
                        first_name: 'John',
                        last_name: 'Doe',
                    },
                    credential_type: 'IdentityCredential',
                    metadata: {
                        subject_did: 'did:persona:user:test',
                    },
                })
                .expect(200);

            expect(response.body).toHaveProperty('verification_result');
            expect(response.body).toHaveProperty('quality_assessment');
            expect(response.body).toHaveProperty('credential');
            expect(response.body.verification_result).toHaveProperty('verified');
            expect(response.body.credential).toHaveProperty('type');
        }, 20000);

        test('GET /api/analytics/dashboard should return dashboard data', async () => {
            const response = await request(app)
                .get('/api/analytics/dashboard')
                .query({ time_range: '24h' })
                .expect(200);

            expect(response.body).toHaveProperty('summary');
            expect(response.body).toHaveProperty('api_usage');
            expect(response.body).toHaveProperty('performance');
        });
    });

    afterAll(async () => {
        // Cleanup
    });
});

describe('Performance Tests', () => {
    test('should handle concurrent verification requests', async () => {
        const concurrentRequests = 10;
        const promises = [];

        for (let i = 0; i < concurrentRequests; i++) {
            const promise = request(app)
                .post('/api/verify')
                .send({
                    api_id: 'mock_identity_verification_0',
                    document_data: {
                        document_image: 'data:image/jpeg;base64,test-data',
                        document_type: 'passport',
                        country: 'US',
                    },
                    credential_type: 'IdentityCredential',
                });
            promises.push(promise);
        }

        const responses = await Promise.all(promises);
        
        responses.forEach(response => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('verification_result');
        });
    }, 30000);

    test('should handle large document images', async () => {
        // Create a large base64 image (2MB)
        const largeImageData = 'data:image/jpeg;base64,' + 'A'.repeat(2 * 1024 * 1024);

        const response = await request(app)
            .post('/api/verify')
            .send({
                api_id: 'mock_identity_verification_0',
                document_data: {
                    document_image: largeImageData,
                    document_type: 'passport',
                    country: 'US',
                },
                credential_type: 'IdentityCredential',
            });

        expect(response.status).toBeLessThan(500); // Should not crash
    }, 15000);
});

describe('Security Tests', () => {
    test('should validate API keys', async () => {
        const response = await request(app)
            .post('/api/verify')
            .set('Authorization', 'Bearer invalid-token')
            .send({
                api_id: 'test-api',
                document_data: {},
            });

        expect(response.status).toBe(401);
    });

    test('should sanitize input data', async () => {
        const maliciousData = {
            api_id: '<script>alert("xss")</script>',
            document_data: {
                document_image: 'javascript:alert("xss")',
                document_type: 'passport',
            },
        };

        const response = await request(app)
            .post('/api/verify')
            .send(maliciousData);

        // Should either sanitize or reject
        expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should prevent credential injection attacks', async () => {
        const maliciousCredential = {
            '@context': ['https://malicious.com/context'],
            type: ['VerifiableCredential', 'MaliciousCredential'],
            credentialSubject: {
                id: 'did:malicious:user',
                adminRights: true,
            },
        };

        // Should not accept pre-formed credentials
        const response = await request(app)
            .post('/api/verify')
            .send({
                api_id: 'test-api',
                document_data: {
                    document_type: 'passport',
                },
                preformed_credential: maliciousCredential,
            });

        expect(response.status).toBe(400);
    });
});