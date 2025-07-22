/**
 * 💰 COMPREHENSIVE PAYMENT SYSTEM SERVICE
 * Multi-tier subscription system with Persona token integration
 * Supports API-based pricing and unlimited subscription models
 */

// 🎯 Payment Models
export type PaymentModel = 'per-api' | 'subscription' | 'freemium' | 'enterprise';
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise' | 'unlimited';
export type PaymentMethod = 'stripe' | 'persona-token' | 'crypto' | 'bank-transfer';

// 🏷️ Subscription Plans
export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  description: string;
  pricing: {
    monthly: number;
    annually: number;
    currency: 'USD' | 'PERSONA';
    discount?: number; // Annual discount percentage
  };
  limits: {
    apiCallsPerMonth: number; // -1 for unlimited
    premiumAPIs: boolean;
    realWorldAPIs: boolean;
    compliance: string[];
    supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
    dataRetention: number; // days
  };
  features: string[];
  popular?: boolean;
  businessFeatures?: string[];
}

// 💳 Payment Information
export interface PaymentInfo {
  method: PaymentMethod;
  stripeCustomerId?: string;
  personaTokenBalance?: number;
  subscriptionId?: string;
  lastPayment?: {
    date: string;
    amount: number;
    currency: string;
    status: 'completed' | 'pending' | 'failed';
  };
}

// 📊 Usage Analytics
export interface UsageAnalytics {
  currentPeriod: {
    startDate: string;
    endDate: string;
    apiCallsUsed: number;
    apiCallsLimit: number;
    costIncurred: number;
    personaTokensSpent: number;
  };
  breakdown: {
    [provider: string]: {
      calls: number;
      cost: number;
      lastUsed: string;
    };
  };
  projectedUsage: {
    monthlyEstimate: number;
    costEstimate: number;
    recommendedTier?: SubscriptionTier;
  };
}

// 🎫 Persona Token Configuration
export interface PersonaTokenConfig {
  symbol: 'PERSONA';
  decimals: 18;
  contractAddress: string;
  exchangeRate: {
    usdToPersona: number;
    personaToUsd: number;
    lastUpdated: string;
  };
  stakingRewards: {
    apy: number;
    minimumStake: number;
    lockupPeriod: number; // days
  };
  governance: {
    votingPower: boolean;
    proposalThreshold: number;
  };
}

// 💰 API Pricing Configuration
export interface APIPricingConfig {
  [provider: string]: {
    baseCost: number; // Cost in USD cents
    personaMarkup: number; // Our markup percentage
    tierDiscounts: {
      [tier in SubscriptionTier]?: number; // Discount percentage
    };
    bulkDiscounts: {
      threshold: number;
      discount: number;
    }[];
  };
}

/**
 * 💰 COMPREHENSIVE PAYMENT SYSTEM SERVICE
 * Manages subscriptions, tokens, and API pricing
 */
export class PaymentSystemService {
  private subscriptionPlans: SubscriptionPlan[] = [];
  private apiPricing: APIPricingConfig = {};
  private personaTokenConfig: PersonaTokenConfig;
  private currentPlan: SubscriptionPlan | null = null;
  private paymentInfo: PaymentInfo | null = null;
  private usageAnalytics: UsageAnalytics | null = null;

  constructor() {
    this.initializeSubscriptionPlans();
    this.initializeAPIPricing();
    this.initializePersonaToken();
    this.loadUserSubscription();
  }

  /**
   * 🎯 Initialize Subscription Plans
   */
  private initializeSubscriptionPlans(): void {
    this.subscriptionPlans = [
      {
        id: 'free',
        name: 'Free Explorer',
        tier: 'free',
        description: 'Perfect for trying out PersonaPass with basic API access',
        pricing: {
          monthly: 0,
          annually: 0,
          currency: 'USD'
        },
        limits: {
          apiCallsPerMonth: 100,
          premiumAPIs: false,
          realWorldAPIs: true,
          compliance: ['Basic'],
          supportLevel: 'community',
          dataRetention: 30
        },
        features: [
          '100 API calls per month',
          'Real-world API access',
          'Community support',
          'Basic compliance tools',
          '30-day data retention'
        ]
      },
      {
        id: 'basic',
        name: 'Basic Professional',
        tier: 'basic',
        description: 'For individuals and small teams getting started with identity verification',
        pricing: {
          monthly: 29,
          annually: 290,
          currency: 'USD',
          discount: 17
        },
        limits: {
          apiCallsPerMonth: 1000,
          premiumAPIs: true,
          realWorldAPIs: true,
          compliance: ['GDPR', 'SOC2'],
          supportLevel: 'email',
          dataRetention: 90
        },
        features: [
          '1,000 API calls per month',
          'Premium API access',
          'Real-world API integrations',
          'GDPR & SOC2 compliance',
          'Email support',
          '90-day data retention',
          'Basic analytics dashboard'
        ]
      },
      {
        id: 'pro',
        name: 'Pro Business',
        tier: 'pro',
        description: 'For growing businesses with higher volume API needs',
        pricing: {
          monthly: 99,
          annually: 990,
          currency: 'USD',
          discount: 17
        },
        limits: {
          apiCallsPerMonth: 10000,
          premiumAPIs: true,
          realWorldAPIs: true,
          compliance: ['GDPR', 'SOC2', 'HIPAA', 'FERPA'],
          supportLevel: 'priority',
          dataRetention: 365
        },
        features: [
          '10,000 API calls per month',
          'All premium & real-world APIs',
          'Full compliance suite (HIPAA, FERPA, GDPR, SOC2)',
          'Priority support',
          '1-year data retention',
          'Advanced analytics & reporting',
          'Custom webhooks',
          'Bulk operations'
        ],
        popular: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise Scale',
        tier: 'enterprise',
        description: 'For large organizations with custom requirements',
        pricing: {
          monthly: 499,
          annually: 4990,
          currency: 'USD',
          discount: 17
        },
        limits: {
          apiCallsPerMonth: 100000,
          premiumAPIs: true,
          realWorldAPIs: true,
          compliance: ['All'],
          supportLevel: 'dedicated',
          dataRetention: -1 // Unlimited
        },
        features: [
          '100,000 API calls per month',
          'Enterprise API access',
          'White-label solutions',
          'All compliance certifications',
          'Dedicated account manager',
          'Unlimited data retention',
          'Custom integrations',
          'SLA guarantees',
          '24/7 phone support'
        ],
        businessFeatures: [
          'On-premise deployment options',
          'Custom compliance requirements',
          'Volume discounts available',
          'Multi-tenant architecture'
        ]
      },
      {
        id: 'unlimited',
        name: 'Unlimited Creator',
        tier: 'unlimited',
        description: 'Unlimited API access paid with Persona tokens',
        pricing: {
          monthly: 150,
          annually: 1500,
          currency: 'PERSONA',
          discount: 17
        },
        limits: {
          apiCallsPerMonth: -1,
          premiumAPIs: true,
          realWorldAPIs: true,
          compliance: ['GDPR', 'SOC2', 'HIPAA'],
          supportLevel: 'priority',
          dataRetention: 365
        },
        features: [
          'Unlimited API calls',
          'Paid in Persona tokens',
          'Staking rewards (12% APY)',
          'Governance voting rights',
          'Token holder benefits',
          'Priority feature access',
          'Community recognition',
          'Exclusive token holder events'
        ]
      }
    ];
  }

  /**
   * 💵 Initialize API Pricing Configuration
   */
  private initializeAPIPricing(): void {
    this.apiPricing = {
      // Healthcare APIs
      'pverify-eligibility': {
        baseCost: 25, // $0.25
        personaMarkup: 15, // 15% markup
        tierDiscounts: {
          'basic': 5,
          'pro': 10,
          'enterprise': 20,
          'unlimited': 25
        },
        bulkDiscounts: [
          { threshold: 1000, discount: 5 },
          { threshold: 10000, discount: 10 },
          { threshold: 50000, discount: 15 }
        ]
      },
      'trulioo-healthcare': {
        baseCost: 150, // $1.50
        personaMarkup: 12,
        tierDiscounts: {
          'basic': 5,
          'pro': 10,
          'enterprise': 18,
          'unlimited': 22
        },
        bulkDiscounts: [
          { threshold: 100, discount: 3 },
          { threshold: 1000, discount: 8 },
          { threshold: 10000, discount: 12 }
        ]
      },
      'epic-fhir': {
        baseCost: 10, // $0.10
        personaMarkup: 20,
        tierDiscounts: {
          'pro': 8,
          'enterprise': 15,
          'unlimited': 20
        },
        bulkDiscounts: [
          { threshold: 5000, discount: 5 },
          { threshold: 25000, discount: 10 }
        ]
      },

      // Education APIs
      'measureone-education': {
        baseCost: 300, // $3.00
        personaMarkup: 10,
        tierDiscounts: {
          'basic': 5,
          'pro': 12,
          'enterprise': 20,
          'unlimited': 25
        },
        bulkDiscounts: [
          { threshold: 50, discount: 5 },
          { threshold: 500, discount: 10 }
        ]
      },
      'microsoft-education': {
        baseCost: 5, // $0.05
        personaMarkup: 25,
        tierDiscounts: {
          'basic': 10,
          'pro': 15,
          'enterprise': 25,
          'unlimited': 30
        },
        bulkDiscounts: [
          { threshold: 10000, discount: 8 },
          { threshold: 100000, discount: 15 }
        ]
      },

      // Government APIs
      'id-me-identity': {
        baseCost: 200, // $2.00
        personaMarkup: 15,
        tierDiscounts: {
          'basic': 5,
          'pro': 10,
          'enterprise': 18,
          'unlimited': 22
        },
        bulkDiscounts: [
          { threshold: 100, discount: 5 },
          { threshold: 1000, discount: 12 }
        ]
      },
      'apisetu-india': {
        baseCost: 2, // $0.02
        personaMarkup: 30,
        tierDiscounts: {
          'basic': 10,
          'pro': 15,
          'enterprise': 25,
          'unlimited': 30
        },
        bulkDiscounts: [
          { threshold: 10000, discount: 10 },
          { threshold: 100000, discount: 20 }
        ]
      },

      // Financial APIs
      'plaid-enhanced': {
        baseCost: 60, // $0.60
        personaMarkup: 12,
        tierDiscounts: {
          'basic': 5,
          'pro': 10,
          'enterprise': 15,
          'unlimited': 20
        },
        bulkDiscounts: [
          { threshold: 1000, discount: 8 },
          { threshold: 10000, discount: 15 }
        ]
      },
      'yodlee-financial': {
        baseCost: 250, // $2.50 per active user
        personaMarkup: 8,
        tierDiscounts: {
          'pro': 10,
          'enterprise': 18,
          'unlimited': 22
        },
        bulkDiscounts: [
          { threshold: 100, discount: 5 },
          { threshold: 1000, discount: 12 }
        ]
      }
    };
  }

  /**
   * 🎫 Initialize Persona Token Configuration
   */
  private initializePersonaToken(): void {
    this.personaTokenConfig = {
      symbol: 'PERSONA',
      decimals: 18,
      contractAddress: 'persona1nc5tatafv6eyq7llkr2gv50ff9e22mnf70qgjlv737ktmt4eswrqrr2r7y',
      exchangeRate: {
        usdToPersona: 0.1, // 1 USD = 10 PERSONA tokens
        personaToUsd: 10, // 1 PERSONA = $0.10
        lastUpdated: new Date().toISOString()
      },
      stakingRewards: {
        apy: 12, // 12% annual percentage yield
        minimumStake: 1000, // Minimum 1000 PERSONA tokens
        lockupPeriod: 90 // 90 days lock-up period
      },
      governance: {
        votingPower: true,
        proposalThreshold: 10000 // Need 10,000 PERSONA to create proposals
      }
    };
  }

  /**
   * 📋 Get All Subscription Plans
   */
  getSubscriptionPlans(): SubscriptionPlan[] {
    return this.subscriptionPlans;
  }

  /**
   * 🎯 Get Current Subscription Plan
   */
  getCurrentPlan(): SubscriptionPlan | null {
    return this.currentPlan;
  }

  /**
   * 💰 Calculate API Call Cost
   */
  calculateAPICallCost(
    apiId: string, 
    quantity: number = 1, 
    userTier: SubscriptionTier = 'free'
  ): {
    baseCost: number;
    markup: number;
    tierDiscount: number;
    bulkDiscount: number;
    finalCost: number;
    costPerCall: number;
    currency: 'USD' | 'PERSONA';
    savings?: number;
  } {
    const pricing = this.apiPricing[apiId];
    if (!pricing) {
      return {
        baseCost: 0,
        markup: 0,
        tierDiscount: 0,
        bulkDiscount: 0,
        finalCost: 0,
        costPerCall: 0,
        currency: 'USD'
      };
    }

    const baseCost = pricing.baseCost * quantity;
    const markup = (baseCost * pricing.personaMarkup) / 100;
    const grossCost = baseCost + markup;

    // Apply tier discount
    const tierDiscountPercent = pricing.tierDiscounts[userTier] || 0;
    const tierDiscount = (grossCost * tierDiscountPercent) / 100;

    // Apply bulk discount
    let bulkDiscountPercent = 0;
    for (const discount of pricing.bulkDiscounts) {
      if (quantity >= discount.threshold) {
        bulkDiscountPercent = Math.max(bulkDiscountPercent, discount.discount);
      }
    }
    const bulkDiscount = (grossCost * bulkDiscountPercent) / 100;

    const finalCost = Math.max(0, grossCost - tierDiscount - bulkDiscount);
    const costPerCall = finalCost / quantity;

    // Determine currency based on plan
    const currency = userTier === 'unlimited' ? 'PERSONA' : 'USD';
    const personaFinalCost = currency === 'PERSONA' ? 
      finalCost * this.personaTokenConfig.exchangeRate.usdToPersona : 
      finalCost;

    return {
      baseCost,
      markup,
      tierDiscount,
      bulkDiscount,
      finalCost: currency === 'PERSONA' ? personaFinalCost : finalCost,
      costPerCall: currency === 'PERSONA' ? personaFinalCost / quantity : costPerCall,
      currency,
      savings: tierDiscount + bulkDiscount
    };
  }

  /**
   * 🔄 Upgrade/Downgrade Subscription
   */
  async changeSubscription(newPlanId: string, paymentMethod: PaymentMethod): Promise<{
    success: boolean;
    subscriptionId?: string;
    error?: string;
    prorationDetails?: any;
  }> {
    try {
      const newPlan = this.subscriptionPlans.find(plan => plan.id === newPlanId);
      if (!newPlan) {
        throw new Error(`Subscription plan not found: ${newPlanId}`);
      }

      // Calculate proration if changing from existing plan
      const prorationDetails = this.currentPlan ? 
        this.calculateProration(this.currentPlan, newPlan) : null;

      // Process payment based on method
      let subscriptionId: string;
      
      if (paymentMethod === 'stripe') {
        subscriptionId = await this.processStripeSubscription(newPlan, prorationDetails);
      } else if (paymentMethod === 'persona-token') {
        subscriptionId = await this.processPersonaTokenSubscription(newPlan);
      } else {
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      // Update current plan
      this.currentPlan = newPlan;
      this.saveUserSubscription();

      console.log(`✅ Subscription changed to ${newPlan.name}`);

      return {
        success: true,
        subscriptionId,
        prorationDetails
      };

    } catch (error) {
      console.error('❌ Subscription change failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscription change failed'
      };
    }
  }

  /**
   * 💳 Process Stripe Subscription
   */
  private async processStripeSubscription(
    plan: SubscriptionPlan, 
    prorationDetails?: any
  ): Promise<string> {
    // In production, this would integrate with Stripe API
    // For now, we'll create a mock subscription ID
    
    const mockSubscriptionId = `sub_${plan.id}_${Date.now()}`;
    
    console.log('💳 Processing Stripe subscription:', {
      planId: plan.id,
      monthlyPrice: plan.pricing.monthly,
      annualPrice: plan.pricing.annually,
      prorationDetails
    });

    return mockSubscriptionId;
  }

  /**
   * 🎫 Process Persona Token Subscription
   */
  private async processPersonaTokenSubscription(plan: SubscriptionPlan): Promise<string> {
    if (plan.pricing.currency !== 'PERSONA') {
      throw new Error('Plan does not support Persona token payments');
    }

    const requiredTokens = plan.pricing.monthly;
    const userBalance = this.paymentInfo?.personaTokenBalance || 0;

    if (userBalance < requiredTokens) {
      throw new Error(`Insufficient Persona tokens. Required: ${requiredTokens}, Available: ${userBalance}`);
    }

    // In production, this would interact with the Persona token contract
    const mockSubscriptionId = `persona_sub_${plan.id}_${Date.now()}`;
    
    console.log('🎫 Processing Persona token subscription:', {
      planId: plan.id,
      tokensRequired: requiredTokens,
      userBalance
    });

    return mockSubscriptionId;
  }

  /**
   * 📊 Calculate Proration
   */
  private calculateProration(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): any {
    const currentPrice = currentPlan.pricing.monthly;
    const newPrice = newPlan.pricing.monthly;
    const daysInMonth = 30;
    const daysRemaining = Math.floor(Math.random() * 30) + 1; // Mock days remaining

    const currentPlanProration = (currentPrice / daysInMonth) * daysRemaining;
    const newPlanProration = (newPrice / daysInMonth) * daysRemaining;
    const prorationAmount = newPlanProration - currentPlanProration;

    return {
      daysRemaining,
      currentPlanProration,
      newPlanProration,
      prorationAmount,
      isUpgrade: prorationAmount > 0
    };
  }

  /**
   * 📈 Get Usage Analytics
   */
  async getUsageAnalytics(): Promise<UsageAnalytics> {
    // In production, this would fetch real usage data
    const mockAnalytics: UsageAnalytics = {
      currentPeriod: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        apiCallsUsed: this.currentPlan ? Math.floor(Math.random() * this.currentPlan.limits.apiCallsPerMonth * 0.8) : 85,
        apiCallsLimit: this.currentPlan?.limits.apiCallsPerMonth || 100,
        costIncurred: 47.50,
        personaTokensSpent: this.currentPlan?.tier === 'unlimited' ? 150 : 0
      },
      breakdown: {
        'plaid-enhanced': { calls: 45, cost: 25.20, lastUsed: new Date().toISOString() },
        'trulioo-healthcare': { calls: 12, cost: 18.00, lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        'measureone-education': { calls: 3, cost: 9.90, lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
      },
      projectedUsage: {
        monthlyEstimate: 150,
        costEstimate: 89.25,
        recommendedTier: 'pro'
      }
    };

    this.usageAnalytics = mockAnalytics;
    return mockAnalytics;
  }

  /**
   * 🎫 Get Persona Token Info
   */
  getPersonaTokenConfig(): PersonaTokenConfig {
    return this.personaTokenConfig;
  }

  /**
   * 💰 Purchase Persona Tokens
   */
  async purchasePersonaTokens(usdAmount: number): Promise<{
    success: boolean;
    tokensReceived?: number;
    transactionId?: string;
    error?: string;
  }> {
    try {
      const tokensToReceive = usdAmount * this.personaTokenConfig.exchangeRate.usdToPersona;
      const mockTransactionId = `token_purchase_${Date.now()}`;
      
      // In production, this would process the payment and mint/transfer tokens
      console.log(`🎫 Persona token purchase:`, {
        usdAmount,
        tokensReceived: tokensToReceive,
        exchangeRate: this.personaTokenConfig.exchangeRate.usdToPersona
      });

      // Update user balance
      if (!this.paymentInfo) {
        this.paymentInfo = { method: 'persona-token' };
      }
      this.paymentInfo.personaTokenBalance = (this.paymentInfo.personaTokenBalance || 0) + tokensToReceive;

      return {
        success: true,
        tokensReceived: tokensToReceived,
        transactionId: mockTransactionId
      };

    } catch (error) {
      console.error('❌ Persona token purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token purchase failed'
      };
    }
  }

  /**
   * 📊 Get Subscription Recommendations
   */
  getSubscriptionRecommendations(monthlyAPIUsage: number): {
    recommended: SubscriptionPlan;
    alternatives: SubscriptionPlan[];
    savingsAnalysis: any;
  } {
    // Find the most cost-effective plan based on usage
    const recommendations = this.subscriptionPlans
      .filter(plan => plan.limits.apiCallsPerMonth >= monthlyAPIUsage || plan.limits.apiCallsPerMonth === -1)
      .sort((a, b) => a.pricing.monthly - b.pricing.monthly);

    const recommended = recommendations[0] || this.subscriptionPlans[0];
    const alternatives = recommendations.slice(1, 3);

    const currentCostEstimate = this.estimatePayAsYouGoCost(monthlyAPIUsage);
    const planCost = recommended.pricing.monthly;
    const savings = currentCostEstimate - planCost;

    const savingsAnalysis = {
      currentEstimate: currentCostEstimate,
      planCost,
      monthlySavings: savings,
      annualSavings: savings * 12,
      breakEvenUsage: recommended.limits.apiCallsPerMonth * 0.7
    };

    return {
      recommended,
      alternatives,
      savingsAnalysis
    };
  }

  /**
   * 💵 Estimate Pay-As-You-Go Cost
   */
  private estimatePayAsYouGoCost(monthlyAPIUsage: number): number {
    let totalCost = 0;
    
    // Estimate cost based on average API pricing
    const averageAPICall = Object.values(this.apiPricing);
    const averageCost = averageAPICall.reduce((sum, api) => sum + api.baseCost, 0) / averageAPICall.length;
    
    totalCost = (averageCost * monthlyAPIUsage) / 100; // Convert cents to dollars
    
    return totalCost;
  }

  /**
   * 💾 Save User Subscription
   */
  private saveUserSubscription(): void {
    try {
      localStorage.setItem('persona_subscription', JSON.stringify({
        currentPlan: this.currentPlan,
        paymentInfo: this.paymentInfo
      }));
    } catch (error) {
      console.error('❌ Failed to save subscription:', error);
    }
  }

  /**
   * 🔓 Load User Subscription
   */
  private loadUserSubscription(): void {
    try {
      const saved = localStorage.getItem('persona_subscription');
      if (saved) {
        const data = JSON.parse(saved);
        this.currentPlan = data.currentPlan;
        this.paymentInfo = data.paymentInfo;
      }
    } catch (error) {
      console.error('❌ Failed to load subscription:', error);
    }
  }

  /**
   * 📊 Get Payment Dashboard Data
   */
  async getPaymentDashboard(): Promise<{
    currentPlan: SubscriptionPlan | null;
    usage: UsageAnalytics;
    tokenBalance: number;
    upcomingBills: any[];
    recommendations: any;
  }> {
    const usage = await this.getUsageAnalytics();
    const recommendations = this.getSubscriptionRecommendations(usage.projectedUsage.monthlyEstimate);

    return {
      currentPlan: this.currentPlan,
      usage,
      tokenBalance: this.paymentInfo?.personaTokenBalance || 0,
      upcomingBills: [], // Mock upcoming bills
      recommendations
    };
  }
}

// 🏭 Export singleton instance
export const paymentSystemService = new PaymentSystemService();