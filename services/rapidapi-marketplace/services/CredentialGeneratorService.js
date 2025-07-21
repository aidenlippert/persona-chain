/**
 * Credential Generator Service
 * Converts API verification results into W3C Verifiable Credentials
 * Supports multiple credential types and standards
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import jwt from 'jsonwebtoken';

export default class CredentialGeneratorService {
    constructor(config) {
        this.config = config;
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            defaultMeta: { service: 'credential-generator' },
        });
        
        // W3C Credential Types Registry
        this.credentialTypes = {
            // Identity Credentials
            IdentityCredential: {
                schema: 'https://schema.org/Person',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/identity/v1'],
                requiredFields: ['fullName', 'dateOfBirth', 'documentNumber'],
                optionalFields: ['nationality', 'issuingAuthority', 'expiryDate', 'photoHash'],
            },
            AgeCredential: {
                schema: 'https://schema.persona-chain.com/age/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/age/v1'],
                requiredFields: ['ageVerified', 'minimumAge'],
                optionalFields: ['exactAge', 'dateOfBirth', 'verificationDate'],
            },
            CitizenshipCredential: {
                schema: 'https://schema.persona-chain.com/citizenship/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/citizenship/v1'],
                requiredFields: ['country', 'citizenshipStatus'],
                optionalFields: ['passportNumber', 'naturalizedDate', 'birthCountry'],
            },
            
            // Document Credentials
            DocumentVerificationCredential: {
                schema: 'https://schema.persona-chain.com/document/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/document/v1'],
                requiredFields: ['documentType', 'verified', 'confidence'],
                optionalFields: ['extractedData', 'securityFeatures', 'fraudScore'],
            },
            EducationCredential: {
                schema: 'https://schema.org/EducationalOccupationalCredential',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.org/'],
                requiredFields: ['institution', 'degree', 'graduationDate'],
                optionalFields: ['gpa', 'honors', 'fieldOfStudy', 'transcript'],
            },
            ProfessionalCredential: {
                schema: 'https://schema.persona-chain.com/professional/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/professional/v1'],
                requiredFields: ['licenseType', 'licenseNumber', 'issuingAuthority'],
                optionalFields: ['specializations', 'expiryDate', 'renewalDate'],
            },
            
            // Financial Credentials
            FinancialCredential: {
                schema: 'https://schema.persona-chain.com/financial/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/financial/v1'],
                requiredFields: ['verificationDate', 'institutionName'],
                optionalFields: ['accountType', 'balanceRange', 'creditScore'],
            },
            CreditCredential: {
                schema: 'https://schema.persona-chain.com/credit/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/credit/v1'],
                requiredFields: ['creditScore', 'scoreRange', 'reportingAgency'],
                optionalFields: ['paymentHistory', 'creditUtilization', 'accountAge'],
            },
            IncomeCredential: {
                schema: 'https://schema.persona-chain.com/income/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/income/v1'],
                requiredFields: ['incomeRange', 'verificationPeriod', 'employmentStatus'],
                optionalFields: ['employer', 'jobTitle', 'salary', 'taxYear'],
            },
            
            // Background Check Credentials
            BackgroundCredential: {
                schema: 'https://schema.persona-chain.com/background/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/background/v1'],
                requiredFields: ['checkType', 'status', 'reportDate'],
                optionalFields: ['jurisdiction', 'searchScope', 'findings'],
            },
            EmploymentCredential: {
                schema: 'https://schema.persona-chain.com/employment/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/employment/v1'],
                requiredFields: ['employer', 'position', 'employmentPeriod'],
                optionalFields: ['salary', 'responsibilities', 'reasonForLeaving'],
            },
            CriminalRecordCredential: {
                schema: 'https://schema.persona-chain.com/criminal/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/criminal/v1'],
                requiredFields: ['checkDate', 'jurisdiction', 'status'],
                optionalFields: ['offenses', 'convictions', 'clearanceLevel'],
            },
            
            // Health Credentials
            HealthCredential: {
                schema: 'https://schema.persona-chain.com/health/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/health/v1'],
                requiredFields: ['healthStatus', 'verificationDate'],
                optionalFields: ['medicalProvider', 'testResults', 'restrictions'],
            },
            VaccinationCredential: {
                schema: 'https://schema.persona-chain.com/vaccination/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/vaccination/v1'],
                requiredFields: ['vaccine', 'vaccinationDate', 'provider'],
                optionalFields: ['batchNumber', 'nextDueDate', 'adverseReactions'],
            },
            
            // Address Credentials
            AddressCredential: {
                schema: 'https://schema.persona-chain.com/address/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/address/v1'],
                requiredFields: ['address', 'verified', 'verificationDate'],
                optionalFields: ['residencyPeriod', 'ownershipStatus', 'utilityProvider'],
            },
            ResidencyCredential: {
                schema: 'https://schema.persona-chain.com/residency/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/residency/v1'],
                requiredFields: ['country', 'residencyStatus', 'validFrom'],
                optionalFields: ['validUntil', 'permits', 'restrictions'],
            },
            
            // Business Credentials
            BusinessCredential: {
                schema: 'https://schema.persona-chain.com/business/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/business/v1'],
                requiredFields: ['businessName', 'registrationNumber', 'jurisdiction'],
                optionalFields: ['businessType', 'incorporationDate', 'directors'],
            },
            LicenseCredential: {
                schema: 'https://schema.persona-chain.com/license/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/license/v1'],
                requiredFields: ['licenseType', 'licenseNumber', 'issuingAuthority'],
                optionalFields: ['issuedDate', 'expiryDate', 'conditions'],
            },
            ComplianceCredential: {
                schema: 'https://schema.persona-chain.com/compliance/v1',
                context: ['https://www.w3.org/2018/credentials/v1', 'https://schema.persona-chain.com/compliance/v1'],
                requiredFields: ['standard', 'complianceStatus', 'assessmentDate'],
                optionalFields: ['certificationBody', 'validityPeriod', 'auditFindings'],
            },
        };
        
        // Issuer configurations
        this.defaultIssuer = {
            id: 'did:persona:issuer:rapidapi',
            name: 'PersonaChain RapidAPI Marketplace',
            description: 'Enterprise identity verification through 40,000+ APIs',
            url: 'https://rapidapi.persona-chain.com',
            logo: 'https://persona-chain.com/images/rapidapi-issuer-logo.png',
        };
    }
    
    /**
     * Generate a verifiable credential from API verification data
     */
    async generateCredential(apiResponse, credentialType, metadata = {}) {
        try {
            this.logger.info('Generating credential', { credentialType, metadata });
            
            // Validate credential type
            if (!this.credentialTypes[credentialType]) {
                throw new Error(`Unknown credential type: ${credentialType}`);
            }
            
            const credentialSpec = this.credentialTypes[credentialType];
            
            // Extract and map data from API response
            const credentialSubject = this.mapApiDataToCredentialSubject(
                apiResponse,
                credentialType,
                metadata
            );
            
            // Validate required fields
            this.validateCredentialSubject(credentialSubject, credentialSpec);
            
            // Generate the credential
            const credential = this.createW3CCredential(
                credentialSubject,
                credentialType,
                credentialSpec,
                metadata
            );
            
            // Add proof (digital signature)
            const signedCredential = await this.signCredential(credential, metadata);
            
            this.logger.info('Credential generated successfully', {
                credentialId: credential.id,
                credentialType,
                subjectId: credentialSubject.id,
            });
            
            return signedCredential;
            
        } catch (error) {
            this.logger.error('Credential generation failed', {
                error: error.message,
                credentialType,
                metadata,
            });
            throw error;
        }
    }
    
    /**
     * Map API response data to credential subject
     */
    mapApiDataToCredentialSubject(apiResponse, credentialType, metadata) {
        const subjectId = metadata.subject_did || `did:persona:user:${uuidv4()}`;
        let credentialSubject = { id: subjectId };
        
        switch (credentialType) {
            case 'IdentityCredential':
                credentialSubject = {
                    ...credentialSubject,
                    fullName: apiResponse.extracted_data?.full_name || apiResponse.full_name,
                    dateOfBirth: apiResponse.extracted_data?.date_of_birth || apiResponse.date_of_birth,
                    documentNumber: apiResponse.extracted_data?.document_number || apiResponse.document_number,
                    nationality: apiResponse.extracted_data?.nationality || apiResponse.nationality,
                    issuingAuthority: apiResponse.extracted_data?.issuing_authority || apiResponse.issuing_authority,
                    expiryDate: apiResponse.extracted_data?.expiry_date || apiResponse.expiry_date,
                    photoHash: apiResponse.photo_hash,
                };
                break;
                
            case 'AgeCredential':
                const birthDate = apiResponse.extracted_data?.date_of_birth || apiResponse.date_of_birth;
                const age = birthDate ? this.calculateAge(birthDate) : null;
                credentialSubject = {
                    ...credentialSubject,
                    ageVerified: apiResponse.verified || false,
                    minimumAge: metadata.minimum_age || 18,
                    exactAge: age,
                    dateOfBirth: birthDate,
                    verificationDate: new Date().toISOString(),
                };
                break;
                
            case 'DocumentVerificationCredential':
                credentialSubject = {
                    ...credentialSubject,
                    documentType: metadata.document_type || apiResponse.document_type,
                    verified: apiResponse.verified || false,
                    confidence: apiResponse.confidence || 0,
                    extractedData: apiResponse.extracted_data,
                    securityFeatures: apiResponse.verification_details?.security_features,
                    fraudScore: apiResponse.risk_assessment?.fraud_score,
                    verificationDetails: apiResponse.verification_details,
                    riskAssessment: apiResponse.risk_assessment,
                };
                break;
                
            case 'FinancialCredential':
                credentialSubject = {
                    ...credentialSubject,
                    verificationDate: new Date().toISOString(),
                    institutionName: apiResponse.institution || apiResponse.bank_name,
                    accountType: apiResponse.account_type,
                    balanceRange: this.categorizeBalance(apiResponse.balance),
                    creditScore: apiResponse.credit_score,
                    accountStatus: apiResponse.account_status,
                };
                break;
                
            case 'BackgroundCredential':
                credentialSubject = {
                    ...credentialSubject,
                    checkType: metadata.check_type || 'comprehensive',
                    status: apiResponse.status || (apiResponse.clear ? 'clear' : 'flagged'),
                    reportDate: new Date().toISOString(),
                    jurisdiction: apiResponse.jurisdiction || metadata.country,
                    searchScope: apiResponse.search_scope,
                    findings: apiResponse.findings || apiResponse.results,
                };
                break;
                
            case 'AddressCredential':
                credentialSubject = {
                    ...credentialSubject,
                    address: apiResponse.address || apiResponse.verified_address,
                    verified: apiResponse.verified || apiResponse.address_verified,
                    verificationDate: new Date().toISOString(),
                    residencyPeriod: apiResponse.residency_period,
                    ownershipStatus: apiResponse.ownership_status,
                    utilityProvider: apiResponse.utility_provider,
                };
                break;
                
            case 'BusinessCredential':
                credentialSubject = {
                    ...credentialSubject,
                    businessName: apiResponse.business_name || apiResponse.company_name,
                    registrationNumber: apiResponse.registration_number || apiResponse.company_number,
                    jurisdiction: apiResponse.jurisdiction || apiResponse.country,
                    businessType: apiResponse.business_type,
                    incorporationDate: apiResponse.incorporation_date,
                    directors: apiResponse.directors,
                    status: apiResponse.status,
                };
                break;
                
            default:
                // Generic mapping for unknown types
                credentialSubject = {
                    ...credentialSubject,
                    ...apiResponse,
                    verificationDate: new Date().toISOString(),
                };
        }
        
        // Remove null/undefined values
        Object.keys(credentialSubject).forEach(key => {
            if (credentialSubject[key] == null) {
                delete credentialSubject[key];
            }
        });
        
        return credentialSubject;
    }
    
    /**
     * Validate credential subject against specification
     */
    validateCredentialSubject(credentialSubject, credentialSpec) {
        const missingFields = credentialSpec.requiredFields.filter(
            field => !(field in credentialSubject)
        );
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
    }
    
    /**
     * Create W3C-compliant verifiable credential
     */
    createW3CCredential(credentialSubject, credentialType, credentialSpec, metadata) {
        const credentialId = `urn:uuid:${uuidv4()}`;
        const issuanceDate = new Date().toISOString();
        const issuer = metadata.issuer_did || this.defaultIssuer.id;
        
        const credential = {
            '@context': credentialSpec.context,
            id: credentialId,
            type: ['VerifiableCredential', credentialType],
            issuer: {
                id: issuer,
                name: this.defaultIssuer.name,
                description: this.defaultIssuer.description,
                url: this.defaultIssuer.url,
                logo: this.defaultIssuer.logo,
            },
            issuanceDate,
            credentialSubject,
            credentialSchema: {
                id: credentialSpec.schema,
                type: 'JsonSchemaValidator2018',
            },
            credentialStatus: {
                id: `${this.config.baseUrl || 'https://api.persona-chain.com'}/credentials/${credentialId}/status`,
                type: 'RevocationList2020Status',
                revocationListIndex: Math.floor(Math.random() * 100000),
                revocationListCredential: `${this.config.baseUrl || 'https://api.persona-chain.com'}/revocation-lists/1`,
            },
            
            // Evidence from API verification
            evidence: [{
                id: `urn:uuid:${uuidv4()}`,
                type: ['DocumentVerification', 'APIVerification'],
                verifier: metadata.api_used || 'RapidAPI Marketplace',
                evidenceDocument: metadata.document_type,
                subjectPresence: 'Digital',
                documentPresence: 'Digital',
                verificationMethod: 'API Integration',
                verificationDate: issuanceDate,
                apiProvider: metadata.api_provider,
                apiEndpoint: metadata.api_endpoint,
                confidence: metadata.confidence,
            }],
            
            // Terms of use
            termsOfUse: [{
                type: 'TrustFrameworkPolicy',
                id: 'https://persona-chain.com/terms/rapidapi-verification',
                policyName: 'PersonaChain RapidAPI Verification Policy',
            }],
            
            // Refresh service (for renewable credentials)
            refreshService: {
                id: `${this.config.baseUrl || 'https://api.persona-chain.com'}/credentials/${credentialId}/refresh`,
                type: 'ManualRefreshService2018',
            },
            
            // Metadata
            metadata: {
                generatedBy: 'PersonaChain RapidAPI Marketplace',
                generationTimestamp: issuanceDate,
                apiUsed: metadata.api_used,
                apiProvider: metadata.api_provider,
                verificationTimestamp: metadata.verification_timestamp,
                userId: metadata.user_id,
                credentialVersion: '1.0',
                expirationDate: this.calculateExpirationDate(credentialType),
            },
        };
        
        return credential;
    }
    
    /**
     * Sign the credential with a digital signature
     */
    async signCredential(credential, metadata) {
        try {
            // Create proof object
            const proof = {
                type: 'RsaSignature2018',
                created: new Date().toISOString(),
                creator: `${credential.issuer.id}#keys-1`,
                purpose: 'assertionMethod',
                domain: 'persona-chain.com',
                challenge: metadata.challenge || uuidv4(),
            };
            
            // Create canonical representation for signing
            const canonicalCredential = this.canonicalizeCredential(credential);
            
            // Generate signature (in production, use proper cryptographic signing)
            const signature = this.generateSignature(canonicalCredential, metadata);
            proof.jws = signature;
            
            // Add proof to credential
            const signedCredential = {
                ...credential,
                proof,
            };
            
            return signedCredential;
            
        } catch (error) {
            this.logger.error('Credential signing failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate cryptographic signature
     */
    generateSignature(data, metadata) {
        // In production, use proper Ed25519 or RSA signing
        // For now, generate a mock JWT-style signature
        const header = {
            alg: 'RS256',
            typ: 'JWT',
            kid: 'rapidapi-issuer-key-1',
        };
        
        const payload = {
            data: crypto.createHash('sha256').update(data).digest('hex'),
            iss: this.defaultIssuer.id,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
        };
        
        const token = jwt.sign(payload, this.config.jwtSecret || 'mock-signing-key', {
            algorithm: 'HS256',
            header,
        });
        
        return token;
    }
    
    /**
     * Canonicalize credential for signing
     */
    canonicalizeCredential(credential) {
        // Remove proof object and create deterministic string representation
        const { proof, ...credentialWithoutProof } = credential;
        return JSON.stringify(credentialWithoutProof, Object.keys(credentialWithoutProof).sort());
    }
    
    /**
     * Calculate credential expiration date based on type
     */
    calculateExpirationDate(credentialType) {
        const now = new Date();
        let expirationMonths = 12; // Default 1 year
        
        switch (credentialType) {
            case 'IdentityCredential':
                expirationMonths = 60; // 5 years
                break;
            case 'AgeCredential':
                expirationMonths = 12; // 1 year
                break;
            case 'DocumentVerificationCredential':
                expirationMonths = 6; // 6 months
                break;
            case 'FinancialCredential':
                expirationMonths = 3; // 3 months
                break;
            case 'BackgroundCredential':
                expirationMonths = 12; // 1 year
                break;
            case 'HealthCredential':
                expirationMonths = 6; // 6 months
                break;
            case 'VaccinationCredential':
                expirationMonths = 24; // 2 years
                break;
            default:
                expirationMonths = 12; // Default 1 year
        }
        
        const expirationDate = new Date(now);
        expirationDate.setMonth(expirationDate.getMonth() + expirationMonths);
        return expirationDate.toISOString();
    }
    
    /**
     * Calculate age from date of birth
     */
    calculateAge(dateOfBirth) {
        const birth = new Date(dateOfBirth);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const monthDiff = now.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }
    
    /**
     * Categorize balance for privacy
     */
    categorizeBalance(balance) {
        if (!balance || balance < 0) return 'unknown';
        if (balance < 1000) return 'low';
        if (balance < 10000) return 'medium';
        if (balance < 100000) return 'high';
        return 'very_high';
    }
    
    /**
     * Batch generate multiple credentials
     */
    async generateBatchCredentials(apiResponses, credentialTypes, metadata = {}) {
        const results = [];
        
        for (let i = 0; i < apiResponses.length; i++) {
            try {
                const credential = await this.generateCredential(
                    apiResponses[i],
                    credentialTypes[i] || credentialTypes[0],
                    { ...metadata, batch_index: i }
                );
                results.push({ success: true, credential });
            } catch (error) {
                results.push({ 
                    success: false, 
                    error: error.message,
                    index: i 
                });
            }
        }
        
        return results;
    }
    
    /**
     * Get credential template for a specific type
     */
    getCredentialTemplate(credentialType) {
        const spec = this.credentialTypes[credentialType];
        if (!spec) {
            throw new Error(`Unknown credential type: ${credentialType}`);
        }
        
        return {
            type: credentialType,
            schema: spec.schema,
            context: spec.context,
            requiredFields: spec.requiredFields,
            optionalFields: spec.optionalFields,
            exampleSubject: this.generateExampleSubject(credentialType),
        };
    }
    
    /**
     * Generate example credential subject for documentation
     */
    generateExampleSubject(credentialType) {
        const examples = {
            IdentityCredential: {
                id: 'did:persona:user:example',
                fullName: 'John Doe',
                dateOfBirth: '1990-01-01',
                documentNumber: 'P123456789',
                nationality: 'US',
                issuingAuthority: 'US Department of State',
                expiryDate: '2030-01-01',
            },
            AgeCredential: {
                id: 'did:persona:user:example',
                ageVerified: true,
                minimumAge: 18,
                verificationDate: '2024-01-15T10:30:00Z',
            },
            DocumentVerificationCredential: {
                id: 'did:persona:user:example',
                documentType: 'passport',
                verified: true,
                confidence: 95,
                verificationDetails: {
                    document_integrity: true,
                    photo_match: true,
                    security_features: true,
                },
            },
        };
        
        return examples[credentialType] || { id: 'did:persona:user:example' };
    }
}