/**
 * Credential Marketplace Service
 * Decentralized marketplace for trading verified credentials with PSA tokens
 */

import { monitoringService, logger } from './monitoringService';
import { errorService, ErrorCategory, ErrorSeverity } from './errorService';
import { rateLimitService } from './rateLimitService';
import { securityAuditService } from './securityAuditService';
import { personaTokenService } from './personaTokenService';
import { enhancedZKProofService } from './enhancedZKProofService';
// Lazy load blockchainService to avoid circular dependency
// Lazy load analyticsService to avoid circular dependency
import { cryptoService } from './cryptoService';
import type { DID, VerifiableCredential, ZKProof } from '../types/wallet';

// Safe BigInt constants
const DECIMALS_18 = BigInt('1000000000000000000'); // 10^18


export interface MarketplaceListing {
  id: string;
  credentialId: string;
  sellerId: DID;
  credential: VerifiableCredential;
  zkProof?: ZKProof;
  listingDetails: {
    title: string;
    description: string;
    category: 'identity' | 'education' | 'employment' | 'financial' | 'healthcare' | 'government' | 'custom';
    tags: string[];
    credentialType: string;
    issuer: string;
    issuanceDate: string;
    expirationDate?: string;
    verificationLevel: 'basic' | 'enhanced' | 'premium';
  };
  pricing: {
    price: bigint; // PSA tokens
    currency: 'PSA' | 'USD' | 'EUR';
    priceHistory: Array<{
      price: bigint;
      timestamp: number;
      reason: string;
    }>;
    minimumOffer: bigint;
    buyNowPrice: bigint;
    auctionEndTime?: number;
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    views: number;
    favorites: number;
    status: 'active' | 'sold' | 'expired' | 'withdrawn' | 'pending_verification' | 'rejected';
    featured: boolean;
    verified: boolean;
    qualityScore: number; // 0-100
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  };
  compliance: {
    privacyLevel: 'public' | 'selective' | 'zero_knowledge';
    jurisdiction: string;
    legalCompliance: string[];
    dataRetention: number; // milliseconds
    transferRights: 'full' | 'limited' | 'view_only';
  };
  escrow: {
    enabled: boolean;
    escrowId?: string;
    releaseConditions: string[];
    disputeResolution: 'automated' | 'manual' | 'arbitration';
  };
}

export interface MarketplaceOffer {
  id: string;
  listingId: string;
  buyerId: DID;
  sellerId: DID;
  offerDetails: {
    price: bigint;
    message: string;
    terms: string;
    validUntil: number;
    type: 'buy_now' | 'auction_bid' | 'counteroffer' | 'trade_proposal';
  };
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
  metadata: {
    createdAt: number;
    updatedAt: number;
    viewedBySeller: boolean;
    autoAccept: boolean;
  };
}

export interface MarketplaceTransaction {
  id: string;
  listingId: string;
  offerId?: string;
  buyerId: DID;
  sellerId: DID;
  transactionDetails: {
    price: bigint;
    fees: {
      platformFee: bigint;
      networkFee: bigint;
      processingFee: bigint;
      total: bigint;
    };
    paymentMethod: 'psa_tokens' | 'escrow' | 'crypto';
    credentialTransfer: {
      transferType: 'full' | 'license' | 'view_only';
      accessPeriod?: number;
      usageRestrictions?: string[];
    };
  };
  blockchain: {
    txHash: string;
    blockNumber: number;
    network: string;
    gasUsed: bigint;
    confirmations: number;
  };
  status: 'pending' | 'confirmed' | 'failed' | 'disputed' | 'refunded';
  timeline: Array<{
    status: string;
    timestamp: number;
    description: string;
    txHash?: string;
  }>;
  metadata: {
    createdAt: number;
    completedAt?: number;
    rating: {
      buyerRating?: number;
      sellerRating?: number;
      feedback?: string;
    };
  };
}

export interface MarketplaceUser {
  did: DID;
  profile: {
    username: string;
    displayName: string;
    bio: string;
    avatar?: string;
    location?: string;
    website?: string;
    verified: boolean;
    verificationBadges: string[];
  };
  reputation: {
    score: number; // 0-100
    totalTransactions: number;
    successfulTransactions: number;
    averageRating: number;
    ratingsCount: number;
    badges: string[];
    trustLevel: 'new' | 'trusted' | 'verified' | 'premium' | 'expert';
  };
  statistics: {
    credentialsSold: number;
    credentialsPurchased: number;
    totalVolume: bigint;
    averagePrice: bigint;
    activeListings: number;
    completionRate: number;
  };
  preferences: {
    publicProfile: boolean;
    allowOffers: boolean;
    autoAcceptThreshold?: bigint;
    notificationSettings: {
      newOffers: boolean;
      priceUpdates: boolean;
      marketTrends: boolean;
    };
  };
  security: {
    twoFactorEnabled: boolean;
    lastActiveAt: number;
    ipWhitelist?: string[];
    maxTransactionLimit: bigint;
  };
}

export interface MarketplaceFilter {
  category?: string[];
  priceRange?: { min: bigint; max: bigint };
  credentialType?: string[];
  issuer?: string[];
  verificationLevel?: string[];
  rarity?: string[];
  tags?: string[];
  jurisdiction?: string[];
  sortBy?: 'price' | 'date' | 'popularity' | 'quality' | 'expiration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MarketplaceAnalytics {
  overview: {
    totalListings: number;
    activeListings: number;
    totalTransactions: number;
    totalVolume: bigint;
    averagePrice: bigint;
    uniqueUsers: number;
    dailyActiveUsers: number;
  };
  trends: {
    volumeGrowth: number;
    priceGrowth: number;
    userGrowth: number;
    transactionGrowth: number;
  };
  topCategories: Array<{
    category: string;
    listings: number;
    volume: bigint;
    averagePrice: bigint;
    growth: number;
  }>;
  marketHealth: {
    liquidityScore: number;
    priceStability: number;
    userActivity: number;
    transactionSuccess: number;
  };
  priceData: Array<{
    timestamp: number;
    category: string;
    averagePrice: bigint;
    volume: bigint;
    transactions: number;
  }>;
}

export class CredentialMarketplaceService {
  private static instance: CredentialMarketplaceService;
  private listings: Map<string, MarketplaceListing> = new Map();
  private offers: Map<string, MarketplaceOffer> = new Map();
  private transactions: Map<string, MarketplaceTransaction> = new Map();
  private users: Map<DID, MarketplaceUser> = new Map();
  private favorites: Map<DID, Set<string>> = new Map();
  private watchlist: Map<DID, Set<string>> = new Map();

  private readonly PLATFORM_CONFIG = {
    fees: {
      platformFeeRate: 0.025, // 2.5%
      minimumFee: BigInt('1') * DECIMALS_18, // 1 PSA
      maximumFee: BigInt('100') * DECIMALS_18, // 100 PSA
      escrowFee: BigInt('5') * DECIMALS_18, // 5 PSA
    },
    limits: {
      maxListings: 50,
      maxOffers: 10,
      maxTransactionValue: BigInt('10000') * DECIMALS_18, // 10,000 PSA
      credentialExpirationBuffer: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    quality: {
      minQualityScore: 60,
      featuredThreshold: 80,
      autoVerificationThreshold: 90,
    },
    security: {
      escrowRequired: BigInt('1000') * DECIMALS_18, // 1,000 PSA
      verificationRequired: BigInt('500') * DECIMALS_18, // 500 PSA
      disputeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  };

  private constructor() {
    this.initializeMarketplace();
    this.startMarketplaceMonitoring();
    this.startPriceTracking();
    this.startReputationUpdates();
  }

  static getInstance(): CredentialMarketplaceService {
    if (!CredentialMarketplaceService.instance) {
      CredentialMarketplaceService.instance = new CredentialMarketplaceService();
    }
    return CredentialMarketplaceService.instance;
  }

  /**
   * Initialize marketplace
   */
  private initializeMarketplace(): void {
    // Set up marketplace monitoring
    monitoringService.registerHealthCheck('marketplace', async () => {
      const activeListings = Array.from(this.listings.values()).filter(l => l.metadata.status === 'active');
      return activeListings.length > 0;
    });

    // Initialize demo listings
    this.createDemoListings();

    logger.info('🏪 Credential Marketplace initialized', {
      platformFees: this.PLATFORM_CONFIG.fees,
      limits: this.PLATFORM_CONFIG.limits,
      securityConfig: this.PLATFORM_CONFIG.security,
    });
  }

  /**
   * Create marketplace listing
   */
  async createListing(
    sellerDID: DID,
    credential: VerifiableCredential,
    listingDetails: MarketplaceListing['listingDetails'],
    pricing: MarketplaceListing['pricing'],
    compliance: MarketplaceListing['compliance'],
    zkProof?: ZKProof
  ): Promise<MarketplaceListing> {
    // Rate limiting
    const rateLimitResult = rateLimitService.checkRateLimit(sellerDID, 'marketplace-listing');
    if (!rateLimitResult.allowed) {
      throw errorService.createError(
        'MARKETPLACE_LISTING_RATE_LIMIT',
        'Marketplace listing rate limit exceeded',
        ErrorCategory.RATE_LIMIT,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'marketplace', action: 'create-listing' })
      );
    }

    try {
      // Validate credential
      await this.validateCredential(credential);

      // Check user limits
      const userListings = Array.from(this.listings.values()).filter(
        l => l.sellerId === sellerDID && l.metadata.status === 'active'
      );
      
      if (userListings.length >= this.PLATFORM_CONFIG.limits.maxListings) {
        throw errorService.createError(
          'MAX_LISTINGS_EXCEEDED',
          `Maximum listings limit (${this.PLATFORM_CONFIG.limits.maxListings}) exceeded`,
          ErrorCategory.VALIDATION,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'marketplace', action: 'create-listing' })
        );
      }

      // Calculate quality score
      const qualityScore = await this.calculateQualityScore(credential, listingDetails);

      // Create listing
      const listing: MarketplaceListing = {
        id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        credentialId: credential.id,
        sellerId: sellerDID,
        credential,
        zkProof,
        listingDetails,
        pricing: {
          ...pricing,
          priceHistory: [
            {
              price: pricing.price,
              timestamp: Date.now(),
              reason: 'Initial listing',
            },
          ],
        },
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          views: 0,
          favorites: 0,
          status: qualityScore >= this.PLATFORM_CONFIG.quality.minQualityScore ? 'active' : 'pending_verification',
          featured: qualityScore >= this.PLATFORM_CONFIG.quality.featuredThreshold,
          verified: qualityScore >= this.PLATFORM_CONFIG.quality.autoVerificationThreshold,
          qualityScore,
          rarity: this.calculateRarity(credential, listingDetails),
        },
        compliance,
        escrow: {
          enabled: pricing.price >= this.PLATFORM_CONFIG.security.escrowRequired,
          releaseConditions: ['buyer_confirmation', 'credential_verified'],
          disputeResolution: 'automated',
        },
      };

      // Store listing
      this.listings.set(listing.id, listing);

      // Update user statistics
      await this.updateUserStatistics(sellerDID, 'listing_created');

      // Record analytics
      const { analyticsService } = await import('./analyticsService');
      await analyticsService.trackEvent(
        'user_action',
        'marketplace',
        'listing_created',
        sellerDID,
        {
          listingId: listing.id,
          category: listingDetails.category,
          price: pricing.price.toString(),
          qualityScore,
        }
      );

      // Record metrics
      monitoringService.recordMetric('marketplace_listing_created', 1, {
        seller: sellerDID,
        category: listingDetails.category,
        price: pricing.price.toString(),
        quality: qualityScore.toString(),
      });

      logger.info('📝 Marketplace listing created successfully', {
        listingId: listing.id,
        sellerId: sellerDID,
        category: listingDetails.category,
        price: pricing.price.toString(),
        qualityScore,
      });

      return listing;

    } catch (error) {
      logger.error('❌ Failed to create marketplace listing', {
        sellerDID,
        error,
      });
      throw errorService.createError(
        'MARKETPLACE_LISTING_ERROR',
        `Failed to create marketplace listing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.INTERNAL,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'marketplace', action: 'create-listing' })
      );
    }
  }

  /**
   * Make offer on listing
   */
  async makeOffer(
    buyerDID: DID,
    listingId: string,
    offerDetails: MarketplaceOffer['offerDetails']
  ): Promise<MarketplaceOffer> {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw errorService.createError(
        'LISTING_NOT_FOUND',
        `Listing ${listingId} not found`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'marketplace', action: 'make-offer' })
      );
    }

    if (listing.metadata.status !== 'active') {
      throw errorService.createError(
        'LISTING_NOT_ACTIVE',
        `Listing ${listingId} is not active`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'marketplace', action: 'make-offer' })
      );
    }

    if (buyerDID === listing.sellerId) {
      throw errorService.createError(
        'SELF_OFFER_NOT_ALLOWED',
        'Cannot make offer on own listing',
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'marketplace', action: 'make-offer' })
      );
    }

    try {
      // Check buyer balance
      const balance = await personaTokenService.getUserBalance(buyerDID);
      if (balance.balance < offerDetails.price) {
        throw errorService.createError(
          'INSUFFICIENT_BALANCE',
          'Insufficient PSA balance for offer',
          ErrorCategory.VALIDATION,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'marketplace', action: 'make-offer' })
        );
      }

      // Check minimum offer
      if (offerDetails.price < listing.pricing.minimumOffer) {
        throw errorService.createError(
          'OFFER_TOO_LOW',
          `Offer must be at least ${listing.pricing.minimumOffer} PSA`,
          ErrorCategory.VALIDATION,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'marketplace', action: 'make-offer' })
        );
      }

      // Create offer
      const offer: MarketplaceOffer = {
        id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        listingId,
        buyerId: buyerDID,
        sellerId: listing.sellerId,
        offerDetails,
        status: 'pending',
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          viewedBySeller: false,
          autoAccept: false,
        },
      };

      // Auto-accept if buy now or above auto-accept threshold
      const user = this.users.get(listing.sellerId);
      if (offerDetails.type === 'buy_now' || 
          (user?.preferences.autoAcceptThreshold && offerDetails.price >= user.preferences.autoAcceptThreshold)) {
        offer.status = 'accepted';
        offer.metadata.autoAccept = true;
        
        // Execute transaction
        await this.executeTransaction(offer);
      }

      // Store offer
      this.offers.set(offer.id, offer);

      // Record analytics
      const { analyticsService } = await import('./analyticsService');
      await analyticsService.trackEvent(
        'user_action',
        'marketplace',
        'offer_made',
        buyerDID,
        {
          offerId: offer.id,
          listingId,
          price: offerDetails.price.toString(),
          type: offerDetails.type,
        }
      );

      logger.info('💰 Marketplace offer made successfully', {
        offerId: offer.id,
        listingId,
        buyerId: buyerDID,
        price: offerDetails.price.toString(),
        type: offerDetails.type,
      });

      return offer;

    } catch (error) {
      logger.error('❌ Failed to make marketplace offer', {
        buyerDID,
        listingId,
        error,
      });
      throw errorService.createError(
        'MARKETPLACE_OFFER_ERROR',
        `Failed to make marketplace offer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.INTERNAL,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'marketplace', action: 'make-offer' })
      );
    }
  }

  /**
   * Accept offer
   */
  async acceptOffer(sellerDID: DID, offerId: string): Promise<MarketplaceTransaction> {
    const offer = this.offers.get(offerId);
    if (!offer) {
      throw errorService.createError(
        'OFFER_NOT_FOUND',
        `Offer ${offerId} not found`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'marketplace', action: 'accept-offer' })
      );
    }

    if (offer.sellerId !== sellerDID) {
      throw errorService.createError(
        'OFFER_ACCESS_DENIED',
        'Not authorized to accept this offer',
        ErrorCategory.AUTHORIZATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'marketplace', action: 'accept-offer' })
      );
    }

    if (offer.status !== 'pending') {
      throw errorService.createError(
        'OFFER_NOT_PENDING',
        `Offer ${offerId} is not pending`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'marketplace', action: 'accept-offer' })
      );
    }

    try {
      // Update offer status
      offer.status = 'accepted';
      offer.metadata.updatedAt = Date.now();
      this.offers.set(offerId, offer);

      // Execute transaction
      const transaction = await this.executeTransaction(offer);

      logger.info('✅ Marketplace offer accepted successfully', {
        offerId,
        sellerDID,
        transactionId: transaction.id,
      });

      return transaction;

    } catch (error) {
      logger.error('❌ Failed to accept marketplace offer', {
        sellerDID,
        offerId,
        error,
      });
      throw errorService.createError(
        'MARKETPLACE_ACCEPT_ERROR',
        `Failed to accept marketplace offer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.INTERNAL,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'marketplace', action: 'accept-offer' })
      );
    }
  }

  /**
   * Search marketplace listings
   */
  async searchListings(
    filters: MarketplaceFilter,
    userDID?: DID
  ): Promise<{
    listings: MarketplaceListing[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    try {
      let listings = Array.from(this.listings.values()).filter(
        l => l.metadata.status === 'active'
      );

      // Apply filters
      if (filters.category) {
        listings = listings.filter(l => filters.category!.includes(l.listingDetails.category));
      }

      if (filters.priceRange) {
        listings = listings.filter(l => 
          l.pricing.price >= filters.priceRange!.min && 
          l.pricing.price <= filters.priceRange!.max
        );
      }

      if (filters.credentialType) {
        listings = listings.filter(l => 
          filters.credentialType!.includes(l.listingDetails.credentialType)
        );
      }

      if (filters.issuer) {
        listings = listings.filter(l => 
          filters.issuer!.includes(l.listingDetails.issuer)
        );
      }

      if (filters.verificationLevel) {
        listings = listings.filter(l => 
          filters.verificationLevel!.includes(l.listingDetails.verificationLevel)
        );
      }

      if (filters.rarity) {
        listings = listings.filter(l => 
          filters.rarity!.includes(l.metadata.rarity)
        );
      }

      if (filters.tags) {
        listings = listings.filter(l => 
          filters.tags!.some(tag => l.listingDetails.tags.includes(tag))
        );
      }

      if (filters.jurisdiction) {
        listings = listings.filter(l => 
          filters.jurisdiction!.includes(l.compliance.jurisdiction)
        );
      }

      // Apply sorting
      if (filters.sortBy) {
        listings.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (filters.sortBy) {
            case 'price':
              aValue = a.pricing.price;
              bValue = b.pricing.price;
              break;
            case 'date':
              aValue = a.metadata.createdAt;
              bValue = b.metadata.createdAt;
              break;
            case 'popularity':
              aValue = a.metadata.views + a.metadata.favorites;
              bValue = b.metadata.views + b.metadata.favorites;
              break;
            case 'quality':
              aValue = a.metadata.qualityScore;
              bValue = b.metadata.qualityScore;
              break;
            case 'expiration':
              aValue = a.listingDetails.expirationDate ? new Date(a.listingDetails.expirationDate).getTime() : Infinity;
              bValue = b.listingDetails.expirationDate ? new Date(b.listingDetails.expirationDate).getTime() : Infinity;
              break;
            default:
              aValue = a.metadata.createdAt;
              bValue = b.metadata.createdAt;
          }

          if (filters.sortOrder === 'desc') {
            return bValue > aValue ? 1 : -1;
          } else {
            return aValue > bValue ? 1 : -1;
          }
        });
      }

      // Apply pagination
      const total = listings.length;
      const page = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
      const limit = filters.limit || 20;
      const startIndex = filters.offset || 0;
      const endIndex = startIndex + limit;
      
      const paginatedListings = listings.slice(startIndex, endIndex);
      
      // Update view counts
      paginatedListings.forEach(listing => {
        listing.metadata.views++;
        this.listings.set(listing.id, listing);
      });

      // Record analytics
      if (userDID) {
        const { analyticsService } = await import('./analyticsService');
      await analyticsService.trackEvent(
          'user_action',
          'marketplace',
          'search_performed',
          userDID,
          {
            filters,
            resultsCount: paginatedListings.length,
            totalResults: total,
          }
        );
      }

      return {
        listings: paginatedListings,
        pagination: {
          total,
          page,
          limit,
          hasMore: endIndex < total,
        },
      };

    } catch (error) {
      logger.error('❌ Failed to search marketplace listings', {
        filters,
        userDID,
        error,
      });
      throw errorService.createError(
        'MARKETPLACE_SEARCH_ERROR',
        `Failed to search marketplace listings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.INTERNAL,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'marketplace', action: 'search-listings' })
      );
    }
  }

  /**
   * Get marketplace analytics
   */
  async getMarketplaceAnalytics(
    timeRange: { start: number; end: number }
  ): Promise<MarketplaceAnalytics> {
    try {
      const listings = Array.from(this.listings.values());
      const transactions = Array.from(this.transactions.values()).filter(
        t => t.metadata.createdAt >= timeRange.start && t.metadata.createdAt <= timeRange.end
      );

      const activeListings = listings.filter(l => l.metadata.status === 'active');
      const totalVolume = transactions.reduce((sum, t) => sum + t.transactionDetails.price, BigInt(0));
      const averagePrice = transactions.length > 0 ? totalVolume / BigInt(transactions.length) : BigInt(0);

      // Calculate trends
      const previousPeriod = {
        start: timeRange.start - (timeRange.end - timeRange.start),
        end: timeRange.start,
      };
      const previousTransactions = Array.from(this.transactions.values()).filter(
        t => t.metadata.createdAt >= previousPeriod.start && t.metadata.createdAt <= previousPeriod.end
      );
      const previousVolume = previousTransactions.reduce((sum, t) => sum + t.transactionDetails.price, BigInt(0));

      // Category analysis
      const categoryStats = new Map<string, { listings: number; volume: bigint; count: number }>();
      
      activeListings.forEach(listing => {
        const category = listing.listingDetails.category;
        const stats = categoryStats.get(category) || { listings: 0, volume: BigInt(0), count: 0 };
        stats.listings++;
        categoryStats.set(category, stats);
      });

      transactions.forEach(transaction => {
        const listing = listings.find(l => l.id === transaction.listingId);
        if (listing) {
          const category = listing.listingDetails.category;
          const stats = categoryStats.get(category) || { listings: 0, volume: BigInt(0), count: 0 };
          stats.volume += transaction.transactionDetails.price;
          stats.count++;
          categoryStats.set(category, stats);
        }
      });

      const topCategories = Array.from(categoryStats.entries())
        .map(([category, stats]) => ({
          category,
          listings: stats.listings,
          volume: stats.volume,
          averagePrice: stats.count > 0 ? stats.volume / BigInt(stats.count) : BigInt(0),
          growth: 0, // TODO: Calculate growth
        }))
        .sort((a, b) => Number(b.volume - a.volume))
        .slice(0, 10);

      // Price data
      const priceData = this.generatePriceData(transactions, timeRange);

      const analytics: MarketplaceAnalytics = {
        overview: {
          totalListings: listings.length,
          activeListings: activeListings.length,
          totalTransactions: transactions.length,
          totalVolume,
          averagePrice,
          uniqueUsers: new Set([...listings.map(l => l.sellerId), ...transactions.map(t => t.buyerId)]).size,
          dailyActiveUsers: this.calculateDailyActiveUsers(timeRange),
        },
        trends: {
          volumeGrowth: previousVolume > BigInt(0) ? Number((totalVolume - previousVolume) * BigInt(100) / previousVolume) : 0,
          priceGrowth: 0, // TODO: Calculate price growth
          userGrowth: 0, // TODO: Calculate user growth
          transactionGrowth: previousTransactions.length > 0 ? ((transactions.length - previousTransactions.length) / previousTransactions.length) * 100 : 0,
        },
        topCategories,
        marketHealth: {
          liquidityScore: this.calculateLiquidityScore(listings, transactions),
          priceStability: this.calculatePriceStability(priceData),
          userActivity: this.calculateUserActivity(timeRange),
          transactionSuccess: transactions.length > 0 ? (transactions.filter(t => t.status === 'confirmed').length / transactions.length) * 100 : 0,
        },
        priceData,
      };

      return analytics;

    } catch (error) {
      logger.error('❌ Failed to get marketplace analytics', {
        timeRange,
        error,
      });
      throw errorService.createError(
        'MARKETPLACE_ANALYTICS_ERROR',
        `Failed to get marketplace analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.INTERNAL,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'marketplace', action: 'get-analytics' })
      );
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userDID: DID): Promise<MarketplaceUser | null> {
    return this.users.get(userDID) || null;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userDID: DID,
    updates: Partial<MarketplaceUser['profile']>
  ): Promise<MarketplaceUser> {
    try {
      let user = this.users.get(userDID);
      
      if (!user) {
        // Create new user profile
        user = {
          did: userDID,
          profile: {
            username: `user_${Date.now()}`,
            displayName: 'Anonymous User',
            bio: '',
            verified: false,
            verificationBadges: [],
            ...updates,
          },
          reputation: {
            score: 50,
            totalTransactions: 0,
            successfulTransactions: 0,
            averageRating: 0,
            ratingsCount: 0,
            badges: [],
            trustLevel: 'new',
          },
          statistics: {
            credentialsSold: 0,
            credentialsPurchased: 0,
            totalVolume: BigInt(0),
            averagePrice: BigInt(0),
            activeListings: 0,
            completionRate: 0,
          },
          preferences: {
            publicProfile: true,
            allowOffers: true,
            notificationSettings: {
              newOffers: true,
              priceUpdates: true,
              marketTrends: false,
            },
          },
          security: {
            twoFactorEnabled: false,
            lastActiveAt: Date.now(),
            maxTransactionLimit: BigInt('1000') * DECIMALS_18, // 1,000 PSA
          },
        };
      } else {
        // Update existing user
        user.profile = { ...user.profile, ...updates };
      }

      this.users.set(userDID, user);

      logger.info('👤 User profile updated successfully', {
        userDID,
        updates,
      });

      return user;

    } catch (error) {
      logger.error('❌ Failed to update user profile', {
        userDID,
        updates,
        error,
      });
      throw errorService.createError(
        'USER_PROFILE_UPDATE_ERROR',
        `Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.INTERNAL,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'marketplace', action: 'update-profile' })
      );
    }
  }

  /**
   * Get user's listings
   */
  async getUserListings(userDID: DID): Promise<MarketplaceListing[]> {
    return Array.from(this.listings.values()).filter(l => l.sellerId === userDID);
  }

  /**
   * Get user's offers
   */
  async getUserOffers(userDID: DID): Promise<MarketplaceOffer[]> {
    return Array.from(this.offers.values()).filter(o => o.buyerId === userDID);
  }

  /**
   * Get user's transactions
   */
  async getUserTransactions(userDID: DID): Promise<MarketplaceTransaction[]> {
    return Array.from(this.transactions.values()).filter(
      t => t.buyerId === userDID || t.sellerId === userDID
    );
  }

  /**
   * Private helper methods
   */
  private async executeTransaction(offer: MarketplaceOffer): Promise<MarketplaceTransaction> {
    const listing = this.listings.get(offer.listingId)!;
    
    // Calculate fees
    const platformFee = BigInt(Math.floor(Number(offer.offerDetails.price) * this.PLATFORM_CONFIG.fees.platformFeeRate));
    const networkFee = BigInt(50000); // Mock network fee
    const processingFee = BigInt(5000); // Mock processing fee
    const totalFees = platformFee + networkFee + processingFee;

    // Create transaction
    const transaction: MarketplaceTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      listingId: offer.listingId,
      offerId: offer.id,
      buyerId: offer.buyerId,
      sellerId: offer.sellerId,
      transactionDetails: {
        price: offer.offerDetails.price,
        fees: {
          platformFee,
          networkFee,
          processingFee,
          total: totalFees,
        },
        paymentMethod: 'psa_tokens',
        credentialTransfer: {
          transferType: 'full',
          usageRestrictions: [],
        },
      },
      blockchain: {
        txHash: '',
        blockNumber: 0,
        network: 'polygon',
        gasUsed: BigInt(0),
        confirmations: 0,
      },
      status: 'pending',
      timeline: [
        {
          status: 'pending',
          timestamp: Date.now(),
          description: 'Transaction initiated',
        },
      ],
      metadata: {
        createdAt: Date.now(),
        rating: {},
      },
    };

    try {
      // Execute blockchain transaction (lazy load to avoid circular dependency)
      const { blockchainService } = await import('./blockchainService');
      const txResult = await blockchainService.sendTransaction(
        offer.buyerId,
        {
          to: offer.sellerId,
          value: offer.offerDetails.price,
          data: JSON.stringify({
            type: 'marketplace_transaction',
            listingId: offer.listingId,
            credentialId: listing.credentialId,
          }),
        }
      );

      // Update transaction with blockchain details
      transaction.blockchain.txHash = txResult.hash;
      transaction.blockchain.gasUsed = txResult.gas;
      transaction.status = 'confirmed';
      transaction.timeline.push({
        status: 'confirmed',
        timestamp: Date.now(),
        description: 'Payment confirmed on blockchain',
        txHash: txResult.hash,
      });

      // Update listing status
      listing.metadata.status = 'sold';
      listing.metadata.updatedAt = Date.now();
      this.listings.set(listing.id, listing);

      // Update user statistics
      await this.updateUserStatistics(offer.buyerId, 'purchase_completed');
      await this.updateUserStatistics(offer.sellerId, 'sale_completed');

      // Store transaction
      this.transactions.set(transaction.id, transaction);

      // Record analytics
      const { analyticsService } = await import('./analyticsService');
      await analyticsService.trackEvent(
        'transaction',
        'marketplace',
        'transaction_completed',
        offer.buyerId,
        {
          transactionId: transaction.id,
          listingId: offer.listingId,
          price: offer.offerDetails.price.toString(),
          seller: offer.sellerId,
        },
        undefined,
        {
          success: true,
          cost: offer.offerDetails.price,
        }
      );

      logger.info('💸 Marketplace transaction completed successfully', {
        transactionId: transaction.id,
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        price: offer.offerDetails.price.toString(),
        txHash: txResult.hash,
      });

      return transaction;

    } catch (error) {
      // Update transaction status
      transaction.status = 'failed';
      transaction.timeline.push({
        status: 'failed',
        timestamp: Date.now(),
        description: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      this.transactions.set(transaction.id, transaction);

      logger.error('❌ Marketplace transaction failed', {
        transactionId: transaction.id,
        error,
      });

      throw error;
    }
  }

  private async validateCredential(credential: VerifiableCredential): Promise<void> {
    // Check if credential is expired
    if (credential.expirationDate && new Date(credential.expirationDate) < new Date()) {
      throw new Error('Credential is expired');
    }

    // Check if credential will expire soon
    if (credential.expirationDate) {
      const expirationTime = new Date(credential.expirationDate).getTime();
      const bufferTime = this.PLATFORM_CONFIG.limits.credentialExpirationBuffer;
      
      if (expirationTime - Date.now() < bufferTime) {
        throw new Error('Credential expires too soon to be listed');
      }
    }

    // Additional validation logic would go here
    // For now, we'll assume all credentials are valid
  }

  private async calculateQualityScore(
    credential: VerifiableCredential,
    listingDetails: MarketplaceListing['listingDetails']
  ): Promise<number> {
    let score = 50; // Base score

    // Credential age (newer is better)
    const credentialAge = Date.now() - new Date(credential.issuanceDate).getTime();
    const ageScore = Math.max(0, 30 - (credentialAge / (30 * 24 * 60 * 60 * 1000)) * 10);
    score += ageScore;

    // Expiration date (further is better)
    if (credential.expirationDate) {
      const timeToExpiry = new Date(credential.expirationDate).getTime() - Date.now();
      const expiryScore = Math.min(20, (timeToExpiry / (365 * 24 * 60 * 60 * 1000)) * 10);
      score += expiryScore;
    } else {
      score += 20; // No expiration is good
    }

    // Listing quality
    if (listingDetails.description.length > 100) score += 5;
    if (listingDetails.tags.length > 2) score += 5;
    if (listingDetails.verificationLevel === 'premium') score += 10;

    // Issuer reputation (mock for now)
    const issuerReputation = Math.random() * 20;
    score += issuerReputation;

    return Math.min(100, Math.max(0, score));
  }

  private calculateRarity(
    credential: VerifiableCredential,
    listingDetails: MarketplaceListing['listingDetails']
  ): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    // Mock rarity calculation
    const rarityScore = Math.random() * 100;
    
    if (rarityScore < 60) return 'common';
    if (rarityScore < 80) return 'uncommon';
    if (rarityScore < 95) return 'rare';
    if (rarityScore < 99) return 'epic';
    return 'legendary';
  }

  private async updateUserStatistics(userDID: DID, action: string): Promise<void> {
    let user = this.users.get(userDID);
    
    if (!user) {
      user = await this.updateUserProfile(userDID, {});
    }

    switch (action) {
      case 'listing_created':
        user.statistics.activeListings++;
        break;
      case 'purchase_completed':
        user.statistics.credentialsPurchased++;
        user.reputation.totalTransactions++;
        user.reputation.successfulTransactions++;
        break;
      case 'sale_completed':
        user.statistics.credentialsSold++;
        user.reputation.totalTransactions++;
        user.reputation.successfulTransactions++;
        break;
    }

    // Update trust level
    if (user.reputation.totalTransactions >= 100) {
      user.reputation.trustLevel = 'expert';
    } else if (user.reputation.totalTransactions >= 50) {
      user.reputation.trustLevel = 'premium';
    } else if (user.reputation.totalTransactions >= 20) {
      user.reputation.trustLevel = 'verified';
    } else if (user.reputation.totalTransactions >= 5) {
      user.reputation.trustLevel = 'trusted';
    }

    // Update reputation score
    user.reputation.score = Math.min(100, 50 + user.reputation.successfulTransactions * 2);

    this.users.set(userDID, user);
  }

  private createDemoListings(): void {
    // Create some demo listings for testing
    const demoCredentials = [
      {
        id: 'demo_cred_1',
        type: ['VerifiableCredential', 'EmploymentCredential'],
        issuer: 'did:example:techcorp',
        issuanceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        credentialSubject: {
          id: 'did:example:user1',
          position: 'Senior Software Engineer',
          company: 'TechCorp Inc.',
          startDate: '2020-01-15',
          salary: '$120,000',
        },
      },
      {
        id: 'demo_cred_2',
        type: ['VerifiableCredential', 'EducationCredential'],
        issuer: 'did:example:university',
        issuanceDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        credentialSubject: {
          id: 'did:example:user2',
          degree: 'Master of Science',
          field: 'Computer Science',
          university: 'Tech University',
          graduationDate: '2019-05-15',
          gpa: '3.8',
        },
      },
    ];

    // This would normally be done through the createListing method
    // but for demo purposes, we'll create them directly
    logger.info('🎭 Demo listings created for testing');
  }

  private generatePriceData(
    transactions: MarketplaceTransaction[],
    timeRange: { start: number; end: number }
  ): Array<{
    timestamp: number;
    category: string;
    averagePrice: bigint;
    volume: bigint;
    transactions: number;
  }> {
    // Mock price data generation
    const priceData = [];
    const interval = (timeRange.end - timeRange.start) / 30; // 30 data points

    for (let i = 0; i < 30; i++) {
      const timestamp = timeRange.start + (i * interval);
      priceData.push({
        timestamp,
        category: 'all',
        averagePrice: BigInt(Math.floor(Math.random() * 100 + 50)) * DECIMALS_18,
        volume: BigInt(Math.floor(Math.random() * 1000 + 100)) * DECIMALS_18,
        transactions: Math.floor(Math.random() * 50 + 10),
      });
    }

    return priceData;
  }

  private calculateDailyActiveUsers(timeRange: { start: number; end: number }): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeUsers = new Set<DID>();

    // Count users with recent activity
    this.listings.forEach(listing => {
      if (listing.metadata.updatedAt >= oneDayAgo) {
        activeUsers.add(listing.sellerId);
      }
    });

    this.offers.forEach(offer => {
      if (offer.metadata.updatedAt >= oneDayAgo) {
        activeUsers.add(offer.buyerId);
      }
    });

    return activeUsers.size;
  }

  private calculateLiquidityScore(
    listings: MarketplaceListing[],
    transactions: MarketplaceTransaction[]
  ): number {
    const activeListings = listings.filter(l => l.metadata.status === 'active').length;
    const completedTransactions = transactions.filter(t => t.status === 'confirmed').length;
    
    if (activeListings === 0) return 0;
    
    return Math.min(100, (completedTransactions / activeListings) * 100);
  }

  private calculatePriceStability(priceData: any[]): number {
    if (priceData.length < 2) return 100;
    
    const prices = priceData.map(d => Number(d.averagePrice));
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to stability score (lower variance = higher stability)
    const stability = Math.max(0, 100 - (standardDeviation / average) * 100);
    return Math.min(100, stability);
  }

  private calculateUserActivity(timeRange: { start: number; end: number }): number {
    const totalUsers = this.users.size;
    const activeUsers = this.calculateDailyActiveUsers(timeRange);
    
    if (totalUsers === 0) return 0;
    
    return (activeUsers / totalUsers) * 100;
  }

  private startMarketplaceMonitoring(): void {
    setInterval(() => {
      this.monitorMarketplace();
    }, 60000); // Every minute
  }

  private monitorMarketplace(): void {
    const activeListings = Array.from(this.listings.values()).filter(l => l.metadata.status === 'active');
    const pendingTransactions = Array.from(this.transactions.values()).filter(t => t.status === 'pending');
    const totalVolume = Array.from(this.transactions.values()).reduce((sum, t) => sum + t.transactionDetails.price, BigInt(0));

    monitoringService.recordMetric('marketplace_active_listings', activeListings.length);
    monitoringService.recordMetric('marketplace_pending_transactions', pendingTransactions.length);
    monitoringService.recordMetric('marketplace_total_volume', Number(totalVolume));

    logger.debug('📊 Marketplace monitoring update', {
      activeListings: activeListings.length,
      pendingTransactions: pendingTransactions.length,
      totalUsers: this.users.size,
    });
  }

  private startPriceTracking(): void {
    setInterval(() => {
      this.trackPrices();
    }, 300000); // Every 5 minutes
  }

  private trackPrices(): void {
    const listings = Array.from(this.listings.values()).filter(l => l.metadata.status === 'active');
    const categories = new Set(listings.map(l => l.listingDetails.category));

    categories.forEach(category => {
      const categoryListings = listings.filter(l => l.listingDetails.category === category);
      const averagePrice = categoryListings.reduce((sum, l) => sum + l.pricing.price, BigInt(0)) / BigInt(categoryListings.length || 1);
      
      monitoringService.recordMetric('marketplace_average_price', Number(averagePrice), {
        category,
      });
    });
  }

  private startReputationUpdates(): void {
    setInterval(() => {
      this.updateReputations();
    }, 3600000); // Every hour
  }

  private updateReputations(): void {
    this.users.forEach((user, userDID) => {
      // Update reputation based on recent activity
      const userTransactions = Array.from(this.transactions.values()).filter(
        t => t.buyerId === userDID || t.sellerId === userDID
      );

      const recentTransactions = userTransactions.filter(
        t => Date.now() - t.metadata.createdAt < 30 * 24 * 60 * 60 * 1000 // 30 days
      );

      if (recentTransactions.length > 0) {
        const successRate = recentTransactions.filter(t => t.status === 'confirmed').length / recentTransactions.length;
        user.reputation.score = Math.min(100, user.reputation.score + (successRate - 0.5) * 10);
        user.statistics.completionRate = successRate * 100;
      }

      this.users.set(userDID, user);
    });
  }
}

export const credentialMarketplaceService = CredentialMarketplaceService.getInstance();