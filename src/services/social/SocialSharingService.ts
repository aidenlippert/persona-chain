/**
 * Social Sharing Service
 * Enables sharing of proofs and credentials across social platforms and community
 */

import { CommunityProof } from '../community/CommunityProofLibrary';
import { communityProofLibrary } from '../community/CommunityProofLibrary';
import { pushNotificationService } from '../notifications/PushNotificationService';
import { errorService } from "@/services/errorService";

export interface ShareConfiguration {
  platforms: SocialPlatform[];
  privacy: 'public' | 'friends' | 'community' | 'private';
  includeMetadata: boolean;
  anonymize: boolean;
  customMessage?: string;
  expiresAt?: string;
  trackingEnabled: boolean;
}

export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  shareUrl: string;
  requiresAuth: boolean;
  maxMessageLength?: number;
}

export interface ShareResult {
  success: boolean;
  platform: string;
  shareUrl?: string;
  error?: string;
  trackingId?: string;
}

export interface ShareAnalytics {
  totalShares: number;
  platformBreakdown: Record<string, number>;
  impressions: number;
  clicks: number;
  conversions: number;
  engagement: number;
  topProofs: Array<{
    proofId: string;
    title: string;
    shares: number;
    engagement: number;
  }>;
}

export interface SocialVerification {
  id: string;
  proofId: string;
  platform: string;
  verifierDid: string;
  verifierProfile: {
    name: string;
    avatar?: string;
    trustLevel: number;
    followers: number;
  };
  verificationMessage: string;
  timestamp: string;
  socialProof: {
    likes: number;
    shares: number;
    comments: number;
  };
}

export class SocialSharingService {
  private static instance: SocialSharingService;
  private platforms: SocialPlatform[] = [];
  private shareHistory: Map<string, ShareResult[]> = new Map();
  private verifications: Map<string, SocialVerification[]> = new Map();

  constructor() {
    this.initializePlatforms();
    this.loadShareHistory();
    console.log('📱 Social Sharing Service initialized');
  }

  static getInstance(): SocialSharingService {
    if (!SocialSharingService.instance) {
      SocialSharingService.instance = new SocialSharingService();
    }
    return SocialSharingService.instance;
  }

  /**
   * Initialize social platforms
   */
  private initializePlatforms(): void {
    this.platforms = [
      {
        id: 'twitter',
        name: 'Twitter',
        icon: '🐦',
        enabled: true,
        shareUrl: 'https://twitter.com/intent/tweet',
        requiresAuth: false,
        maxMessageLength: 280
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        icon: '💼',
        enabled: true,
        shareUrl: 'https://www.linkedin.com/sharing/share-offsite/',
        requiresAuth: false,
        maxMessageLength: 700
      },
      {
        id: 'facebook',
        name: 'Facebook',
        icon: '📘',
        enabled: true,
        shareUrl: 'https://www.facebook.com/sharer/sharer.php',
        requiresAuth: false
      },
      {
        id: 'reddit',
        name: 'Reddit',
        icon: '🟠',
        enabled: true,
        shareUrl: 'https://reddit.com/submit',
        requiresAuth: false
      },
      {
        id: 'telegram',
        name: 'Telegram',
        icon: '✈️',
        enabled: true,
        shareUrl: 'https://t.me/share/url',
        requiresAuth: false
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        icon: '💬',
        enabled: true,
        shareUrl: 'https://wa.me/',
        requiresAuth: false
      },
      {
        id: 'discord',
        name: 'Discord',
        icon: '🎮',
        enabled: false, // Requires bot integration
        shareUrl: '',
        requiresAuth: true
      },
      {
        id: 'community',
        name: 'PersonaPass Community',
        icon: '👥',
        enabled: true,
        shareUrl: '',
        requiresAuth: false
      },
      {
        id: 'qr-code',
        name: 'QR Code',
        icon: '📱',
        enabled: true,
        shareUrl: '',
        requiresAuth: false
      },
      {
        id: 'email',
        name: 'Email',
        icon: '📧',
        enabled: true,
        shareUrl: 'mailto:',
        requiresAuth: false
      }
    ];
  }

  /**
   * Load share history from storage
   */
  private loadShareHistory(): void {
    try {
      const stored = localStorage.getItem('social-share-history');
      if (stored) {
        const data = JSON.parse(stored);
        this.shareHistory = new Map(Object.entries(data));
      }
    } catch (error) {
      errorService.logError('Failed to load share history:', error);
    }
  }

  /**
   * Save share history to storage
   */
  private saveShareHistory(): void {
    try {
      const data = Object.fromEntries(this.shareHistory);
      localStorage.setItem('social-share-history', JSON.stringify(data));
    } catch (error) {
      errorService.logError('Failed to save share history:', error);
    }
  }

  /**
   * Share a community proof
   */
  async shareProof(
    proof: CommunityProof,
    config: ShareConfiguration
  ): Promise<ShareResult[]> {
    console.log('📤 Sharing proof to social platforms...');

    const results: ShareResult[] = [];

    try {
      for (const platform of config.platforms) {
        if (!platform.enabled) continue;

        try {
          const result = await this.shareToplatform(proof, platform, config);
          results.push(result);

          // Store share history
          const history = this.shareHistory.get(proof.id) || [];
          history.push(result);
          this.shareHistory.set(proof.id, history);

        } catch (error) {
          errorService.logError(`Failed to share to ${platform.name}:`, error);
          results.push({
            success: false,
            platform: platform.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Save history
      this.saveShareHistory();

      // Update proof usage count if sharing to community
      if (config.platforms.some(p => p.id === 'community')) {
        await communityProofLibrary.useProof(proof.id, 'did:persona:user:current');
      }

      // Send notification about successful shares
      if (results.some(r => r.success)) {
        await pushNotificationService.sendLocalNotification({
          title: 'Proof Shared Successfully 📤',
          body: `Your "${proof.title}" proof has been shared to ${results.filter(r => r.success).length} platform(s)`,
          icon: '/icon.svg',
          tag: 'share-success',
          data: { proofId: proof.id, type: 'share' }
        });
      }

      console.log('✅ Proof sharing completed');
      return results;

    } catch (error) {
      errorService.logError('❌ Proof sharing failed:', error);
      throw error;
    }
  }

  /**
   * Share to specific platform
   */
  private async shareToplatform(
    proof: CommunityProof,
    platform: SocialPlatform,
    config: ShareConfiguration
  ): Promise<ShareResult> {
    const trackingId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    switch (platform.id) {
      case 'community':
        return this.shareToCommunity(proof, config, trackingId);
      
      case 'qr-code':
        return this.generateQRCode(proof, config, trackingId);
      
      case 'email':
        return this.shareViaEmail(proof, config, trackingId);
      
      default:
        return this.shareToSocialPlatform(proof, platform, config, trackingId);
    }
  }

  /**
   * Share to PersonaPass community
   */
  private async shareToCommunity(
    proof: CommunityProof,
    config: ShareConfiguration,
    trackingId: string
  ): Promise<ShareResult> {
    try {
      // Create enhanced proof for community sharing
      const sharedProof = await communityProofLibrary.shareProof(
        'did:persona:user:current',
        {
          title: proof.title,
          description: config.customMessage || proof.description,
          category: proof.category,
          proofType: proof.proofType,
          templateId: proof.templateId,
          tags: proof.tags,
          isAnonymous: config.anonymize,
          metadata: {
            ...proof.metadata,
            privacyLevel: config.privacy
          }
        },
        {
          isPublic: config.privacy === 'public',
          allowDerivatives: true,
          requireAttribution: !config.anonymize,
          commercialUse: false,
          shareableWith: config.privacy as any,
          currentUses: 0,
          licenseType: 'cc-by-sa'
        }
      );

      return {
        success: true,
        platform: 'community',
        shareUrl: `/community/proof/${sharedProof.id}`,
        trackingId
      };

    } catch (error) {
      throw new Error(`Community sharing failed: ${error}`);
    }
  }

  /**
   * Generate QR code for proof
   */
  private async generateQRCode(
    proof: CommunityProof,
    config: ShareConfiguration,
    trackingId: string
  ): Promise<ShareResult> {
    try {
      const shareData = {
        proofId: proof.id,
        title: proof.title,
        category: proof.category,
        trustScore: proof.trustScore,
        verificationLevel: proof.verification.isVerified,
        sharedAt: Date.now(),
        trackingId
      };

      const qrData = JSON.stringify(shareData);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

      return {
        success: true,
        platform: 'qr-code',
        shareUrl: qrUrl,
        trackingId
      };

    } catch (error) {
      throw new Error(`QR code generation failed: ${error}`);
    }
  }

  /**
   * Share via email
   */
  private async shareViaEmail(
    proof: CommunityProof,
    config: ShareConfiguration,
    trackingId: string
  ): Promise<ShareResult> {
    try {
      const subject = encodeURIComponent(`Check out my verified proof: ${proof.title}`);
      const body = encodeURIComponent(
        `${config.customMessage || ''}\n\n` +
        `I've verified my ${proof.category} credentials using PersonaPass:\n\n` +
        `• ${proof.title}\n` +
        `• Trust Score: ${(proof.trustScore * 100).toFixed(0)}%\n` +
        `• Verification Level: ${proof.verificationLevel}\n` +
        `• Community Endorsements: ${proof.endorsements}\n\n` +
        `Learn more about zero-knowledge proofs and digital identity at PersonaPass.`
      );

      const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

      // Open email client
      window.open(mailtoUrl, '_blank');

      return {
        success: true,
        platform: 'email',
        shareUrl: mailtoUrl,
        trackingId
      };

    } catch (error) {
      throw new Error(`Email sharing failed: ${error}`);
    }
  }

  /**
   * Share to external social platform
   */
  private async shareToSocialPlatform(
    proof: CommunityProof,
    platform: SocialPlatform,
    config: ShareConfiguration,
    trackingId: string
  ): Promise<ShareResult> {
    try {
      const baseUrl = window.location.origin;
      const proofUrl = `${baseUrl}/proof/${proof.id}`;
      
      let message = config.customMessage || 
        `Just verified my ${proof.category} credentials with @PersonaPass! ` +
        `Zero-knowledge proofs for privacy-preserving identity verification. #Web3 #DigitalIdentity #ZKProofs`;

      // Truncate message if needed
      if (platform.maxMessageLength && message.length > platform.maxMessageLength) {
        message = message.substring(0, platform.maxMessageLength - 3) + '...';
      }

      let shareUrl: string;

      switch (platform.id) {
        case 'twitter':
          shareUrl = `${platform.shareUrl}?text=${encodeURIComponent(message)}&url=${encodeURIComponent(proofUrl)}`;
          break;
        
        case 'linkedin':
          shareUrl = `${platform.shareUrl}?url=${encodeURIComponent(proofUrl)}&title=${encodeURIComponent(proof.title)}&summary=${encodeURIComponent(message)}`;
          break;
        
        case 'facebook':
          shareUrl = `${platform.shareUrl}?u=${encodeURIComponent(proofUrl)}&quote=${encodeURIComponent(message)}`;
          break;
        
        case 'reddit':
          shareUrl = `${platform.shareUrl}?url=${encodeURIComponent(proofUrl)}&title=${encodeURIComponent(proof.title)}`;
          break;
        
        case 'telegram':
          shareUrl = `${platform.shareUrl}?url=${encodeURIComponent(proofUrl)}&text=${encodeURIComponent(message)}`;
          break;
        
        case 'whatsapp':
          shareUrl = `${platform.shareUrl}?text=${encodeURIComponent(`${message} ${proofUrl}`)}`;
          break;
        
        default:
          throw new Error(`Unsupported platform: ${platform.id}`);
      }

      // Open share window
      window.open(shareUrl, '_blank', 'width=600,height=400');

      return {
        success: true,
        platform: platform.id,
        shareUrl,
        trackingId
      };

    } catch (error) {
      throw new Error(`${platform.name} sharing failed: ${error}`);
    }
  }

  /**
   * Get share analytics for a proof
   */
  async getShareAnalytics(proofId: string): Promise<ShareAnalytics> {
    try {
      const history = this.shareHistory.get(proofId) || [];
      const successfulShares = history.filter(h => h.success);

      const platformBreakdown: Record<string, number> = {};
      successfulShares.forEach(share => {
        platformBreakdown[share.platform] = (platformBreakdown[share.platform] || 0) + 1;
      });

      // Mock analytics data (in production, this would come from analytics service)
      return {
        totalShares: successfulShares.length,
        platformBreakdown,
        impressions: successfulShares.length * 150, // Estimated
        clicks: successfulShares.length * 12, // Estimated
        conversions: successfulShares.length * 2, // Estimated
        engagement: 0.08, // 8% engagement rate
        topProofs: [] // Would be populated from analytics service
      };

    } catch (error) {
      errorService.logError('Failed to get share analytics:', error);
      return {
        totalShares: 0,
        platformBreakdown: {},
        impressions: 0,
        clicks: 0,
        conversions: 0,
        engagement: 0,
        topProofs: []
      };
    }
  }

  /**
   * Add social verification
   */
  async addSocialVerification(verification: Omit<SocialVerification, 'id' | 'timestamp'>): Promise<boolean> {
    try {
      const id = `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullVerification: SocialVerification = {
        ...verification,
        id,
        timestamp: new Date().toISOString()
      };

      const verifications = this.verifications.get(verification.proofId) || [];
      verifications.push(fullVerification);
      this.verifications.set(verification.proofId, verifications);

      // Notify about social verification
      await pushNotificationService.notifyProofEndorsement(
        'your proof',
        verification.verifierProfile.name
      );

      console.log('✅ Social verification added');
      return true;

    } catch (error) {
      errorService.logError('Failed to add social verification:', error);
      return false;
    }
  }

  /**
   * Get social verifications for a proof
   */
  getSocialVerifications(proofId: string): SocialVerification[] {
    return this.verifications.get(proofId) || [];
  }

  /**
   * Get available platforms
   */
  getPlatforms(): SocialPlatform[] {
    return [...this.platforms];
  }

  /**
   * Update platform settings
   */
  updatePlatform(platformId: string, updates: Partial<SocialPlatform>): boolean {
    const index = this.platforms.findIndex(p => p.id === platformId);
    if (index === -1) return false;

    this.platforms[index] = { ...this.platforms[index], ...updates };
    return true;
  }

  /**
   * Get share history for a proof
   */
  getShareHistory(proofId: string): ShareResult[] {
    return this.shareHistory.get(proofId) || [];
  }

  /**
   * Use Web Share API if available
   */
  async nativeShare(proof: CommunityProof, config: ShareConfiguration): Promise<boolean> {
    if (!('share' in navigator)) {
      console.log('Web Share API not supported');
      return false;
    }

    try {
      await navigator.share({
        title: proof.title,
        text: config.customMessage || `Check out my verified ${proof.category} proof`,
        url: `${window.location.origin}/proof/${proof.id}`
      });

      console.log('✅ Native share completed');
      return true;

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        errorService.logError('Native share failed:', error);
      }
      return false;
    }
  }

  /**
   * Get sharing statistics
   */
  getOverallAnalytics(): ShareAnalytics {
    const allShares = Array.from(this.shareHistory.values()).flat().filter(h => h.success);
    
    const platformBreakdown: Record<string, number> = {};
    allShares.forEach(share => {
      platformBreakdown[share.platform] = (platformBreakdown[share.platform] || 0) + 1;
    });

    return {
      totalShares: allShares.length,
      platformBreakdown,
      impressions: allShares.length * 150,
      clicks: allShares.length * 12,
      conversions: allShares.length * 2,
      engagement: 0.08,
      topProofs: [] // Would calculate from share history
    };
  }
}

// Export singleton instance
export const socialSharingService = SocialSharingService.getInstance();