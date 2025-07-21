/**
 * Guardian Management Service
 * Guardian onboarding, lifecycle management, and access control
 * Handles guardian registration, authentication, permissions, and monitoring
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import NodeCache from 'node-cache';
import winston from 'winston';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

export default class GuardianManagementService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        this.cache = new NodeCache({ stdTTL: 1800 }); // 30 minute cache
        
        // Guardian storage (in production, use persistent database)
        this.guardians = new Map();
        this.sessions = new Map();
        this.auditLogs = new Map();
        
        // Guardian configuration
        this.guardianConfig = {
            minGuardians: config.guardian?.minGuardians || 3,
            maxGuardians: config.guardian?.maxGuardians || 15,
            sessionTimeout: config.guardian?.sessionTimeout || 24 * 60 * 60 * 1000, // 24 hours
            maxLoginAttempts: config.guardian?.maxLoginAttempts || 5,
            lockoutDuration: config.guardian?.lockoutDuration || 15 * 60 * 1000, // 15 minutes
            mfaRequired: config.guardian?.mfaRequired || true,
            passwordPolicy: {
                minLength: 12,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSymbols: true,
                maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
            }
        };
        
        // Guardian roles and permissions
        this.roles = {
            ADMIN: {
                name: 'Administrator',
                permissions: [
                    'guardian.create', 'guardian.delete', 'guardian.modify',
                    'proposal.create', 'proposal.vote', 'proposal.execute',
                    'threshold.sign', 'threshold.manage',
                    'policy.create', 'policy.modify', 'policy.delete',
                    'audit.view', 'system.configure'
                ]
            },
            SENIOR_GUARDIAN: {
                name: 'Senior Guardian',
                permissions: [
                    'proposal.create', 'proposal.vote',
                    'threshold.sign',
                    'policy.view', 'audit.view'
                ]
            },
            GUARDIAN: {
                name: 'Guardian',
                permissions: [
                    'proposal.vote',
                    'threshold.sign'
                ]
            },
            OBSERVER: {
                name: 'Observer',
                permissions: [
                    'proposal.view',
                    'audit.view'
                ]
            }
        };
        
        // Guardian statuses
        this.statuses = {
            PENDING: 'pending',
            ACTIVE: 'active',
            SUSPENDED: 'suspended',
            LOCKED: 'locked',
            TERMINATED: 'terminated'
        };
        
        // Initialize with default admin guardian if none exist
        this.initializeDefaultGuardians();
        
        this.logger.info('Guardian management service initialized', {
            minGuardians: this.guardianConfig.minGuardians,
            maxGuardians: this.guardianConfig.maxGuardians,
            mfaRequired: this.guardianConfig.mfaRequired
        });
    }
    
    /**
     * Create new guardian
     */
    async createGuardian(guardianData) {
        try {
            const {
                name,
                email,
                role,
                permissions,
                contactInfo,
                metadata,
                createdBy
            } = guardianData;
            
            this.logger.info('Creating new guardian', { name, email, role });
            
            // Validate guardian data
            this.validateGuardianData(guardianData);
            
            // Check guardian limits
            const activeGuardians = Array.from(this.guardians.values())
                .filter(g => g.status === this.statuses.ACTIVE);
            
            if (activeGuardians.length >= this.guardianConfig.maxGuardians) {
                throw new Error(`Maximum number of guardians reached (${this.guardianConfig.maxGuardians})`);
            }
            
            // Check for duplicate email
            const existingGuardian = Array.from(this.guardians.values())
                .find(g => g.email === email);
            
            if (existingGuardian) {
                throw new Error('Guardian with this email already exists');
            }
            
            // Generate guardian ID
            const guardianId = crypto.randomUUID();
            
            // Generate temporary password
            const tempPassword = this.generateSecurePassword();
            const hashedPassword = await bcrypt.hash(tempPassword, 12);
            
            // Generate MFA secret
            const mfaSecret = speakeasy.generateSecret({
                name: `PersonaChain Guardian - ${name}`,
                account: email,
                issuer: 'PersonaChain'
            });
            
            // Create guardian record
            const guardian = {
                id: guardianId,
                name,
                email,
                role: role || 'GUARDIAN',
                permissions: permissions || this.roles[role || 'GUARDIAN'].permissions,
                contactInfo: {
                    phone: contactInfo?.phone,
                    address: contactInfo?.address,
                    emergencyContact: contactInfo?.emergencyContact
                },
                authentication: {
                    passwordHash: hashedPassword,
                    tempPassword: tempPassword,
                    passwordChangedAt: new Date().toISOString(),
                    passwordMustChange: true,
                    mfaSecret: mfaSecret.base32,
                    mfaEnabled: this.guardianConfig.mfaRequired,
                    mfaBackupCodes: this.generateMFABackupCodes(),
                    loginAttempts: 0,
                    lastLoginAttempt: null,
                    lockedUntil: null
                },
                status: this.statuses.PENDING,
                metadata: {
                    ...metadata,
                    createdBy,
                    ipAddress: metadata?.ipAddress,
                    userAgent: metadata?.userAgent
                },
                timestamps: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastLoginAt: null,
                    lastActivityAt: null
                },
                settings: {
                    notificationPreferences: {
                        email: true,
                        sms: contactInfo?.phone ? true : false,
                        slack: false,
                        discord: false
                    },
                    sessionTimeout: this.guardianConfig.sessionTimeout,
                    autoLogout: true
                }
            };
            
            // Store guardian
            this.guardians.set(guardianId, guardian);
            
            // Generate MFA QR code
            const qrCodeUrl = await qrcode.toDataURL(mfaSecret.otpauth_url);
            
            // Log audit event
            await this.logAuditEvent({
                type: 'guardian_created',
                actor: createdBy,
                target: guardianId,
                details: {
                    name,
                    email,
                    role,
                    permissions: guardian.permissions
                }
            });
            
            this.logger.info('Guardian created successfully', {
                guardianId,
                name,
                email,
                role
            });
            
            return {
                guardian: {
                    id: guardian.id,
                    name: guardian.name,
                    email: guardian.email,
                    role: guardian.role,
                    status: guardian.status,
                    createdAt: guardian.timestamps.createdAt
                },
                onboarding: {
                    tempPassword,
                    mfaSecret: mfaSecret.base32,
                    qrCode: qrCodeUrl,
                    backupCodes: guardian.authentication.mfaBackupCodes
                }
            };
            
        } catch (error) {
            this.logger.error('Failed to create guardian', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Authenticate guardian
     */
    async authenticateGuardian(credentials) {
        try {
            const { email, password, mfaToken, ipAddress, userAgent } = credentials;
            
            this.logger.info('Authenticating guardian', { email, ipAddress });
            
            // Find guardian by email
            const guardian = Array.from(this.guardians.values())
                .find(g => g.email === email);
            
            if (!guardian) {
                throw new Error('Invalid credentials');
            }
            
            // Check guardian status
            if (guardian.status !== this.statuses.ACTIVE && guardian.status !== this.statuses.PENDING) {
                throw new Error('Guardian account is not active');
            }
            
            // Check lockout status
            if (guardian.authentication.lockedUntil && 
                new Date() < new Date(guardian.authentication.lockedUntil)) {
                throw new Error('Account is temporarily locked due to failed login attempts');
            }
            
            // Verify password
            const passwordValid = await bcrypt.compare(password, guardian.authentication.passwordHash);
            if (!passwordValid) {
                await this.handleFailedLogin(guardian.id);
                throw new Error('Invalid credentials');
            }
            
            // Verify MFA if enabled
            if (guardian.authentication.mfaEnabled) {
                if (!mfaToken) {
                    throw new Error('MFA token required');
                }
                
                const mfaValid = speakeasy.totp.verify({
                    secret: guardian.authentication.mfaSecret,
                    encoding: 'base32',
                    token: mfaToken,
                    window: 2
                });
                
                if (!mfaValid) {
                    // Check backup codes
                    const backupCodeValid = guardian.authentication.mfaBackupCodes.includes(mfaToken);
                    if (backupCodeValid) {
                        // Remove used backup code
                        guardian.authentication.mfaBackupCodes = 
                            guardian.authentication.mfaBackupCodes.filter(code => code !== mfaToken);
                    } else {
                        await this.handleFailedLogin(guardian.id);
                        throw new Error('Invalid MFA token');
                    }
                }
            }
            
            // Reset failed login attempts
            guardian.authentication.loginAttempts = 0;
            guardian.authentication.lockedUntil = null;
            
            // Update login timestamps
            guardian.timestamps.lastLoginAt = new Date().toISOString();
            guardian.timestamps.lastActivityAt = new Date().toISOString();
            guardian.timestamps.updatedAt = new Date().toISOString();
            
            // Activate pending guardian
            if (guardian.status === this.statuses.PENDING) {
                guardian.status = this.statuses.ACTIVE;
            }
            
            // Create session
            const sessionId = crypto.randomUUID();
            const session = {
                id: sessionId,
                guardianId: guardian.id,
                ipAddress,
                userAgent,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + guardian.settings.sessionTimeout).toISOString(),
                active: true
            };
            
            this.sessions.set(sessionId, session);
            
            // Log audit event
            await this.logAuditEvent({
                type: 'guardian_login',
                actor: guardian.id,
                target: guardian.id,
                details: { ipAddress, userAgent }
            });
            
            this.logger.info('Guardian authenticated successfully', {
                guardianId: guardian.id,
                sessionId
            });
            
            return {
                guardian: {
                    id: guardian.id,
                    name: guardian.name,
                    email: guardian.email,
                    role: guardian.role,
                    permissions: guardian.permissions,
                    status: guardian.status
                },
                session: {
                    id: sessionId,
                    expiresAt: session.expiresAt
                },
                passwordMustChange: guardian.authentication.passwordMustChange
            };
            
        } catch (error) {
            this.logger.error('Guardian authentication failed', { 
                email: credentials.email, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Get guardian by ID
     */
    async getGuardian(guardianId) {
        const guardian = this.guardians.get(guardianId);
        if (!guardian) {
            return null;
        }
        
        // Return guardian without sensitive data
        return {
            id: guardian.id,
            name: guardian.name,
            email: guardian.email,
            role: guardian.role,
            permissions: guardian.permissions,
            status: guardian.status,
            contactInfo: guardian.contactInfo,
            timestamps: guardian.timestamps,
            settings: guardian.settings,
            active: guardian.status === this.statuses.ACTIVE,
            lastLoginAt: guardian.timestamps.lastLoginAt
        };
    }
    
    /**
     * Get all guardians
     */
    async getAllGuardians(filters = {}) {
        try {
            let guardians = Array.from(this.guardians.values());
            
            // Apply filters
            if (filters.status) {
                guardians = guardians.filter(g => g.status === filters.status);
            }
            
            if (filters.role) {
                guardians = guardians.filter(g => g.role === filters.role);
            }
            
            if (filters.active !== undefined) {
                guardians = guardians.filter(g => 
                    filters.active ? g.status === this.statuses.ACTIVE : g.status !== this.statuses.ACTIVE
                );
            }
            
            // Sort by creation date (newest first)
            guardians.sort((a, b) => new Date(b.timestamps.createdAt) - new Date(a.timestamps.createdAt));
            
            // Remove sensitive data
            return guardians.map(guardian => ({
                id: guardian.id,
                name: guardian.name,
                email: guardian.email,
                role: guardian.role,
                status: guardian.status,
                lastLoginAt: guardian.timestamps.lastLoginAt,
                createdAt: guardian.timestamps.createdAt,
                active: guardian.status === this.statuses.ACTIVE
            }));
            
        } catch (error) {
            this.logger.error('Failed to get guardians', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Update guardian
     */
    async updateGuardian(guardianId, updates, updatedBy) {
        try {
            const guardian = this.guardians.get(guardianId);
            if (!guardian) {
                throw new Error('Guardian not found');
            }
            
            this.logger.info('Updating guardian', { guardianId, updates: Object.keys(updates) });
            
            // Validate updates
            if (updates.email && updates.email !== guardian.email) {
                const existingGuardian = Array.from(this.guardians.values())
                    .find(g => g.email === updates.email && g.id !== guardianId);
                
                if (existingGuardian) {
                    throw new Error('Guardian with this email already exists');
                }
            }
            
            // Apply updates
            if (updates.name) guardian.name = updates.name;
            if (updates.email) guardian.email = updates.email;
            if (updates.role) {
                guardian.role = updates.role;
                guardian.permissions = this.roles[updates.role]?.permissions || guardian.permissions;
            }
            if (updates.permissions) guardian.permissions = updates.permissions;
            if (updates.contactInfo) guardian.contactInfo = { ...guardian.contactInfo, ...updates.contactInfo };
            if (updates.settings) guardian.settings = { ...guardian.settings, ...updates.settings };
            if (updates.status) guardian.status = updates.status;
            
            guardian.timestamps.updatedAt = new Date().toISOString();
            
            // Log audit event
            await this.logAuditEvent({
                type: 'guardian_updated',
                actor: updatedBy,
                target: guardianId,
                details: updates
            });
            
            this.logger.info('Guardian updated successfully', { guardianId });
            
            return await this.getGuardian(guardianId);
            
        } catch (error) {
            this.logger.error('Failed to update guardian', { 
                guardianId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Delete guardian
     */
    async deleteGuardian(guardianId, deletedBy, reason) {
        try {
            const guardian = this.guardians.get(guardianId);
            if (!guardian) {
                throw new Error('Guardian not found');
            }
            
            // Check minimum guardian requirement
            const activeGuardians = Array.from(this.guardians.values())
                .filter(g => g.status === this.statuses.ACTIVE && g.id !== guardianId);
            
            if (activeGuardians.length < this.guardianConfig.minGuardians) {
                throw new Error(`Cannot delete guardian: minimum ${this.guardianConfig.minGuardians} active guardians required`);
            }
            
            this.logger.info('Deleting guardian', { guardianId, reason });
            
            // Mark as terminated instead of deleting for audit purposes
            guardian.status = this.statuses.TERMINATED;
            guardian.timestamps.terminatedAt = new Date().toISOString();
            guardian.timestamps.updatedAt = new Date().toISOString();
            guardian.terminationReason = reason;
            
            // Invalidate all sessions
            const guardianSessions = Array.from(this.sessions.entries())
                .filter(([_, session]) => session.guardianId === guardianId);
            
            for (const [sessionId, _] of guardianSessions) {
                this.sessions.delete(sessionId);
            }
            
            // Log audit event
            await this.logAuditEvent({
                type: 'guardian_deleted',
                actor: deletedBy,
                target: guardianId,
                details: { reason }
            });
            
            this.logger.info('Guardian deleted successfully', { guardianId });
            
            return {
                success: true,
                guardianId,
                terminatedAt: guardian.timestamps.terminatedAt
            };
            
        } catch (error) {
            this.logger.error('Failed to delete guardian', { 
                guardianId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Validate session
     */
    async validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        
        // Check expiration
        if (new Date() > new Date(session.expiresAt)) {
            this.sessions.delete(sessionId);
            return null;
        }
        
        // Get guardian
        const guardian = this.guardians.get(session.guardianId);
        if (!guardian || guardian.status !== this.statuses.ACTIVE) {
            this.sessions.delete(sessionId);
            return null;
        }
        
        return {
            sessionId: session.id,
            guardian: await this.getGuardian(session.guardianId),
            expiresAt: session.expiresAt
        };
    }
    
    // Utility methods
    
    validateGuardianData(data) {
        if (!data.name || data.name.trim().length < 2) {
            throw new Error('Guardian name must be at least 2 characters');
        }
        
        if (!data.email || !this.isValidEmail(data.email)) {
            throw new Error('Valid email address is required');
        }
        
        if (data.role && !this.roles[data.role]) {
            throw new Error('Invalid guardian role');
        }
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    generateSecurePassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    
    generateMFABackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }
    
    async handleFailedLogin(guardianId) {
        const guardian = this.guardians.get(guardianId);
        if (!guardian) return;
        
        guardian.authentication.loginAttempts++;
        guardian.authentication.lastLoginAttempt = new Date().toISOString();
        
        if (guardian.authentication.loginAttempts >= this.guardianConfig.maxLoginAttempts) {
            guardian.authentication.lockedUntil = 
                new Date(Date.now() + this.guardianConfig.lockoutDuration).toISOString();
            
            this.logger.warn('Guardian account locked due to failed login attempts', {
                guardianId,
                attempts: guardian.authentication.loginAttempts
            });
        }
    }
    
    async logAuditEvent(event) {
        const auditId = crypto.randomUUID();
        const auditEvent = {
            id: auditId,
            type: event.type,
            actor: event.actor,
            target: event.target,
            details: event.details,
            timestamp: new Date().toISOString(),
            ipAddress: event.ipAddress,
            userAgent: event.userAgent
        };
        
        this.auditLogs.set(auditId, auditEvent);
        
        this.logger.info('Audit event logged', {
            type: event.type,
            actor: event.actor,
            target: event.target
        });
    }
    
    async initializeDefaultGuardians() {
        // Create default admin guardian if none exist
        if (this.guardians.size === 0) {
            const defaultAdmin = {
                name: 'System Administrator',
                email: 'admin@persona-chain.com',
                role: 'ADMIN',
                contactInfo: {
                    phone: null,
                    address: null
                },
                metadata: {
                    createdBy: 'system',
                    isDefault: true
                }
            };
            
            try {
                await this.createGuardian(defaultAdmin);
                this.logger.info('Default admin guardian created');
            } catch (error) {
                this.logger.error('Failed to create default admin guardian', { error: error.message });
            }
        }
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const activeGuardians = Array.from(this.guardians.values())
                .filter(g => g.status === this.statuses.ACTIVE).length;
            
            const activeSessions = Array.from(this.sessions.values())
                .filter(s => new Date() <= new Date(s.expiresAt)).length;
                
            return {
                status: 'healthy',
                totalGuardians: this.guardians.size,
                activeGuardians,
                activeSessions,
                auditLogs: this.auditLogs.size,
                configuration: {
                    minGuardians: this.guardianConfig.minGuardians,
                    maxGuardians: this.guardianConfig.maxGuardians,
                    mfaRequired: this.guardianConfig.mfaRequired
                },
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