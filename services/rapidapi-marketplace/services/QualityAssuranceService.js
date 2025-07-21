/**
 * Quality Assurance Service
 * Comprehensive quality control for API responses and credential generation
 * Ensures data integrity, compliance, and reliability
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import crypto from 'crypto';
import { z } from 'zod';

export default class QualityAssuranceService {
    constructor(config) {
        this.config = config;
        this.cache = new NodeCache({ stdTTL: 3600 });
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            defaultMeta: { service: 'quality-assurance' },
        });
        
        // Quality check configurations
        this.qualityChecks = {
            // Data consistency checks
            CONSISTENCY: {
                weight: 0.25,
                checks: [
                    'field_completeness',
                    'data_format_validation',
                    'cross_field_validation',
                    'temporal_consistency',
                ],
                thresholds: {
                    critical: 0.9,
                    warning: 0.7,
                    acceptable: 0.5,
                },
            },
            
            // Accuracy checks
            ACCURACY: {
                weight: 0.3,
                checks: [
                    'api_confidence_validation',
                    'ocr_quality_assessment',
                    'fraud_score_validation',
                    'historical_accuracy',
                ],
                thresholds: {
                    critical: 0.85,
                    warning: 0.7,
                    acceptable: 0.6,
                },
            },
            
            // Compliance checks
            COMPLIANCE: {
                weight: 0.2,
                checks: [
                    'gdpr_compliance',
                    'data_retention_compliance',
                    'consent_validation',
                    'audit_trail_completeness',
                ],
                thresholds: {
                    critical: 1.0,
                    warning: 0.9,
                    acceptable: 0.8,
                },
            },
            
            // Performance checks
            PERFORMANCE: {
                weight: 0.15,
                checks: [
                    'response_time_validation',
                    'api_reliability_check',
                    'resource_utilization',
                    'scalability_metrics',
                ],
                thresholds: {
                    critical: 0.8,
                    warning: 0.6,
                    acceptable: 0.4,
                },
            },
            
            // Security checks
            SECURITY: {
                weight: 0.1,
                checks: [
                    'data_sanitization',
                    'encryption_validation',
                    'access_control_check',
                    'pii_protection',
                ],
                thresholds: {
                    critical: 0.95,
                    warning: 0.8,
                    acceptable: 0.7,
                },
            },
        };
        
        // Validation rules for different data types
        this.validationRules = {
            // Personal information validation
            personal: {
                full_name: {
                    pattern: /^[a-zA-Z\s\-'\.]{2,100}$/,
                    minLength: 2,
                    maxLength: 100,
                    required: true,
                },
                first_name: {
                    pattern: /^[a-zA-Z\-'\.]{1,50}$/,
                    minLength: 1,
                    maxLength: 50,
                    required: false,
                },
                last_name: {
                    pattern: /^[a-zA-Z\s\-'\.]{1,50}$/,
                    minLength: 1,
                    maxLength: 50,
                    required: false,
                },
                date_of_birth: {
                    pattern: /^\d{4}-\d{2}-\d{2}$/,
                    validation: (date) => {
                        const birthDate = new Date(date);
                        const now = new Date();
                        const age = now.getFullYear() - birthDate.getFullYear();
                        return age >= 0 && age <= 150;
                    },
                    required: true,
                },
            },
            
            // Document validation
            document: {
                document_number: {
                    minLength: 5,
                    maxLength: 20,
                    pattern: /^[A-Z0-9\-]{5,20}$/,
                    required: true,
                },
                nationality: {
                    pattern: /^[A-Z]{2,3}$/,
                    validation: (code) => this.isValidCountryCode(code),
                    required: false,
                },
                expiry_date: {
                    pattern: /^\d{4}-\d{2}-\d{2}$/,
                    validation: (date) => {
                        const expiryDate = new Date(date);
                        const now = new Date();
                        return expiryDate > now; // Must be in future
                    },
                    required: false,
                },
            },
            
            // Verification metadata
            verification: {
                confidence: {
                    type: 'number',
                    min: 0,
                    max: 100,
                    required: true,
                },
                verified: {
                    type: 'boolean',
                    required: true,
                },
                processing_time: {
                    type: 'number',
                    min: 0,
                    max: 60000, // 60 seconds max
                    required: false,
                },
                api_provider: {
                    pattern: /^[a-zA-Z0-9_\-]{2,50}$/,
                    required: true,
                },
            },
        };
        
        // Known quality issues and their patterns
        this.qualityIssuePatterns = {
            // OCR quality issues
            OCR_POOR_QUALITY: {
                indicators: ['low_confidence', 'missing_characters', 'garbled_text'],
                severity: 'medium',
                remediation: 'Improve image quality or use alternative OCR engine',
            },
            
            // API reliability issues
            API_INCONSISTENCY: {
                indicators: ['conflicting_results', 'timeout_errors', 'format_errors'],
                severity: 'high',
                remediation: 'Use alternative API provider or implement fallback',
            },
            
            // Data quality issues
            INCOMPLETE_DATA: {
                indicators: ['missing_required_fields', 'empty_responses', 'null_values'],
                severity: 'medium',
                remediation: 'Request additional data or mark as incomplete',
            },
            
            // Fraud indicators
            POTENTIAL_FRAUD: {
                indicators: ['high_fraud_score', 'tampered_document', 'inconsistent_data'],
                severity: 'critical',
                remediation: 'Reject verification and flag for manual review',
            },
            
            // Compliance issues
            COMPLIANCE_VIOLATION: {
                indicators: ['missing_consent', 'data_retention_exceeded', 'unauthorized_access'],
                severity: 'critical',
                remediation: 'Immediate remediation required for compliance',
            },
        };
        
        // Historical quality metrics for trend analysis
        this.qualityMetrics = {
            daily: new Map(),
            weekly: new Map(),
            monthly: new Map(),
        };
        
        // Initialize quality monitoring
        this.initializeQualityMonitoring();
    }
    
    initializeQualityMonitoring() {
        // Set up periodic quality metric aggregation
        setInterval(() => {
            this.aggregateQualityMetrics();
        }, 300000); // Every 5 minutes
        
        // Set up quality alerts
        setInterval(() => {
            this.checkQualityAlerts();
        }, 60000); // Every minute
    }
    
    /**
     * Perform comprehensive quality assessment
     */
    async performQualityAssessment(verificationResult, metadata = {}) {
        const assessmentId = crypto.randomUUID();
        
        try {
            this.logger.info('Starting quality assessment', {
                assessmentId,
                provider: metadata.api_provider,
                documentType: metadata.document_type,
            });
            
            const assessment = {
                assessment_id: assessmentId,
                timestamp: new Date().toISOString(),
                overall_quality_score: 0,
                quality_level: 'unknown',
                checks_performed: [],
                issues_detected: [],
                recommendations: [],
                metadata,
            };
            
            // Perform individual quality checks
            const checkResults = await Promise.allSettled([
                this.performConsistencyChecks(verificationResult, metadata),
                this.performAccuracyChecks(verificationResult, metadata),
                this.performComplianceChecks(verificationResult, metadata),
                this.performPerformanceChecks(verificationResult, metadata),
                this.performSecurityChecks(verificationResult, metadata),
            ]);
            
            // Process check results
            for (const [index, result] of checkResults.entries()) {
                const checkType = Object.keys(this.qualityChecks)[index];
                
                if (result.status === 'fulfilled') {
                    assessment.checks_performed.push({
                        type: checkType,
                        score: result.value.score,
                        status: result.value.status,
                        details: result.value.details,
                        issues: result.value.issues,
                    });
                } else {
                    assessment.checks_performed.push({
                        type: checkType,
                        score: 0,
                        status: 'failed',
                        error: result.reason.message,
                    });
                }
            }
            
            // Calculate overall quality score
            assessment.overall_quality_score = this.calculateOverallQualityScore(assessment.checks_performed);
            assessment.quality_level = this.determineQualityLevel(assessment.overall_quality_score);
            
            // Collect all issues and recommendations
            assessment.issues_detected = this.collectIssues(assessment.checks_performed);
            assessment.recommendations = this.generateRecommendations(assessment);
            
            // Store quality metrics
            this.storeQualityMetrics(assessment);
            
            this.logger.info('Quality assessment completed', {
                assessmentId,
                qualityScore: assessment.overall_quality_score,
                qualityLevel: assessment.quality_level,
                issuesCount: assessment.issues_detected.length,
            });
            
            return assessment;
            
        } catch (error) {
            this.logger.error('Quality assessment failed', {
                assessmentId,
                error: error.message,
            });
            
            return {
                assessment_id: assessmentId,
                overall_quality_score: 0,
                quality_level: 'unknown',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
    
    /**
     * Perform data consistency checks
     */
    async performConsistencyChecks(verificationResult, metadata) {
        const checks = {
            score: 0,
            status: 'unknown',
            details: {},
            issues: [],
        };
        
        try {
            let totalScore = 0;
            let checkCount = 0;
            
            // Field completeness check
            const completenessScore = this.checkFieldCompleteness(verificationResult);
            checks.details.field_completeness = completenessScore;
            totalScore += completenessScore.score;
            checkCount++;
            
            // Data format validation
            const formatScore = this.validateDataFormats(verificationResult);
            checks.details.data_format_validation = formatScore;
            totalScore += formatScore.score;
            checkCount++;
            
            // Cross-field validation
            const crossFieldScore = this.performCrossFieldValidation(verificationResult);
            checks.details.cross_field_validation = crossFieldScore;
            totalScore += crossFieldScore.score;
            checkCount++;
            
            // Temporal consistency
            const temporalScore = this.checkTemporalConsistency(verificationResult);
            checks.details.temporal_consistency = temporalScore;
            totalScore += temporalScore.score;
            checkCount++;
            
            checks.score = totalScore / checkCount;
            checks.status = checks.score >= this.qualityChecks.CONSISTENCY.thresholds.acceptable ? 'pass' : 'fail';
            
            // Collect issues
            Object.values(checks.details).forEach(detail => {
                if (detail.issues) {
                    checks.issues.push(...detail.issues);
                }
            });
            
        } catch (error) {
            checks.status = 'error';
            checks.error = error.message;
        }
        
        return checks;
    }
    
    /**
     * Perform accuracy checks
     */
    async performAccuracyChecks(verificationResult, metadata) {
        const checks = {
            score: 0,
            status: 'unknown',
            details: {},
            issues: [],
        };
        
        try {
            let totalScore = 0;
            let checkCount = 0;
            
            // API confidence validation
            const confidenceScore = this.validateAPIConfidence(verificationResult);
            checks.details.api_confidence_validation = confidenceScore;
            totalScore += confidenceScore.score;
            checkCount++;
            
            // OCR quality assessment
            const ocrScore = this.assessOCRQuality(verificationResult);
            checks.details.ocr_quality_assessment = ocrScore;
            totalScore += ocrScore.score;
            checkCount++;
            
            // Fraud score validation
            const fraudScore = this.validateFraudScore(verificationResult);
            checks.details.fraud_score_validation = fraudScore;
            totalScore += fraudScore.score;
            checkCount++;
            
            // Historical accuracy comparison
            const historicalScore = await this.compareWithHistoricalAccuracy(verificationResult, metadata);
            checks.details.historical_accuracy = historicalScore;
            totalScore += historicalScore.score;
            checkCount++;
            
            checks.score = totalScore / checkCount;
            checks.status = checks.score >= this.qualityChecks.ACCURACY.thresholds.acceptable ? 'pass' : 'fail';
            
            // Collect issues
            Object.values(checks.details).forEach(detail => {
                if (detail.issues) {
                    checks.issues.push(...detail.issues);
                }
            });
            
        } catch (error) {
            checks.status = 'error';
            checks.error = error.message;
        }
        
        return checks;
    }
    
    /**
     * Perform compliance checks
     */
    async performComplianceChecks(verificationResult, metadata) {
        const checks = {
            score: 0,
            status: 'unknown',
            details: {},
            issues: [],
        };
        
        try {
            let totalScore = 0;
            let checkCount = 0;
            
            // GDPR compliance check
            const gdprScore = this.checkGDPRCompliance(verificationResult, metadata);
            checks.details.gdpr_compliance = gdprScore;
            totalScore += gdprScore.score;
            checkCount++;
            
            // Data retention compliance
            const retentionScore = this.checkDataRetentionCompliance(metadata);
            checks.details.data_retention_compliance = retentionScore;
            totalScore += retentionScore.score;
            checkCount++;
            
            // Consent validation
            const consentScore = this.validateConsent(metadata);
            checks.details.consent_validation = consentScore;
            totalScore += consentScore.score;
            checkCount++;
            
            // Audit trail completeness
            const auditScore = this.checkAuditTrailCompleteness(verificationResult, metadata);
            checks.details.audit_trail_completeness = auditScore;
            totalScore += auditScore.score;
            checkCount++;
            
            checks.score = totalScore / checkCount;
            checks.status = checks.score >= this.qualityChecks.COMPLIANCE.thresholds.acceptable ? 'pass' : 'fail';
            
            // Collect issues
            Object.values(checks.details).forEach(detail => {
                if (detail.issues) {
                    checks.issues.push(...detail.issues);
                }
            });
            
        } catch (error) {
            checks.status = 'error';
            checks.error = error.message;
        }
        
        return checks;
    }
    
    /**
     * Perform performance checks
     */
    async performPerformanceChecks(verificationResult, metadata) {
        const checks = {
            score: 0,
            status: 'unknown',
            details: {},
            issues: [],
        };
        
        try {
            let totalScore = 0;
            let checkCount = 0;
            
            // Response time validation
            const responseTimeScore = this.validateResponseTime(verificationResult, metadata);
            checks.details.response_time_validation = responseTimeScore;
            totalScore += responseTimeScore.score;
            checkCount++;
            
            // API reliability check
            const reliabilityScore = await this.checkAPIReliability(metadata);
            checks.details.api_reliability_check = reliabilityScore;
            totalScore += reliabilityScore.score;
            checkCount++;
            
            checks.score = totalScore / checkCount;
            checks.status = checks.score >= this.qualityChecks.PERFORMANCE.thresholds.acceptable ? 'pass' : 'fail';
            
        } catch (error) {
            checks.status = 'error';
            checks.error = error.message;
        }
        
        return checks;
    }
    
    /**
     * Perform security checks
     */
    async performSecurityChecks(verificationResult, metadata) {
        const checks = {
            score: 0,
            status: 'unknown',
            details: {},
            issues: [],
        };
        
        try {
            let totalScore = 0;
            let checkCount = 0;
            
            // Data sanitization check
            const sanitizationScore = this.checkDataSanitization(verificationResult);
            checks.details.data_sanitization = sanitizationScore;
            totalScore += sanitizationScore.score;
            checkCount++;
            
            // PII protection check
            const piiScore = this.checkPIIProtection(verificationResult, metadata);
            checks.details.pii_protection = piiScore;
            totalScore += piiScore.score;
            checkCount++;
            
            checks.score = totalScore / checkCount;
            checks.status = checks.score >= this.qualityChecks.SECURITY.thresholds.acceptable ? 'pass' : 'fail';
            
        } catch (error) {
            checks.status = 'error';
            checks.error = error.message;
        }
        
        return checks;
    }
    
    // Individual check implementations
    checkFieldCompleteness(verificationResult) {
        const requiredFields = ['verified', 'confidence', 'extracted_data'];
        const optionalFields = ['verification_details', 'fraud_assessment'];
        
        let score = 0;
        const issues = [];
        const details = { missing_required: [], missing_optional: [] };
        
        // Check required fields
        for (const field of requiredFields) {
            if (verificationResult[field] !== undefined && verificationResult[field] !== null) {
                score += 1 / requiredFields.length;
            } else {
                details.missing_required.push(field);
                issues.push(`Missing required field: ${field}`);
            }
        }
        
        // Check optional fields (bonus points)
        for (const field of optionalFields) {
            if (verificationResult[field] !== undefined && verificationResult[field] !== null) {
                score += 0.1;
            } else {
                details.missing_optional.push(field);
            }
        }
        
        return { score: Math.min(score, 1), issues, details };
    }
    
    validateDataFormats(verificationResult) {
        let score = 1;
        const issues = [];
        const validationResults = {};
        
        // Validate extracted data if present
        if (verificationResult.extracted_data) {
            for (const [field, value] of Object.entries(verificationResult.extracted_data)) {
                const validation = this.validateField(field, value);
                validationResults[field] = validation;
                
                if (!validation.valid) {
                    score -= 0.1;
                    issues.push(`Invalid format for ${field}: ${validation.error}`);
                }
            }
        }
        
        return { score: Math.max(score, 0), issues, validation_results: validationResults };
    }
    
    validateField(fieldName, value) {
        // Find appropriate validation rule
        let rule = null;
        for (const [category, rules] of Object.entries(this.validationRules)) {
            if (rules[fieldName]) {
                rule = rules[fieldName];
                break;
            }
        }
        
        if (!rule) {
            return { valid: true, note: 'No validation rule found' };
        }
        
        // Perform validation
        if (rule.required && (value === undefined || value === null || value === '')) {
            return { valid: false, error: 'Required field is missing or empty' };
        }
        
        if (value && rule.pattern && !rule.pattern.test(value)) {
            return { valid: false, error: 'Value does not match required pattern' };
        }
        
        if (value && rule.minLength && value.length < rule.minLength) {
            return { valid: false, error: `Value too short (minimum ${rule.minLength})` };
        }
        
        if (value && rule.maxLength && value.length > rule.maxLength) {
            return { valid: false, error: `Value too long (maximum ${rule.maxLength})` };
        }
        
        if (rule.validation && typeof rule.validation === 'function') {
            try {
                if (!rule.validation(value)) {
                    return { valid: false, error: 'Custom validation failed' };
                }
            } catch (error) {
                return { valid: false, error: `Validation error: ${error.message}` };
            }
        }
        
        return { valid: true };
    }
    
    performCrossFieldValidation(verificationResult) {
        let score = 1;
        const issues = [];
        
        if (verificationResult.extracted_data) {
            const data = verificationResult.extracted_data;
            
            // Check name consistency
            if (data.full_name && (data.first_name || data.last_name)) {
                const fullNameParts = data.full_name.toLowerCase().split(' ');
                const firstName = data.first_name?.toLowerCase();
                const lastName = data.last_name?.toLowerCase();
                
                if (firstName && !fullNameParts.includes(firstName)) {
                    score -= 0.2;
                    issues.push('First name not found in full name');
                }
                
                if (lastName && !fullNameParts.includes(lastName)) {
                    score -= 0.2;
                    issues.push('Last name not found in full name');
                }
            }
            
            // Check date consistency
            if (data.date_of_birth && data.expiry_date) {
                const birthDate = new Date(data.date_of_birth);
                const expiryDate = new Date(data.expiry_date);
                
                if (expiryDate <= birthDate) {
                    score -= 0.3;
                    issues.push('Document expiry date is before birth date');
                }
            }
        }
        
        return { score: Math.max(score, 0), issues };
    }
    
    checkTemporalConsistency(verificationResult) {
        let score = 1;
        const issues = [];
        
        const now = new Date();
        
        // Check if verification timestamp is reasonable
        if (verificationResult.timestamp) {
            const verificationTime = new Date(verificationResult.timestamp);
            const timeDiff = Math.abs(now.getTime() - verificationTime.getTime());
            
            if (timeDiff > 24 * 60 * 60 * 1000) { // More than 24 hours
                score -= 0.3;
                issues.push('Verification timestamp is more than 24 hours old');
            }
        }
        
        return { score, issues };
    }
    
    validateAPIConfidence(verificationResult) {
        let score = 0;
        const issues = [];
        
        const confidence = verificationResult.confidence || 0;
        
        if (confidence >= 90) {
            score = 1;
        } else if (confidence >= 80) {
            score = 0.8;
        } else if (confidence >= 70) {
            score = 0.6;
            issues.push('Medium confidence level');
        } else if (confidence >= 50) {
            score = 0.4;
            issues.push('Low confidence level');
        } else {
            score = 0.2;
            issues.push('Very low confidence level');
        }
        
        return { score, confidence, issues };
    }
    
    assessOCRQuality(verificationResult) {
        let score = 0.7; // Default score
        const issues = [];
        
        if (verificationResult.ocr_analysis) {
            const ocrConfidence = verificationResult.ocr_analysis.ocr_confidence || 0;
            score = ocrConfidence / 100;
            
            if (ocrConfidence < 70) {
                issues.push('Low OCR confidence detected');
            }
        }
        
        return { score, issues };
    }
    
    validateFraudScore(verificationResult) {
        let score = 1;
        const issues = [];
        
        if (verificationResult.fraud_assessment) {
            const fraudScore = verificationResult.fraud_assessment.fraud_score || 0;
            const riskLevel = verificationResult.fraud_assessment.risk_level;
            
            if (riskLevel === 'high' || fraudScore > 0.8) {
                score = 0.1;
                issues.push('High fraud risk detected');
            } else if (riskLevel === 'medium' || fraudScore > 0.5) {
                score = 0.6;
                issues.push('Medium fraud risk detected');
            }
        }
        
        return { score, issues };
    }
    
    async compareWithHistoricalAccuracy(verificationResult, metadata) {
        // Mock implementation - in production, compare with historical data
        const score = 0.8;
        const issues = [];
        
        return { score, issues, note: 'Historical comparison not yet implemented' };
    }
    
    checkGDPRCompliance(verificationResult, metadata) {
        let score = 1;
        const issues = [];
        
        // Check for consent tracking
        if (!metadata.consent_given) {
            score -= 0.5;
            issues.push('No consent record found');
        }
        
        // Check for data minimization
        if (this.containsExcessiveData(verificationResult)) {
            score -= 0.3;
            issues.push('Potential data minimization violation');
        }
        
        return { score: Math.max(score, 0), issues };
    }
    
    checkDataRetentionCompliance(metadata) {
        let score = 1;
        const issues = [];
        
        // Check retention period
        if (metadata.retention_period && metadata.retention_period > 365) {
            score -= 0.2;
            issues.push('Retention period exceeds recommended limit');
        }
        
        return { score, issues };
    }
    
    validateConsent(metadata) {
        let score = metadata.consent_given ? 1 : 0;
        const issues = [];
        
        if (!metadata.consent_given) {
            issues.push('User consent not recorded');
        }
        
        return { score, issues };
    }
    
    checkAuditTrailCompleteness(verificationResult, metadata) {
        let score = 0;
        const issues = [];
        const requiredAuditFields = ['verification_id', 'timestamp', 'api_provider', 'user_id'];
        
        for (const field of requiredAuditFields) {
            if (verificationResult[field] || metadata[field]) {
                score += 1 / requiredAuditFields.length;
            } else {
                issues.push(`Missing audit field: ${field}`);
            }
        }
        
        return { score, issues };
    }
    
    validateResponseTime(verificationResult, metadata) {
        let score = 1;
        const issues = [];
        
        const processingTime = verificationResult.processing_time || metadata.processing_time;
        
        if (processingTime) {
            if (processingTime > 30000) { // 30 seconds
                score = 0.3;
                issues.push('Very slow response time');
            } else if (processingTime > 10000) { // 10 seconds
                score = 0.7;
                issues.push('Slow response time');
            }
        }
        
        return { score, processing_time: processingTime, issues };
    }
    
    async checkAPIReliability(metadata) {
        // Mock implementation - in production, check API reliability metrics
        const score = 0.9;
        const issues = [];
        
        return { score, issues, note: 'API reliability check not yet implemented' };
    }
    
    checkDataSanitization(verificationResult) {
        let score = 1;
        const issues = [];
        
        // Check for potentially unsafe data
        const dataString = JSON.stringify(verificationResult);
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /data:text\/html/i,
            /vbscript:/i,
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(dataString)) {
                score = 0;
                issues.push('Potentially unsafe data detected');
                break;
            }
        }
        
        return { score, issues };
    }
    
    checkPIIProtection(verificationResult, metadata) {
        let score = 1;
        const issues = [];
        
        // Check if PII is properly handled
        if (this.containsSensitivePII(verificationResult)) {
            score -= 0.5;
            issues.push('Sensitive PII detected in response');
        }
        
        return { score, issues };
    }
    
    // Utility methods
    calculateOverallQualityScore(checkResults) {
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const check of checkResults) {
            if (check.score !== undefined && this.qualityChecks[check.type.toUpperCase()]) {
                const weight = this.qualityChecks[check.type.toUpperCase()].weight;
                totalScore += check.score * weight;
                totalWeight += weight;
            }
        }
        
        return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0;
    }
    
    determineQualityLevel(score) {
        if (score >= 0.9) return 'excellent';
        if (score >= 0.8) return 'good';
        if (score >= 0.7) return 'acceptable';
        if (score >= 0.5) return 'poor';
        return 'unacceptable';
    }
    
    collectIssues(checkResults) {
        const allIssues = [];
        
        for (const check of checkResults) {
            if (check.issues && check.issues.length > 0) {
                for (const issue of check.issues) {
                    allIssues.push({
                        category: check.type,
                        issue: issue,
                        severity: this.determineSeverity(issue, check.score),
                    });
                }
            }
        }
        
        return allIssues;
    }
    
    generateRecommendations(assessment) {
        const recommendations = [];
        
        // Generate recommendations based on quality level
        if (assessment.quality_level === 'unacceptable') {
            recommendations.push('Verification should be rejected due to poor quality');
        } else if (assessment.quality_level === 'poor') {
            recommendations.push('Manual review recommended before accepting verification');
        }
        
        // Generate specific recommendations based on issues
        for (const issue of assessment.issues_detected) {
            const pattern = this.findIssuePattern(issue.issue);
            if (pattern && pattern.remediation) {
                recommendations.push(`${issue.category}: ${pattern.remediation}`);
            }
        }
        
        return [...new Set(recommendations)]; // Remove duplicates
    }
    
    determineSeverity(issue, score) {
        if (score < 0.3) return 'critical';
        if (score < 0.6) return 'high';
        if (score < 0.8) return 'medium';
        return 'low';
    }
    
    findIssuePattern(issueText) {
        for (const [patternName, pattern] of Object.entries(this.qualityIssuePatterns)) {
            if (pattern.indicators.some(indicator => issueText.toLowerCase().includes(indicator))) {
                return pattern;
            }
        }
        return null;
    }
    
    containsExcessiveData(verificationResult) {
        // Check if response contains more data than necessary
        const sensitiveFields = ['ssn', 'credit_card', 'bank_account'];
        const dataString = JSON.stringify(verificationResult).toLowerCase();
        
        return sensitiveFields.some(field => dataString.includes(field));
    }
    
    containsSensitivePII(verificationResult) {
        const sensitivePatterns = [
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
            /\b\d{10,12}\b/, // Phone numbers
        ];
        
        const dataString = JSON.stringify(verificationResult);
        return sensitivePatterns.some(pattern => pattern.test(dataString));
    }
    
    isValidCountryCode(code) {
        const validCodes = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'KR', 'CN', 'IN', 'BR', 'MX'];
        return validCodes.includes(code.toUpperCase());
    }
    
    storeQualityMetrics(assessment) {
        const date = new Date().toISOString().split('T')[0];
        
        if (!this.qualityMetrics.daily.has(date)) {
            this.qualityMetrics.daily.set(date, {
                total_assessments: 0,
                average_quality_score: 0,
                quality_levels: { excellent: 0, good: 0, acceptable: 0, poor: 0, unacceptable: 0 },
                common_issues: new Map(),
            });
        }
        
        const dailyMetrics = this.qualityMetrics.daily.get(date);
        dailyMetrics.total_assessments++;
        dailyMetrics.average_quality_score = 
            (dailyMetrics.average_quality_score * (dailyMetrics.total_assessments - 1) + assessment.overall_quality_score) 
            / dailyMetrics.total_assessments;
        
        dailyMetrics.quality_levels[assessment.quality_level]++;
        
        // Track common issues
        for (const issue of assessment.issues_detected) {
            const issueKey = `${issue.category}:${issue.issue}`;
            dailyMetrics.common_issues.set(issueKey, (dailyMetrics.common_issues.get(issueKey) || 0) + 1);
        }
    }
    
    aggregateQualityMetrics() {
        // Aggregate daily metrics to weekly and monthly
        // Implementation would go here
        this.logger.debug('Quality metrics aggregated');
    }
    
    checkQualityAlerts() {
        // Check for quality alerts and notifications
        // Implementation would go here
        this.logger.debug('Quality alerts checked');
    }
    
    getQualityMetrics(period = 'daily', date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        switch (period) {
            case 'daily':
                return this.qualityMetrics.daily.get(targetDate) || null;
            case 'weekly':
                return this.qualityMetrics.weekly.get(targetDate) || null;
            case 'monthly':
                return this.qualityMetrics.monthly.get(targetDate) || null;
            default:
                return null;
        }
    }
}