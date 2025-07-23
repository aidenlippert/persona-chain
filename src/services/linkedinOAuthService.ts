/**
 * LinkedIn OAuth 2.0 Service - Updated for 2025 API
 * Fixes all LinkedIn OAuth integration issues
 */

import { errorService } from './errorService';
import { rateLimitService } from './rateLimitService';

export interface LinkedInOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  environment: 'production' | 'development';
}

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: 'Bearer';
}

export interface LinkedInProfile {
  id: string;
  firstName: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
  lastName: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
  headline?: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
  profilePicture?: {
    'displayImage~': {
      elements: Array<{
        identifiers: Array<{ identifier: string }>;
      }>;
    };
  };
}

export interface LinkedInEmailResponse {
  elements: Array<{
    'handle~': {
      emailAddress: string;
    };
    handle: string;
    primary: boolean;
    type: string;
  }>;
}

export class LinkedInOAuthService {
  private config: LinkedInOAuthConfig;
  private readonly API_VERSION = 'v2';
  private readonly BASE_URL = 'https://api.linkedin.com';
  private readonly AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
  private readonly TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

  constructor(config: LinkedInOAuthConfig) {
    this.config = {
      ...config,
      scopes: config.scopes.length > 0 ? config.scopes : ['r_liteprofile', 'r_emailaddress']
    };
  }

  /**
   * Generate LinkedIn OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const authState = state || this.generateSecureState();
    
    // Store state for CSRF protection
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('linkedin_oauth_state', authState);
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state: authState,
      scope: this.config.scopes.join(' '),
    });

    return `${this.AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<LinkedInTokenResponse> {
    try {
      // Validate state parameter for CSRF protection
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const storedState = sessionStorage.getItem('linkedin_oauth_state');
        if (!storedState || storedState !== state) {
          throw new Error('Invalid state parameter - potential CSRF attack');
        }
      }

      // Check rate limiting
      const rateLimitCheck = rateLimitService.checkRateLimit('linkedin-oauth', 'linkedin-oauth');
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateLimitCheck.retryAfter / 1000)} seconds`);
      }

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      });

      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Persona-Wallet/1.0',
          'LinkedIn-Version': '202401', // Latest API version
        },
        body: tokenParams.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Record failed request for rate limiting
        rateLimitService.recordFailedRequest('linkedin-oauth', 'linkedin-oauth');
        
        const error = errorService.handleAPIError('LinkedIn', {
          status: response.status,
          message: errorData.error_description || response.statusText,
          ...errorData
        });
        
        throw error;
      }

      const tokenData = await response.json();

      // Clean up stored state
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('linkedin_oauth_state');
      }

      return {
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        token_type: 'Bearer'
      };

    } catch (error) {
      errorService.logError('LinkedIn token exchange error:', error);
      throw error;
    }
  }

  /**
   * Get LinkedIn profile information
   */
  async getProfile(accessToken: string): Promise<LinkedInProfile> {
    try {
      const response = await fetch(`${this.BASE_URL}/v2/people/~:(id,firstName,lastName,headline,profilePicture(displayImage~:playableStreams))`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw errorService.handleAPIError('LinkedIn Profile', {
          status: response.status,
          message: errorData.message || response.statusText,
          ...errorData
        });
      }

      return await response.json();
    } catch (error) {
      errorService.logError('LinkedIn profile fetch error:', error);
      throw error;
    }
  }

  /**
   * Get LinkedIn email address
   */
  async getEmailAddress(accessToken: string): Promise<string> {
    try {
      const response = await fetch(`${this.BASE_URL}/v2/emailAddresses?q=members&projection=(elements*(handle~))`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw errorService.handleAPIError('LinkedIn Email', {
          status: response.status,
          message: errorData.message || response.statusText,
          ...errorData
        });
      }

      const emailData: LinkedInEmailResponse = await response.json();
      
      // Find primary email or first available
      const primaryEmail = emailData.elements.find(e => e.primary);
      const email = primaryEmail || emailData.elements[0];
      
      if (!email || !email['handle~']) {
        throw new Error('No email address found in LinkedIn profile');
      }

      return email['handle~'].emailAddress;
    } catch (error) {
      errorService.logError('LinkedIn email fetch error:', error);
      throw error;
    }
  }

  /**
   * Get complete LinkedIn user data
   */
  async getCompleteProfile(accessToken: string): Promise<{
    profile: LinkedInProfile;
    email: string;
    formattedProfile: {
      id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      headline?: string;
      email: string;
      profilePicture?: string;
    };
  }> {
    try {
      const [profile, email] = await Promise.all([
        this.getProfile(accessToken),
        this.getEmailAddress(accessToken)
      ]);

      // Format profile data
      const firstName = this.getLocalizedText(profile.firstName);
      const lastName = this.getLocalizedText(profile.lastName);
      const headline = profile.headline ? this.getLocalizedText(profile.headline) : undefined;
      
      // Extract profile picture URL
      const profilePicture = profile.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier;

      const formattedProfile = {
        id: profile.id,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        headline,
        email,
        profilePicture
      };

      return {
        profile,
        email,
        formattedProfile
      };
    } catch (error) {
      errorService.logError('LinkedIn complete profile fetch error:', error);
      throw error;
    }
  }

  /**
   * Extract localized text from LinkedIn's localized format
   */
  private getLocalizedText(localizedField: { 
    localized: { [key: string]: string }; 
    preferredLocale: { country: string; language: string }; 
  }): string {
    const preferred = localizedField.preferredLocale;
    const preferredKey = `${preferred.language}_${preferred.country}`;
    
    // Try preferred locale first, then fallback to first available
    return localizedField.localized[preferredKey] || 
           localizedField.localized[Object.keys(localizedField.localized)[0]] || 
           '';
  }

  /**
   * Generate secure state parameter for CSRF protection
   */
  private generateSecureState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate LinkedIn OAuth configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.clientId) {
      errors.push('LinkedIn Client ID is required');
    }

    if (!this.config.clientSecret) {
      errors.push('LinkedIn Client Secret is required');
    }

    if (!this.config.redirectUri) {
      errors.push('LinkedIn Redirect URI is required');
    } else if (!this.config.redirectUri.startsWith('https://') && !this.config.redirectUri.startsWith('http://localhost')) {
      errors.push('LinkedIn Redirect URI must use HTTPS (except for localhost)');
    }

    if (!this.config.scopes || this.config.scopes.length === 0) {
      errors.push('LinkedIn OAuth scopes are required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Factory function to create LinkedIn OAuth service
export function createLinkedInOAuthService(): LinkedInOAuthService {
  const config: LinkedInOAuthConfig = {
    clientId: import.meta.env.VITE_LINKEDIN_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_LINKEDIN_CLIENT_SECRET || '',
    redirectUri: import.meta.env.VITE_LINKEDIN_REDIRECT_URI || `${window.location.origin}/auth/linkedin/callback`,
    scopes: (import.meta.env.VITE_LINKEDIN_SCOPES || 'r_liteprofile,r_emailaddress').split(','),
    environment: import.meta.env.VITE_ENVIRONMENT === 'production' ? 'production' : 'development'
  };

  return new LinkedInOAuthService(config);
}

// Export singleton instance
export const linkedInOAuthService = createLinkedInOAuthService();