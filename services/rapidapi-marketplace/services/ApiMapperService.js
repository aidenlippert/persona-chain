/**
 * API Mapper Service
 * Intelligent mapping between different API formats and PersonaChain standards
 * Handles data transformation, normalization, and schema mapping
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Joi from 'joi';
import { z } from 'zod';

export default class ApiMapperService {
    constructor(config) {
        this.config = config;
        this.cache = new NodeCache({ stdTTL: 3600 });
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            defaultMeta: { service: 'api-mapper' },
        });
        
        // Standard field mappings for different API providers
        this.providerMappings = {
            // Trulioo mappings
            trulioo: {
                request: {
                    'document_image': 'DocumentImage',
                    'document_type': 'DocumentType',
                    'country_code': 'CountryCode',
                    'first_name': 'PersonInfo.FirstGivenName',
                    'last_name': 'PersonInfo.FirstSurName',
                    'date_of_birth': 'PersonInfo.DayOfBirth',
                },
                response: {
                    'Record.RecordStatus': 'verified',
                    'Record.DatasourceResults[0].DatasourceFields.FullName': 'extracted_data.full_name',
                    'Record.DatasourceResults[0].DatasourceFields.DateOfBirth': 'extracted_data.date_of_birth',
                    'Record.DatasourceResults[0].DatasourceFields.DocumentNumber': 'extracted_data.document_number',
                    'Record.Errors': 'errors',
                },
                transformations: {
                    verified: (value) => value === 'match',
                    confidence: (value) => value === 'match' ? 95 : 20,
                },
            },
            
            // Onfido mappings
            onfido: {
                request: {
                    'document_image': 'file',
                    'document_type': 'type',
                    'country_code': 'issuing_country',
                },
                response: {
                    'result': 'verified',
                    'properties.document_numbers[0].value': 'extracted_data.document_number',
                    'properties.full_name.value': 'extracted_data.full_name',
                    'properties.date_of_birth.value': 'extracted_data.date_of_birth',
                    'properties.nationality.value': 'extracted_data.nationality',
                },
                transformations: {
                    verified: (value) => value === 'clear',
                    confidence: (value) => value === 'clear' ? 90 : 30,
                },
            },
            
            // Jumio mappings
            jumio: {
                request: {
                    'document_image': 'frontsideImage',
                    'document_type': 'type',
                    'country': 'country',
                },
                response: {
                    'verification.mrzCheck': 'verification_details.mrz_valid',
                    'verification.faceMatch': 'verification_details.photo_match',
                    'extractedData.firstName': 'extracted_data.first_name',
                    'extractedData.lastName': 'extracted_data.last_name',
                    'extractedData.dateOfBirth': 'extracted_data.date_of_birth',
                    'extractedData.documentNumber': 'extracted_data.document_number',
                },
                transformations: {
                    verified: (checks) => checks.mrzCheck === 'OK' && checks.faceMatch === 'MATCH',
                    confidence: (checks) => {
                        let score = 0;
                        if (checks.mrzCheck === 'OK') score += 40;
                        if (checks.faceMatch === 'MATCH') score += 40;
                        if (checks.hologram === 'OK') score += 20;
                        return score;
                    },
                },
            },
            
            // LexisNexis mappings
            lexisnexis: {
                request: {
                    'document_image': 'DocumentImage',
                    'document_type': 'DocumentType',
                    'subject.name.first': 'first_name',
                    'subject.name.last': 'last_name',
                    'subject.dateOfBirth': 'date_of_birth',
                },
                response: {
                    'WorkflowOutcome': 'verified',
                    'Products[0].ExecutedStepResults[0].Data.Result': 'verification_result',
                    'Products[0].ExecutedStepResults[0].Data.Name': 'extracted_data.full_name',
                    'Products[0].ExecutedStepResults[0].Data.DateOfBirth': 'extracted_data.date_of_birth',
                },
                transformations: {
                    verified: (value) => value === 'Complete',
                    confidence: (result) => result === 'Pass' ? 88 : 25,
                },
            },
            
            // Generic/fallback mappings
            generic: {
                request: {
                    'document_image': ['image', 'document', 'file', 'photo'],
                    'document_type': ['type', 'docType', 'document_type'],
                    'country_code': ['country', 'countryCode', 'nation'],
                },
                response: {
                    // Common response field variations
                    verified: ['verified', 'success', 'valid', 'passed', 'approved'],
                    confidence: ['confidence', 'score', 'certainty', 'accuracy'],
                    full_name: ['fullName', 'full_name', 'name', 'completeName'],
                    date_of_birth: ['dateOfBirth', 'date_of_birth', 'dob', 'birthDate'],
                    document_number: ['documentNumber', 'document_number', 'docNumber', 'number'],
                },
            },
        };
        
        // Schema definitions for validation
        this.schemas = {
            // Input validation schemas
            documentVerificationRequest: z.object({
                document_image: z.string().min(100), // Base64 string
                document_type: z.enum(['passport', 'drivers_license', 'national_id', 'birth_certificate']),
                country_code: z.string().length(2),
                first_name: z.string().optional(),
                last_name: z.string().optional(),
                date_of_birth: z.string().optional(),
            }),
            
            // Output validation schemas
            verificationResponse: z.object({
                verified: z.boolean(),
                confidence: z.number().min(0).max(100),
                extracted_data: z.object({
                    full_name: z.string().optional(),
                    first_name: z.string().optional(),
                    last_name: z.string().optional(),
                    date_of_birth: z.string().optional(),
                    document_number: z.string().optional(),
                    nationality: z.string().optional(),
                    expiry_date: z.string().optional(),
                }).optional(),
                verification_details: z.object({
                    document_integrity: z.boolean().optional(),
                    photo_match: z.boolean().optional(),
                    mrz_valid: z.boolean().optional(),
                    security_features: z.boolean().optional(),
                }).optional(),
                errors: z.array(z.string()).optional(),
                processing_time: z.number().optional(),
            }),
        };
        
        // Country code mappings (ISO 3166-1 alpha-2 to various formats)
        this.countryMappings = {
            'US': { iso3: 'USA', name: 'United States', numeric: '840' },
            'UK': { iso3: 'GBR', name: 'United Kingdom', numeric: '826' },
            'CA': { iso3: 'CAN', name: 'Canada', numeric: '124' },
            'AU': { iso3: 'AUS', name: 'Australia', numeric: '036' },
            'DE': { iso3: 'DEU', name: 'Germany', numeric: '276' },
            'FR': { iso3: 'FRA', name: 'France', numeric: '250' },
            'IT': { iso3: 'ITA', name: 'Italy', numeric: '380' },
            'ES': { iso3: 'ESP', name: 'Spain', numeric: '724' },
            'JP': { iso3: 'JPN', name: 'Japan', numeric: '392' },
            'KR': { iso3: 'KOR', name: 'South Korea', numeric: '410' },
            'CN': { iso3: 'CHN', name: 'China', numeric: '156' },
            'IN': { iso3: 'IND', name: 'India', numeric: '356' },
            'BR': { iso3: 'BRA', name: 'Brazil', numeric: '076' },
            'MX': { iso3: 'MEX', name: 'Mexico', numeric: '484' },
        };
        
        // Document type mappings
        this.documentTypeMappings = {
            passport: ['passport', 'pp', 'travel_document'],
            drivers_license: ['drivers_license', 'driving_licence', 'dl', 'license'],
            national_id: ['national_id', 'id_card', 'identity_card', 'government_id'],
            birth_certificate: ['birth_certificate', 'birth_cert', 'certificate_of_birth'],
            utility_bill: ['utility_bill', 'utility', 'bill', 'statement'],
            bank_statement: ['bank_statement', 'statement', 'financial_statement'],
        };
    }
    
    /**
     * Map request data to API provider format
     */
    async mapRequestToProvider(requestData, providerName, apiEndpoint) {
        try {
            this.logger.info('Mapping request to provider format', { 
                provider: providerName,
                endpoint: apiEndpoint 
            });
            
            // Validate input
            const validatedInput = this.schemas.documentVerificationRequest.parse(requestData);
            
            // Get provider mapping or use generic
            const mapping = this.providerMappings[providerName.toLowerCase()] || this.providerMappings.generic;
            
            // Transform request data
            const mappedRequest = this.transformObject(validatedInput, mapping.request, 'request');
            
            // Add provider-specific headers and metadata
            const providerRequest = {
                ...mappedRequest,
                ...this.addProviderSpecificData(validatedInput, providerName),
            };
            
            this.logger.info('Request mapping completed', {
                provider: providerName,
                originalFields: Object.keys(requestData).length,
                mappedFields: Object.keys(providerRequest).length,
            });
            
            return providerRequest;
            
        } catch (error) {
            this.logger.error('Request mapping failed', {
                provider: providerName,
                error: error.message,
            });
            throw new Error(`Failed to map request for provider ${providerName}: ${error.message}`);
        }
    }
    
    /**
     * Map provider response to standard format
     */
    async mapResponseFromProvider(providerResponse, providerName, originalRequest) {
        try {
            this.logger.info('Mapping response from provider', { 
                provider: providerName,
                responseSize: JSON.stringify(providerResponse).length 
            });
            
            // Get provider mapping or use generic
            const mapping = this.providerMappings[providerName.toLowerCase()] || this.providerMappings.generic;
            
            // Transform response data
            let mappedResponse = this.transformObject(providerResponse, mapping.response, 'response');
            
            // Apply provider-specific transformations
            if (mapping.transformations) {
                mappedResponse = this.applyTransformations(mappedResponse, mapping.transformations, providerResponse);
            }
            
            // Ensure required fields and apply defaults
            mappedResponse = this.ensureStandardFormat(mappedResponse, originalRequest);
            
            // Validate output
            const validatedResponse = this.schemas.verificationResponse.parse(mappedResponse);
            
            this.logger.info('Response mapping completed', {
                provider: providerName,
                verified: validatedResponse.verified,
                confidence: validatedResponse.confidence,
            });
            
            return validatedResponse;
            
        } catch (error) {
            this.logger.error('Response mapping failed', {
                provider: providerName,
                error: error.message,
            });
            
            // Return fallback response
            return {
                verified: false,
                confidence: 0,
                errors: [`Mapping failed: ${error.message}`],
                mapping_error: true,
                original_response: providerResponse,
            };
        }
    }
    
    /**
     * Transform object using field mappings
     */
    transformObject(sourceObject, fieldMappings, direction) {
        const result = {};
        
        for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
            try {
                let value = this.getNestedValue(sourceObject, sourceField);
                
                if (value !== undefined && value !== null) {
                    if (direction === 'response' && Array.isArray(targetField)) {
                        // For response mapping with multiple possible field names
                        for (const possibleField of targetField) {
                            const possibleValue = this.getNestedValue(sourceObject, possibleField);
                            if (possibleValue !== undefined && possibleValue !== null) {
                                value = possibleValue;
                                break;
                            }
                        }
                    }
                    
                    this.setNestedValue(result, targetField, value);
                }
            } catch (error) {
                this.logger.warn('Field mapping failed', {
                    sourceField,
                    targetField,
                    error: error.message,
                });
            }
        }
        
        return result;
    }
    
    /**
     * Apply provider-specific transformations
     */
    applyTransformations(mappedResponse, transformations, originalResponse) {
        const result = { ...mappedResponse };
        
        for (const [field, transformFunction] of Object.entries(transformations)) {
            try {
                if (typeof transformFunction === 'function') {
                    // Use original response data for transformation
                    const sourceValue = this.getNestedValue(originalResponse, field) || 
                                       this.getRelevantValue(originalResponse, field);
                    
                    if (sourceValue !== undefined) {
                        result[field] = transformFunction(sourceValue);
                    }
                }
            } catch (error) {
                this.logger.warn('Transformation failed', {
                    field,
                    error: error.message,
                });
            }
        }
        
        return result;
    }
    
    /**
     * Ensure response conforms to standard format
     */
    ensureStandardFormat(mappedResponse, originalRequest) {
        const standardResponse = {
            verified: false,
            confidence: 0,
            timestamp: new Date().toISOString(),
            ...mappedResponse,
        };
        
        // Ensure verified is boolean
        if (typeof standardResponse.verified !== 'boolean') {
            standardResponse.verified = this.parseBoolean(standardResponse.verified);
        }
        
        // Ensure confidence is number between 0-100
        if (typeof standardResponse.confidence !== 'number') {
            standardResponse.confidence = this.parseConfidence(standardResponse.confidence);
        }
        
        // Ensure extracted_data exists
        if (!standardResponse.extracted_data) {
            standardResponse.extracted_data = {};
        }
        
        // Normalize names
        if (standardResponse.extracted_data.full_name && 
            !standardResponse.extracted_data.first_name && 
            !standardResponse.extracted_data.last_name) {
            const nameParts = this.parseFullName(standardResponse.extracted_data.full_name);
            standardResponse.extracted_data.first_name = nameParts.first;
            standardResponse.extracted_data.last_name = nameParts.last;
        }
        
        // Normalize dates
        if (standardResponse.extracted_data.date_of_birth) {
            standardResponse.extracted_data.date_of_birth = this.normalizeDate(
                standardResponse.extracted_data.date_of_birth
            );
        }
        
        if (standardResponse.extracted_data.expiry_date) {
            standardResponse.extracted_data.expiry_date = this.normalizeDate(
                standardResponse.extracted_data.expiry_date
            );
        }
        
        // Add metadata
        standardResponse.metadata = {
            request_country: originalRequest.country_code,
            request_document_type: originalRequest.document_type,
            processing_timestamp: new Date().toISOString(),
            api_version: '1.0',
        };
        
        return standardResponse;
    }
    
    /**
     * Add provider-specific request data
     */
    addProviderSpecificData(requestData, providerName) {
        const specificData = {};
        
        switch (providerName.toLowerCase()) {
            case 'trulioo':
                specificData.AcceptTruliooTermsAndConditions = true;
                specificData.Demo = this.config.environment === 'development';
                specificData.VerboseMode = true;
                break;
                
            case 'onfido':
                specificData.validate_document = true;
                specificData.extract_data = true;
                break;
                
            case 'jumio':
                specificData.enableExtraction = true;
                specificData.enableVerification = true;
                specificData.userReference = `pc_${Date.now()}`;
                break;
                
            case 'lexisnexis':
                specificData.Permissions = ['KnowYourCustomer'];
                specificData.Reference = `ref_${Date.now()}`;
                break;
        }
        
        // Add country-specific data
        const countryInfo = this.countryMappings[requestData.country_code];
        if (countryInfo) {
            specificData.country_iso3 = countryInfo.iso3;
            specificData.country_name = countryInfo.name;
            specificData.country_numeric = countryInfo.numeric;
        }
        
        // Map document type
        const documentType = this.mapDocumentType(requestData.document_type, providerName);
        if (documentType) {
            specificData.normalized_document_type = documentType;
        }
        
        return specificData;
    }
    
    /**
     * Map document type to provider-specific format
     */
    mapDocumentType(documentType, providerName) {
        const mappings = {
            trulioo: {
                passport: 'Passport',
                drivers_license: 'DrivingLicence',
                national_id: 'NationalId',
            },
            onfido: {
                passport: 'passport',
                drivers_license: 'driving_licence',
                national_id: 'national_identity_card',
            },
            jumio: {
                passport: 'PASSPORT',
                drivers_license: 'DRIVING_LICENSE',
                national_id: 'ID_CARD',
            },
        };
        
        return mappings[providerName.toLowerCase()]?.[documentType] || documentType;
    }
    
    /**
     * Get nested object value using dot notation
     */
    getNestedValue(obj, path) {
        if (!path || !obj) return undefined;
        
        return path.split('.').reduce((current, key) => {
            // Handle array indices like [0]
            if (key.includes('[') && key.includes(']')) {
                const arrayPath = key.split('[');
                const arrayKey = arrayPath[0];
                const index = parseInt(arrayPath[1].replace(']', ''));
                
                return current?.[arrayKey]?.[index];
            }
            
            return current?.[key];
        }, obj);
    }
    
    /**
     * Set nested object value using dot notation
     */
    setNestedValue(obj, path, value) {
        if (!path) return;
        
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }
    
    /**
     * Get relevant value when exact path doesn't exist
     */
    getRelevantValue(obj, targetField) {
        // Try to find similar field names
        const objStr = JSON.stringify(obj).toLowerCase();
        const targetLower = targetField.toLowerCase();
        
        // Look for fields containing target keywords
        for (const [key, value] of Object.entries(obj)) {
            if (key.toLowerCase().includes(targetLower) || 
                targetLower.includes(key.toLowerCase())) {
                return value;
            }
        }
        
        return undefined;
    }
    
    /**
     * Parse boolean from various formats
     */
    parseBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            return ['true', 'yes', '1', 'success', 'pass', 'clear', 'match', 'verified'].includes(lowerValue);
        }
        if (typeof value === 'number') return value > 0;
        return false;
    }
    
    /**
     * Parse confidence from various formats
     */
    parseConfidence(value) {
        if (typeof value === 'number') {
            // Assume 0-1 scale if less than 1, otherwise 0-100
            return value <= 1 ? Math.round(value * 100) : Math.min(value, 100);
        }
        if (typeof value === 'string') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                return numValue <= 1 ? Math.round(numValue * 100) : Math.min(numValue, 100);
            }
            // Parse text confidence levels
            const lowerValue = value.toLowerCase();
            if (lowerValue.includes('high')) return 90;
            if (lowerValue.includes('medium')) return 70;
            if (lowerValue.includes('low')) return 30;
        }
        return 50; // Default medium confidence
    }
    
    /**
     * Parse full name into components
     */
    parseFullName(fullName) {
        if (!fullName || typeof fullName !== 'string') {
            return { first: '', last: '' };
        }
        
        const nameParts = fullName.trim().split(/\s+/);
        
        if (nameParts.length === 1) {
            return { first: nameParts[0], last: '' };
        } else if (nameParts.length === 2) {
            return { first: nameParts[0], last: nameParts[1] };
        } else {
            // Multiple parts - first is first name, rest is last name
            return {
                first: nameParts[0],
                last: nameParts.slice(1).join(' '),
            };
        }
    }
    
    /**
     * Normalize date to ISO format
     */
    normalizeDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                // Try parsing common formats
                const dateFormats = [
                    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
                    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
                    /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
                    /(\d{4})(\d{2})(\d{2})/, // YYYYMMDD
                ];
                
                for (const format of dateFormats) {
                    const match = dateValue.match(format);
                    if (match) {
                        const [, year, month, day] = match;
                        const parsedDate = new Date(year, month - 1, day);
                        if (!isNaN(parsedDate.getTime())) {
                            return parsedDate.toISOString().split('T')[0];
                        }
                    }
                }
                
                return dateValue; // Return original if can't parse
            }
            
            return date.toISOString().split('T')[0];
        } catch (error) {
            this.logger.warn('Date normalization failed', { dateValue, error: error.message });
            return dateValue;
        }
    }
    
    /**
     * Batch map multiple responses
     */
    async mapBatchResponses(responses, providerName, originalRequests) {
        const results = [];
        
        for (let i = 0; i < responses.length; i++) {
            try {
                const mappedResponse = await this.mapResponseFromProvider(
                    responses[i],
                    providerName,
                    originalRequests[i] || originalRequests[0]
                );
                results.push({ success: true, data: mappedResponse });
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    index: i,
                });
            }
        }
        
        return results;
    }
    
    /**
     * Get mapping statistics for monitoring
     */
    getMappingStats() {
        return {
            supported_providers: Object.keys(this.providerMappings).length,
            supported_countries: Object.keys(this.countryMappings).length,
            supported_document_types: Object.keys(this.documentTypeMappings).length,
            cache_size: this.cache.keys().length,
            last_updated: new Date().toISOString(),
        };
    }
    
    /**
     * Validate mapping configuration
     */
    validateMappingConfig(providerName) {
        const mapping = this.providerMappings[providerName.toLowerCase()];
        
        if (!mapping) {
            return {
                valid: false,
                error: `No mapping configuration found for provider: ${providerName}`,
            };
        }
        
        const requiredSections = ['request', 'response'];
        const missingSections = requiredSections.filter(section => !mapping[section]);
        
        if (missingSections.length > 0) {
            return {
                valid: false,
                error: `Missing mapping sections: ${missingSections.join(', ')}`,
            };
        }
        
        return {
            valid: true,
            provider: providerName,
            sections: Object.keys(mapping),
            request_mappings: Object.keys(mapping.request).length,
            response_mappings: Object.keys(mapping.response).length,
            has_transformations: !!mapping.transformations,
        };
    }
}