/**
 * Twilio API Service for PersonaPass - Phone Number Verification
 * Implements our comprehensive API integration framework
 */

import { BaseApiService, ApiResponse, ApiRequestConfig } from '../base/BaseApiService';
import { VCGenerationFramework, ApiDataMapping, VCGenerationConfig } from '../vc/VCGenerationFramework';
import { VerifiableCredential } from '../../../types/credentials';
import { errorService } from "@/services/errorService";

export interface TwilioVerificationResponse {
  sid: string;
  status: 'pending' | 'approved' | 'canceled';
  valid: boolean;
  to: string;
  channel: 'sms' | 'call' | 'email' | 'whatsapp';
  amount?: string;
  payee?: string;
  date_created: string;
  date_updated: string;
}

export interface TwilioVerificationCheckResponse {
  sid: string;
  status: 'approved' | 'pending' | 'canceled';
  valid: boolean;
  to: string;
  channel: string;
  date_created: string;
  date_updated: string;
}

export interface TwilioPhoneLookupResponse {
  caller_name?: {
    caller_name: string;
    caller_type: string;
    error_code?: string;
  };
  country_code: string;
  phone_number: string;
  national_format: string;
  carrier?: {
    mobile_country_code: string;
    mobile_network_code: string;
    name: string;
    type: 'mobile' | 'landline' | 'voip';
    error_code?: string;
  };
  add_ons?: any;
  url: string;
}

export class TwilioApiService extends BaseApiService {
  private vcFramework: VCGenerationFramework;
  private serviceSid: string;

  constructor() {
    super('twilio');
    this.vcFramework = VCGenerationFramework.getInstance();
    this.serviceSid = process.env.VITE_TWILIO_VERIFY_SERVICE_SID || 'default';
  }

  /**
   * Override auth headers for Twilio's basic auth
   */
  protected getAuthHeaders(): Record<string, string> {
    const credentials = this.credentialManager.getCredentials(this.provider);
    if (!credentials) {
      throw new Error(`No credentials found for provider: ${this.provider}`);
    }

    const authString = btoa(`${credentials.apiKey}:${credentials.apiSecret}`);
    return {
      'Authorization': `Basic ${authString}`
    };
  }

  /**
   * Send verification code to phone number
   */
  async sendVerificationCode(
    phoneNumber: string, 
    channel: 'sms' | 'call' = 'sms'
  ): Promise<ApiResponse<TwilioVerificationResponse>> {
    const config: ApiRequestConfig = {
      method: 'POST',
      endpoint: `/Accounts/${this.getAccountSid()}/Verify/Services/${this.serviceSid}/Verifications`,
      data: {
        To: phoneNumber,
        Channel: channel
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    // Convert JSON data to URL-encoded format for Twilio
    const formData = new URLSearchParams(config.data as Record<string, string>);
    
    return this.executeFormRequest<TwilioVerificationResponse>(config, formData);
  }

  /**
   * Verify the code sent to phone number
   */
  async verifyCode(
    phoneNumber: string, 
    code: string
  ): Promise<ApiResponse<TwilioVerificationCheckResponse>> {
    const config: ApiRequestConfig = {
      method: 'POST',
      endpoint: `/Accounts/${this.getAccountSid()}/Verify/Services/${this.serviceSid}/VerificationChecks`,
      data: {
        To: phoneNumber,
        Code: code
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const formData = new URLSearchParams(config.data as Record<string, string>);
    
    return this.executeFormRequest<TwilioVerificationCheckResponse>(config, formData);
  }

  /**
   * Lookup phone number information (carrier, type, etc.)
   */
  async lookupPhoneNumber(phoneNumber: string): Promise<ApiResponse<TwilioPhoneLookupResponse>> {
    const config: ApiRequestConfig = {
      method: 'GET',
      endpoint: `/Accounts/${this.getAccountSid()}/Lookups/PhoneNumbers/${encodeURIComponent(phoneNumber)}?Type=carrier,caller-name`
    };

    return this.executeRequest<TwilioPhoneLookupResponse>(config);
  }

  /**
   * Execute form-encoded request (Twilio uses form encoding)
   */
  private async executeFormRequest<T>(
    config: ApiRequestConfig, 
    formData: URLSearchParams
  ): Promise<ApiResponse<T>> {
    const { method, endpoint, headers = {} } = config;

    // Check credentials and rate limits
    if (!this.credentialManager.isCredentialValid(this.provider)) {
      return {
        success: false,
        error: `Invalid or expired credentials for ${this.provider}`,
        statusCode: 401
      };
    }

    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...this.getAuthHeaders(),
      ...headers
    };

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: formData.toString()
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: responseData,
          statusCode: response.status
        };
      } else {
        return {
          success: false,
          error: responseData.message || responseData.error_message || 'API request failed',
          statusCode: response.status
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Request failed: ${(error as Error).message}`,
        statusCode: 500
      };
    }
  }

  /**
   * Generate Phone Verification VC from successful verification
   */
  async generatePhoneVerificationVC(
    phoneNumber: string,
    verificationData: TwilioVerificationCheckResponse,
    lookupData?: TwilioPhoneLookupResponse,
    subjectDid?: string
  ): Promise<VerifiableCredential | null> {
    try {
      if (!verificationData.valid || verificationData.status !== 'approved') {
        throw new Error('Phone verification not successful');
      }

      // Define mappings for VC generation
      const mappings: ApiDataMapping[] = [
        {
          apiField: 'to',
          vcField: 'phone.number',
          required: true
        },
        {
          apiField: 'valid',
          vcField: 'phone.verified',
          required: true
        },
        {
          apiField: 'status',
          vcField: 'phone.verificationStatus',
          required: true
        },
        {
          apiField: 'channel',
          vcField: 'phone.verificationMethod',
          required: true
        },
        {
          apiField: 'date_created',
          vcField: 'phone.verificationDate',
          transform: (value: string) => new Date(value).toISOString(),
          required: true
        }
      ];

      // Add lookup data if available
      if (lookupData) {
        mappings.push(
          {
            apiField: 'country_code',
            vcField: 'phone.countryCode'
          },
          {
            apiField: 'national_format',
            vcField: 'phone.nationalFormat'
          },
          {
            apiField: 'carrier.name',
            vcField: 'phone.carrier'
          },
          {
            apiField: 'carrier.type',
            vcField: 'phone.type'
          }
        );
      }

      const template = this.vcFramework.getTemplate('PhoneVerificationCredential');
      if (!template) {
        throw new Error('Phone verification VC template not found');
      }

      const config: VCGenerationConfig = {
        template,
        mappings,
        issuer: {
          id: 'did:persona:twilio-issuer',
          name: 'PersonaPass Twilio Integration',
          url: 'https://personapass.org/issuers/twilio'
        },
        proofType: 'Ed25519Signature2020'
      };

      // Combine verification and lookup data
      const combinedData = {
        ...verificationData,
        ...(lookupData && lookupData)
      };

      return await this.vcFramework.generateVC(
        combinedData, 
        config, 
        subjectDid || `did:persona:phone:${phoneNumber.replace(/[^\d]/g, '')}`
      );
    } catch (error) {
      errorService.logError('Failed to generate phone verification VC:', error);
      return null;
    }
  }

  /**
   * Complete phone verification flow with VC generation
   */
  async completePhoneVerification(
    phoneNumber: string,
    code: string,
    subjectDid: string,
    includeLookup: boolean = true
  ): Promise<{
    verified: boolean;
    credential?: VerifiableCredential;
    error?: string;
  }> {
    try {
      // Verify the code
      const verificationResult = await this.verifyCode(phoneNumber, code);
      
      if (!verificationResult.success || !verificationResult.data) {
        return {
          verified: false,
          error: verificationResult.error || 'Verification failed'
        };
      }

      // Get phone lookup data if requested
      let lookupData: TwilioPhoneLookupResponse | undefined;
      if (includeLookup) {
        const lookupResult = await this.lookupPhoneNumber(phoneNumber);
        if (lookupResult.success && lookupResult.data) {
          lookupData = lookupResult.data;
        }
      }

      // Generate VC
      const credential = await this.generatePhoneVerificationVC(
        phoneNumber,
        verificationResult.data,
        lookupData,
        subjectDid
      );

      return {
        verified: verificationResult.data.valid,
        credential: credential || undefined
      };
    } catch (error) {
      return {
        verified: false,
        error: `Phone verification failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get Twilio Account SID from credentials
   */
  private getAccountSid(): string {
    const credentials = this.credentialManager.getCredentials(this.provider);
    return credentials?.apiKey || 'default';
  }

  /**
   * Send WhatsApp verification (if WhatsApp sender is enabled)
   */
  async sendWhatsAppVerification(phoneNumber: string): Promise<ApiResponse<TwilioVerificationResponse>> {
    return this.sendVerificationCode(phoneNumber, 'whatsapp' as any);
  }

  /**
   * Send voice call verification
   */
  async sendVoiceVerification(phoneNumber: string): Promise<ApiResponse<TwilioVerificationResponse>> {
    return this.sendVerificationCode(phoneNumber, 'call');
  }
}

export default TwilioApiService;