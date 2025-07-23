/**
 * Plaid Automation Service for PersonaPass
 * Integrates Plaid with the automation framework for financial verification
 */

import { PlaidApiService, PlaidAccount, PlaidIncomeData } from '../api/providers/PlaidApiService';
import { AutomatedAPIIntegrator } from './AutomatedAPIIntegrator';
import { VCGenerationFramework } from '../api/vc/VCGenerationFramework';
import { storageService } from '../storageService';
import { VerifiableCredential } from '../../types/credentials';
import { errorService } from "@/services/errorService";

export interface PlaidConnectionResult {
  success: boolean;
  accessToken?: string;
  accounts?: PlaidAccount[];
  error?: string;
  institutionName?: string;
}

export interface PlaidVerificationResult {
  success: boolean;
  credentials: VerifiableCredential[];
  verificationTypes: string[];
  error?: string;
  metadata: {
    accountsVerified: number;
    incomeVerified: boolean;
    institutionTrust: number;
  };
}

export interface PlaidAutomationConfig {
  enableAutoVerification: boolean;
  generateCredentialsOnConnect: boolean;
  includeIncomeVerification: boolean;
  minimumAccountBalance: number;
  supportedAccountTypes: string[];
  autoStoreCredentials: boolean;
}

export class PlaidAutomationService {
  private static instance: PlaidAutomationService;
  private plaidService: PlaidApiService;
  private vcFramework: VCGenerationFramework;
  private config: PlaidAutomationConfig;

  private constructor() {
    this.plaidService = new PlaidApiService();
    this.vcFramework = VCGenerationFramework.getInstance();
    this.config = this.getDefaultConfig();
  }

  static getInstance(): PlaidAutomationService {
    if (!PlaidAutomationService.instance) {
      PlaidAutomationService.instance = new PlaidAutomationService();
    }
    return PlaidAutomationService.instance;
  }

  /**
   * Initialize Plaid Link and handle the entire flow automatically
   */
  async initializeAutomatedPlaidFlow(userId: string): Promise<PlaidConnectionResult> {
    console.log('🏦 Starting automated Plaid integration flow...');

    try {
      // Step 1: Create link token
      const linkTokenResponse = await this.plaidService.createLinkToken(userId, ['auth', 'transactions', 'income']);
      
      if (!linkTokenResponse.success || !linkTokenResponse.data) {
        throw new Error('Failed to create Plaid link token');
      }

      console.log('✅ Plaid link token created successfully');
      
      // Return link token for frontend to use with Plaid Link
      return {
        success: true,
        accessToken: linkTokenResponse.data.link_token
      };

    } catch (error) {
      errorService.logError('❌ Plaid flow initialization failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Complete the Plaid connection after user links their account
   */
  async completeAutomatedPlaidConnection(
    publicToken: string,
    userDid: string
  ): Promise<PlaidVerificationResult> {
    console.log('🔄 Completing automated Plaid connection and verification...');

    try {
      // Step 1: Exchange public token for access token
      const exchangeResponse = await this.plaidService.exchangePublicToken(publicToken);
      
      if (!exchangeResponse.success || !exchangeResponse.data) {
        throw new Error('Failed to exchange Plaid public token');
      }

      const { access_token, item_id } = exchangeResponse.data;
      console.log('✅ Access token obtained');

      // Step 2: Get account information
      const accountsResponse = await this.plaidService.getAccounts(access_token);
      
      if (!accountsResponse.success || !accountsResponse.data) {
        throw new Error('Failed to fetch account information');
      }

      const { accounts } = accountsResponse.data;
      console.log(`📊 Retrieved ${accounts.length} accounts`);

      // Step 3: Generate credentials automatically
      const credentials: VerifiableCredential[] = [];
      const verificationTypes: string[] = [];

      // Generate bank account verification credential
      if (this.config.generateCredentialsOnConnect) {
        const bankVC = await this.plaidService.generateBankAccountVC(access_token, userDid);
        if (bankVC) {
          credentials.push(bankVC);
          verificationTypes.push('bank_account');
          console.log('✅ Bank account credential generated');
        }

        // Generate income verification credential if enabled
        if (this.config.includeIncomeVerification) {
          try {
            const incomeVC = await this.plaidService.generateIncomeVerificationVC(access_token, userDid);
            if (incomeVC) {
              credentials.push(incomeVC);
              verificationTypes.push('income_verification');
              console.log('✅ Income verification credential generated');
            }
          } catch (error) {
            console.log('⚠️ Income verification not available for this account');
          }
        }
      }

      // Step 4: Store credentials if configured
      if (this.config.autoStoreCredentials && credentials.length > 0) {
        await this.storeCredentials(credentials, userDid);
        console.log('💾 Credentials stored automatically');
      }

      // Step 5: Store access token securely for future use
      await this.storeAccessToken(access_token, item_id, userDid);

      // Step 6: Calculate verification metadata
      const metadata = this.calculateVerificationMetadata(accounts, credentials);

      console.log('🎉 Automated Plaid verification completed successfully');

      return {
        success: true,
        credentials,
        verificationTypes,
        metadata
      };

    } catch (error) {
      errorService.logError('❌ Automated Plaid connection failed:', error);
      return {
        success: false,
        credentials: [],
        verificationTypes: [],
        error: (error as Error).message,
        metadata: {
          accountsVerified: 0,
          incomeVerified: false,
          institutionTrust: 0
        }
      };
    }
  }

  /**
   * Perform periodic verification updates
   */
  async performPeriodicVerification(userDid: string): Promise<PlaidVerificationResult> {
    console.log('🔄 Performing periodic Plaid verification update...');

    try {
      // Get stored access token
      const tokenData = await this.getStoredAccessToken(userDid);
      if (!tokenData) {
        throw new Error('No stored Plaid access token found');
      }

      const { accessToken } = tokenData;

      // Re-verify accounts and update credentials
      const accountsResponse = await this.plaidService.getAccounts(accessToken);
      
      if (!accountsResponse.success) {
        throw new Error('Failed to refresh account information');
      }

      const { accounts } = accountsResponse.data;
      const credentials: VerifiableCredential[] = [];

      // Re-generate current credentials with fresh data
      const bankVC = await this.plaidService.generateBankAccountVC(accessToken, userDid);
      if (bankVC) {
        credentials.push(bankVC);
      }

      if (this.config.includeIncomeVerification) {
        const incomeVC = await this.plaidService.generateIncomeVerificationVC(accessToken, userDid);
        if (incomeVC) {
          credentials.push(incomeVC);
        }
      }

      // Update stored credentials
      if (credentials.length > 0) {
        await this.updateStoredCredentials(credentials, userDid);
      }

      console.log('✅ Periodic verification completed');

      return {
        success: true,
        credentials,
        verificationTypes: ['bank_account', 'income_verification'],
        metadata: this.calculateVerificationMetadata(accounts, credentials)
      };

    } catch (error) {
      errorService.logError('❌ Periodic verification failed:', error);
      return {
        success: false,
        credentials: [],
        verificationTypes: [],
        error: (error as Error).message,
        metadata: {
          accountsVerified: 0,
          incomeVerified: false,
          institutionTrust: 0
        }
      };
    }
  }

  /**
   * Get financial verification status for a user
   */
  async getFinancialVerificationStatus(userDid: string): Promise<{
    hasVerification: boolean;
    verificationTypes: string[];
    lastUpdate: number | null;
    accountCount: number;
    trustScore: number;
  }> {
    try {
      const tokenData = await this.getStoredAccessToken(userDid);
      const credentials = await this.getStoredCredentials(userDid);

      const hasBank = credentials.some(vc => vc.type.includes('BankAccountCredential'));
      const hasIncome = credentials.some(vc => vc.type.includes('IncomeVerificationCredential'));

      const verificationTypes = [];
      if (hasBank) verificationTypes.push('bank_account');
      if (hasIncome) verificationTypes.push('income_verification');

      return {
        hasVerification: tokenData !== null,
        verificationTypes,
        lastUpdate: tokenData?.timestamp || null,
        accountCount: tokenData?.accountCount || 0,
        trustScore: this.calculateTrustScore(credentials)
      };

    } catch (error) {
      errorService.logError('Failed to get verification status:', error);
      return {
        hasVerification: false,
        verificationTypes: [],
        lastUpdate: null,
        accountCount: 0,
        trustScore: 0
      };
    }
  }

  /**
   * Disconnect Plaid and remove stored data
   */
  async disconnectPlaid(userDid: string): Promise<boolean> {
    try {
      console.log('🔌 Disconnecting Plaid integration...');

      // Remove stored access token
      await storageService.removeItem(`plaid_token_${userDid}`);
      
      // Remove Plaid-generated credentials
      const allCredentials = await this.getStoredCredentials(userDid);
      const nonPlaidCredentials = allCredentials.filter(vc => 
        !vc.issuer.includes('plaid') && 
        !vc.type.some(type => ['BankAccountCredential', 'IncomeVerificationCredential'].includes(type))
      );
      
      await storageService.setItem(`credentials_${userDid}`, nonPlaidCredentials);

      console.log('✅ Plaid integration disconnected');
      return true;

    } catch (error) {
      errorService.logError('❌ Failed to disconnect Plaid:', error);
      return false;
    }
  }

  /**
   * Configure automation settings
   */
  updateConfig(newConfig: Partial<PlaidAutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Plaid automation config updated');
  }

  // Private helper methods

  private async storeAccessToken(accessToken: string, itemId: string, userDid: string): Promise<void> {
    const tokenData = {
      accessToken,
      itemId,
      timestamp: Date.now(),
      userDid,
      accountCount: 0 // Will be updated later
    };

    await storageService.setItem(`plaid_token_${userDid}`, tokenData);
  }

  private async getStoredAccessToken(userDid: string): Promise<any> {
    return await storageService.getItem(`plaid_token_${userDid}`);
  }

  private async storeCredentials(credentials: VerifiableCredential[], userDid: string): Promise<void> {
    const existingCredentials = await this.getStoredCredentials(userDid);
    const allCredentials = [...existingCredentials, ...credentials];
    
    await storageService.setItem(`credentials_${userDid}`, allCredentials);
  }

  private async updateStoredCredentials(credentials: VerifiableCredential[], userDid: string): Promise<void> {
    const existingCredentials = await this.getStoredCredentials(userDid);
    
    // Remove old Plaid credentials
    const nonPlaidCredentials = existingCredentials.filter(vc => 
      !vc.issuer.includes('plaid')
    );
    
    // Add new credentials
    const allCredentials = [...nonPlaidCredentials, ...credentials];
    
    await storageService.setItem(`credentials_${userDid}`, allCredentials);
  }

  private async getStoredCredentials(userDid: string): Promise<VerifiableCredential[]> {
    const credentials = await storageService.getItem(`credentials_${userDid}`);
    return credentials || [];
  }

  private calculateVerificationMetadata(accounts: PlaidAccount[], credentials: VerifiableCredential[]) {
    const accountsVerified = accounts.length;
    const incomeVerified = credentials.some(vc => 
      vc.type.includes('IncomeVerificationCredential')
    );
    
    // Calculate institution trust based on account types and balances
    let institutionTrust = 0.7; // Base trust
    
    if (accounts.some(acc => acc.type === 'depository')) institutionTrust += 0.1;
    if (accounts.some(acc => acc.balances.current && acc.balances.current > 1000)) institutionTrust += 0.1;
    if (incomeVerified) institutionTrust += 0.1;
    
    return {
      accountsVerified,
      incomeVerified,
      institutionTrust: Math.min(institutionTrust, 1.0)
    };
  }

  private calculateTrustScore(credentials: VerifiableCredential[]): number {
    let score = 0;
    
    if (credentials.some(vc => vc.type.includes('BankAccountCredential'))) score += 0.5;
    if (credentials.some(vc => vc.type.includes('IncomeVerificationCredential'))) score += 0.3;
    
    // Add bonus for multiple accounts
    const bankCredentials = credentials.filter(vc => vc.type.includes('BankAccountCredential'));
    if (bankCredentials.length > 1) score += 0.1;
    
    // Add recency bonus
    const recentCredentials = credentials.filter(vc => {
      const issuanceDate = new Date(vc.issuanceDate);
      const daysOld = (Date.now() - issuanceDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysOld < 30; // Less than 30 days old
    });
    
    if (recentCredentials.length > 0) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private getDefaultConfig(): PlaidAutomationConfig {
    return {
      enableAutoVerification: true,
      generateCredentialsOnConnect: true,
      includeIncomeVerification: true,
      minimumAccountBalance: 0,
      supportedAccountTypes: ['depository', 'credit', 'loan', 'investment'],
      autoStoreCredentials: true
    };
  }
}

// Export singleton instance
export const plaidAutomationService = new PlaidAutomationService();

export default PlaidAutomationService;