/**
 * Billing Integration Service
 * Comprehensive billing and subscription management with multiple payment providers
 * Enterprise-grade billing platform with usage-based pricing and invoicing
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import validator from 'validator';

class BillingIntegrationService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });
    this.redis = null;
    this.subscriptions = new Map();
    this.invoices = new Map();
    this.payments = new Map();
    this.usageRecords = new Map();
    this.billingPlans = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'billing-integration' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/billing-integration.log' })
      ]
    });

    // Payment providers configuration
    this.paymentProviders = {
      STRIPE: {
        name: 'Stripe',
        supportedMethods: ['card', 'bank_transfer', 'ach', 'sepa'],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
        features: ['subscriptions', 'usage_billing', 'invoicing', 'tax'],
        webhookEvents: ['payment_succeeded', 'payment_failed', 'subscription_updated']
      },
      PAYPAL: {
        name: 'PayPal',
        supportedMethods: ['paypal', 'card'],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        features: ['subscriptions', 'one_time_payments'],
        webhookEvents: ['payment_completed', 'subscription_cancelled']
      },
      ADYEN: {
        name: 'Adyen',
        supportedMethods: ['card', 'bank_transfer', 'wallet', 'local_payment'],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'INR', 'BRL'],
        features: ['global_payments', 'fraud_detection', 'data_insights'],
        webhookEvents: ['payment_authorized', 'payment_captured', 'payment_refused']
      },
      SQUARE: {
        name: 'Square',
        supportedMethods: ['card', 'cash_app', 'apple_pay', 'google_pay'],
        supportedCurrencies: ['USD', 'CAD', 'AUD', 'GBP', 'EUR'],
        features: ['in_person', 'online', 'invoicing'],
        webhookEvents: ['payment_updated', 'invoice_payment_made']
      }
    };

    // Billing plans and pricing tiers
    this.pricingPlans = {
      STARTUP: {
        id: 'startup',
        name: 'Startup',
        description: 'Perfect for small teams getting started',
        monthlyPrice: 29.00,
        yearlyPrice: 290.00,
        currency: 'USD',
        features: {
          maxUsers: 25,
          maxStorage: 10, // GB
          maxApiCalls: 10000,
          support: 'email',
          customBranding: false,
          analytics: 'basic',
          integrations: 5
        },
        usageLimits: {
          apiCalls: { included: 10000, overage: 0.001 },
          storage: { included: 10, overage: 0.50 },
          users: { included: 25, overage: 2.00 }
        }
      },
      BUSINESS: {
        id: 'business',
        name: 'Business',
        description: 'Ideal for growing businesses',
        monthlyPrice: 99.00,
        yearlyPrice: 990.00,
        currency: 'USD',
        features: {
          maxUsers: 100,
          maxStorage: 100, // GB
          maxApiCalls: 100000,
          support: 'priority',
          customBranding: true,
          analytics: 'advanced',
          integrations: 20
        },
        usageLimits: {
          apiCalls: { included: 100000, overage: 0.0005 },
          storage: { included: 100, overage: 0.30 },
          users: { included: 100, overage: 1.50 }
        }
      },
      ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'For large organizations with complex needs',
        monthlyPrice: 499.00,
        yearlyPrice: 4990.00,
        currency: 'USD',
        features: {
          maxUsers: 'unlimited',
          maxStorage: 1000, // GB
          maxApiCalls: 1000000,
          support: 'dedicated',
          customBranding: true,
          analytics: 'enterprise',
          integrations: 'unlimited'
        },
        usageLimits: {
          apiCalls: { included: 1000000, overage: 0.0003 },
          storage: { included: 1000, overage: 0.20 },
          users: { included: 'unlimited', overage: 0 }
        }
      },
      CUSTOM: {
        id: 'custom',
        name: 'Custom Enterprise',
        description: 'Tailored solutions for specific requirements',
        monthlyPrice: 'custom',
        yearlyPrice: 'custom',
        currency: 'USD',
        features: {
          maxUsers: 'custom',
          maxStorage: 'custom',
          maxApiCalls: 'custom',
          support: 'white_glove',
          customBranding: true,
          analytics: 'custom',
          integrations: 'custom'
        },
        usageLimits: {
          apiCalls: { included: 'custom', overage: 'negotiated' },
          storage: { included: 'custom', overage: 'negotiated' },
          users: { included: 'custom', overage: 'negotiated' }
        }
      }
    };

    // Billing cycles and frequencies
    this.billingCycles = {
      MONTHLY: { name: 'Monthly', interval: 1, unit: 'month', discount: 0 },
      QUARTERLY: { name: 'Quarterly', interval: 3, unit: 'month', discount: 0.05 },
      YEARLY: { name: 'Yearly', interval: 1, unit: 'year', discount: 0.15 },
      BIENNIAL: { name: 'Biennial', interval: 2, unit: 'year', discount: 0.25 }
    };

    // Tax configuration
    this.taxConfiguration = {
      US: {
        salesTax: true,
        taxRates: {
          'CA': 0.0875, // California
          'NY': 0.08,   // New York
          'TX': 0.0625, // Texas
          'FL': 0.06,   // Florida
          'WA': 0.065   // Washington
        },
        exemptions: ['nonprofit', 'government', 'resale']
      },
      EU: {
        vat: true,
        vatRates: {
          'DE': 0.19,   // Germany
          'FR': 0.20,   // France
          'GB': 0.20,   // United Kingdom
          'IT': 0.22,   // Italy
          'ES': 0.21    // Spain
        },
        reverseCharge: true
      },
      CA: {
        gst: 0.05,
        hst: { 'ON': 0.13, 'NB': 0.15, 'NL': 0.15, 'NS': 0.15, 'PEI': 0.15 },
        pst: { 'BC': 0.07, 'SK': 0.06, 'MB': 0.07, 'QC': 0.09975 }
      }
    };

    // Invoice templates and settings
    this.invoiceSettings = {
      templates: {
        standard: {
          name: 'Standard Invoice',
          format: 'pdf',
          includeTax: true,
          includeUsage: true,
          paymentTerms: 'Net 30'
        },
        simplified: {
          name: 'Simplified Invoice',
          format: 'pdf',
          includeTax: false,
          includeUsage: false,
          paymentTerms: 'Due on receipt'
        },
        detailed: {
          name: 'Detailed Invoice',
          format: 'pdf',
          includeTax: true,
          includeUsage: true,
          includeBreakdown: true,
          paymentTerms: 'Net 15'
        }
      },
      numbering: {
        prefix: 'INV',
        format: 'YYYY-NNNNNN',
        startNumber: 100000
      },
      currency: {
        default: 'USD',
        precision: 2,
        symbol: '$'
      }
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Billing Integration Service...');

      // Initialize Redis for distributed billing management
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for billing integration');
      }

      // Load billing plans
      await this.loadBillingPlans();

      // Initialize payment providers
      await this.initializePaymentProviders();

      // Setup billing schedules
      await this.setupBillingSchedules();

      // Initialize usage tracking
      await this.initializeUsageTracking();

      // Setup invoice generation
      await this.setupInvoiceGeneration();

      this.logger.info('Billing Integration Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Billing Integration Service:', error);
      throw error;
    }
  }

  async createSubscription(params, subscriptionData, query, req) {
    try {
      const { tenantId } = params;
      const {
        planId,
        billingCycle = 'MONTHLY',
        paymentMethod,
        billingAddress,
        startDate = DateTime.now().toISO(),
        trialDays = 0,
        customPricing = {},
        metadata = {}
      } = subscriptionData;

      const subscriptionId = crypto.randomUUID();

      this.logger.info(`Creating subscription for tenant: ${tenantId}`, {
        subscriptionId,
        planId,
        billingCycle
      });

      // Validate plan and pricing
      const plan = this.pricingPlans[planId];
      if (!plan) {
        throw new Error(`Invalid pricing plan: ${planId}`);
      }

      // Calculate pricing based on cycle
      const pricing = this.calculateSubscriptionPricing(plan, billingCycle, customPricing);

      // Create subscription object
      const subscription = {
        id: subscriptionId,
        tenantId,
        planId,
        status: trialDays > 0 ? 'trialing' : 'active',
        
        // Billing configuration
        billing: {
          cycle: billingCycle,
          currency: plan.currency,
          amount: pricing.amount,
          discount: pricing.discount,
          tax: pricing.tax,
          total: pricing.total
        },
        
        // Dates and timeline
        dates: {
          created: DateTime.now().toISO(),
          started: startDate,
          trialEnd: trialDays > 0 ? DateTime.fromISO(startDate).plus({ days: trialDays }).toISO() : null,
          currentPeriodStart: startDate,
          currentPeriodEnd: this.calculatePeriodEnd(startDate, billingCycle),
          nextBilling: this.calculateNextBilling(startDate, billingCycle, trialDays)
        },
        
        // Payment information
        payment: {
          method: paymentMethod,
          provider: this.detectPaymentProvider(paymentMethod),
          billingAddress,
          lastPayment: null,
          failedAttempts: 0
        },
        
        // Usage tracking
        usage: {
          current: {
            apiCalls: 0,
            storage: 0,
            users: 0
          },
          limits: plan.features,
          usageLimits: plan.usageLimits,
          overageCharges: []
        },
        
        // Features and limits
        features: { ...plan.features, ...customPricing.features },
        
        // Metadata and tracking
        metadata: {
          ...metadata,
          createdBy: req.user?.id || 'system',
          source: 'api',
          version: '1.0.0'
        },
        
        // Billing history
        history: [{
          action: 'subscription_created',
          timestamp: DateTime.now().toISO(),
          details: { planId, billingCycle, amount: pricing.total }
        }]
      };

      // Store subscription
      this.subscriptions.set(subscriptionId, subscription);
      this.cache.set(`subscription:${subscriptionId}`, subscription, 3600);
      this.cache.set(`tenant_subscription:${tenantId}`, subscriptionId, 3600);

      // Store in Redis
      if (this.redis) {
        await this.redis.setex(
          `subscription:${subscriptionId}`,
          3600,
          JSON.stringify(subscription)
        );
        await this.redis.setex(
          `tenant_subscription:${tenantId}`,
          3600,
          subscriptionId
        );
      }

      // Setup billing schedule
      await this.scheduleBilling(subscription);

      // Create initial invoice if not in trial
      if (trialDays === 0) {
        await this.generateInitialInvoice(subscription);
      }

      this.logger.info(`Subscription created successfully`, {
        subscriptionId,
        tenantId,
        planId,
        total: pricing.total
      });

      return {
        subscriptionId,
        tenantId,
        planId,
        status: subscription.status,
        billing: subscription.billing,
        dates: subscription.dates,
        features: subscription.features,
        nextBilling: subscription.dates.nextBilling
      };

    } catch (error) {
      this.logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  async getSubscription(params, body, query, req) {
    try {
      const { tenantId } = params;
      
      this.logger.info(`Retrieving subscription for tenant: ${tenantId}`);

      // Check cache for tenant subscription
      let subscriptionId = this.cache.get(`tenant_subscription:${tenantId}`);
      
      if (!subscriptionId && this.redis) {
        subscriptionId = await this.redis.get(`tenant_subscription:${tenantId}`);
        if (subscriptionId) {
          this.cache.set(`tenant_subscription:${tenantId}`, subscriptionId, 3600);
        }
      }

      if (!subscriptionId) {
        throw new Error(`No subscription found for tenant: ${tenantId}`);
      }

      // Get subscription details
      let subscription = this.cache.get(`subscription:${subscriptionId}`);
      
      if (!subscription) {
        if (this.redis) {
          const subData = await this.redis.get(`subscription:${subscriptionId}`);
          if (subData) {
            subscription = JSON.parse(subData);
            this.cache.set(`subscription:${subscriptionId}`, subscription, 3600);
          }
        }
        
        if (!subscription) {
          subscription = this.subscriptions.get(subscriptionId);
        }
      }

      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      // Calculate current usage and charges
      const currentUsage = await this.calculateCurrentUsage(tenantId);
      const overageCharges = this.calculateOverageCharges(subscription, currentUsage);
      const nextInvoicePreview = await this.previewNextInvoice(subscription);

      // Get recent invoices
      const recentInvoices = await this.getRecentInvoices(subscriptionId, 5);

      // Get payment history
      const paymentHistory = await this.getPaymentHistory(subscriptionId, 10);

      const enrichedSubscription = {
        ...subscription,
        currentUsage,
        overageCharges,
        nextInvoicePreview,
        recentInvoices,
        paymentHistory,
        healthStatus: this.calculateSubscriptionHealth(subscription),
        recommendations: this.generateBillingRecommendations(subscription, currentUsage)
      };

      return enrichedSubscription;

    } catch (error) {
      this.logger.error('Error retrieving subscription:', error);
      throw error;
    }
  }

  async updateSubscription(params, updateData, query, req) {
    try {
      const { tenantId } = params;
      
      this.logger.info(`Updating subscription for tenant: ${tenantId}`, updateData);

      // Get current subscription
      const subscriptionId = this.cache.get(`tenant_subscription:${tenantId}`);
      if (!subscriptionId) {
        throw new Error(`No subscription found for tenant: ${tenantId}`);
      }

      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      // Validate update
      this.validateSubscriptionUpdate(updateData, subscription);

      // Calculate proration if plan change
      let prorationCredit = 0;
      let prorationCharge = 0;
      
      if (updateData.planId && updateData.planId !== subscription.planId) {
        const proration = this.calculateProration(subscription, updateData.planId);
        prorationCredit = proration.credit;
        prorationCharge = proration.charge;
      }

      // Apply updates
      const updatedSubscription = {
        ...subscription,
        ...updateData,
        metadata: {
          ...subscription.metadata,
          lastModified: DateTime.now().toISO(),
          lastModifiedBy: req.user?.id || 'system',
          version: this.incrementVersion(subscription.metadata.version)
        }
      };

      // Update billing if plan changed
      if (updateData.planId) {
        const newPlan = this.pricingPlans[updateData.planId];
        const newPricing = this.calculateSubscriptionPricing(newPlan, subscription.billing.cycle);
        
        updatedSubscription.billing = {
          ...subscription.billing,
          amount: newPricing.amount,
          total: newPricing.total
        };
        
        updatedSubscription.features = newPlan.features;
        updatedSubscription.usage.limits = newPlan.features;
        updatedSubscription.usage.usageLimits = newPlan.usageLimits;
      }

      // Add history entry
      updatedSubscription.history.push({
        action: 'subscription_updated',
        timestamp: DateTime.now().toISO(),
        details: {
          changes: Object.keys(updateData),
          prorationCredit,
          prorationCharge,
          previousPlan: subscription.planId,
          newPlan: updateData.planId
        }
      });

      // Update stores
      this.subscriptions.set(subscriptionId, updatedSubscription);
      this.cache.set(`subscription:${subscriptionId}`, updatedSubscription, 3600);

      if (this.redis) {
        await this.redis.setex(
          `subscription:${subscriptionId}`,
          3600,
          JSON.stringify(updatedSubscription)
        );
      }

      // Generate proration invoice if needed
      if (prorationCredit > 0 || prorationCharge > 0) {
        await this.generateProrationInvoice(updatedSubscription, prorationCredit, prorationCharge);
      }

      this.logger.info(`Subscription updated successfully`, {
        subscriptionId,
        tenantId,
        changes: Object.keys(updateData)
      });

      return {
        subscriptionId,
        tenantId,
        status: 'updated',
        changes: Object.keys(updateData),
        prorationCredit,
        prorationCharge,
        version: updatedSubscription.metadata.version,
        nextBilling: updatedSubscription.dates.nextBilling
      };

    } catch (error) {
      this.logger.error('Error updating subscription:', error);
      throw error;
    }
  }

  async generateInvoice(params, invoiceData, query, req) {
    try {
      const { tenantId } = params;
      const {
        type = 'subscription',
        items = [],
        dueDate,
        template = 'standard',
        sendEmail = true
      } = invoiceData;

      const invoiceId = crypto.randomUUID();

      this.logger.info(`Generating invoice for tenant: ${tenantId}`, {
        invoiceId,
        type,
        template
      });

      // Get subscription if subscription invoice
      let subscription = null;
      if (type === 'subscription') {
        const subscriptionId = this.cache.get(`tenant_subscription:${tenantId}`);
        if (subscriptionId) {
          subscription = this.subscriptions.get(subscriptionId);
        }
      }

      // Calculate invoice details
      const invoiceCalculation = await this.calculateInvoiceAmount(
        tenantId,
        type,
        items,
        subscription
      );

      // Generate invoice number
      const invoiceNumber = this.generateInvoiceNumber();

      // Create invoice object
      const invoice = {
        id: invoiceId,
        number: invoiceNumber,
        tenantId,
        subscriptionId: subscription?.id || null,
        type,
        status: 'draft',
        
        // Invoice details
        details: {
          description: this.generateInvoiceDescription(type, subscription),
          items: invoiceCalculation.items,
          subtotal: invoiceCalculation.subtotal,
          tax: invoiceCalculation.tax,
          discount: invoiceCalculation.discount,
          total: invoiceCalculation.total,
          currency: subscription?.billing.currency || 'USD'
        },
        
        // Dates
        dates: {
          created: DateTime.now().toISO(),
          issued: DateTime.now().toISO(),
          due: dueDate || DateTime.now().plus({ days: 30 }).toISO(),
          periodStart: subscription?.dates.currentPeriodStart || DateTime.now().toISO(),
          periodEnd: subscription?.dates.currentPeriodEnd || DateTime.now().toISO()
        },
        
        // Payment information
        payment: {
          method: subscription?.payment.method || null,
          provider: subscription?.payment.provider || null,
          status: 'pending',
          attempts: 0,
          lastAttempt: null
        },
        
        // Template and formatting
        template,
        
        // Metadata
        metadata: {
          createdBy: req.user?.id || 'system',
          source: 'api',
          version: '1.0.0'
        }
      };

      // Store invoice
      this.invoices.set(invoiceId, invoice);
      this.cache.set(`invoice:${invoiceId}`, invoice, 3600);

      // Add to tenant invoice list
      const tenantInvoices = this.cache.get(`tenant_invoices:${tenantId}`) || [];
      tenantInvoices.unshift(invoiceId);
      this.cache.set(`tenant_invoices:${tenantId}`, tenantInvoices, 3600);

      // Generate PDF
      const pdfFile = await this.generateInvoicePDF(invoice);
      invoice.pdfFile = pdfFile;

      // Send email if requested
      if (sendEmail) {
        await this.sendInvoiceEmail(invoice);
      }

      // Finalize invoice
      invoice.status = 'sent';
      this.invoices.set(invoiceId, invoice);

      this.logger.info(`Invoice generated successfully`, {
        invoiceId,
        invoiceNumber,
        tenantId,
        total: invoice.details.total
      });

      return {
        invoiceId,
        invoiceNumber,
        tenantId,
        type,
        status: invoice.status,
        total: invoice.details.total,
        currency: invoice.details.currency,
        dueDate: invoice.dates.due,
        downloadUrl: pdfFile.url,
        emailSent: sendEmail
      };

    } catch (error) {
      this.logger.error('Error generating invoice:', error);
      throw error;
    }
  }

  async processPayment(params, paymentData, query, req) {
    try {
      const { tenantId } = params;
      const {
        amount,
        currency = 'USD',
        paymentMethod,
        description,
        invoiceId,
        metadata = {}
      } = paymentData;

      const paymentId = crypto.randomUUID();

      this.logger.info(`Processing payment for tenant: ${tenantId}`, {
        paymentId,
        amount,
        currency,
        invoiceId
      });

      // Validate payment data
      this.validatePaymentData(paymentData);

      // Get invoice if provided
      let invoice = null;
      if (invoiceId) {
        invoice = this.invoices.get(invoiceId);
        if (!invoice) {
          throw new Error(`Invoice not found: ${invoiceId}`);
        }
      }

      // Create payment record
      const payment = {
        id: paymentId,
        tenantId,
        invoiceId,
        status: 'processing',
        
        // Payment details
        amount: parseFloat(amount),
        currency,
        description: description || `Payment for ${tenantId}`,
        
        // Payment method
        method: {
          type: paymentMethod.type,
          provider: this.detectPaymentProvider(paymentMethod),
          details: this.sanitizePaymentMethod(paymentMethod)
        },
        
        // Processing information
        processing: {
          startedAt: DateTime.now().toISO(),
          attempts: 1,
          provider: this.selectPaymentProvider(paymentMethod, currency),
          transactionId: null,
          providerResponse: null
        },
        
        // Metadata
        metadata: {
          ...metadata,
          createdBy: req.user?.id || 'system',
          source: 'api',
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      };

      // Store payment record
      this.payments.set(paymentId, payment);
      this.cache.set(`payment:${paymentId}`, payment, 3600);

      // Process payment with provider
      const providerResult = await this.processPaymentWithProvider(payment);

      // Update payment with result
      payment.status = providerResult.status;
      payment.processing.completedAt = DateTime.now().toISO();
      payment.processing.transactionId = providerResult.transactionId;
      payment.processing.providerResponse = providerResult.response;

      if (providerResult.status === 'succeeded') {
        payment.succeededAt = DateTime.now().toISO();
        
        // Update invoice if applicable
        if (invoice) {
          invoice.payment.status = 'paid';
          invoice.payment.paidAt = DateTime.now().toISO();
          invoice.payment.paymentId = paymentId;
          invoice.status = 'paid';
          this.invoices.set(invoiceId, invoice);
        }
        
        // Update subscription if applicable
        await this.updateSubscriptionPayment(tenantId, payment);
      } else if (providerResult.status === 'failed') {
        payment.failedAt = DateTime.now().toISO();
        payment.failureReason = providerResult.error;
        
        // Handle payment failure
        await this.handlePaymentFailure(tenantId, payment, invoice);
      }

      // Update payment record
      this.payments.set(paymentId, payment);
      this.cache.set(`payment:${paymentId}`, payment, 3600);

      this.logger.info(`Payment processing completed`, {
        paymentId,
        tenantId,
        status: payment.status,
        amount: payment.amount
      });

      return {
        paymentId,
        tenantId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        transactionId: payment.processing.transactionId,
        processedAt: payment.processing.completedAt,
        ...(payment.status === 'failed' && { 
          failureReason: payment.failureReason 
        })
      };

    } catch (error) {
      this.logger.error('Error processing payment:', error);
      throw error;
    }
  }

  async calculateUsageCharges(params, body, query, req) {
    try {
      const { tenantId } = params;
      const { 
        period = 'current',
        includeProjections = false 
      } = query;

      this.logger.info(`Calculating usage charges for tenant: ${tenantId}`, {
        period,
        includeProjections
      });

      // Get subscription
      const subscriptionId = this.cache.get(`tenant_subscription:${tenantId}`);
      if (!subscriptionId) {
        throw new Error(`No subscription found for tenant: ${tenantId}`);
      }

      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      // Calculate period dates
      const periodDates = this.calculatePeriodDates(period, subscription);

      // Get usage data for period
      const usageData = await this.getUsageDataForPeriod(tenantId, periodDates);

      // Calculate charges
      const charges = this.calculateChargesFromUsage(subscription, usageData);

      // Calculate projections if requested
      let projections = null;
      if (includeProjections) {
        projections = await this.calculateUsageProjections(tenantId, subscription, usageData);
      }

      // Generate detailed breakdown
      const breakdown = {
        period: {
          start: periodDates.start,
          end: periodDates.end,
          type: period
        },
        subscription: {
          plan: subscription.planId,
          baseAmount: subscription.billing.amount,
          includedLimits: subscription.usage.usageLimits
        },
        usage: usageData,
        charges: {
          base: subscription.billing.amount,
          overages: charges.overageCharges,
          total: charges.total,
          breakdown: charges.breakdown
        },
        projections
      };

      return breakdown;

    } catch (error) {
      this.logger.error('Error calculating usage charges:', error);
      throw error;
    }
  }

  // Helper methods
  calculateSubscriptionPricing(plan, billingCycle, customPricing = {}) {
    const cycle = this.billingCycles[billingCycle];
    let baseAmount = cycle.unit === 'year' ? plan.yearlyPrice : plan.monthlyPrice;
    
    if (customPricing.amount) {
      baseAmount = customPricing.amount;
    }

    const discount = baseAmount * cycle.discount;
    const discountedAmount = baseAmount - discount;
    const tax = discountedAmount * (customPricing.taxRate || 0.08); // Default 8% tax
    const total = discountedAmount + tax;

    return {
      amount: baseAmount,
      discount,
      discountedAmount,
      tax,
      total,
      cycle: billingCycle
    };
  }

  calculatePeriodEnd(startDate, billingCycle) {
    const cycle = this.billingCycles[billingCycle];
    return DateTime.fromISO(startDate)
      .plus({ [cycle.unit]: cycle.interval })
      .toISO();
  }

  calculateNextBilling(startDate, billingCycle, trialDays = 0) {
    const cycle = this.billingCycles[billingCycle];
    let baseDate = DateTime.fromISO(startDate);
    
    if (trialDays > 0) {
      baseDate = baseDate.plus({ days: trialDays });
    }
    
    return baseDate.plus({ [cycle.unit]: cycle.interval }).toISO();
  }

  detectPaymentProvider(paymentMethod) {
    if (paymentMethod.stripe_token || paymentMethod.stripe_payment_method) {
      return 'STRIPE';
    } else if (paymentMethod.paypal_order_id || paymentMethod.paypal_subscription_id) {
      return 'PAYPAL';
    } else if (paymentMethod.adyen_token) {
      return 'ADYEN';
    } else if (paymentMethod.square_token) {
      return 'SQUARE';
    }
    return 'UNKNOWN';
  }

  generateInvoiceNumber() {
    const settings = this.invoiceSettings.numbering;
    const year = DateTime.now().year;
    const sequence = this.getNextInvoiceSequence();
    return `${settings.prefix}-${year}-${sequence.toString().padStart(6, '0')}`;
  }

  getNextInvoiceSequence() {
    // Mock sequence generation - in production, use database sequence
    return Math.floor(Math.random() * 900000) + 100000;
  }

  validatePaymentData(data) {
    const required = ['amount', 'paymentMethod'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required payment fields: ${missing.join(', ')}`);
    }

    if (!validator.isFloat(data.amount.toString(), { min: 0.01 })) {
      throw new Error('Invalid payment amount');
    }
  }

  sanitizePaymentMethod(method) {
    // Remove sensitive data from payment method for storage
    const sanitized = { ...method };
    delete sanitized.card_number;
    delete sanitized.cvv;
    delete sanitized.account_number;
    delete sanitized.routing_number;
    return sanitized;
  }

  async loadBillingPlans() {
    this.logger.info('Loading billing plans');
  }

  async initializePaymentProviders() {
    this.logger.info('Initializing payment providers');
  }

  async setupBillingSchedules() {
    this.logger.info('Setting up billing schedules');
  }

  async initializeUsageTracking() {
    this.logger.info('Initializing usage tracking');
  }

  async setupInvoiceGeneration() {
    this.logger.info('Setting up invoice generation');
  }

  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        timestamp: DateTime.now().toISO(),
        cache: {
          keys: this.cache.keys().length,
          stats: this.cache.getStats()
        },
        billing: {
          subscriptions: this.subscriptions.size,
          invoices: this.invoices.size,
          payments: this.payments.size,
          plans: Object.keys(this.pricingPlans).length
        }
      };

      if (this.redis) {
        await this.redis.ping();
        health.redis = { status: 'connected' };
      }

      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: DateTime.now().toISO()
      };
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down Billing Integration Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.subscriptions.clear();
      this.invoices.clear();
      this.payments.clear();
      this.usageRecords.clear();
      this.billingPlans.clear();

      this.logger.info('Billing Integration Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default BillingIntegrationService;