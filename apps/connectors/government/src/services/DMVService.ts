import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/config';
import { DriverLicenseVerification, VehicleRegistration, DriverRecord } from '../types/government';

export interface DMVAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface DMVLicenseRequest {
  licenseNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  lastFourSSN?: string;
}

export interface DMVVehicleRequest {
  licensePlate: string;
  vin?: string;
  state: string;
}

export class DMVService {
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;
  
  /**
   * Authenticate with DMV API using OAuth2
   */
  async authenticate(): Promise<string> {
    try {
      if (this.accessToken && Date.now() < this.tokenExpiration) {
        return this.accessToken;
      }
      
      console.log('🔐 Authenticating with DMV API...');
      
      const authData = {
        grant_type: 'client_credentials',
        client_id: config.dmv.clientId,
        client_secret: config.dmv.clientSecret,
        scope: config.dmv.scope
      };
      
      const response = await axios.post(
        config.dmv.tokenUrl,
        new URLSearchParams(authData),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const tokenData: DMVAuthResponse = response.data;
      this.accessToken = tokenData.access_token;
      this.tokenExpiration = Date.now() + (tokenData.expires_in * 1000);
      
      console.log('✅ DMV authentication successful');
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ Error authenticating with DMV:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock DMV token for development');
        this.accessToken = `dmv_mock_token_${Date.now()}`;
        this.tokenExpiration = Date.now() + 3600000; // 1 hour
        return this.accessToken;
      }
      
      throw new Error('Failed to authenticate with DMV API');
    }
  }
  
  /**
   * Verify driver's license
   */
  async verifyDriverLicense(request: DMVLicenseRequest): Promise<DriverLicenseVerification> {
    try {
      const accessToken = await this.authenticate();
      
      console.log('🚗 Verifying driver license with DMV...');
      
      // Hash sensitive data for logging
      const hashedSSN = request.lastFourSSN ? 
        crypto.createHash('sha256').update(request.lastFourSSN).digest('hex').substring(0, 8) : null;
      
      console.log(`📋 License verification request - License: ${request.licenseNumber.slice(-4)}, DOB: ${request.dateOfBirth}, SSN Hash: ${hashedSSN}`);
      
      const verificationRequest = {
        license_number: request.licenseNumber,
        first_name: request.firstName,
        last_name: request.lastName,
        date_of_birth: request.dateOfBirth,
        last_four_ssn: request.lastFourSSN
      };
      
      const response = await axios.post(
        `${config.dmv.baseUrl}${config.dmv.endpoints.licenseVerification}`,
        verificationRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': config.dmv.apiKey
          },
          timeout: 30000
        }
      );
      
      const dmvResponse = response.data;
      
      const verification: DriverLicenseVerification = {
        verified: dmvResponse.verified || false,
        licenseNumber: request.licenseNumber,
        firstName: request.firstName,
        lastName: request.lastName,
        dateOfBirth: request.dateOfBirth,
        licenseStatus: dmvResponse.license_status || 'unknown',
        licenseClass: dmvResponse.license_class || 'unknown',
        issuedDate: dmvResponse.issued_date,
        expirationDate: dmvResponse.expiration_date,
        restrictions: dmvResponse.restrictions || [],
        endorsements: dmvResponse.endorsements || [],
        state: dmvResponse.issuing_state || 'CA',
        confidence: dmvResponse.confidence || 0.95,
        source: 'State DMV',
        verifiedAt: new Date().toISOString(),
        metadata: {
          verification_id: dmvResponse.verification_id,
          response_time: dmvResponse.response_time
        }
      };
      
      console.log(`✅ Driver license verification completed - Status: ${verification.licenseStatus}`);
      return verification;
      
    } catch (error) {
      console.error('❌ Error verifying driver license:', error);
      
      // Return mock verification for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock driver license verification');
        return {
          verified: true,
          licenseNumber: request.licenseNumber,
          firstName: request.firstName,
          lastName: request.lastName,
          dateOfBirth: request.dateOfBirth,
          licenseStatus: 'valid',
          licenseClass: 'C',
          issuedDate: '2020-03-15',
          expirationDate: '2025-03-15',
          restrictions: [],
          endorsements: [],
          state: 'CA',
          confidence: 0.95,
          source: 'State DMV (Mock)',
          verifiedAt: new Date().toISOString(),
          metadata: {
            mockData: true
          }
        };
      }
      
      throw new Error('Failed to verify driver license with DMV');
    }
  }
  
  /**
   * Verify vehicle registration
   */
  async verifyVehicleRegistration(request: DMVVehicleRequest): Promise<VehicleRegistration> {
    try {
      const accessToken = await this.authenticate();
      
      console.log('🚙 Verifying vehicle registration with DMV...');
      
      const registrationRequest = {
        license_plate: request.licensePlate,
        vin: request.vin,
        state: request.state
      };
      
      const response = await axios.post(
        `${config.dmv.baseUrl}${config.dmv.endpoints.vehicleRegistration}`,
        registrationRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': config.dmv.apiKey
          },
          timeout: 30000
        }
      );
      
      const dmvResponse = response.data;
      
      const registration: VehicleRegistration = {
        verified: dmvResponse.verified || false,
        licensePlate: request.licensePlate,
        vin: dmvResponse.vin || request.vin,
        registrationStatus: dmvResponse.registration_status || 'unknown',
        make: dmvResponse.vehicle_make,
        model: dmvResponse.vehicle_model,
        year: dmvResponse.vehicle_year,
        registeredOwner: dmvResponse.registered_owner,
        registrationDate: dmvResponse.registration_date,
        expirationDate: dmvResponse.expiration_date,
        state: request.state,
        confidence: dmvResponse.confidence || 0.95,
        source: 'State DMV',
        verifiedAt: new Date().toISOString(),
        metadata: {
          verification_id: dmvResponse.verification_id,
          vehicle_type: dmvResponse.vehicle_type,
          fuel_type: dmvResponse.fuel_type
        }
      };
      
      console.log(`✅ Vehicle registration verification completed - Status: ${registration.registrationStatus}`);
      return registration;
      
    } catch (error) {
      console.error('❌ Error verifying vehicle registration:', error);
      
      // Return mock verification for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock vehicle registration verification');
        return {
          verified: true,
          licensePlate: request.licensePlate,
          vin: request.vin || 'MOCK1234567890123',
          registrationStatus: 'current',
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          registeredOwner: 'John Doe',
          registrationDate: '2022-01-15',
          expirationDate: '2025-01-15',
          state: request.state,
          confidence: 0.95,
          source: 'State DMV (Mock)',
          verifiedAt: new Date().toISOString(),
          metadata: {
            mockData: true,
            vehicle_type: 'passenger',
            fuel_type: 'gasoline'
          }
        };
      }
      
      throw new Error('Failed to verify vehicle registration with DMV');
    }
  }
  
  /**
   * Get driver record (for comprehensive background check)
   */
  async getDriverRecord(licenseNumber: string, firstName: string, lastName: string, dateOfBirth: string): Promise<DriverRecord> {
    try {
      const accessToken = await this.authenticate();
      
      console.log('📋 Fetching driver record from DMV...');
      
      const recordRequest = {
        license_number: licenseNumber,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth
      };
      
      const response = await axios.post(
        `${config.dmv.baseUrl}${config.dmv.endpoints.driverRecord}`,
        recordRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': config.dmv.apiKey
          },
          timeout: 30000
        }
      );
      
      const dmvResponse = response.data;
      
      const driverRecord: DriverRecord = {
        verified: dmvResponse.verified || false,
        licenseNumber,
        firstName,
        lastName,
        dateOfBirth,
        licenseStatus: dmvResponse.license_status,
        violations: dmvResponse.violations || [],
        accidents: dmvResponse.accidents || [],
        suspensions: dmvResponse.suspensions || [],
        pointBalance: dmvResponse.point_balance || 0,
        recordPeriod: dmvResponse.record_period || '3 years',
        safeDriverStatus: dmvResponse.safe_driver_status || false,
        source: 'State DMV',
        fetchedAt: new Date().toISOString(),
        metadata: {
          record_id: dmvResponse.record_id,
          last_updated: dmvResponse.last_updated
        }
      };
      
      console.log(`✅ Driver record fetched - Points: ${driverRecord.pointBalance}, Violations: ${driverRecord.violations.length}`);
      return driverRecord;
      
    } catch (error) {
      console.error('❌ Error fetching driver record:', error);
      
      // Return mock record for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock driver record');
        return {
          verified: true,
          licenseNumber,
          firstName,
          lastName,
          dateOfBirth,
          licenseStatus: 'valid',
          violations: [
            {
              date: '2023-05-15',
              violation: 'Speeding',
              points: 2,
              fine: 150,
              location: 'Highway 101'
            }
          ],
          accidents: [],
          suspensions: [],
          pointBalance: 2,
          recordPeriod: '3 years',
          safeDriverStatus: true,
          source: 'State DMV (Mock)',
          fetchedAt: new Date().toISOString(),
          metadata: {
            mockData: true
          }
        };
      }
      
      throw new Error('Failed to fetch driver record from DMV');
    }
  }
  
  /**
   * Generate OAuth2 authorization URL for user consent
   */
  async buildAuthorizationUrl(did: string, redirectUri?: string): Promise<{ authUrl: string; state: string }> {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const actualRedirectUri = redirectUri || config.dmv.redirectUri;
      
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.dmv.clientId,
        redirect_uri: actualRedirectUri,
        scope: config.dmv.scope,
        state,
        // Custom parameter for user identification
        user_reference: did
      });
      
      const authUrl = `${config.dmv.authUrl}?${params.toString()}`;
      
      console.log('🔗 DMV authorization URL generated');
      return { authUrl, state };
      
    } catch (error) {
      console.error('❌ Error building DMV authorization URL:', error);
      throw new Error('Failed to build DMV authorization URL');
    }
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri?: string): Promise<DMVAuthResponse> {
    try {
      console.log('🔄 Exchanging authorization code for DMV access token...');
      
      const tokenRequest = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri || config.dmv.redirectUri,
        client_id: config.dmv.clientId,
        client_secret: config.dmv.clientSecret
      };
      
      const response = await axios.post(
        config.dmv.tokenUrl,
        new URLSearchParams(tokenRequest),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ DMV access token obtained');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error exchanging DMV authorization code:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        return {
          access_token: `dmv_mock_user_token_${Date.now()}`,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: config.dmv.scope
        };
      }
      
      throw new Error('Failed to exchange DMV authorization code');
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<DMVAuthResponse> {
    try {
      console.log('🔄 Refreshing DMV access token...');
      
      const refreshRequest = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.dmv.clientId,
        client_secret: config.dmv.clientSecret
      };
      
      const response = await axios.post(
        config.dmv.tokenUrl,
        new URLSearchParams(refreshRequest),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ DMV access token refreshed');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error refreshing DMV access token:', error);
      throw new Error('Failed to refresh DMV access token');
    }
  }
  
  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      console.log('🔓 Revoking DMV access token...');
      
      await axios.post(
        `${config.dmv.baseUrl}/oauth/revoke`,
        { token: accessToken },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ DMV access token revoked');
      
    } catch (error) {
      console.warn('⚠️ DMV token revocation not supported or failed');
      // Don't throw here as revocation is best-effort
    }
  }
}