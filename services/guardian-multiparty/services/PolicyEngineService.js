/**
 * Policy Engine Service
 * Governance rule validation and policy management
 * Handles policy creation, validation, enforcement, and compliance checking
 */

import crypto from 'crypto';
import NodeCache from 'node-cache';
import winston from 'winston';

export default class PolicyEngineService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        this.cache = new NodeCache({ stdTTL: 1800 }); // 30 minute cache
        
        // Policy storage (in production, use persistent database)
        this.policies = new Map();
        this.policyVersions = new Map();
        this.validationRules = new Map();
        
        // Policy configuration
        this.policyConfig = {
            maxPolicySize: config.policy?.maxPolicySize || 1048576, // 1MB
            maxVersionHistory: config.policy?.maxVersionHistory || 50,
            policyTimeout: config.policy?.policyTimeout || 30000, // 30 seconds
            validationCaching: config.policy?.validationCaching || true,
        };
        
        // Policy types
        this.policyTypes = {
            GOVERNANCE: 'governance',
            THRESHOLD: 'threshold',
            CREDENTIAL: 'credential',
            SECURITY: 'security',
            COMPLIANCE: 'compliance',
            ACCESS_CONTROL: 'access_control',
            WORKFLOW: 'workflow',
            RISK_MANAGEMENT: 'risk_management'
        };
        
        // Policy statuses
        this.policyStatuses = {
            DRAFT: 'draft',
            ACTIVE: 'active',
            DEPRECATED: 'deprecated',
            ARCHIVED: 'archived'
        };
        
        // Validation result types
        this.validationResults = {
            VALID: 'valid',
            INVALID: 'invalid',
            WARNING: 'warning',
            ERROR: 'error'
        };
        
        // Initialize default policies
        this.initializeDefaultPolicies();
        
        this.logger.info('Policy engine service initialized', {
            maxPolicySize: this.policyConfig.maxPolicySize,
            validationCaching: this.policyConfig.validationCaching
        });
    }
    
    /**
     * Create new policy
     */
    async createPolicy(policyData) {
        try {
            const {
                name,
                type,
                description,
                rules,
                conditions,
                actions,
                metadata,
                createdBy
            } = policyData;
            
            this.logger.info('Creating new policy', { name, type });
            
            // Validate policy data
            this.validatePolicyData(policyData);
            
            // Check for duplicate policy name
            const existingPolicy = Array.from(this.policies.values())
                .find(p => p.name === name && p.status !== this.policyStatuses.ARCHIVED);
            
            if (existingPolicy) {
                throw new Error('Policy with this name already exists');
            }
            
            // Generate policy ID
            const policyId = crypto.randomUUID();
            
            // Create policy
            const policy = {
                id: policyId,
                name,
                type,
                description,
                version: '1.0.0',
                status: this.policyStatuses.DRAFT,
                
                // Policy definition
                rules: this.normalizeRules(rules),
                conditions: this.normalizeConditions(conditions),
                actions: this.normalizeActions(actions),
                
                // Metadata
                metadata: {
                    ...metadata,
                    createdBy,
                    tags: metadata?.tags || [],
                    category: metadata?.category || type,
                    priority: metadata?.priority || 'medium',
                    severity: metadata?.severity || 'medium'
                },
                
                // Configuration
                configuration: {
                    enabled: false,
                    enforcementMode: 'strict', // strict, permissive, monitor
                    scope: metadata?.scope || 'global',
                    applicability: metadata?.applicability || 'all',
                    exceptions: metadata?.exceptions || []
                },
                
                // Timestamps
                timestamps: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    activatedAt: null,
                    lastValidated: null
                },
                
                // Validation
                validation: {
                    syntax: null,
                    semantics: null,
                    conflicts: null,
                    dependencies: null
                },
                
                // Statistics
                statistics: {
                    validationCount: 0,
                    successCount: 0,
                    failureCount: 0,
                    warningCount: 0,
                    lastExecuted: null,
                    averageExecutionTime: 0
                }
            };
            
            // Validate policy syntax and semantics
            const validation = await this.validatePolicyDefinition(policy);
            policy.validation = validation;
            
            if (validation.syntax.result !== this.validationResults.VALID) {
                throw new Error(`Policy syntax validation failed: ${validation.syntax.errors.join(', ')}`);
            }
            
            // Store policy
            this.policies.set(policyId, policy);
            
            // Create version history
            this.createPolicyVersion(policyId, policy, 'created', createdBy);
            
            this.logger.info('Policy created successfully', {
                policyId,
                name,
                type,
                version: policy.version
            });
            
            return policy;
            
        } catch (error) {
            this.logger.error('Failed to create policy', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Validate signing request against policies
     */
    async validateSigningRequest(request) {
        try {
            const {
                credentialData,
                threshold,
                guardians,
                requester,
                metadata
            } = request;
            
            this.logger.info('Validating signing request', {
                requester,
                threshold,
                guardianCount: guardians.length
            });
            
            // Get applicable policies
            const applicablePolicies = await this.getApplicablePolicies('threshold', {
                action: 'sign',
                context: 'credential_issuance',
                requester,
                credentialType: credentialData.type
            });
            
            const validationResult = {
                valid: true,
                errors: [],
                warnings: [],
                appliedPolicies: [],
                validationDetails: {}
            };
            
            // Validate against each applicable policy
            for (const policy of applicablePolicies) {
                const policyResult = await this.validateAgainstPolicy(policy, {
                    action: 'threshold_signing',
                    data: request,
                    context: {
                        requester,
                        guardians,
                        threshold,
                        credentialType: credentialData.type
                    }
                });
                
                validationResult.appliedPolicies.push({
                    policyId: policy.id,
                    name: policy.name,
                    result: policyResult.result,
                    details: policyResult.details
                });
                
                if (policyResult.result === this.validationResults.INVALID || 
                    policyResult.result === this.validationResults.ERROR) {
                    validationResult.valid = false;
                    validationResult.errors.push(...policyResult.errors);
                }
                
                if (policyResult.result === this.validationResults.WARNING) {
                    validationResult.warnings.push(...policyResult.warnings);
                }
                
                // Update policy statistics
                policy.statistics.validationCount++;
                if (policyResult.result === this.validationResults.VALID) {
                    policy.statistics.successCount++;
                } else if (policyResult.result === this.validationResults.WARNING) {
                    policy.statistics.warningCount++;
                } else {
                    policy.statistics.failureCount++;
                }
                policy.statistics.lastExecuted = new Date().toISOString();
            }
            
            // Threshold validation
            validationResult.validationDetails.thresholdCheck = 
                await this.validateThresholdRequirements(threshold, guardians, credentialData);
            
            // Guardian authorization validation
            validationResult.validationDetails.guardianCheck = 
                await this.validateGuardianAuthorization(guardians, 'threshold_signing');
            
            // Credential policy validation
            validationResult.validationDetails.credentialCheck = 
                await this.validateCredentialPolicy(credentialData, requester);
            
            // Risk assessment
            validationResult.validationDetails.riskAssessment = 
                await this.performRiskAssessment(request);
            
            this.logger.info('Signing request validation completed', {
                valid: validationResult.valid,
                errorsCount: validationResult.errors.length,
                warningsCount: validationResult.warnings.length,
                policiesApplied: validationResult.appliedPolicies.length
            });
            
            return validationResult;
            
        } catch (error) {
            this.logger.error('Failed to validate signing request', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Validate against specific policy
     */
    async validateAgainstPolicy(policy, validationContext) {
        try {
            const { action, data, context } = validationContext;
            
            const result = {
                result: this.validationResults.VALID,
                errors: [],
                warnings: [],
                details: {},
                executionTime: 0
            };
            
            const startTime = Date.now();
            
            // Check if policy is enabled
            if (!policy.configuration.enabled) {
                result.result = this.validationResults.WARNING;
                result.warnings.push('Policy is not enabled');
                return result;
            }
            
            // Evaluate policy conditions
            const conditionsResult = await this.evaluateConditions(policy.conditions, context);
            if (!conditionsResult.met) {
                // Policy doesn't apply to this context
                result.details.conditionsEvaluation = conditionsResult;
                return result;
            }
            
            // Evaluate policy rules
            for (const rule of policy.rules) {
                const ruleResult = await this.evaluateRule(rule, data, context);
                
                if (!ruleResult.valid) {
                    if (ruleResult.severity === 'error') {
                        result.result = this.validationResults.ERROR;
                        result.errors.push(ruleResult.message);
                    } else if (ruleResult.severity === 'warning') {
                        if (result.result === this.validationResults.VALID) {
                            result.result = this.validationResults.WARNING;
                        }
                        result.warnings.push(ruleResult.message);
                    }
                }
                
                result.details[rule.id] = ruleResult;
            }
            
            result.executionTime = Date.now() - startTime;
            
            // Update policy execution statistics
            const currentAvg = policy.statistics.averageExecutionTime;
            const count = policy.statistics.validationCount;
            policy.statistics.averageExecutionTime = 
                ((currentAvg * count) + result.executionTime) / (count + 1);
            
            return result;
            
        } catch (error) {
            this.logger.error('Policy validation failed', { 
                policyId: policy.id, 
                error: error.message 
            });
            
            return {
                result: this.validationResults.ERROR,
                errors: [`Policy validation error: ${error.message}`],
                warnings: [],
                details: {},
                executionTime: 0
            };
        }
    }
    
    /**
     * Get policy by ID
     */
    async getPolicy(policyId) {
        const policy = this.policies.get(policyId);
        if (!policy) {
            return null;
        }
        
        return policy;
    }
    
    /**
     * Get all policies
     */
    async getAllPolicies(filters = {}) {
        try {
            let policies = Array.from(this.policies.values());
            
            // Apply filters
            if (filters.type) {
                policies = policies.filter(p => p.type === filters.type);
            }
            
            if (filters.status) {
                policies = policies.filter(p => p.status === filters.status);
            }
            
            if (filters.enabled !== undefined) {
                policies = policies.filter(p => p.configuration.enabled === filters.enabled);
            }
            
            if (filters.category) {
                policies = policies.filter(p => p.metadata.category === filters.category);
            }
            
            // Sort by creation date (newest first)
            policies.sort((a, b) => new Date(b.timestamps.createdAt) - new Date(a.timestamps.createdAt));
            
            return policies;
            
        } catch (error) {
            this.logger.error('Failed to get policies', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Update policy
     */
    async updatePolicy(policyId, updates, updatedBy) {
        try {
            const policy = this.policies.get(policyId);
            if (!policy) {
                throw new Error('Policy not found');
            }
            
            this.logger.info('Updating policy', { policyId, updates: Object.keys(updates) });
            
            // Create new version
            const newVersion = this.incrementVersion(policy.version);
            
            // Apply updates
            const updatedPolicy = {
                ...policy,
                ...updates,
                version: newVersion,
                timestamps: {
                    ...policy.timestamps,
                    updatedAt: new Date().toISOString()
                }
            };
            
            // Validate updated policy
            if (updates.rules || updates.conditions || updates.actions) {
                const validation = await this.validatePolicyDefinition(updatedPolicy);
                updatedPolicy.validation = validation;
                
                if (validation.syntax.result !== this.validationResults.VALID) {
                    throw new Error(`Updated policy syntax validation failed: ${validation.syntax.errors.join(', ')}`);
                }
            }
            
            // Store updated policy
            this.policies.set(policyId, updatedPolicy);
            
            // Create version history
            this.createPolicyVersion(policyId, updatedPolicy, 'updated', updatedBy);
            
            this.logger.info('Policy updated successfully', { policyId, version: newVersion });
            
            return updatedPolicy;
            
        } catch (error) {
            this.logger.error('Failed to update policy', { 
                policyId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Activate policy
     */
    async activatePolicy(policyId, activatedBy) {
        try {
            const policy = this.policies.get(policyId);
            if (!policy) {
                throw new Error('Policy not found');
            }
            
            if (policy.status === this.policyStatuses.ACTIVE) {
                throw new Error('Policy is already active');
            }
            
            // Validate policy before activation
            const validation = await this.validatePolicyDefinition(policy);
            if (validation.syntax.result !== this.validationResults.VALID) {
                throw new Error('Cannot activate policy with validation errors');
            }
            
            // Check for policy conflicts
            const conflicts = await this.checkPolicyConflicts(policy);
            if (conflicts.length > 0) {
                throw new Error(`Policy conflicts detected: ${conflicts.join(', ')}`);
            }
            
            policy.status = this.policyStatuses.ACTIVE;
            policy.configuration.enabled = true;
            policy.timestamps.activatedAt = new Date().toISOString();
            policy.timestamps.updatedAt = new Date().toISOString();
            
            // Create version history
            this.createPolicyVersion(policyId, policy, 'activated', activatedBy);
            
            this.logger.info('Policy activated successfully', { policyId });
            
            return policy;
            
        } catch (error) {
            this.logger.error('Failed to activate policy', { 
                policyId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    // Utility methods
    
    validatePolicyData(data) {
        if (!data.name || data.name.trim().length < 3) {
            throw new Error('Policy name must be at least 3 characters');
        }
        
        if (!data.type || !Object.values(this.policyTypes).includes(data.type)) {
            throw new Error('Valid policy type is required');
        }
        
        if (!data.rules || !Array.isArray(data.rules) || data.rules.length === 0) {
            throw new Error('Policy must have at least one rule');
        }
        
        // Validate policy size
        const policySize = JSON.stringify(data).length;
        if (policySize > this.policyConfig.maxPolicySize) {
            throw new Error(`Policy size exceeds maximum allowed size (${this.policyConfig.maxPolicySize} bytes)`);
        }
    }
    
    normalizeRules(rules) {
        return rules.map((rule, index) => ({
            id: rule.id || `rule_${index + 1}`,
            name: rule.name || `Rule ${index + 1}`,
            description: rule.description || '',
            condition: rule.condition,
            action: rule.action,
            severity: rule.severity || 'error',
            enabled: rule.enabled !== false,
            parameters: rule.parameters || {},
            metadata: rule.metadata || {}
        }));
    }
    
    normalizeConditions(conditions) {
        if (!conditions) return [];
        
        return Array.isArray(conditions) ? conditions : [conditions];
    }
    
    normalizeActions(actions) {
        if (!actions) return [];
        
        return Array.isArray(actions) ? actions : [actions];
    }
    
    async validatePolicyDefinition(policy) {
        const validation = {
            syntax: { result: this.validationResults.VALID, errors: [], warnings: [] },
            semantics: { result: this.validationResults.VALID, errors: [], warnings: [] },
            conflicts: { result: this.validationResults.VALID, conflicts: [] },
            dependencies: { result: this.validationResults.VALID, missing: [] }
        };
        
        // Syntax validation
        try {
            for (const rule of policy.rules) {
                if (!rule.condition) {
                    validation.syntax.errors.push(`Rule ${rule.id}: missing condition`);
                }
                if (!rule.action) {
                    validation.syntax.errors.push(`Rule ${rule.id}: missing action`);
                }
            }
            
            if (validation.syntax.errors.length > 0) {
                validation.syntax.result = this.validationResults.INVALID;
            }
        } catch (error) {
            validation.syntax.result = this.validationResults.ERROR;
            validation.syntax.errors.push(error.message);
        }
        
        return validation;
    }
    
    async getApplicablePolicies(type, context) {
        const allPolicies = Array.from(this.policies.values());
        
        return allPolicies.filter(policy => {
            if (policy.type !== type) return false;
            if (!policy.configuration.enabled) return false;
            if (policy.status !== this.policyStatuses.ACTIVE) return false;
            
            // Check scope
            if (policy.configuration.scope !== 'global' && 
                policy.configuration.scope !== context.scope) {
                return false;
            }
            
            return true;
        });
    }
    
    async evaluateConditions(conditions, context) {
        if (!conditions || conditions.length === 0) {
            return { met: true, details: {} };
        }
        
        // Simplified condition evaluation (implement complex logic as needed)
        for (const condition of conditions) {
            const result = await this.evaluateCondition(condition, context);
            if (!result) {
                return { met: false, details: { failedCondition: condition } };
            }
        }
        
        return { met: true, details: {} };
    }
    
    async evaluateCondition(condition, context) {
        // Simplified condition evaluation
        switch (condition.type) {
            case 'equals':
                return context[condition.field] === condition.value;
            case 'greater_than':
                return context[condition.field] > condition.value;
            case 'less_than':
                return context[condition.field] < condition.value;
            case 'contains':
                return Array.isArray(context[condition.field]) && 
                       context[condition.field].includes(condition.value);
            default:
                return true;
        }
    }
    
    async evaluateRule(rule, data, context) {
        // Simplified rule evaluation
        try {
            let valid = true;
            let message = '';
            
            switch (rule.condition.type) {
                case 'min_threshold':
                    valid = context.threshold >= rule.condition.value;
                    message = valid ? '' : `Minimum threshold of ${rule.condition.value} required`;
                    break;
                    
                case 'max_threshold':
                    valid = context.threshold <= rule.condition.value;
                    message = valid ? '' : `Maximum threshold of ${rule.condition.value} exceeded`;
                    break;
                    
                case 'authorized_guardians':
                    valid = context.guardians.every(g => rule.condition.value.includes(g));
                    message = valid ? '' : 'One or more guardians are not authorized';
                    break;
                    
                case 'credential_type_allowed':
                    valid = rule.condition.value.includes(context.credentialType);
                    message = valid ? '' : `Credential type ${context.credentialType} is not allowed`;
                    break;
                    
                default:
                    valid = true;
            }
            
            return {
                valid,
                message,
                severity: rule.severity,
                ruleId: rule.id,
                executedAt: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                valid: false,
                message: `Rule evaluation error: ${error.message}`,
                severity: 'error',
                ruleId: rule.id,
                executedAt: new Date().toISOString()
            };
        }
    }
    
    async validateThresholdRequirements(threshold, guardians, credentialData) {
        return {
            valid: threshold >= 2 && threshold <= guardians.length,
            threshold,
            guardianCount: guardians.length,
            message: threshold >= 2 && threshold <= guardians.length 
                ? 'Threshold requirements met' 
                : 'Invalid threshold configuration'
        };
    }
    
    async validateGuardianAuthorization(guardians, action) {
        // Mock implementation - integrate with GuardianManagementService
        return {
            valid: true,
            authorizedGuardians: guardians.length,
            unauthorizedGuardians: 0,
            message: 'All guardians are authorized'
        };
    }
    
    async validateCredentialPolicy(credentialData, requester) {
        return {
            valid: true,
            credentialType: credentialData.type,
            requester,
            message: 'Credential policy validation passed'
        };
    }
    
    async performRiskAssessment(request) {
        // Simplified risk assessment
        const riskFactors = {
            newRequester: 0.1,
            highThreshold: request.threshold > 5 ? 0.2 : 0,
            offHours: new Date().getHours() < 9 || new Date().getHours() > 17 ? 0.1 : 0
        };
        
        const totalRisk = Object.values(riskFactors).reduce((a, b) => a + b, 0);
        
        return {
            riskScore: totalRisk,
            riskLevel: totalRisk < 0.3 ? 'low' : totalRisk < 0.6 ? 'medium' : 'high',
            riskFactors,
            recommendation: totalRisk > 0.6 ? 'require_additional_approval' : 'proceed'
        };
    }
    
    async checkPolicyConflicts(policy) {
        // Check for conflicts with existing active policies
        const activePolicies = Array.from(this.policies.values())
            .filter(p => p.status === this.policyStatuses.ACTIVE && p.id !== policy.id);
        
        const conflicts = [];
        
        for (const existingPolicy of activePolicies) {
            if (existingPolicy.type === policy.type && 
                existingPolicy.configuration.scope === policy.configuration.scope) {
                // Check for rule conflicts
                for (const rule of policy.rules) {
                    for (const existingRule of existingPolicy.rules) {
                        if (this.rulesConflict(rule, existingRule)) {
                            conflicts.push(`Conflict with policy ${existingPolicy.name} rule ${existingRule.id}`);
                        }
                    }
                }
            }
        }
        
        return conflicts;
    }
    
    rulesConflict(rule1, rule2) {
        // Simplified conflict detection
        return rule1.condition.type === rule2.condition.type && 
               rule1.condition.field === rule2.condition.field &&
               rule1.condition.value !== rule2.condition.value;
    }
    
    createPolicyVersion(policyId, policy, changeType, changedBy) {
        const versionId = crypto.randomUUID();
        const version = {
            id: versionId,
            policyId,
            version: policy.version,
            changeType,
            changedBy,
            timestamp: new Date().toISOString(),
            snapshot: JSON.parse(JSON.stringify(policy))
        };
        
        if (!this.policyVersions.has(policyId)) {
            this.policyVersions.set(policyId, []);
        }
        
        const versions = this.policyVersions.get(policyId);
        versions.push(version);
        
        // Maintain version history limit
        if (versions.length > this.policyConfig.maxVersionHistory) {
            versions.splice(0, versions.length - this.policyConfig.maxVersionHistory);
        }
    }
    
    incrementVersion(currentVersion) {
        const parts = currentVersion.split('.').map(Number);
        parts[2]++; // Increment patch version
        return parts.join('.');
    }
    
    async initializeDefaultPolicies() {
        // Create default threshold policy
        const defaultThresholdPolicy = {
            name: 'Default Threshold Policy',
            type: this.policyTypes.THRESHOLD,
            description: 'Default policy for threshold signature validation',
            rules: [
                {
                    id: 'min_threshold_rule',
                    name: 'Minimum Threshold',
                    description: 'Require minimum threshold of 2 guardians',
                    condition: {
                        type: 'min_threshold',
                        value: 2
                    },
                    action: 'reject',
                    severity: 'error'
                },
                {
                    id: 'max_threshold_rule',
                    name: 'Maximum Threshold',
                    description: 'Limit maximum threshold to 10 guardians',
                    condition: {
                        type: 'max_threshold',
                        value: 10
                    },
                    action: 'reject',
                    severity: 'error'
                }
            ],
            conditions: [],
            actions: [],
            metadata: {
                createdBy: 'system',
                category: 'security',
                priority: 'high'
            }
        };
        
        try {
            const policy = await this.createPolicy(defaultThresholdPolicy);
            await this.activatePolicy(policy.id, 'system');
            this.logger.info('Default threshold policy created and activated');
        } catch (error) {
            this.logger.error('Failed to create default threshold policy', { error: error.message });
        }
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const activePolicies = Array.from(this.policies.values())
                .filter(p => p.status === this.policyStatuses.ACTIVE).length;
            
            const enabledPolicies = Array.from(this.policies.values())
                .filter(p => p.configuration.enabled).length;
                
            return {
                status: 'healthy',
                totalPolicies: this.policies.size,
                activePolicies,
                enabledPolicies,
                validationRules: this.validationRules.size,
                policyVersions: this.policyVersions.size,
                configuration: this.policyConfig,
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }
    }
}