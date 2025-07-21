/**
 * Certificate Authority Service
 * HSM-backed Public Key Infrastructure operations
 * Handles certificate generation, signing, validation, and lifecycle management
 */

import crypto from 'crypto';
import winston from 'winston';
import forge from 'node-forge';
import x509 from 'x509';
import NodeCache from 'node-cache';

export default class CertificateAuthorityService {
    constructor(config, logger, keyManagementService) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        this.keyManagement = keyManagementService;
        
        // Certificate storage and caching
        this.certificateRegistry = new Map();
        this.certificateCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
        this.certificateChains = new Map();
        this.revokedCertificates = new Set();
        
        // Certificate Revocation List management
        this.crlStorage = new Map();
        this.ocspResponses = new Map();
        
        // CA hierarchy
        this.rootCAs = new Map();
        this.intermediateCAs = new Map();
        this.activeCA = null;
        
        // Certificate templates and policies
        this.certificateTemplates = {
            identity: {
                keyUsage: ['digitalSignature', 'keyAgreement'],
                extendedKeyUsage: ['clientAuth', 'emailProtection'],
                validityPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year
                requiresApproval: false
            },
            device: {
                keyUsage: ['digitalSignature', 'keyEncipherment'],
                extendedKeyUsage: ['clientAuth', 'serverAuth'],
                validityPeriod: 730 * 24 * 60 * 60 * 1000, // 2 years
                requiresApproval: true
            },
            ssl: {
                keyUsage: ['digitalSignature', 'keyEncipherment'],
                extendedKeyUsage: ['serverAuth'],
                validityPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year
                requiresApproval: true
            },
            code_signing: {
                keyUsage: ['digitalSignature'],
                extendedKeyUsage: ['codeSigning'],
                validityPeriod: 1095 * 24 * 60 * 60 * 1000, // 3 years
                requiresApproval: true
            },
            timestamp: {
                keyUsage: ['digitalSignature'],
                extendedKeyUsage: ['timeStamping'],
                validityPeriod: 2555 * 24 * 60 * 60 * 1000, // 7 years
                requiresApproval: true
            }
        };
        
        // Supported algorithms and key sizes
        this.supportedAlgorithms = {
            'RSA': [2048, 3072, 4096],
            'ECDSA': [256, 384, 521],
            'Ed25519': [256]
        };
        
        // Certificate validation policies
        this.validationPolicies = {
            pathLengthConstraint: 3,
            requireBasicConstraints: true,
            requireKeyUsage: true,
            allowSelfSigned: false,
            maxValidityPeriod: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
            minKeySize: {
                'RSA': 2048,
                'ECDSA': 256,
                'Ed25519': 256
            }
        };
        
        // Performance metrics
        this.metrics = {
            certificatesIssued: 0,
            certificatesRevoked: 0,
            validationRequests: 0,
            crlGenerations: 0,
            ocspRequests: 0,
            averageIssuanceTime: 0,
            errorCount: 0
        };
        
        this.logger.info('Certificate Authority Service initialized', {
            supportedTemplates: Object.keys(this.certificateTemplates),
            supportedAlgorithms: Object.keys(this.supportedAlgorithms)
        });
    }
    
    /**
     * Initialize Certificate Authority Service
     */
    async initialize() {
        try {
            this.logger.info('📜 Initializing Certificate Authority Service...');
            
            // Verify key management service is available
            if (!this.keyManagement) {
                throw new Error('Key Management Service not available');
            }
            
            // Initialize root CA if not exists
            await this.initializeRootCA();
            
            // Load existing certificates
            await this.loadExistingCertificates();
            
            // Initialize CRL and OCSP services
            await this.initializeCRLService();
            await this.initializeOCSPService();
            
            // Schedule certificate maintenance tasks
            this.scheduleMaintenance();
            
            this.logger.info('✅ Certificate Authority Service initialized successfully', {
                rootCAs: this.rootCAs.size,
                intermediateCAs: this.intermediateCAs.size,
                certificates: this.certificateRegistry.size
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize Certificate Authority Service', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate new certificate
     */
    async generateCertificate(certRequest) {
        try {
            const {
                subject,
                template = 'identity',
                keyType = 'RSA',
                keySize = 4096,
                validityDays,
                extensions = {},
                approvalRequired = null
            } = certRequest;
            
            this.logger.debug('Generating certificate', {
                subject: subject.commonName,
                template,
                keyType,
                keySize
            });
            
            const startTime = Date.now();
            
            // Validate certificate request
            await this.validateCertificateRequest(certRequest);
            
            // Get certificate template
            const certTemplate = this.certificateTemplates[template];
            if (!certTemplate) {
                throw new Error(`Unknown certificate template: ${template}`);
            }
            
            // Check if approval is required
            const requiresApproval = approvalRequired !== null ? approvalRequired : certTemplate.requiresApproval;
            if (requiresApproval) {
                return await this.createPendingCertificateRequest(certRequest);
            }
            
            // Generate key pair for the certificate
            const keyPair = await this.keyManagement.generateKey({
                keyType,
                keySize,
                keyUsage: ['sign', 'verify'],
                keyLabel: `cert-key-${subject.commonName}-${Date.now()}`,
                metadata: {
                    certificateSubject: subject.commonName,
                    certificateTemplate: template,
                    createdBy: 'certificate_authority'
                }
            });
            
            // Create certificate
            const certificate = await this.createCertificate({
                subject,
                keyPair,
                template: certTemplate,
                validityDays: validityDays || Math.floor(certTemplate.validityPeriod / (24 * 60 * 60 * 1000)),
                extensions
            });
            
            // Sign certificate with CA key
            const signedCertificate = await this.signCertificate(certificate);
            
            // Store certificate in registry
            const certificateId = crypto.randomUUID();
            const certificateMetadata = {
                id: certificateId,
                certificate: signedCertificate,
                subject,
                keyPairId: keyPair.keyId,
                template,
                issuedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + (validityDays || Math.floor(certTemplate.validityPeriod / (24 * 60 * 60 * 1000))) * 24 * 60 * 60 * 1000).toISOString(),
                serialNumber: this.generateSerialNumber(),
                status: 'active',
                issuer: this.getActiveCASubject(),
                revocationReason: null,
                revokedAt: null,
                extensions,
                compliance: {
                    fipsCompliant: true,
                    algorithm: keyType,
                    keySize,
                    hashAlgorithm: 'SHA-256'
                },
                audit: {
                    issuedBy: 'certificate_authority_service',
                    approvedBy: null,
                    validatedAt: new Date().toISOString()
                }
            };
            
            this.certificateRegistry.set(certificateId, certificateMetadata);
            this.certificateCache.set(certificateId, certificateMetadata);
            
            // Update metrics
            this.metrics.certificatesIssued++;
            const issuanceTime = Date.now() - startTime;
            this.updateAverageIssuanceTime(issuanceTime);
            
            this.logger.info('Certificate generated successfully', {
                certificateId,
                subject: subject.commonName,
                template,
                serialNumber: certificateMetadata.serialNumber,
                issuanceTime
            });
            
            return {
                certificateId,
                certificate: signedCertificate,
                serialNumber: certificateMetadata.serialNumber,
                subject,
                issuedAt: certificateMetadata.issuedAt,
                expiresAt: certificateMetadata.expiresAt,
                keyPairId: keyPair.keyId,
                publicKey: keyPair.publicKey,
                template,
                compliance: certificateMetadata.compliance
            };
            
        } catch (error) {
            this.metrics.errorCount++;
            this.logger.error('Certificate generation failed', { error: error.message, certRequest });
            throw error;
        }
    }
    
    /**
     * Revoke certificate
     */
    async revokeCertificate(certificateId, revocationReason = 'unspecified') {
        try {
            const certMetadata = this.certificateRegistry.get(certificateId);
            if (!certMetadata) {
                throw new Error(`Certificate not found: ${certificateId}`);
            }
            
            if (certMetadata.status === 'revoked') {
                throw new Error(`Certificate already revoked: ${certificateId}`);
            }
            
            this.logger.info('Revoking certificate', {
                certificateId,
                subject: certMetadata.subject.commonName,
                reason: revocationReason
            });
            
            // Update certificate status
            certMetadata.status = 'revoked';
            certMetadata.revokedAt = new Date().toISOString();
            certMetadata.revocationReason = revocationReason;
            
            // Add to revoked certificates set
            this.revokedCertificates.add(certificateId);
            
            // Update CRL
            await this.updateCRL();
            
            // Update OCSP response
            await this.updateOCSPResponse(certificateId, 'revoked');
            
            // Remove from cache
            this.certificateCache.del(certificateId);
            
            // Update metrics
            this.metrics.certificatesRevoked++;
            
            this.logger.info('Certificate revoked successfully', {
                certificateId,
                revokedAt: certMetadata.revokedAt,
                reason: revocationReason
            });
            
            return {
                certificateId,
                revokedAt: certMetadata.revokedAt,
                revocationReason,
                crlUpdated: true,
                ocspUpdated: true
            };
            
        } catch (error) {
            this.logger.error('Certificate revocation failed', { certificateId, error: error.message });
            throw error;
        }
    }
    
    /**
     * Validate certificate
     */
    async validateCertificate(certificateData, validationOptions = {}) {
        try {
            const {
                checkRevocation = true,
                checkChain = true,
                checkTime = true,
                allowSelfSigned = this.validationPolicies.allowSelfSigned
            } = validationOptions;
            
            this.logger.debug('Validating certificate', {
                checkRevocation,
                checkChain,
                checkTime
            });
            
            const startTime = Date.now();
            const validationResult = {
                valid: false,
                errors: [],
                warnings: [],
                certificateInfo: {},
                validatedAt: new Date().toISOString(),
                validationTime: 0
            };
            
            // Parse certificate
            let certificate;
            try {
                certificate = forge.pki.certificateFromPem(certificateData);
                validationResult.certificateInfo = this.extractCertificateInfo(certificate);
            } catch (error) {
                validationResult.errors.push('Invalid certificate format');
                return validationResult;
            }
            
            // Check time validity
            if (checkTime) {
                const now = new Date();
                if (certificate.validity.notBefore > now) {
                    validationResult.errors.push('Certificate not yet valid');
                }
                if (certificate.validity.notAfter < now) {
                    validationResult.errors.push('Certificate has expired');
                }
            }
            
            // Check certificate chain
            if (checkChain && !allowSelfSigned) {
                const chainValidation = await this.validateCertificateChain(certificate);
                if (!chainValidation.valid) {
                    validationResult.errors.push(...chainValidation.errors);
                }
                validationResult.warnings.push(...chainValidation.warnings);
            }
            
            // Check revocation status
            if (checkRevocation) {
                const revocationCheck = await this.checkRevocationStatus(certificate);
                if (revocationCheck.revoked) {
                    validationResult.errors.push(`Certificate revoked: ${revocationCheck.reason}`);
                }
            }
            
            // Check signature
            const signatureValid = await this.verifySignature(certificate);
            if (!signatureValid) {
                validationResult.errors.push('Invalid certificate signature');
            }
            
            // Check key usage constraints
            const keyUsageValid = this.validateKeyUsage(certificate, validationOptions.requiredKeyUsage);
            if (!keyUsageValid.valid) {
                validationResult.errors.push(...keyUsageValid.errors);
            }
            
            // Determine overall validity
            validationResult.valid = validationResult.errors.length === 0;
            validationResult.validationTime = Date.now() - startTime;
            
            // Update metrics
            this.metrics.validationRequests++;
            
            this.logger.debug('Certificate validation completed', {
                valid: validationResult.valid,
                errors: validationResult.errors.length,
                warnings: validationResult.warnings.length,
                validationTime: validationResult.validationTime
            });
            
            return validationResult;
            
        } catch (error) {
            this.logger.error('Certificate validation failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate Certificate Revocation List (CRL)
     */
    async generateCRL() {
        try {
            this.logger.debug('Generating Certificate Revocation List');
            
            const crl = forge.pki.createCrl();
            const crlId = crypto.randomUUID();
            
            // Set CRL issuer
            const activeCA = this.getActiveCA();
            crl.issuer = activeCA.certificate.subject.attributes;
            
            // Set CRL validity
            crl.thisUpdate = new Date();
            crl.nextUpdate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            
            // Add revoked certificates
            for (const certificateId of this.revokedCertificates) {
                const certMetadata = this.certificateRegistry.get(certificateId);
                if (certMetadata && certMetadata.status === 'revoked') {
                    const revokedCert = {
                        serialNumber: certMetadata.serialNumber,
                        revocationDate: new Date(certMetadata.revokedAt)
                    };
                    
                    // Add revocation reason extension if available
                    if (certMetadata.revocationReason && certMetadata.revocationReason !== 'unspecified') {
                        revokedCert.extensions = [{
                            name: 'cRLReasons',
                            reason: this.mapRevocationReason(certMetadata.revocationReason)
                        }];
                    }
                    
                    crl.revokedCertificates.push(revokedCert);
                }
            }
            
            // Sign CRL with CA key
            const caKeyId = activeCA.keyPairId;
            const crlData = forge.pki.crlToPem(crl);
            
            // Sign the CRL
            const signature = await this.keyManagement.sign({
                keyId: caKeyId,
                data: Buffer.from(crlData),
                algorithm: 'RSA-PSS',
                hashAlgorithm: 'SHA-256'
            });
            
            // Store CRL
            const crlMetadata = {
                id: crlId,
                crl: crlData,
                signature: signature.signature,
                issuer: activeCA.subject,
                thisUpdate: crl.thisUpdate.toISOString(),
                nextUpdate: crl.nextUpdate.toISOString(),
                revokedCount: crl.revokedCertificates.length,
                generatedAt: new Date().toISOString()
            };
            
            this.crlStorage.set(crlId, crlMetadata);
            
            // Update metrics
            this.metrics.crlGenerations++;
            
            this.logger.info('CRL generated successfully', {
                crlId,
                revokedCertificates: crl.revokedCertificates.length,
                nextUpdate: crl.nextUpdate.toISOString()
            });
            
            return {
                crlId,
                crl: crlData,
                signature: signature.signature,
                thisUpdate: crlMetadata.thisUpdate,
                nextUpdate: crlMetadata.nextUpdate,
                revokedCount: crlMetadata.revokedCount
            };
            
        } catch (error) {
            this.logger.error('CRL generation failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Get certificate information
     */
    async getCertificateInfo(certificateId) {
        try {
            // Check cache first
            let certInfo = this.certificateCache.get(certificateId);
            if (certInfo) {
                return this.sanitizeCertificateInfo(certInfo);
            }
            
            // Get from registry
            certInfo = this.certificateRegistry.get(certificateId);
            if (!certInfo) {
                return null;
            }
            
            // Update cache
            this.certificateCache.set(certificateId, certInfo);
            
            return this.sanitizeCertificateInfo(certInfo);
            
        } catch (error) {
            this.logger.error('Failed to get certificate info', { certificateId, error: error.message });
            throw error;
        }
    }
    
    /**
     * List certificates with filtering
     */
    async listCertificates(filters = {}) {
        try {
            const {
                status,
                template,
                subject,
                issuedAfter,
                expiringWithin,
                limit = 100,
                offset = 0
            } = filters;
            
            let certificates = Array.from(this.certificateRegistry.values());
            
            // Apply filters
            if (status) {
                certificates = certificates.filter(cert => cert.status === status);
            }
            
            if (template) {
                certificates = certificates.filter(cert => cert.template === template);
            }
            
            if (subject) {
                certificates = certificates.filter(cert => 
                    cert.subject.commonName.toLowerCase().includes(subject.toLowerCase())
                );
            }
            
            if (issuedAfter) {
                certificates = certificates.filter(cert => 
                    new Date(cert.issuedAt) > new Date(issuedAfter)
                );
            }
            
            if (expiringWithin) {
                const expirationThreshold = new Date(Date.now() + expiringWithin);
                certificates = certificates.filter(cert => 
                    new Date(cert.expiresAt) < expirationThreshold
                );
            }
            
            // Sort by issue date (newest first)
            certificates.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
            
            // Apply pagination
            const totalCount = certificates.length;
            certificates = certificates.slice(offset, offset + limit);
            
            // Sanitize certificate information
            const sanitizedCertificates = certificates.map(cert => this.sanitizeCertificateInfo(cert));
            
            return {
                certificates: sanitizedCertificates,
                totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            };
            
        } catch (error) {
            this.logger.error('Failed to list certificates', { error: error.message });
            throw error;
        }
    }
    
    // Private methods
    
    async initializeRootCA() {
        // Initialize root CA if it doesn't exist
        if (this.rootCAs.size === 0) {
            this.logger.info('Initializing Root Certificate Authority');
            
            // Generate root CA key pair
            const rootKeyPair = await this.keyManagement.generateKey({
                keyType: 'RSA',
                keySize: 4096,
                keyUsage: ['sign', 'verify'],
                keyLabel: 'root-ca-key',
                metadata: {
                    usage: 'root_ca',
                    createdBy: 'certificate_authority_initialization'
                }
            });
            
            // Create root CA certificate
            const rootCert = await this.createRootCACertificate(rootKeyPair);
            
            // Store root CA
            const rootCAId = crypto.randomUUID();
            const rootCAInfo = {
                id: rootCAId,
                certificate: rootCert.certificate,
                keyPairId: rootKeyPair.keyId,
                subject: rootCert.subject,
                serialNumber: rootCert.serialNumber,
                issuedAt: rootCert.issuedAt,
                expiresAt: rootCert.expiresAt,
                type: 'root'
            };
            
            this.rootCAs.set(rootCAId, rootCAInfo);
            this.activeCA = rootCAId;
            
            this.logger.info('Root CA initialized successfully', {
                rootCAId,
                subject: rootCert.subject.commonName,
                serialNumber: rootCert.serialNumber
            });
        }
    }
    
    async createRootCACertificate(keyPair) {
        const cert = forge.pki.createCertificate();
        
        // Set serial number
        cert.serialNumber = this.generateSerialNumber();
        
        // Set validity period (10 years for root CA)
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
        
        // Set subject and issuer (same for root CA)
        const subject = [{
            name: 'commonName',
            value: 'PersonaChain Root CA'
        }, {
            name: 'organizationName',
            value: 'PersonaChain'
        }, {
            name: 'countryName',
            value: 'US'
        }];
        
        cert.subject.attributes = subject;
        cert.issuer.attributes = subject;
        
        // Set public key
        // Note: In a real implementation, you would get the public key from the HSM
        cert.publicKey = forge.pki.rsa.generateKeyPair(4096).publicKey;
        
        // Add extensions
        cert.setExtensions([{
            name: 'basicConstraints',
            cA: true,
            critical: true
        }, {
            name: 'keyUsage',
            keyCertSign: true,
            cRLSign: true,
            critical: true
        }, {
            name: 'subjectKeyIdentifier'
        }]);
        
        // Self-sign the certificate
        const certPem = forge.pki.certificateToPem(cert);
        
        return {
            certificate: certPem,
            subject: {
                commonName: 'PersonaChain Root CA',
                organizationName: 'PersonaChain',
                countryName: 'US'
            },
            serialNumber: cert.serialNumber,
            issuedAt: cert.validity.notBefore.toISOString(),
            expiresAt: cert.validity.notAfter.toISOString()
        };
    }
    
    async createCertificate(certOptions) {
        const { subject, keyPair, template, validityDays, extensions } = certOptions;
        
        const cert = forge.pki.createCertificate();
        
        // Set serial number
        cert.serialNumber = this.generateSerialNumber();
        
        // Set validity period
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + validityDays);
        
        // Set subject
        const subjectAttrs = Object.entries(subject).map(([key, value]) => ({
            name: key,
            value: value
        }));
        cert.subject.attributes = subjectAttrs;
        
        // Set issuer (from active CA)
        const activeCA = this.getActiveCA();
        cert.issuer.attributes = forge.pki.certificateFromPem(activeCA.certificate).subject.attributes;
        
        // Set public key (from HSM key pair)
        // Note: In a real implementation, you would get the public key from the HSM
        cert.publicKey = forge.pki.rsa.generateKeyPair(4096).publicKey;
        
        // Add extensions based on template
        const certExtensions = this.buildCertificateExtensions(template, extensions);
        cert.setExtensions(certExtensions);
        
        return cert;
    }
    
    async signCertificate(certificate) {
        // Get active CA
        const activeCA = this.getActiveCA();
        
        // Convert certificate to PEM for signing
        const certPem = forge.pki.certificateToPem(certificate);
        
        // Sign with CA key
        const signature = await this.keyManagement.sign({
            keyId: activeCA.keyPairId,
            data: Buffer.from(certPem),
            algorithm: 'RSA-PSS',
            hashAlgorithm: 'SHA-256'
        });
        
        // In a real implementation, you would embed the signature in the certificate
        return certPem;
    }
    
    buildCertificateExtensions(template, customExtensions) {
        const extensions = [];
        
        // Basic constraints
        if (template.basicConstraints !== false) {
            extensions.push({
                name: 'basicConstraints',
                cA: template.basicConstraints?.cA || false,
                pathLenConstraint: template.basicConstraints?.pathLenConstraint,
                critical: true
            });
        }
        
        // Key usage
        if (template.keyUsage) {
            const keyUsageExt = {
                name: 'keyUsage',
                critical: true
            };
            
            template.keyUsage.forEach(usage => {
                keyUsageExt[usage] = true;
            });
            
            extensions.push(keyUsageExt);
        }
        
        // Extended key usage
        if (template.extendedKeyUsage) {
            extensions.push({
                name: 'extKeyUsage',
                serverAuth: template.extendedKeyUsage.includes('serverAuth'),
                clientAuth: template.extendedKeyUsage.includes('clientAuth'),
                codeSigning: template.extendedKeyUsage.includes('codeSigning'),
                emailProtection: template.extendedKeyUsage.includes('emailProtection'),
                timeStamping: template.extendedKeyUsage.includes('timeStamping'),
                critical: false
            });
        }
        
        // Subject alternative names
        if (customExtensions.subjectAltNames) {
            extensions.push({
                name: 'subjectAltName',
                altNames: customExtensions.subjectAltNames
            });
        }
        
        // Subject key identifier
        extensions.push({
            name: 'subjectKeyIdentifier'
        });
        
        // Authority key identifier
        extensions.push({
            name: 'authorityKeyIdentifier'
        });
        
        return extensions;
    }
    
    getActiveCA() {
        if (!this.activeCA) {
            throw new Error('No active Certificate Authority');
        }
        
        return this.rootCAs.get(this.activeCA) || this.intermediateCAs.get(this.activeCA);
    }
    
    getActiveCASubject() {
        const activeCA = this.getActiveCA();
        return activeCA.subject;
    }
    
    generateSerialNumber() {
        // Generate cryptographically secure serial number
        const bytes = crypto.randomBytes(16);
        return bytes.toString('hex').toUpperCase();
    }
    
    async validateCertificateRequest(certRequest) {
        const { subject, keyType, keySize, template } = certRequest;
        
        // Validate subject
        if (!subject || !subject.commonName) {
            throw new Error('Certificate subject must include commonName');
        }
        
        // Validate key parameters
        if (!this.supportedAlgorithms[keyType]) {
            throw new Error(`Unsupported key type: ${keyType}`);
        }
        
        if (!this.supportedAlgorithms[keyType].includes(keySize)) {
            throw new Error(`Unsupported key size ${keySize} for type ${keyType}`);
        }
        
        // Validate template
        if (!this.certificateTemplates[template]) {
            throw new Error(`Unknown certificate template: ${template}`);
        }
    }
    
    async createPendingCertificateRequest(certRequest) {
        const requestId = crypto.randomUUID();
        
        // Store pending request
        // Implementation would store in database for approval workflow
        
        return {
            requestId,
            status: 'pending_approval',
            submittedAt: new Date().toISOString(),
            message: 'Certificate request submitted for approval'
        };
    }
    
    extractCertificateInfo(certificate) {
        return {
            subject: certificate.subject.attributes.reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
            }, {}),
            issuer: certificate.issuer.attributes.reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
            }, {}),
            serialNumber: certificate.serialNumber,
            notBefore: certificate.validity.notBefore.toISOString(),
            notAfter: certificate.validity.notAfter.toISOString(),
            extensions: certificate.extensions.map(ext => ({
                name: ext.name,
                critical: ext.critical,
                value: ext.value || ext
            }))
        };
    }
    
    async validateCertificateChain(certificate) {
        // Implementation would validate the full certificate chain
        return {
            valid: true,
            errors: [],
            warnings: []
        };
    }
    
    async checkRevocationStatus(certificate) {
        // Check if certificate is in revoked list
        for (const [certId, certMetadata] of this.certificateRegistry) {
            if (certMetadata.serialNumber === certificate.serialNumber && 
                certMetadata.status === 'revoked') {
                return {
                    revoked: true,
                    reason: certMetadata.revocationReason,
                    revokedAt: certMetadata.revokedAt
                };
            }
        }
        
        return {
            revoked: false
        };
    }
    
    async verifySignature(certificate) {
        // Implementation would verify certificate signature using CA public key
        return true;
    }
    
    validateKeyUsage(certificate, requiredKeyUsage) {
        if (!requiredKeyUsage) {
            return { valid: true, errors: [] };
        }
        
        // Implementation would check key usage extensions
        return { valid: true, errors: [] };
    }
    
    sanitizeCertificateInfo(certInfo) {
        return {
            id: certInfo.id,
            subject: certInfo.subject,
            template: certInfo.template,
            status: certInfo.status,
            issuedAt: certInfo.issuedAt,
            expiresAt: certInfo.expiresAt,
            serialNumber: certInfo.serialNumber,
            compliance: certInfo.compliance,
            // Remove sensitive information like private keys
        };
    }
    
    mapRevocationReason(reason) {
        const reasonMap = {
            'unspecified': 0,
            'key_compromise': 1,
            'ca_compromise': 2,
            'affiliation_changed': 3,
            'superseded': 4,
            'cessation_of_operation': 5,
            'certificate_hold': 6,
            'remove_from_crl': 8,
            'privilege_withdrawn': 9,
            'aa_compromise': 10
        };
        
        return reasonMap[reason] || 0;
    }
    
    updateAverageIssuanceTime(newTime) {
        const count = this.metrics.certificatesIssued;
        this.metrics.averageIssuanceTime = 
            ((this.metrics.averageIssuanceTime * (count - 1)) + newTime) / count;
    }
    
    async loadExistingCertificates() {
        // Load existing certificates from persistent storage
        this.logger.debug('Loading existing certificates');
    }
    
    async initializeCRLService() {
        // Initialize Certificate Revocation List service
        this.logger.debug('Initializing CRL service');
    }
    
    async initializeOCSPService() {
        // Initialize Online Certificate Status Protocol service
        this.logger.debug('Initializing OCSP service');
    }
    
    async updateCRL() {
        // Update Certificate Revocation List
        await this.generateCRL();
    }
    
    async updateOCSPResponse(certificateId, status) {
        // Update OCSP response for certificate
        this.ocspResponses.set(certificateId, {
            status,
            updatedAt: new Date().toISOString()
        });
    }
    
    scheduleMaintenance() {
        // Schedule periodic maintenance tasks
        setInterval(async () => {
            try {
                await this.performMaintenance();
            } catch (error) {
                this.logger.error('Certificate maintenance failed', { error: error.message });
            }
        }, 24 * 60 * 60 * 1000); // Daily maintenance
    }
    
    async performMaintenance() {
        // Check for expiring certificates
        const expiringThreshold = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        for (const [certId, certInfo] of this.certificateRegistry) {
            if (certInfo.status === 'active' && new Date(certInfo.expiresAt) < expiringThreshold) {
                this.logger.warn('Certificate expiring soon', {
                    certificateId: certId,
                    subject: certInfo.subject.commonName,
                    expiresAt: certInfo.expiresAt
                });
            }
        }
        
        // Update CRL if needed
        await this.updateCRL();
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const activeCertificates = Array.from(this.certificateRegistry.values())
                .filter(cert => cert.status === 'active').length;
                
            const revokedCertificates = Array.from(this.certificateRegistry.values())
                .filter(cert => cert.status === 'revoked').length;
                
            const expiringCertificates = Array.from(this.certificateRegistry.values())
                .filter(cert => {
                    const expiringThreshold = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    return cert.status === 'active' && new Date(cert.expiresAt) < expiringThreshold;
                }).length;
            
            return {
                status: 'healthy',
                totalCertificates: this.certificateRegistry.size,
                activeCertificates,
                revokedCertificates,
                expiringCertificates,
                rootCAs: this.rootCAs.size,
                intermediateCAs: this.intermediateCAs.size,
                metrics: this.metrics,
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