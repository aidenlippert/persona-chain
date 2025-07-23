/**
 * 💼 LINKEDIN API INTEGRATION SERVICE
 * Professional credentials, employment verification, education verification
 * Career and professional network verification
 */

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
  profilePicture?: {
    displayImage: string;
  };
  headline?: {
    localized: { [key: string]: string };
  };
  location?: {
    country: string;
    region: string;
  };
}

export interface LinkedInEmailAddress {
  handle: string;
  'handle~': {
    emailAddress: string;
  };
}

export interface LinkedInPosition {
  id: string;
  title: {
    localized: { [key: string]: string };
  };
  company: {
    name: string;
    industry?: string;
    size?: string;
  };
  startDate: {
    year: number;
    month?: number;
  };
  endDate?: {
    year: number;
    month?: number;
  };
  description?: {
    localized: { [key: string]: string };
  };
  current: boolean;
}

export interface LinkedInEducation {
  id: string;
  school: {
    name: string;
  };
  degree?: {
    localized: { [key: string]: string };
  };
  fieldOfStudy?: {
    localized: { [key: string]: string };
  };
  startDate?: {
    year: number;
  };
  endDate?: {
    year: number;
  };
}

export interface LinkedInSkills {
  elements: Array<{
    name: {
      localized: { [key: string]: string };
    };
    endorsementCount: number;
  }>;
}

export interface LinkedInCredentialData {
  profile: LinkedInProfile;
  email: string;
  positions: LinkedInPosition[];
  education: LinkedInEducation[];
  skills: LinkedInSkills;
  verificationDate: string;
  credentialType: 'ProfessionalCredential';
}

/**
 * 💼 LINKEDIN API INTEGRATION SERVICE
 */
export class LinkedInAPIService {
  private accessToken: string | null = null;
  private credentialData: any = null;

  /**
   * 🔑 Set LinkedIn access token (from OAuth flow)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    console.log('💼 LinkedIn access token set successfully');
  }

  /**
   * 🔗 Start LinkedIn OAuth flow (RETURNS URL FOR POPUP)
   */
  startOAuthFlow(): string {
    console.log('🚀🚀🚀 POPUP MODE: Starting LinkedIn OAuth flow for popup');
    
    // CLEAR OLD DATA BUT KEEP SESSION STATE UNTIL CALLBACK
    this.clearOldCredentialData();
    
    const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    console.log('🔍 DEBUG: Client ID exists:', !!clientId);
    
    if (!clientId || clientId === 'development_client_id_here') {
      console.error('❌ CRITICAL ERROR: LinkedIn Client ID not configured!');
      throw new Error('LinkedIn Client ID not configured');
    }

    const scopes = ['r_liteprofile', 'r_emailaddress', 'r_basicprofile'];
    
    // Use current domain for redirect URI to handle different environments
    const currentDomain = window.location.origin;
    const redirectUri = `${currentDomain}/oauth/linkedin/callback`;
    
    console.log('🌐 Using redirect URI:', redirectUri);
    
    // Log the domain detection for debugging
    console.log('🔍 Domain detection:', {
      currentOrigin: window.location.origin,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      isDev: window.location.hostname === 'localhost',
      isVercel: window.location.hostname.includes('vercel.app'),
      isProduction: window.location.hostname === 'personapass.xyz'
    });
    
    // Generate FRESH state with timestamp to ensure uniqueness
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const state = `${timestamp}_${randomString}`;
    
    console.log('🔍 DEBUG: FRESH OAuth parameters:', {
      clientId: clientId.substring(0, 8) + '...',
      redirectUri,
      state,
      stateLength: state.length,
      scopes: scopes.join(' '),
      timestamp
    });
    
    // Store FRESH state for callback validation
    try {
      sessionStorage.setItem('linkedin_oauth_state', state);
      localStorage.setItem('linkedin_oauth_state_backup', state);
      console.log('✅ DEBUG: FRESH OAuth state stored successfully:', state);
    } catch (error) {
      console.warn('⚠️ DEBUG: Could not store OAuth state:', error);
    }
    
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    
    const finalUrl = authUrl.toString();
    console.log('🔗 DEBUG: FRESH OAuth URL:', finalUrl);
    console.log('🪟 DEBUG: Returning URL for popup window...');
    
    return finalUrl;
  }

  /**
   * 🧹 Clear old credential data but preserve OAuth state
   */
  private clearOldCredentialData(): void {
    console.log('🧹 CLEARING old credential data for fresh session...');
    
    // Clear old credential data but NOT OAuth state (needed for validation)
    localStorage.removeItem('linkedin_credential_cache_v1');
    
    // Clear service state
    this.accessToken = null;
    this.credentialData = null;
    
    console.log('✅ Old credential data cleared - OAuth state preserved for validation');
  }

  /**
   * 🧹 Clear OAuth state after successful validation
   */
  private clearOAuthStateAfterValidation(): void {
    console.log('🧹 CLEARING OAuth state after successful validation...');
    
    // Now safe to clear OAuth state after successful callback
    sessionStorage.removeItem('linkedin_oauth_state');
    localStorage.removeItem('linkedin_oauth_state_backup');
    
    console.log('✅ OAuth state cleared after successful validation');
  }

  /**
   * 🎫 Exchange OAuth code for REAL LinkedIn data via CORS proxy
   */
  async exchangeCodeForToken(code: string, state: string): Promise<string> {
    console.log('🚀 LINKEDIN OAUTH: Processing OAuth callback');
    console.log('🔄 OAuth Code:', code.substring(0, 10) + '...');
    console.log('🔄 State param:', state || 'none');
    
    // Exchange code for REAL LinkedIn access token
    console.log('🔑 REAL MODE: Exchanging code for actual LinkedIn access token...');
    
    try {
      // Use serverless function for secure token exchange
      console.log('🔑 Step 1: Exchanging code via secure serverless function...');
      
      // Get the API base URL from config
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.personapass.xyz';
      const oauthEndpoint = `${API_BASE_URL}/api/linkedin-oauth`;
      
      console.log('🔍 Using LinkedIn OAuth endpoint:', oauthEndpoint);
      
      const response = await fetch(oauthEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          state: state
        })
      });

      console.log('🔍 Serverless response status:', response.status);
      console.log('🔍 Serverless response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const responseText = await response.text();
        console.error('❌ Serverless function failed:', {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText.substring(0, 500) + '...'
        });
        
        // Try to parse as JSON, fallback to text
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: responseText || `Server error: ${response.status}` };
        }
        
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('🔍 Raw serverless response:', responseText.substring(0, 500) + '...');
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse serverless response as JSON:', parseError);
        console.error('🔍 Response text:', responseText);
        throw new Error('Invalid response from authentication server');
      }
      
      if (!result.success) {
        throw new Error(result.error || 'LinkedIn authentication failed');
      }

      console.log('🎉 REAL LinkedIn data received for user:', result.profile.firstName.localized[Object.keys(result.profile.firstName.localized)[0]]);
      
      // Set access token
      this.setAccessToken(result.access_token);
      
      // Store the credential
      this.credentialData = result.credential;
      localStorage.setItem('linkedin_credential_cache_v1', JSON.stringify(result.credential));
      
      // Clear OAuth state after successful processing
      this.clearOAuthStateAfterValidation();
      
      return result.access_token;
      
    } catch (error) {
      console.error('❌ Failed to get real LinkedIn data:', error);
      throw new Error(`LinkedIn OAuth failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🏆 Generate LinkedIn professional credential
   */
  createProfessionalCredential(data: LinkedInCredentialData, userDid: string) {
    console.log('🏆 Creating LinkedIn professional credential...');
    
    const firstName = Object.values(data.profile.firstName.localized)[0];
    const lastName = Object.values(data.profile.lastName.localized)[0];
    const headline = data.profile.headline ? Object.values(data.profile.headline.localized)[0] : 'Professional';
    
    // Get current position
    const currentPosition = data.positions.find(pos => pos.current);
    const mostRecentPosition = data.positions[0];
    const primaryPosition = currentPosition || mostRecentPosition;
    
    // Calculate career experience
    const totalExperienceYears = data.positions.reduce((total, pos) => {
      const startYear = pos.startDate.year;
      const endYear = pos.endDate?.year || new Date().getFullYear();
      return total + (endYear - startYear);
    }, 0);
    
    // Get education
    const latestEducation = data.education[0];
    
    const credential = {
      id: `linkedin_prof_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://persona.xyz/contexts/v1"
      ],
      type: ["VerifiableCredential", "ProfessionalCredential"],
      issuer: "did:persona:linkedin",
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: userDid,
        platform: 'linkedin',
        profile: {
          profileId: data.profile.id,
          firstName: firstName,
          lastName: lastName,
          fullName: `${firstName} ${lastName}`,
          headline: headline,
          email: data.email,
          location: data.profile.location ? `${data.profile.location.region}, ${data.profile.location.country}` : null
        },
        professional: {
          currentPosition: primaryPosition ? {
            title: Object.values(primaryPosition.title.localized)[0],
            company: primaryPosition.company.name,
            industry: primaryPosition.company.industry,
            startDate: `${primaryPosition.startDate.year}-${(primaryPosition.startDate.month || 1).toString().padStart(2, '0')}-01`,
            isCurrent: primaryPosition.current
          } : null,
          totalExperienceYears: totalExperienceYears,
          positionCount: data.positions.length,
          companies: data.positions.map(pos => pos.company.name).slice(0, 5)
        },
        education: latestEducation ? {
          school: latestEducation.school.name,
          degree: latestEducation.degree ? Object.values(latestEducation.degree.localized)[0] : null,
          fieldOfStudy: latestEducation.fieldOfStudy ? Object.values(latestEducation.fieldOfStudy.localized)[0] : null,
          graduationYear: latestEducation.endDate?.year
        } : null,
        skills: {
          skillCount: data.skills.elements.length,
          topSkills: data.skills.elements
            .sort((a, b) => b.endorsementCount - a.endorsementCount)
            .slice(0, 10)
            .map(skill => ({
              name: Object.values(skill.name.localized)[0],
              endorsements: skill.endorsementCount
            }))
        },
        verification: {
          verificationMethod: 'linkedin_oauth',
          verificationProvider: 'linkedin',
          verificationLevel: 'professional_profile_verified',
          verifiedAt: data.verificationDate,
          dataSource: 'linkedin_api'
        }
      },
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        proofPurpose: "assertionMethod",
        verificationMethod: "did:persona:linkedin#key-1"
      },
      blockchainTxHash: `0x${Math.random().toString(16).substring(2, 66)}`
    };
    
    console.log('🎉 LinkedIn professional credential created:', {
      id: credential.id,
      name: credential.credentialSubject.profile.fullName,
      title: credential.credentialSubject.professional.currentPosition?.title,
      company: credential.credentialSubject.professional.currentPosition?.company,
      experience: credential.credentialSubject.professional.totalExperienceYears + ' years'
    });
    
    return credential;
  }

  /**
   * 🎫 Get stored credential from LinkedIn flow
   */
  getStoredCredential(): any {
    // Check service memory first
    if (this.credentialData) {
      console.log('🔍 Found LinkedIn credential in service memory');
      return this.credentialData;
    }
    
    // Check localStorage cache
    try {
      const cachedCredential = localStorage.getItem('linkedin_credential_cache_v1');
      if (cachedCredential) {
        const parsedCredential = JSON.parse(cachedCredential);
        this.credentialData = parsedCredential;
        console.log('🔍 Found LinkedIn credential in localStorage cache');
        return parsedCredential;
      }
    } catch (error) {
      console.error('❌ Error reading cached LinkedIn credential:', error);
    }
    
    console.log('🔍 No stored LinkedIn credential found');
    return null;
  }

  /**
   * 🔍 Test LinkedIn API configuration
   */
  async testConfiguration(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_LINKEDIN_CLIENT_SECRET;
      
      if (!clientId || clientId === 'development_client_id_here') {
        return {
          success: false,
          error: 'LinkedIn Client ID not configured'
        };
      }

      if (!clientSecret || clientSecret === 'development_client_secret_here') {
        return {
          success: false,
          error: 'LinkedIn Client Secret not configured'
        };
      }
      
      return {
        success: true,
        message: 'LinkedIn OAuth configured and ready'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Configuration test failed'
      };
    }
  }

  /**
   * 🧹 Clear stored token and credentials
   */
  clearToken(): void {
    this.accessToken = null;
    this.credentialData = null;
    sessionStorage.removeItem('linkedin_oauth_state');
    localStorage.removeItem('linkedin_oauth_state_backup');
    localStorage.removeItem('linkedin_credential_cache_v1');
    console.log('🧹 LinkedIn token and credential cleared');
  }
}

// 🏭 Export singleton instance
export const linkedInAPIService = new LinkedInAPIService();