/**
 * Notification Service
 * Multi-channel guardian communication and alerting
 * Handles email, SMS, Slack, Discord, and real-time notifications
 */

import crypto from 'crypto';
import NodeCache from 'node-cache';
import winston from 'winston';
import nodemailer from 'nodemailer';

export default class NotificationService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        this.cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache
        
        // Notification storage
        this.notifications = new Map();
        this.notificationQueue = new Map();
        this.templates = new Map();
        this.subscriptions = new Map();
        
        // Notification configuration
        this.notificationConfig = {
            maxRetries: config.notification?.maxRetries || 3,
            retryDelay: config.notification?.retryDelay || 5000, // 5 seconds
            batchSize: config.notification?.batchSize || 100,
            rateLimiting: config.notification?.rateLimiting || true,
            templateCaching: config.notification?.templateCaching || true,
        };
        
        // Notification channels
        this.channels = {
            EMAIL: 'email',
            SMS: 'sms',
            SLACK: 'slack',
            DISCORD: 'discord',
            WEBHOOK: 'webhook',
            PUSH: 'push',
            IN_APP: 'in_app'
        };
        
        // Notification types
        this.notificationTypes = {
            PROPOSAL_CREATED: 'proposal_created',
            PROPOSAL_APPROVED: 'proposal_approved',
            PROPOSAL_REJECTED: 'proposal_rejected',
            VOTING_REMINDER: 'voting_reminder',
            VOTING_DEADLINE: 'voting_deadline',
            THRESHOLD_SIGNING_REQUEST: 'threshold_signing_request',
            SIGNATURE_REQUIRED: 'signature_required',
            SIGNING_COMPLETED: 'signing_completed',
            GUARDIAN_ADDED: 'guardian_added',
            GUARDIAN_REMOVED: 'guardian_removed',
            SECURITY_ALERT: 'security_alert',
            SYSTEM_MAINTENANCE: 'system_maintenance',
            POLICY_VIOLATION: 'policy_violation',
            CREDENTIAL_ISSUED: 'credential_issued',
            LOGIN_ANOMALY: 'login_anomaly',
            EMERGENCY_ACTION: 'emergency_action'
        };
        
        // Priority levels
        this.priorities = {
            LOW: 'low',
            NORMAL: 'normal',
            HIGH: 'high',
            URGENT: 'urgent',
            CRITICAL: 'critical'
        };
        
        // Notification statuses
        this.statuses = {
            PENDING: 'pending',
            SENT: 'sent',
            DELIVERED: 'delivered',
            FAILED: 'failed',
            RETRYING: 'retrying'
        };
        
        // Initialize services
        this.initializeServices();
        
        // Initialize default templates
        this.initializeDefaultTemplates();
        
        this.logger.info('Notification service initialized', {
            maxRetries: this.notificationConfig.maxRetries,
            rateLimiting: this.notificationConfig.rateLimiting
        });
    }
    
    /**
     * Send notification to guardians
     */
    async notifyGuardians(type, data, options = {}) {
        try {
            const {
                guardians = [],
                channels = [this.channels.EMAIL],
                priority = this.priorities.NORMAL,
                scheduled = null,
                template = null
            } = options;
            
            this.logger.info('Sending notification to guardians', {
                type,
                guardianCount: guardians.length,
                channels,
                priority
            });
            
            // Get guardian notification preferences
            const recipients = await this.getGuardianNotificationPreferences(guardians);
            
            // Generate notifications for each recipient
            const notifications = [];
            
            for (const recipient of recipients) {
                for (const channel of channels) {
                    // Check if guardian has this channel enabled
                    if (!recipient.preferences[channel]) {
                        continue;
                    }
                    
                    const notification = await this.createNotification({
                        type,
                        channel,
                        recipient: recipient.guardianId,
                        data,
                        priority,
                        scheduled,
                        template: template || this.getDefaultTemplate(type, channel)
                    });
                    
                    notifications.push(notification);
                }
            }
            
            // Send notifications
            const results = await this.sendNotifications(notifications);
            
            this.logger.info('Guardian notifications processed', {
                type,
                totalNotifications: notifications.length,
                successCount: results.filter(r => r.success).length,
                failureCount: results.filter(r => !r.success).length
            });
            
            return {
                notificationsCreated: notifications.length,
                results
            };
            
        } catch (error) {
            this.logger.error('Failed to notify guardians', { 
                type, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Notify signing participants
     */
    async notifySigningParticipants(guardians, signingData) {
        try {
            const { sessionId, credentialType, requester } = signingData;
            
            this.logger.info('Notifying signing participants', {
                sessionId,
                participantCount: guardians.length
            });
            
            const notificationData = {
                sessionId,
                credentialType,
                requester,
                timestamp: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            };
            
            return await this.notifyGuardians(
                this.notificationTypes.THRESHOLD_SIGNING_REQUEST,
                notificationData,
                {
                    guardians,
                    channels: [this.channels.EMAIL, this.channels.SLACK],
                    priority: this.priorities.HIGH
                }
            );
            
        } catch (error) {
            this.logger.error('Failed to notify signing participants', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Notify signing completion
     */
    async notifySigningCompletion(guardians, completionData) {
        try {
            const { sessionId, credentialId } = completionData;
            
            this.logger.info('Notifying signing completion', {
                sessionId,
                credentialId,
                participantCount: guardians.length
            });
            
            const notificationData = {
                sessionId,
                credentialId,
                completedAt: new Date().toISOString()
            };
            
            return await this.notifyGuardians(
                this.notificationTypes.SIGNING_COMPLETED,
                notificationData,
                {
                    guardians,
                    channels: [this.channels.EMAIL],
                    priority: this.priorities.NORMAL
                }
            );
            
        } catch (error) {
            this.logger.error('Failed to notify signing completion', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Send security alert
     */
    async sendSecurityAlert(alertData, targetAudience = 'all') {
        try {
            const {
                alertType,
                severity,
                description,
                affectedSystems,
                recommendedActions
            } = alertData;
            
            this.logger.warn('Sending security alert', {
                alertType,
                severity,
                targetAudience
            });
            
            // Determine recipients based on target audience
            let guardians = [];
            if (targetAudience === 'all') {
                guardians = await this.getAllActiveGuardians();
            } else if (targetAudience === 'admins') {
                guardians = await this.getAdminGuardians();
            } else if (Array.isArray(targetAudience)) {
                guardians = targetAudience;
            }
            
            const notificationData = {
                alertType,
                severity,
                description,
                affectedSystems,
                recommendedActions,
                timestamp: new Date().toISOString(),
                alertId: crypto.randomUUID()
            };
            
            // Use multiple channels for security alerts
            const channels = [this.channels.EMAIL, this.channels.SMS];
            if (severity === 'critical') {
                channels.push(this.channels.SLACK, this.channels.DISCORD);
            }
            
            return await this.notifyGuardians(
                this.notificationTypes.SECURITY_ALERT,
                notificationData,
                {
                    guardians,
                    channels,
                    priority: severity === 'critical' ? this.priorities.CRITICAL : this.priorities.HIGH
                }
            );
            
        } catch (error) {
            this.logger.error('Failed to send security alert', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Create individual notification
     */
    async createNotification(notificationData) {
        try {
            const {
                type,
                channel,
                recipient,
                data,
                priority,
                scheduled,
                template
            } = notificationData;
            
            const notificationId = crypto.randomUUID();
            
            // Generate notification content
            const content = await this.generateNotificationContent(type, data, template);
            
            const notification = {
                id: notificationId,
                type,
                channel,
                recipient,
                priority,
                status: this.statuses.PENDING,
                
                // Content
                subject: content.subject,
                message: content.message,
                htmlMessage: content.htmlMessage,
                metadata: content.metadata,
                
                // Delivery configuration
                scheduledAt: scheduled,
                maxRetries: this.notificationConfig.maxRetries,
                retryCount: 0,
                retryDelay: this.notificationConfig.retryDelay,
                
                // Timestamps
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                sentAt: null,
                deliveredAt: null,
                
                // Tracking
                tracking: {
                    attempts: [],
                    errors: [],
                    deliveryConfirmation: null
                }
            };
            
            // Store notification
            this.notifications.set(notificationId, notification);
            
            return notification;
            
        } catch (error) {
            this.logger.error('Failed to create notification', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Send notifications
     */
    async sendNotifications(notifications) {
        try {
            const results = [];
            
            for (const notification of notifications) {
                try {
                    const result = await this.sendNotification(notification);
                    results.push({ notificationId: notification.id, success: true, result });
                } catch (error) {
                    results.push({ 
                        notificationId: notification.id, 
                        success: false, 
                        error: error.message 
                    });
                    
                    // Queue for retry if not at max retries
                    if (notification.retryCount < notification.maxRetries) {
                        await this.queueForRetry(notification);
                    }
                }
            }
            
            return results;
            
        } catch (error) {
            this.logger.error('Failed to send notifications', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Send individual notification
     */
    async sendNotification(notification) {
        try {
            this.logger.debug('Sending notification', {
                id: notification.id,
                type: notification.type,
                channel: notification.channel,
                recipient: notification.recipient
            });
            
            // Update status
            notification.status = this.statuses.RETRYING;
            notification.retryCount++;
            
            // Record attempt
            notification.tracking.attempts.push({
                attempt: notification.retryCount,
                timestamp: new Date().toISOString(),
                channel: notification.channel
            });
            
            let result;
            
            // Send via appropriate channel
            switch (notification.channel) {
                case this.channels.EMAIL:
                    result = await this.sendEmail(notification);
                    break;
                    
                case this.channels.SMS:
                    result = await this.sendSMS(notification);
                    break;
                    
                case this.channels.SLACK:
                    result = await this.sendSlack(notification);
                    break;
                    
                case this.channels.DISCORD:
                    result = await this.sendDiscord(notification);
                    break;
                    
                case this.channels.WEBHOOK:
                    result = await this.sendWebhook(notification);
                    break;
                    
                default:
                    throw new Error(`Unsupported notification channel: ${notification.channel}`);
            }
            
            // Update notification status
            notification.status = this.statuses.SENT;
            notification.sentAt = new Date().toISOString();
            notification.updatedAt = new Date().toISOString();
            
            // Store delivery result
            notification.tracking.deliveryConfirmation = result;
            
            this.logger.info('Notification sent successfully', {
                id: notification.id,
                channel: notification.channel,
                recipient: notification.recipient
            });
            
            return result;
            
        } catch (error) {
            // Record error
            notification.tracking.errors.push({
                attempt: notification.retryCount,
                timestamp: new Date().toISOString(),
                error: error.message
            });
            
            this.logger.error('Failed to send notification', {
                id: notification.id,
                channel: notification.channel,
                error: error.message
            });
            
            throw error;
        }
    }
    
    // Channel-specific sending methods
    
    async sendEmail(notification) {
        try {
            if (!this.emailTransporter) {
                throw new Error('Email service not configured');
            }
            
            const recipientInfo = await this.getRecipientContactInfo(notification.recipient);
            if (!recipientInfo.email) {
                throw new Error('No email address found for recipient');
            }
            
            const mailOptions = {
                from: this.config.notifications?.email?.from || 'noreply@persona-chain.com',
                to: recipientInfo.email,
                subject: notification.subject,
                text: notification.message,
                html: notification.htmlMessage || notification.message,
                headers: {
                    'X-Notification-ID': notification.id,
                    'X-Notification-Type': notification.type,
                    'X-Priority': this.getEmailPriority(notification.priority)
                }
            };
            
            const result = await this.emailTransporter.sendMail(mailOptions);
            
            return {
                messageId: result.messageId,
                channel: this.channels.EMAIL,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Email sending failed', { 
                notificationId: notification.id, 
                error: error.message 
            });
            throw error;
        }
    }
    
    async sendSMS(notification) {
        try {
            const recipientInfo = await this.getRecipientContactInfo(notification.recipient);
            if (!recipientInfo.phone) {
                throw new Error('No phone number found for recipient');
            }
            
            // Mock SMS implementation - integrate with Twilio
            this.logger.info('Sending SMS (mock)', {
                to: recipientInfo.phone,
                message: notification.message.substring(0, 160) // SMS limit
            });
            
            return {
                messageId: crypto.randomUUID(),
                channel: this.channels.SMS,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('SMS sending failed', { 
                notificationId: notification.id, 
                error: error.message 
            });
            throw error;
        }
    }
    
    async sendSlack(notification) {
        try {
            const webhookUrl = this.config.notifications?.slack?.webhook;
            if (!webhookUrl) {
                throw new Error('Slack webhook not configured');
            }
            
            const slackMessage = {
                text: notification.subject,
                attachments: [{
                    color: this.getSlackColor(notification.priority),
                    title: notification.subject,
                    text: notification.message,
                    footer: 'PersonaChain Guardian System',
                    ts: Math.floor(Date.now() / 1000)
                }]
            };
            
            // Mock Slack implementation
            this.logger.info('Sending Slack notification (mock)', {
                webhook: webhookUrl,
                message: slackMessage.text
            });
            
            return {
                messageId: crypto.randomUUID(),
                channel: this.channels.SLACK,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Slack sending failed', { 
                notificationId: notification.id, 
                error: error.message 
            });
            throw error;
        }
    }
    
    async sendDiscord(notification) {
        try {
            const webhookUrl = this.config.notifications?.discord?.webhook;
            if (!webhookUrl) {
                throw new Error('Discord webhook not configured');
            }
            
            const discordMessage = {
                content: notification.message,
                embeds: [{
                    title: notification.subject,
                    description: notification.message,
                    color: this.getDiscordColor(notification.priority),
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: 'PersonaChain Guardian System'
                    }
                }]
            };
            
            // Mock Discord implementation
            this.logger.info('Sending Discord notification (mock)', {
                webhook: webhookUrl,
                message: discordMessage.content
            });
            
            return {
                messageId: crypto.randomUUID(),
                channel: this.channels.DISCORD,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Discord sending failed', { 
                notificationId: notification.id, 
                error: error.message 
            });
            throw error;
        }
    }
    
    async sendWebhook(notification) {
        try {
            const recipientInfo = await this.getRecipientContactInfo(notification.recipient);
            if (!recipientInfo.webhookUrl) {
                throw new Error('No webhook URL found for recipient');
            }
            
            const webhookPayload = {
                notificationId: notification.id,
                type: notification.type,
                subject: notification.subject,
                message: notification.message,
                priority: notification.priority,
                timestamp: new Date().toISOString(),
                metadata: notification.metadata
            };
            
            // Mock webhook implementation
            this.logger.info('Sending webhook notification (mock)', {
                url: recipientInfo.webhookUrl,
                payload: webhookPayload
            });
            
            return {
                messageId: crypto.randomUUID(),
                channel: this.channels.WEBHOOK,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Webhook sending failed', { 
                notificationId: notification.id, 
                error: error.message 
            });
            throw error;
        }
    }
    
    // Utility methods
    
    initializeServices() {
        // Initialize email transporter
        if (this.config.notifications?.email?.smtp) {
            try {
                this.emailTransporter = nodemailer.createTransporter(
                    this.config.notifications.email.smtp
                );
                this.logger.info('Email service initialized');
            } catch (error) {
                this.logger.warn('Failed to initialize email service', { error: error.message });
            }
        }
    }
    
    initializeDefaultTemplates() {
        // Proposal created template
        this.templates.set(`${this.notificationTypes.PROPOSAL_CREATED}_${this.channels.EMAIL}`, {
            subject: 'New Governance Proposal: {{title}}',
            message: `A new governance proposal has been created:

Title: {{title}}
Type: {{type}}
Proposer: {{proposer}}
Voting Deadline: {{deadline}}

Please review and cast your vote at: {{votingUrl}}

Best regards,
PersonaChain Guardian System`,
            htmlMessage: `<h2>New Governance Proposal</h2>
<p>A new governance proposal has been created:</p>
<ul>
<li><strong>Title:</strong> {{title}}</li>
<li><strong>Type:</strong> {{type}}</li>
<li><strong>Proposer:</strong> {{proposer}}</li>
<li><strong>Voting Deadline:</strong> {{deadline}}</li>
</ul>
<p><a href="{{votingUrl}}">Click here to review and vote</a></p>
<p>Best regards,<br>PersonaChain Guardian System</p>`
        });
        
        // Threshold signing request template
        this.templates.set(`${this.notificationTypes.THRESHOLD_SIGNING_REQUEST}_${this.channels.EMAIL}`, {
            subject: 'Threshold Signature Required - Session {{sessionId}}',
            message: `Your signature is required for credential issuance:

Session ID: {{sessionId}}
Credential Type: {{credentialType}}
Requester: {{requester}}
Expires: {{expiresAt}}

Please complete your signature at: {{signingUrl}}

Best regards,
PersonaChain Guardian System`,
            htmlMessage: `<h2>Threshold Signature Required</h2>
<p>Your signature is required for credential issuance:</p>
<ul>
<li><strong>Session ID:</strong> {{sessionId}}</li>
<li><strong>Credential Type:</strong> {{credentialType}}</li>
<li><strong>Requester:</strong> {{requester}}</li>
<li><strong>Expires:</strong> {{expiresAt}}</li>
</ul>
<p><a href="{{signingUrl}}">Click here to complete your signature</a></p>
<p>Best regards,<br>PersonaChain Guardian System</p>`
        });
        
        // Security alert template
        this.templates.set(`${this.notificationTypes.SECURITY_ALERT}_${this.channels.EMAIL}`, {
            subject: 'SECURITY ALERT: {{alertType}} - {{severity}}',
            message: `SECURITY ALERT

Alert Type: {{alertType}}
Severity: {{severity}}
Description: {{description}}

Affected Systems: {{affectedSystems}}
Recommended Actions: {{recommendedActions}}

Alert ID: {{alertId}}
Timestamp: {{timestamp}}

Please take immediate action as necessary.

PersonaChain Security Team`,
            htmlMessage: `<h1 style="color: red;">SECURITY ALERT</h1>
<p><strong>Alert Type:</strong> {{alertType}}</p>
<p><strong>Severity:</strong> {{severity}}</p>
<p><strong>Description:</strong> {{description}}</p>
<p><strong>Affected Systems:</strong> {{affectedSystems}}</p>
<p><strong>Recommended Actions:</strong> {{recommendedActions}}</p>
<hr>
<p><small>Alert ID: {{alertId}}<br>Timestamp: {{timestamp}}</small></p>
<p>Please take immediate action as necessary.</p>
<p>PersonaChain Security Team</p>`
        });
        
        this.logger.info('Default notification templates initialized');
    }
    
    async generateNotificationContent(type, data, template) {
        try {
            const templateKey = template || this.getDefaultTemplate(type, this.channels.EMAIL);
            const templateData = this.templates.get(templateKey);
            
            if (!templateData) {
                // Fallback to basic template
                return {
                    subject: `PersonaChain Notification: ${type}`,
                    message: `Notification Type: ${type}\n\nData: ${JSON.stringify(data, null, 2)}`,
                    htmlMessage: null,
                    metadata: { template: 'fallback' }
                };
            }
            
            // Replace template variables
            const subject = this.replacePlaceholders(templateData.subject, data);
            const message = this.replacePlaceholders(templateData.message, data);
            const htmlMessage = templateData.htmlMessage 
                ? this.replacePlaceholders(templateData.htmlMessage, data)
                : null;
            
            return {
                subject,
                message,
                htmlMessage,
                metadata: { template: templateKey }
            };
            
        } catch (error) {
            this.logger.error('Failed to generate notification content', { error: error.message });
            throw error;
        }
    }
    
    replacePlaceholders(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }
    
    getDefaultTemplate(type, channel) {
        return `${type}_${channel}`;
    }
    
    async getGuardianNotificationPreferences(guardians) {
        // Mock implementation - integrate with GuardianManagementService
        return guardians.map(guardianId => ({
            guardianId,
            preferences: {
                [this.channels.EMAIL]: true,
                [this.channels.SMS]: false,
                [this.channels.SLACK]: true,
                [this.channels.DISCORD]: false,
                [this.channels.WEBHOOK]: false
            }
        }));
    }
    
    async getRecipientContactInfo(recipientId) {
        // Mock implementation - integrate with GuardianManagementService
        return {
            email: `${recipientId}@example.com`,
            phone: '+1234567890',
            webhookUrl: null
        };
    }
    
    async getAllActiveGuardians() {
        // Mock implementation - integrate with GuardianManagementService
        return ['guardian_1', 'guardian_2', 'guardian_3'];
    }
    
    async getAdminGuardians() {
        // Mock implementation - integrate with GuardianManagementService
        return ['guardian_admin_1', 'guardian_admin_2'];
    }
    
    async queueForRetry(notification) {
        const retryTime = Date.now() + (notification.retryDelay * notification.retryCount);
        
        setTimeout(async () => {
            try {
                await this.sendNotification(notification);
            } catch (error) {
                if (notification.retryCount < notification.maxRetries) {
                    await this.queueForRetry(notification);
                } else {
                    notification.status = this.statuses.FAILED;
                    this.logger.error('Notification failed after max retries', {
                        id: notification.id,
                        retryCount: notification.retryCount
                    });
                }
            }
        }, notification.retryDelay);
    }
    
    getEmailPriority(priority) {
        const priorityMap = {
            [this.priorities.LOW]: '5',
            [this.priorities.NORMAL]: '3',
            [this.priorities.HIGH]: '2',
            [this.priorities.URGENT]: '1',
            [this.priorities.CRITICAL]: '1'
        };
        
        return priorityMap[priority] || '3';
    }
    
    getSlackColor(priority) {
        const colorMap = {
            [this.priorities.LOW]: '#36a64f',      // green
            [this.priorities.NORMAL]: '#2eb886',   // teal
            [this.priorities.HIGH]: '#ff9500',     // orange
            [this.priorities.URGENT]: '#e01e5a',   // red
            [this.priorities.CRITICAL]: '#a30200'  // dark red
        };
        
        return colorMap[priority] || '#2eb886';
    }
    
    getDiscordColor(priority) {
        const colorMap = {
            [this.priorities.LOW]: 0x57F287,      // green
            [this.priorities.NORMAL]: 0x5865F2,   // blurple
            [this.priorities.HIGH]: 0xFEE75C,     // yellow
            [this.priorities.URGENT]: 0xED4245,   // red
            [this.priorities.CRITICAL]: 0x992D22  // dark red
        };
        
        return colorMap[priority] || 0x5865F2;
    }
    
    /**
     * Get notification status
     */
    async getNotificationStatus(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            return null;
        }
        
        return {
            id: notification.id,
            type: notification.type,
            channel: notification.channel,
            recipient: notification.recipient,
            status: notification.status,
            createdAt: notification.createdAt,
            sentAt: notification.sentAt,
            deliveredAt: notification.deliveredAt,
            retryCount: notification.retryCount,
            tracking: notification.tracking
        };
    }
    
    /**
     * Get notification statistics
     */
    async getNotificationStatistics(timeRange = '24h') {
        try {
            const now = new Date();
            let startTime;
            
            switch (timeRange) {
                case '1h':
                    startTime = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '24h':
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }
            
            const notifications = Array.from(this.notifications.values())
                .filter(n => new Date(n.createdAt) >= startTime);
            
            const statistics = {
                timeRange,
                totalNotifications: notifications.length,
                byStatus: {},
                byChannel: {},
                byType: {},
                byPriority: {},
                successRate: 0,
                averageDeliveryTime: 0
            };
            
            // Calculate statistics
            let successCount = 0;
            let totalDeliveryTime = 0;
            let deliveredCount = 0;
            
            for (const notification of notifications) {
                // By status
                statistics.byStatus[notification.status] = 
                    (statistics.byStatus[notification.status] || 0) + 1;
                
                // By channel
                statistics.byChannel[notification.channel] = 
                    (statistics.byChannel[notification.channel] || 0) + 1;
                
                // By type
                statistics.byType[notification.type] = 
                    (statistics.byType[notification.type] || 0) + 1;
                
                // By priority
                statistics.byPriority[notification.priority] = 
                    (statistics.byPriority[notification.priority] || 0) + 1;
                
                // Success rate
                if (notification.status === this.statuses.SENT || 
                    notification.status === this.statuses.DELIVERED) {
                    successCount++;
                }
                
                // Delivery time
                if (notification.sentAt) {
                    const deliveryTime = new Date(notification.sentAt) - new Date(notification.createdAt);
                    totalDeliveryTime += deliveryTime;
                    deliveredCount++;
                }
            }
            
            statistics.successRate = notifications.length > 0 
                ? Math.round((successCount / notifications.length) * 100)
                : 0;
            
            statistics.averageDeliveryTime = deliveredCount > 0
                ? Math.round(totalDeliveryTime / deliveredCount)
                : 0;
            
            return statistics;
            
        } catch (error) {
            this.logger.error('Failed to get notification statistics', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const recentNotifications = Array.from(this.notifications.values())
                .filter(n => {
                    const notificationTime = new Date(n.createdAt).getTime();
                    const oneHourAgo = Date.now() - (60 * 60 * 1000);
                    return notificationTime >= oneHourAgo;
                }).length;
            
            const failedNotifications = Array.from(this.notifications.values())
                .filter(n => n.status === this.statuses.FAILED).length;
                
            return {
                status: 'healthy',
                totalNotifications: this.notifications.size,
                recentNotifications,
                failedNotifications,
                queueSize: this.notificationQueue.size,
                templates: this.templates.size,
                channels: Object.keys(this.channels),
                configuration: this.notificationConfig,
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