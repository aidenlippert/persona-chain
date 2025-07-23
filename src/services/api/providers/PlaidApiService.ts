/**
 * Plaid API Service for PersonaPass - Bank Account & Income Verification
 * Implements our comprehensive API integration framework
 */

import { BaseApiService, ApiResponse, ApiRequestConfig } from '../base/BaseApiService';
import { VCGenerationFramework, ApiDataMapping, VCGenerationConfig } from '../vc/VCGenerationFramework';
import { VerifiableCredential } from '../../../types/credentials';
import { errorService } from "@/services/errorService";

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
  request_id: string;
}

export interface PlaidAccount {
  account_id: string;
  type: string;
  subtype: string;
  name: string;
  mask: string;
  balances: {
    available?: number;
    current?: number;
    iso_currency_code: string;
  };
}

export interface PlaidInstitution {
  institution_id: string;
  name: string;
  country_codes: string[];
}

export interface PlaidIncomeData {
  income_streams: Array<{
    monthly_income: number;
    confidence: string;
    days: number;
  }>;
  total_income: number;
  projected_yearly_income: number;
}

export class PlaidApiService extends BaseApiService {
  private vcFramework: VCGenerationFramework;

  constructor() {
    super('plaid');
    this.vcFramework = VCGenerationFramework.getInstance();
  }

  /**
   * Override auth headers for Plaid's specific authentication
   */
  protected getAuthHeaders(): Record<string, string> {
    const credentials = this.credentialManager.getCredentials(this.provider);
    if (!credentials) {
      throw new Error(`No credentials found for provider: ${this.provider}`);
    }

    return {
      'PLAID-CLIENT-ID': credentials.apiKey,
      'PLAID-SECRET': credentials.apiSecret || ''
    };
  }

  /**
   * Create link token for Plaid Link initialization
   */
  async createLinkToken(userId: string, products: string[] = ['transactions', 'auth']): Promise<ApiResponse<PlaidLinkTokenResponse>> {
    const config: ApiRequestConfig = {
      method: 'POST',
      endpoint: '/link/token/create',
      data: {
        client_name: 'PersonaPass Identity Wallet',
        country_codes: ['US'],
        language: 'en',
        user: {
          client_user_id: userId
        },
        products,
        webhook: `${window.location.origin}/api/plaid/webhook`
      }
    };

    return this.executeRequest<PlaidLinkTokenResponse>(config);
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string): Promise<ApiResponse<{ access_token: string; item_id: string }>> {
    const config: ApiRequestConfig = {
      method: 'POST',
      endpoint: '/link/token/exchange',
      data: {
        public_token: publicToken
      }
    };

    return this.executeRequest(config);
  }

  /**
   * Get account information
   */
  async getAccounts(accessToken: string): Promise<ApiResponse<{ accounts: PlaidAccount[]; item: any }>> {
    const config: ApiRequestConfig = {
      method: 'POST',
      endpoint: '/accounts/get',
      data: {
        access_token: accessToken
      }
    };

    return this.executeRequest(config);
  }

  /**
   * Get institution information
   */
  async getInstitution(institutionId: string): Promise<ApiResponse<{ institution: PlaidInstitution }>> {
    const config: ApiRequestConfig = {
      method: 'POST',
      endpoint: '/institutions/get_by_id',
      data: {
        institution_id: institutionId,
        country_codes: ['US']
      }
    };

    return this.executeRequest(config);
  }

  /**
   * Get income data for verification
   */
  async getIncome(accessToken: string): Promise<ApiResponse<PlaidIncomeData>> {
    const config: ApiRequestConfig = {
      method: 'POST',
      endpoint: '/income/get',
      data: {
        access_token: accessToken
      }
    };

    return this.executeRequest(config);
  }

  /**
   * Generate Bank Account Verification VC from Plaid data
   */
  async generateBankAccountVC(
    accessToken: string,
    subjectDid: string
  ): Promise<VerifiableCredential | null> {
    try {
      // Get account data
      const accountsResponse = await this.getAccounts(accessToken);
      if (!accountsResponse.success || !accountsResponse.data) {
        throw new Error('Failed to fetch account data');
      }

      const { accounts } = accountsResponse.data;
      const primaryAccount = accounts[0]; // Use first account

      // Get institution data
      const institutionResponse = await this.getInstitution(primaryAccount.account_id);
      
      // Define mappings for VC generation
      const mappings: ApiDataMapping[] = [
        {
          apiField: 'type',
          vcField: 'bankAccount.accountType',
          transform: (value: string) => value.toLowerCase(),
          required: true
        },
        {
          apiField: 'subtype',
          vcField: 'bankAccount.accountSubtype',
          transform: (value: string) => value.toLowerCase()
        },
        {
          apiField: 'name',
          vcField: 'bankAccount.accountName',
          required: true
        },
        {
          apiField: 'mask',
          vcField: 'bankAccount.lastFourDigits',
          required: true
        },
        {
          apiField: 'balances.iso_currency_code',
          vcField: 'bankAccount.currency',
          required: true
        }
      ];

      // Add institution name if available
      if (institutionResponse.success && institutionResponse.data) {
        mappings.push({
          apiField: 'institution.name',
          vcField: 'bankAccount.institutionName',
          required: true
        });
      }

      const template = this.vcFramework.getTemplate('BankAccountCredential');
      if (!template) {
        throw new Error('Bank account VC template not found');
      }

      const config: VCGenerationConfig = {
        template,
        mappings,
        issuer: {
          id: 'did:persona:plaid-issuer',
          name: 'PersonaPass Plaid Integration',
          url: 'https://personapass.org/issuers/plaid'
        },
        proofType: 'Ed25519Signature2020'
      };

      // Combine data for mapping
      const combinedData = {
        ...primaryAccount,
        ...(institutionResponse.success && institutionResponse.data && {
          institution: institutionResponse.data.institution
        })
      };

      return await this.vcFramework.generateVC(combinedData, config, subjectDid);
    } catch (error) {
      errorService.logError('Failed to generate bank account VC:', error);
      return null;
    }
  }

  /**
   * Generate Income Verification VC from Plaid data
   */
  async generateIncomeVerificationVC(
    accessToken: string,
    subjectDid: string
  ): Promise<VerifiableCredential | null> {
    try {
      // Get income data
      const incomeResponse = await this.getIncome(accessToken);
      if (!incomeResponse.success || !incomeResponse.data) {
        throw new Error('Failed to fetch income data');
      }

      const incomeData = incomeResponse.data;

      // Define mappings for VC generation
      const mappings: ApiDataMapping[] = [
        {
          apiField: 'projected_yearly_income',
          vcField: 'income.annualAmount',
          required: true
        },
        {
          apiField: 'total_income',
          vcField: 'income.monthlyAmount',
          required: true
        },
        {
          apiField: 'income_streams.0.confidence',
          vcField: 'income.confidenceLevel',
          transform: (value: string) => value.toLowerCase()
        },
        {
          apiField: 'currency',
          vcField: 'income.currency',
          transform: () => 'USD', // Default to USD for Plaid
          required: true
        }
      ];

      const template = this.vcFramework.getTemplate('IncomeVerificationCredential');
      if (!template) {
        throw new Error('Income verification VC template not found');
      }

      const config: VCGenerationConfig = {
        template,
        mappings,
        issuer: {
          id: 'did:persona:plaid-issuer',
          name: 'PersonaPass Plaid Integration',
          url: 'https://personapass.org/issuers/plaid'
        },
        proofType: 'Ed25519Signature2020'
      };

      return await this.vcFramework.generateVC(incomeData, config, subjectDid);
    } catch (error) {
      errorService.logError('Failed to generate income verification VC:', error);
      return null;
    }
  }

  /**
   * Verify bank account ownership through micro-deposits (for enhanced verification)
   */
  async initiateAccountVerification(accessToken: string, accountId: string): Promise<ApiResponse<any>> {
    const config: ApiRequestConfig = {
      method: 'POST',
      endpoint: '/processor/auth/get',
      data: {
        access_token: accessToken,
        account_id: accountId
      }
    };

    return this.executeRequest(config);
  }

  /**
   * Get transaction data for additional verification context
   */
  async getTransactions(
    accessToken: string, 
    startDate: string, 
    endDate: string,
    count: number = 100
  ): Promise<ApiResponse<any>> {
    const config: ApiRequestConfig = {
      method: 'POST',
      endpoint: '/transactions/get',
      data: {
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        count
      }
    };

    return this.executeRequest(config);
  }
}

export default PlaidApiService;