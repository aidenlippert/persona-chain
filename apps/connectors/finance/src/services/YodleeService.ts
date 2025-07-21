import axios, { AxiosRequestConfig } from 'axios';
import { config } from '../config/config';
import { BankAccount, Transaction, AccessTokenData } from '../types/financial';

export interface YodleeAuthResponse {
  token: {
    accessToken: string;
    issuedAt: string;
    expiresIn: number;
  };
}

export interface YodleeAccount {
  id: number;
  accountName: string;
  accountNumber: string;
  accountType: string;
  balance: {
    amount: number;
    currency: string;
  };
  providerAccount: {
    id: number;
    providerId: number;
    providerName: string;
  };
  isManual: boolean;
  accountStatus: string;
  refreshinfo: {
    statusCode: number;
    statusMessage: string;
    lastRefreshed: string;
  };
}

export interface YodleeTransaction {
  id: number;
  amount: {
    amount: number;
    currency: string;
  };
  baseType: string;
  categoryType: string;
  category: string;
  date: string;
  description: {
    original: string;
    simple: string;
  };
  status: string;
  accountId: number;
  merchant?: {
    name: string;
  };
}

export class YodleeService {
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;
  
  /**
   * Authenticate with Yodlee API
   */
  async authenticate(): Promise<string> {
    try {
      if (this.accessToken && Date.now() < this.tokenExpiration) {
        return this.accessToken;
      }
      
      console.log('🔐 Authenticating with Yodlee API...');
      
      const response = await axios.post(
        `${config.yodlee.baseUrl}/auth/token`,
        {
          clientId: config.yodlee.clientId,
          secret: config.yodlee.secret
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Api-Version': '1.1'
          },
          timeout: 30000
        }
      );
      
      const authData: YodleeAuthResponse = response.data;
      this.accessToken = authData.token.accessToken;
      this.tokenExpiration = Date.now() + (authData.token.expiresIn * 1000);
      
      console.log('✅ Yodlee authentication successful');
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ Error authenticating with Yodlee:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock Yodlee token for development');
        this.accessToken = `yodlee_mock_token_${Date.now()}`;
        this.tokenExpiration = Date.now() + 3600000; // 1 hour
        return this.accessToken;
      }
      
      throw new Error('Failed to authenticate with Yodlee');
    }
  }
  
  /**
   * Get FastLink token for user authentication
   */
  async getFastLinkToken(did: string): Promise<string> {
    try {
      const accessToken = await this.authenticate();
      
      console.log('🔗 Creating Yodlee FastLink token for DID:', did);
      
      const response = await axios.post(
        `${config.yodlee.baseUrl}/user/accessTokens`,
        {
          userData: {
            clientUserId: did,
            preferences: {
              currency: 'USD',
              timeZone: 'PST',
              dateFormat: 'MM/dd/yyyy',
              locale: 'en_US'
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Api-Version': '1.1'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Yodlee FastLink token created');
      return response.data.user.accessTokens[0].value;
      
    } catch (error) {
      console.error('❌ Error creating FastLink token:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        return `fastlink_mock_token_${Date.now()}`;
      }
      
      throw new Error('Failed to create FastLink token');
    }
  }
  
  /**
   * Get user accounts from Yodlee
   */
  async getAccounts(userAccessToken: string): Promise<BankAccount[]> {
    try {
      console.log('💳 Fetching accounts from Yodlee...');
      
      const response = await axios.get(
        `${config.yodlee.baseUrl}/accounts`,
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'Api-Version': '1.1'
          },
          timeout: 30000
        }
      );
      
      const yodleeAccounts: YodleeAccount[] = response.data.account || [];
      
      const accounts: BankAccount[] = yodleeAccounts.map(account => ({
        id: account.id.toString(),
        institutionId: account.providerAccount.providerId.toString(),
        institutionName: account.providerAccount.providerName,
        accountType: this.mapAccountType(account.accountType),
        accountSubtype: account.accountType,
        balance: account.balance.amount,
        currency: account.balance.currency,
        accountNumber: account.accountNumber ? `****${account.accountNumber.slice(-4)}` : undefined,
        verified: account.refreshinfo.statusCode === 0,
        lastUpdated: account.refreshinfo.lastRefreshed || new Date().toISOString()
      }));
      
      console.log(`✅ Fetched ${accounts.length} accounts from Yodlee`);
      return accounts;
      
    } catch (error) {
      console.error('❌ Error fetching accounts from Yodlee:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock Yodlee account data');
        return [
          {
            id: 'yodlee_checking_mock',
            institutionId: 'yodlee_bank_1',
            institutionName: 'Yodlee Demo Bank',
            accountType: 'checking',
            accountSubtype: 'CHECKING',
            balance: 12500.75,
            availableBalance: 12500.75,
            currency: 'USD',
            accountNumber: '****7890',
            verified: true,
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'yodlee_credit_mock',
            institutionId: 'yodlee_bank_1',
            institutionName: 'Yodlee Demo Bank',
            accountType: 'credit',
            accountSubtype: 'CREDIT_CARD',
            balance: -2150.00,
            availableBalance: 7850.00,
            currency: 'USD',
            accountNumber: '****4321',
            verified: true,
            lastUpdated: new Date().toISOString()
          }
        ];
      }
      
      throw error;
    }
  }
  
  /**
   * Get transactions from Yodlee
   */
  async getTransactions(
    userAccessToken: string, 
    accountId?: string, 
    fromDate?: string, 
    toDate?: string
  ): Promise<Transaction[]> {
    try {
      console.log('💸 Fetching transactions from Yodlee...');
      
      const params: any = {};
      if (accountId) params.accountId = accountId;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      
      const response = await axios.get(
        `${config.yodlee.baseUrl}/transactions`,
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'Api-Version': '1.1'
          },
          params,
          timeout: 30000
        }
      );
      
      const yodleeTransactions: YodleeTransaction[] = response.data.transaction || [];
      
      const transactions: Transaction[] = yodleeTransactions.map(transaction => ({
        id: transaction.id.toString(),
        accountId: transaction.accountId.toString(),
        amount: Math.abs(transaction.amount.amount),
        currency: transaction.amount.currency,
        date: transaction.date,
        category: [transaction.category],
        description: transaction.description.simple || transaction.description.original,
        merchantName: transaction.merchant?.name,
        pending: transaction.status === 'PENDING',
        transactionType: transaction.baseType === 'DEBIT' ? 'debit' : 'credit',
        verified: true
      }));
      
      console.log(`✅ Fetched ${transactions.length} transactions from Yodlee`);
      return transactions;
      
    } catch (error) {
      console.error('❌ Error fetching transactions from Yodlee:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock Yodlee transaction data');
        return [
          {
            id: 'yodlee_txn_1',
            accountId: 'yodlee_checking_mock',
            amount: 2500.00,
            currency: 'USD',
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            category: ['Salary', 'Income'],
            description: 'DIRECT DEPOSIT PAYROLL',
            pending: false,
            transactionType: 'credit',
            verified: true
          },
          {
            id: 'yodlee_txn_2',
            accountId: 'yodlee_checking_mock',
            amount: 120.00,
            currency: 'USD',
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            category: ['Shopping', 'General Merchandise'],
            description: 'AMAZON.COM',
            merchantName: 'Amazon',
            pending: false,
            transactionType: 'debit',
            verified: true
          }
        ];
      }
      
      throw error;
    }
  }
  
  /**
   * Get account balances and financial summary
   */
  async getFinancialSummary(userAccessToken: string): Promise<{
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    creditUtilization: number;
  }> {
    try {
      console.log('📊 Fetching financial summary from Yodlee...');
      
      const accounts = await this.getAccounts(userAccessToken);
      const transactions = await this.getTransactions(userAccessToken);
      
      const assets = accounts
        .filter(acc => ['checking', 'savings', 'investment'].includes(acc.accountType))
        .reduce((sum, acc) => sum + acc.balance, 0);
      
      const liabilities = Math.abs(accounts
        .filter(acc => ['credit', 'loan'].includes(acc.accountType))
        .reduce((sum, acc) => sum + Math.min(0, acc.balance), 0));
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentTransactions = transactions.filter(txn => 
        new Date(txn.date) >= thirtyDaysAgo
      );
      
      const monthlyIncome = recentTransactions
        .filter(txn => txn.transactionType === 'credit')
        .reduce((sum, txn) => sum + txn.amount, 0);
      
      const monthlyExpenses = recentTransactions
        .filter(txn => txn.transactionType === 'debit')
        .reduce((sum, txn) => sum + txn.amount, 0);
      
      const creditAccounts = accounts.filter(acc => acc.accountType === 'credit');
      const creditUtilization = creditAccounts.length > 0 
        ? Math.abs(creditAccounts.reduce((sum, acc) => sum + Math.min(0, acc.balance), 0)) /
          creditAccounts.reduce((sum, acc) => sum + (acc.availableBalance || 0), 0) * 100
        : 0;
      
      const summary = {
        totalAssets: assets,
        totalLiabilities: liabilities,
        netWorth: assets - liabilities,
        monthlyIncome,
        monthlyExpenses,
        creditUtilization: Math.min(100, Math.max(0, creditUtilization))
      };
      
      console.log('✅ Financial summary calculated from Yodlee data');
      return summary;
      
    } catch (error) {
      console.error('❌ Error calculating financial summary:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        return {
          totalAssets: 25000.75,
          totalLiabilities: 8500.00,
          netWorth: 16500.75,
          monthlyIncome: 5200.00,
          monthlyExpenses: 3800.00,
          creditUtilization: 25.3
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Delete user from Yodlee (GDPR compliance)
   */
  async deleteUser(userAccessToken: string): Promise<void> {
    try {
      console.log('🗑️ Deleting user from Yodlee...');
      
      await axios.delete(
        `${config.yodlee.baseUrl}/user`,
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'Api-Version': '1.1'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ User deleted from Yodlee successfully');
      
    } catch (error) {
      console.error('❌ Error deleting user from Yodlee:', error);
      throw new Error('Failed to delete user from Yodlee');
    }
  }
  
  /**
   * Map Yodlee account types to our standard types
   */
  private mapAccountType(yodleeType: string): 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'other' {
    const type = yodleeType.toUpperCase();
    
    if (type.includes('CHECKING')) return 'checking';
    if (type.includes('SAVINGS')) return 'savings';
    if (type.includes('CREDIT')) return 'credit';
    if (type.includes('LOAN') || type.includes('MORTGAGE')) return 'loan';
    if (type.includes('INVESTMENT') || type.includes('BROKERAGE')) return 'investment';
    
    return 'other';
  }
  
  /**
   * Refresh account data
   */
  async refreshAccountData(userAccessToken: string, accountId: string): Promise<boolean> {
    try {
      console.log('🔄 Refreshing account data in Yodlee...');
      
      await axios.put(
        `${config.yodlee.baseUrl}/refresh`,
        {
          accountId: [accountId]
        },
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'Content-Type': 'application/json',
            'Api-Version': '1.1'
          },
          timeout: 60000 // Refresh can take longer
        }
      );
      
      console.log('✅ Account data refresh initiated');
      return true;
      
    } catch (error) {
      console.error('❌ Error refreshing account data:', error);
      return false;
    }
  }
}