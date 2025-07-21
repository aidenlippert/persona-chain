import crypto from 'crypto';
import { CensusService } from './CensusService';
import { DMVService } from './DMVService';
import { USPSService } from './USPSService';
import { IRSService } from './IRSService';
import { config } from '../config/config';
import { 
  GovernmentCredential, 
  ResidencyVerification, 
  DriverLicenseVerification, 
  VehicleRegistration,
  DemographicData,
  GeographicData,
  AccessTokenData
} from '../types/government';

export class GovernmentService {
  private censusService: CensusService;
  private dmvService: DMVService;
  private uspsService: USPSService;
  private irsService: IRSService;
  private tokenStore = new Map<string, AccessTokenData>(); // In production, use encrypted database
  private credentialStore = new Map<string, GovernmentCredential>(); // In production, use database
  
  constructor() {
    this.censusService = new CensusService();
    this.dmvService = new DMVService();
    this.uspsService = new USPSService();
    this.irsService = new IRSService();
  }
  
  /**
   * Verify residency using Census Bureau address verification
   */
  async verifyResidency(
    did: string, 
    address: { street: string; city: string; state: string; zip: string }
  ): Promise<GovernmentCredential> {
    try {
      console.log('🏛️ Creating residency verification credential...');
      
      // Verify address with Census Bureau
      const residencyVerification = await this.censusService.verifyAddress(address);
      
      // Get demographic and geographic data for additional context
      const [geographicData, demographicData] = await Promise.allSettled([
        this.censusService.getGeographicData(address),
        this.censusService.getDemographicData('tract', '12345') // Would use actual FIPS code from geocoding
      ]);
      
      // Generate commitment hash for ZK proofs
      const rawData = {
        residencyVerification,
        geographicData: geographicData.status === 'fulfilled' ? geographicData.value : null,
        demographicData: demographicData.status === 'fulfilled' ? demographicData.value : null
      };
      
      const rawDataHash = this.hashData(rawData);
      const commitment = this.hashData({
        did,
        type: 'residency',
        source: 'census',
        verified: residencyVerification.verified,
        address: residencyVerification.standardizedAddress || residencyVerification.address,
        timestamp: Date.now()
      });
      
      const credential: GovernmentCredential = {
        id: `residency_${did}_${Date.now()}`,
        did,
        type: 'residency',
        source: 'census',
        verified: residencyVerification.verified,
        data: residencyVerification,
        commitment,
        rawDataHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      };
      
      // Store credential
      this.credentialStore.set(credential.id, credential);
      
      console.log(`✅ Residency credential created: ${credential.id}`);
      return credential;
      
    } catch (error) {
      console.error('❌ Error creating residency verification:', error);
      throw new Error('Failed to verify residency with government sources');
    }
  }
  
  /**
   * Verify driver's license with DMV
   */
  async verifyDriverLicense(
    did: string,
    licenseData: {
      licenseNumber: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      lastFourSSN?: string;
    }
  ): Promise<GovernmentCredential> {
    try {
      console.log('🚗 Creating driver license verification credential...');
      
      // Verify license with DMV
      const licenseVerification = await this.dmvService.verifyDriverLicense(licenseData);
      
      // Generate commitment hash
      const rawDataHash = this.hashData(licenseVerification);
      const commitment = this.hashData({
        did,
        type: 'driver_license',
        source: 'dmv',
        verified: licenseVerification.verified,
        licenseNumber: licenseVerification.licenseNumber,
        state: licenseVerification.state,
        timestamp: Date.now()
      });
      
      const credential: GovernmentCredential = {
        id: `driver_license_${did}_${Date.now()}`,
        did,
        type: 'driver_license',
        source: 'dmv',
        verified: licenseVerification.verified,
        data: licenseVerification,
        commitment,
        rawDataHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 6 months
      };
      
      this.credentialStore.set(credential.id, credential);
      
      console.log(`✅ Driver license credential created: ${credential.id}`);
      return credential;
      
    } catch (error) {
      console.error('❌ Error creating driver license verification:', error);
      throw new Error('Failed to verify driver license with DMV');
    }
  }
  
  /**
   * Verify vehicle registration with DMV
   */
  async verifyVehicleRegistration(
    did: string,
    vehicleData: {
      licensePlate: string;
      vin?: string;
      state: string;
    }
  ): Promise<GovernmentCredential> {
    try {
      console.log('🚙 Creating vehicle registration verification credential...');
      
      // Verify registration with DMV
      const registrationVerification = await this.dmvService.verifyVehicleRegistration(vehicleData);
      
      // Generate commitment hash
      const rawDataHash = this.hashData(registrationVerification);
      const commitment = this.hashData({
        did,
        type: 'vehicle_registration',
        source: 'dmv',
        verified: registrationVerification.verified,
        licensePlate: registrationVerification.licensePlate,
        state: registrationVerification.state,
        timestamp: Date.now()
      });
      
      const credential: GovernmentCredential = {
        id: `vehicle_registration_${did}_${Date.now()}`,
        did,
        type: 'vehicle_registration',
        source: 'dmv',
        verified: registrationVerification.verified,
        data: registrationVerification,
        commitment,
        rawDataHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      };
      
      this.credentialStore.set(credential.id, credential);
      
      console.log(`✅ Vehicle registration credential created: ${credential.id}`);
      return credential;
      
    } catch (error) {
      console.error('❌ Error creating vehicle registration verification:', error);
      throw new Error('Failed to verify vehicle registration with DMV');
    }
  }
  
  /**
   * Create comprehensive government profile
   */
  async createGovernmentProfile(did: string): Promise<{
    residency?: GovernmentCredential;
    driverLicense?: GovernmentCredential;
    vehicleRegistration?: GovernmentCredential;
    demographicProfile?: GovernmentCredential;
    summary: any;
  }> {
    try {
      console.log('📋 Creating comprehensive government profile...');
      
      const profile: any = {
        did,
        summary: {
          verifications: 0,
          sources: [],
          confidence: 0,
          lastUpdated: new Date().toISOString()
        }
      };
      
      const credentials = Array.from(this.credentialStore.values())
        .filter(cred => cred.did === did)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Organize credentials by type
      for (const credential of credentials) {
        switch (credential.type) {
          case 'residency':
            if (!profile.residency) profile.residency = credential;
            break;
          case 'driver_license':
            if (!profile.driverLicense) profile.driverLicense = credential;
            break;
          case 'vehicle_registration':
            if (!profile.vehicleRegistration) profile.vehicleRegistration = credential;
            break;
          case 'demographic_profile':
            if (!profile.demographicProfile) profile.demographicProfile = credential;
            break;
        }
      }
      
      // Calculate summary statistics
      const verificationCount = Object.keys(profile).filter(key => 
        key !== 'did' && key !== 'summary' && profile[key]
      ).length;
      
      const uniqueSources = new Set(credentials.map(c => c.source));
      const verifiedCredentials = credentials.filter(c => c.verified);
      const averageConfidence = verifiedCredentials.length > 0 
        ? verifiedCredentials.reduce((sum, c) => {
            const data = c.data as any;
            return sum + (data.confidence || 0);
          }, 0) / verifiedCredentials.length
        : 0;
      
      profile.summary = {
        verifications: verificationCount,
        sources: Array.from(uniqueSources),
        confidence: averageConfidence,
        verified: verifiedCredentials.length,
        total: credentials.length,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`✅ Government profile created with ${verificationCount} verifications`);
      return profile;
      
    } catch (error) {
      console.error('❌ Error creating government profile:', error);
      throw new Error('Failed to create comprehensive government profile');
    }
  }
  
  /**
   * Get stored government credential by ID
   */
  async getGovernmentCredential(credentialId: string): Promise<GovernmentCredential | null> {
    return this.credentialStore.get(credentialId) || null;
  }
  
  /**
   * List government credentials for a DID
   */
  async listGovernmentCredentials(did: string): Promise<GovernmentCredential[]> {
    const credentials = Array.from(this.credentialStore.values())
      .filter(cred => cred.did === did)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return credentials;
  }
  
  /**
   * Delete government credential (compliance with data retention policies)
   */
  async deleteGovernmentCredential(credentialId: string): Promise<void> {
    this.credentialStore.delete(credentialId);
    console.log(`🗑️ Government credential deleted: ${credentialId}`);
  }
  
  /**
   * Store DMV access token for user
   */
  async storeDMVAccessToken(did: string, tokenData: any): Promise<void> {
    const key = `dmv:${did}`;
    
    // In production, encrypt and store in database
    this.tokenStore.set(key, {
      accessToken: this.encryptData(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? this.encryptData(tokenData.refresh_token) : undefined,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      scope: tokenData.scope,
      agency: 'dmv',
      userId: did
    });
    
    console.log(`🔐 DMV access token stored for DID: ${did}`);
  }
  
  /**
   * Get DMV access token for user
   */
  async getDMVAccessToken(did: string): Promise<AccessTokenData | null> {
    const key = `dmv:${did}`;
    const tokenData = this.tokenStore.get(key);
    
    if (!tokenData) return null;
    
    // Check if token is expired
    if (Date.now() >= tokenData.expiresAt) {
      console.log(`⏰ DMV token expired for DID: ${did}`);
      this.tokenStore.delete(key);
      return null;
    }
    
    return {
      ...tokenData,
      accessToken: this.decryptData(tokenData.accessToken),
      refreshToken: tokenData.refreshToken ? this.decryptData(tokenData.refreshToken) : undefined
    };
  }
  
  /**
   * Check authorization status for government services
   */
  async checkAuthorizationStatus(did: string): Promise<{
    authorized: boolean;
    dmv: boolean;
    census: boolean;
    usps: boolean;
    irs: boolean;
    authUrls?: any;
  }> {
    try {
      const dmvToken = await this.getDMVAccessToken(did);
      
      // Census Bureau API doesn't require user authorization, just API key
      const censusAvailable = !!config.census.apiKey;
      
      // USPS and IRS would have similar token checks
      const uspsAvailable = true; // USPS API available with credentials
      const irsAvailable = true; // IRS API available with proper certification
      
      const dmvAuthorized = !!dmvToken;
      
      if (!dmvAuthorized) {
        const { authUrl } = await this.dmvService.buildAuthorizationUrl(did);
        return {
          authorized: false,
          dmv: false,
          census: censusAvailable,
          usps: uspsAvailable,
          irs: irsAvailable,
          authUrls: {
            dmv: authUrl
          }
        };
      }
      
      return {
        authorized: dmvAuthorized,
        dmv: dmvAuthorized,
        census: censusAvailable,
        usps: uspsAvailable,
        irs: irsAvailable
      };
      
    } catch (error) {
      console.error('Error checking government authorization status:', error);
      return {
        authorized: false,
        dmv: false,
        census: false,
        usps: false,
        irs: false,
        authUrls: {
          dmv: `/oauth/authorize/dmv?did=${did}`
        }
      };
    }
  }
  
  /**
   * Revoke DMV access
   */
  async revokeDMVAccess(did: string): Promise<void> {
    try {
      const accessToken = await this.getDMVAccessToken(did);
      if (accessToken) {
        await this.dmvService.revokeToken(accessToken.accessToken);
        this.tokenStore.delete(`dmv:${did}`);
      }
      
      console.log(`🔓 DMV access revoked for DID: ${did}`);
    } catch (error) {
      console.error('❌ Error revoking DMV access:', error);
      throw error;
    }
  }
  
  /**
   * Encrypt sensitive data
   */
  private encryptData(data: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, config.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
  }
  
  /**
   * Decrypt sensitive data
   */
  private decryptData(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipher(algorithm, config.encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Hash data for commitment generation
   */
  private hashData(data: any): string {
    const stringified = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(stringified).digest('hex');
  }
  
  /**
   * Verify government credential authenticity
   */
  async verifyCredential(commitment: string, metadata: any): Promise<{ 
    verified: boolean; 
    confidence: number; 
    sources: string[] 
  }> {
    try {
      console.log('🔍 Verifying government credential...');
      
      // In production, this would verify against government databases
      const verified = Math.random() > 0.05; // 95% verification rate for demo
      const confidence = verified ? 0.97 : 0.12;
      
      return {
        verified,
        confidence,
        sources: metadata.sources || ['US Census Bureau', 'State DMV', 'USPS', 'IRS']
      };
      
    } catch (error) {
      console.error('❌ Error verifying government credential:', error);
      return {
        verified: false,
        confidence: 0,
        sources: []
      };
    }
  }
}