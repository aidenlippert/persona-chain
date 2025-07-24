/**
 * 🔄 OAuth to Verifiable Credential Service
 * Converts OAuth API responses into W3C Verifiable Credentials
 * CRITICAL: This fixes the missing link between API auth and VC creation!
 */

import { v4 as uuidv4 } from 'uuid';
import { secureCredentialStorage } from '../secureCredentialStorage';
import { didService } from '../didService';
import { analyticsService } from '../analyticsService';
import { errorService } from '../errorService';

export interface OAuthResponse {
  platform: 'github' | 'linkedin' | 'plaid' | 'stripe' | 'twitter' | 'discord';
  accessToken: string;
  userData: any;
  metadata?: any;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: any;
  proof?: any;
}

class OAuthToVCService {
  /**
   * 🎯 Convert OAuth response to Verifiable Credential
   */
  async createVCFromOAuth(oauthResponse: OAuthResponse): Promise<VerifiableCredential> {
    try {
      console.log(`🔄 Converting ${oauthResponse.platform} OAuth to VC...`);

      // Get user DID
      const userDid = await didService.getActiveDid();
      if (!userDid) {
        throw new Error('No active DID found');
      }

      // Generate credential based on platform
      let credential: VerifiableCredential;
      
      switch (oauthResponse.platform) {
        case 'github':
          credential = await this.createGitHubVC(userDid, oauthResponse.userData);
          break;
        case 'linkedin':
          credential = await this.createLinkedInVC(userDid, oauthResponse.userData);
          break;
        case 'plaid':
          credential = await this.createPlaidVC(userDid, oauthResponse.userData);
          break;
        case 'stripe':
          credential = await this.createStripeVC(userDid, oauthResponse.userData);
          break;
        default:
          credential = await this.createGenericVC(userDid, oauthResponse);
      }

      // Store credential securely
      await secureCredentialStorage.storeCredential(credential as any);

      // Track analytics
      await analyticsService.track('credential_created', {
        platform: oauthResponse.platform,
        credentialType: credential.type[1],
        did: userDid
      });

      console.log('✅ Verifiable Credential created and stored successfully!');
      return credential;

    } catch (error) {
      errorService.logError('Failed to create VC from OAuth:', error);
      throw error;
    }
  }

  /**
   * 🐙 Create GitHub Developer Credential
   */
  private async createGitHubVC(userDid: string, githubData: any): Promise<VerifiableCredential> {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/citizenship/v1'
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'GitHubDeveloperCredential'],
      issuer: 'did:web:personapass.xyz',
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      credentialSubject: {
        id: userDid,
        platform: 'github',
        username: githubData.login,
        name: githubData.name,
        email: githubData.email,
        publicRepos: githubData.public_repos,
        followers: githubData.followers,
        createdAt: githubData.created_at,
        verified: true,
        profileUrl: githubData.html_url,
        developerStats: {
          totalStars: githubData.stats?.totalStars || 0,
          totalForks: githubData.stats?.totalForks || 0,
          languages: githubData.stats?.languages || {},
          contributionScore: githubData.stats?.contributionScore || 0
        }
      }
    };
  }

  /**
   * 💼 Create LinkedIn Professional Credential
   */
  private async createLinkedInVC(userDid: string, linkedInData: any): Promise<VerifiableCredential> {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/citizenship/v1'
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'LinkedInProfessionalCredential'],
      issuer: 'did:web:personapass.xyz',
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      credentialSubject: {
        id: userDid,
        platform: 'linkedin',
        name: `${linkedInData.firstName} ${linkedInData.lastName}`,
        email: linkedInData.emailAddress,
        headline: linkedInData.headline,
        profileUrl: linkedInData.publicProfileUrl,
        verified: true,
        professionalData: {
          industry: linkedInData.industry,
          positions: linkedInData.positions?.values || [],
          education: linkedInData.educations?.values || [],
          skills: linkedInData.skills?.values || [],
          connections: linkedInData.numConnections
        }
      }
    };
  }

  /**
   * 💰 Create Plaid Financial Credential
   */
  private async createPlaidVC(userDid: string, plaidData: any): Promise<VerifiableCredential> {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/citizenship/v1'
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'PlaidFinancialCredential'],
      issuer: 'did:web:personapass.xyz',
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      credentialSubject: {
        id: userDid,
        platform: 'plaid',
        verified: true,
        financialProfile: {
          accountsConnected: plaidData.accounts?.length || 0,
          institutionsLinked: plaidData.institutions || [],
          verificationDate: new Date().toISOString(),
          // Privacy-preserving - don't store actual balances
          hasVerifiedAccounts: true,
          accountTypes: plaidData.accounts?.map((a: any) => a.type) || []
        }
      }
    };
  }

  /**
   * 🆔 Create Stripe Identity Credential
   */
  private async createStripeVC(userDid: string, stripeData: any): Promise<VerifiableCredential> {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/citizenship/v1'
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'StripeIdentityCredential'],
      issuer: 'did:web:personapass.xyz',
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      credentialSubject: {
        id: userDid,
        platform: 'stripe',
        verified: true,
        identityVerification: {
          status: stripeData.status,
          verifiedAt: stripeData.created,
          documentType: stripeData.document?.type,
          liveness: stripeData.selfie?.status === 'verified',
          riskScore: stripeData.risk_score,
          verificationId: stripeData.id
        }
      }
    };
  }

  /**
   * 🌐 Create Generic Platform Credential
   */
  private async createGenericVC(userDid: string, oauthResponse: OAuthResponse): Promise<VerifiableCredential> {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/citizenship/v1'
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'PlatformCredential'],
      issuer: 'did:web:personapass.xyz',
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      credentialSubject: {
        id: userDid,
        platform: oauthResponse.platform,
        verified: true,
        userData: oauthResponse.userData,
        metadata: oauthResponse.metadata
      }
    };
  }

  /**
   * 🔄 Batch create VCs from multiple OAuth responses
   */
  async batchCreateVCs(oauthResponses: OAuthResponse[]): Promise<VerifiableCredential[]> {
    console.log(`📦 Batch creating ${oauthResponses.length} VCs...`);
    
    const credentials: VerifiableCredential[] = [];
    
    for (const response of oauthResponses) {
      try {
        const vc = await this.createVCFromOAuth(response);
        credentials.push(vc);
      } catch (error) {
        console.error(`Failed to create VC for ${response.platform}:`, error);
      }
    }

    console.log(`✅ Created ${credentials.length}/${oauthResponses.length} VCs successfully`);
    return credentials;
  }
}

// Export singleton instance
export const oauthToVCService = new OAuthToVCService();