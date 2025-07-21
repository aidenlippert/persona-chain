import axios, { AxiosRequestConfig } from 'axios';
import { config } from '../config/config';
import { APIError } from '../middleware/errorHandler';
import { encrypt, decrypt } from '../middleware/auth';

export interface IDmeStudentProfile {
  sub: string;
  email: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  student_verification: {
    verified: boolean;
    status: 'verified' | 'pending' | 'denied';
    verification_date: string;
    attributes: {
      enrollment_status: 'enrolled' | 'graduated' | 'not_enrolled';
      institution_name?: string;
      degree_type?: string;
      major?: string;
      expected_graduation?: string;
      student_id?: string;
      gpa?: number;
      gpa_scale?: number;
    };
  };
}

export interface IDmeTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
}

export class IDmeService {
  private tokenStore = new Map<string, any>(); // In production, use Redis
  
  /**
   * Build ID.me OAuth authorization URL
   */
  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.idme.clientId,
      redirect_uri: config.idme.redirectUri,
      scope: config.idme.scope,
      state,
      // ID.me specific parameters for student verification
      op: 'student', // Operation type for student verification
      level: '2' // Verification level (2 = student verification)
    });
    
    return `${config.idme.baseUrl}/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<IDmeTokenResponse> {
    try {
      console.log('🔄 Exchanging authorization code for ID.me access token...');
      
      const response = await axios.post(
        `${config.idme.baseUrl}/oauth/token`,
        {
          grant_type: 'authorization_code',
          code,
          client_id: config.idme.clientId,
          client_secret: config.idme.clientSecret,
          redirect_uri: config.idme.redirectUri
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Successfully exchanged code for ID.me token');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error exchanging code for token:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock ID.me token for development');
        return {
          access_token: `mock_idme_token_${Date.now()}`,
          refresh_token: `mock_idme_refresh_${Date.now()}`,
          expires_in: 3600,
          token_type: 'Bearer',
          scope: config.idme.scope
        };
      }
      
      throw new APIError('Failed to exchange authorization code', 500);
    }
  }
  
  /**
   * Get student profile from ID.me
   */
  async getStudentProfile(accessToken: string): Promise<IDmeStudentProfile> {
    try {
      console.log('👤 Fetching student profile from ID.me...');
      
      const response = await axios.get(
        `${config.idme.baseUrl}/api/public/v3/userinfo`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      // Fetch additional student verification data
      const studentVerification = await this.getStudentVerificationData(accessToken);
      
      const profile: IDmeStudentProfile = {
        sub: response.data.sub,
        email: response.data.email,
        first_name: response.data.fname,
        last_name: response.data.lname,
        birth_date: response.data.birth_date,
        student_verification: studentVerification
      };
      
      console.log('✅ Successfully fetched ID.me student profile');
      return profile;
      
    } catch (error) {
      console.error('❌ Error fetching student profile:', error);
      
      // Return mock profile for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock ID.me profile for development');
        return {
          sub: `idme_user_${Date.now()}`,
          email: 'student@university.edu',
          first_name: 'John',
          last_name: 'Student',
          birth_date: '1998-03-15',
          student_verification: {
            verified: true,
            status: 'verified',
            verification_date: new Date().toISOString(),
            attributes: {
              enrollment_status: 'enrolled',
              institution_name: 'State University',
              degree_type: 'Bachelor of Science',
              major: 'Computer Science',
              expected_graduation: '2024-05-15',
              student_id: 'STU123456789',
              gpa: 3.7,
              gpa_scale: 4.0
            }
          }
        };
      }
      
      throw new APIError('Failed to fetch student profile', 500);
    }
  }
  
  /**
   * Get detailed student verification data
   */
  private async getStudentVerificationData(accessToken: string): Promise<IDmeStudentProfile['student_verification']> {
    try {
      const response = await axios.get(
        `${config.idme.baseUrl}/api/public/v3/attributes/student`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      return {
        verified: response.data.verified === true,
        status: response.data.status || 'verified',
        verification_date: response.data.verification_date || new Date().toISOString(),
        attributes: {
          enrollment_status: response.data.enrollment_status || 'enrolled',
          institution_name: response.data.institution_name,
          degree_type: response.data.degree_type,
          major: response.data.major,
          expected_graduation: response.data.expected_graduation,
          student_id: response.data.student_id,
          gpa: response.data.gpa ? parseFloat(response.data.gpa) : undefined,
          gpa_scale: response.data.gpa_scale ? parseFloat(response.data.gpa_scale) : undefined
        }
      };
      
    } catch (error) {
      console.warn('⚠️ Could not fetch detailed student verification data:', error.message);
      
      // Return basic verification data
      return {
        verified: true,
        status: 'verified',
        verification_date: new Date().toISOString(),
        attributes: {
          enrollment_status: 'enrolled'
        }
      };
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<IDmeTokenResponse> {
    try {
      console.log('🔄 Refreshing ID.me access token...');
      
      const response = await axios.post(
        `${config.idme.baseUrl}/oauth/token`,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.idme.clientId,
          client_secret: config.idme.clientSecret
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Successfully refreshed ID.me token');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      throw new APIError('Failed to refresh access token', 500);
    }
  }
  
  /**
   * Store encrypted token for DID
   */
  async storeTokenForDID(did: string, tokenData: IDmeTokenResponse): Promise<void> {
    const encryptedData = encrypt(JSON.stringify({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      scope: tokenData.scope
    }));
    
    // In production, store in encrypted database
    this.tokenStore.set(did, encryptedData);
    
    console.log(`🔐 Encrypted token stored for DID: ${did}`);
  }
  
  /**
   * Get token for DID
   */
  async getTokenForDID(did: string): Promise<any | null> {
    const encryptedData = this.tokenStore.get(did);
    if (!encryptedData) return null;
    
    try {
      const decryptedData = JSON.parse(decrypt(encryptedData));
      
      // Check if token is expired
      if (Date.now() >= decryptedData.expiresAt) {
        console.log(`⏰ Token expired for DID: ${did}`);
        
        // Try to refresh
        if (decryptedData.refreshToken) {
          const refreshed = await this.refreshAccessToken(decryptedData.refreshToken);
          await this.storeTokenForDID(did, refreshed);
          return {
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            expiresAt: Date.now() + (refreshed.expires_in * 1000),
            scope: refreshed.scope
          };
        }
        
        // Remove expired token
        this.tokenStore.delete(did);
        return null;
      }
      
      return decryptedData;
      
    } catch (error) {
      console.error('❌ Error decrypting token:', error);
      this.tokenStore.delete(did);
      return null;
    }
  }
  
  /**
   * Revoke access and delete stored tokens
   */
  async revokeAccess(did: string): Promise<void> {
    try {
      const tokenData = await this.getTokenForDID(did);
      
      if (tokenData) {
        // Revoke token with ID.me
        try {
          await axios.post(
            `${config.idme.baseUrl}/oauth/revoke`,
            {
              token: tokenData.accessToken,
              client_id: config.idme.clientId,
              client_secret: config.idme.clientSecret
            },
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
        } catch (revokeError) {
          console.warn('⚠️ Failed to revoke token with ID.me, but removing locally:', revokeError.message);
        }
        
        // Remove token from local storage
        this.tokenStore.delete(did);
      }
      
      console.log(`🔓 Access revoked for DID: ${did}`);
      
    } catch (error) {
      console.error('❌ Error revoking access:', error);
      throw new APIError('Failed to revoke access', 500);
    }
  }
  
  /**
   * Validate student verification status
   */
  async validateStudentStatus(did: string): Promise<{
    isValid: boolean;
    status: string;
    institution?: string;
    degree?: string;
    gpa?: number;
  }> {
    try {
      const tokenData = await this.getTokenForDID(did);
      if (!tokenData) {
        return { isValid: false, status: 'not_authenticated' };
      }
      
      const profile = await this.getStudentProfile(tokenData.accessToken);
      
      return {
        isValid: profile.student_verification.verified,
        status: profile.student_verification.status,
        institution: profile.student_verification.attributes.institution_name,
        degree: profile.student_verification.attributes.degree_type,
        gpa: profile.student_verification.attributes.gpa
      };
      
    } catch (error) {
      console.error('❌ Error validating student status:', error);
      return { isValid: false, status: 'validation_error' };
    }
  }
}