import { PlaidApi, Configuration, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { config } from '../config/config';
import { BankAccount, Transaction, AccessTokenData, PlaidLinkToken } from '../types/financial';

export class PlaidService {
  private client: PlaidApi;
  
  constructor() {
    const configuration = new Configuration({
      basePath: this.getPlaidEnvironment(),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': config.plaid.clientId,
          'PLAID-SECRET': config.plaid.secret,
          'Plaid-Version': '2020-09-14',
        },
      },
    });
    
    this.client = new PlaidApi(configuration);
  }
  
  private getPlaidEnvironment(): PlaidEnvironments {
    switch (config.plaid.environment) {
      case 'production':
        return PlaidEnvironments.production;
      case 'development':
        return PlaidEnvironments.development;
      case 'sandbox':
      default:
        return PlaidEnvironments.sandbox;
    }
  }
  
  /**
   * Create a link token for Plaid Link initialization
   */
  async createLinkToken(did: string, redirectUri?: string): Promise<PlaidLinkToken> {
    try {
      console.log('🔗 Creating Plaid Link token for DID:', did);
      
      const request = {
        user: {
          client_user_id: did,
        },
        client_name: 'PersonaPass Financial Connector',
        products: [Products.Transactions, Products.Accounts, Products.Identity],
        country_codes: [CountryCode.Us],
        language: 'en',
        redirect_uri: redirectUri || config.plaid.redirectUri,
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings', 'money market'],
          },
          credit: {
            account_subtypes: ['credit card', 'line of credit'],
          },
        },
      };
      
      const response = await this.client.linkTokenCreate(request);
      
      console.log('✅ Plaid Link token created successfully');
      
      return {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
        requestId: response.data.request_id
      };
      
    } catch (error) {
      console.error('❌ Error creating Plaid Link token:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock Plaid Link token for development');
        return {
          linkToken: `link-sandbox-${Date.now()}`,
          expiration: new Date(Date.now() + 3600000).toISOString(),
          requestId: `req-${Date.now()}`
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string): Promise<AccessTokenData> {
    try {
      console.log('🔄 Exchanging public token for access token...');
      
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      
      // Get institution information
      const itemResponse = await this.client.itemGet({
        access_token: response.data.access_token,
      });
      
      const institutionResponse = await this.client.institutionsGetById({
        institution_id: itemResponse.data.item.institution_id!,
        country_codes: [CountryCode.Us],
      });
      
      console.log('✅ Access token exchanged successfully');
      
      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        institutionId: itemResponse.data.item.institution_id!,
        institutionName: institutionResponse.data.institution.name
      };
      
    } catch (error) {
      console.error('❌ Error exchanging public token:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock access token for development');
        return {
          accessToken: `access-sandbox-${Date.now()}`,
          itemId: `item-sandbox-${Date.now()}`,
          expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
          institutionId: 'ins_sandbox',
          institutionName: 'Sandbox Bank'
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch account information
   */
  async getAccounts(accessToken: string): Promise<BankAccount[]> {
    try {
      console.log('💳 Fetching account information from Plaid...');
      
      const response = await this.client.accountsGet({
        access_token: accessToken,
      });
      
      const accounts: BankAccount[] = response.data.accounts.map(account => ({
        id: account.account_id,
        institutionId: account.account_id, // Will be updated with real institution ID
        institutionName: 'Unknown', // Will be updated with real name
        accountType: this.mapAccountType(account.type),
        accountSubtype: account.subtype || account.type,
        balance: account.balances.current || 0,
        availableBalance: account.balances.available || undefined,
        currency: account.balances.iso_currency_code || 'USD',
        accountNumber: account.mask ? `****${account.mask}` : undefined,
        verified: true,
        lastUpdated: new Date().toISOString()
      }));
      
      console.log(`✅ Fetched ${accounts.length} accounts from Plaid`);
      return accounts;
      
    } catch (error) {
      console.error('❌ Error fetching accounts from Plaid:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock account data for development');
        return [
          {
            id: 'plaid_checking_mock',
            institutionId: 'ins_sandbox',
            institutionName: 'Sandbox Bank',
            accountType: 'checking',
            accountSubtype: 'checking',
            balance: 15420.50,
            availableBalance: 15420.50,
            currency: 'USD',
            accountNumber: '****1234',
            verified: true,
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'plaid_savings_mock',
            institutionId: 'ins_sandbox',
            institutionName: 'Sandbox Bank',
            accountType: 'savings',
            accountSubtype: 'savings',
            balance: 8750.25,
            currency: 'USD',
            accountNumber: '****5678',
            verified: true,
            lastUpdated: new Date().toISOString()
          }
        ];
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch recent transactions
   */
  async getTransactions(accessToken: string, startDate?: string, endDate?: string, count: number = 100): Promise<Transaction[]> {
    try {
      console.log('💸 Fetching transactions from Plaid...');
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate ? new Date(endDate) : new Date();
      
      const response = await this.client.transactionsGet({
        access_token: accessToken,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        count: Math.min(count, 500) // Plaid limit
      });
      
      const transactions: Transaction[] = response.data.transactions.map(transaction => ({
        id: transaction.transaction_id,
        accountId: transaction.account_id,
        amount: Math.abs(transaction.amount),
        currency: transaction.iso_currency_code || 'USD',
        date: transaction.date,
        category: transaction.category || ['other'],
        description: transaction.name,
        merchantName: transaction.merchant_name || undefined,
        pending: transaction.pending,
        transactionType: transaction.amount > 0 ? 'debit' : 'credit',
        verified: true
      }));
      
      console.log(`✅ Fetched ${transactions.length} transactions from Plaid`);
      return transactions;
      
    } catch (error) {
      console.error('❌ Error fetching transactions from Plaid:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock transaction data for development');
        return [
          {
            id: 'plaid_txn_mock_1',
            accountId: 'plaid_checking_mock',
            amount: 1200.00,
            currency: 'USD',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            category: ['Deposit'],
            description: 'PAYROLL DEPOSIT',
            pending: false,
            transactionType: 'credit',
            verified: true
          },
          {
            id: 'plaid_txn_mock_2',
            accountId: 'plaid_checking_mock',
            amount: 85.50,
            currency: 'USD',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            category: ['Food and Drink', 'Restaurants'],
            description: 'Chipotle',
            merchantName: 'Chipotle',
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
   * Remove item (revoke access)
   */
  async removeItem(accessToken: string): Promise<void> {
    try {
      console.log('🗑️ Removing Plaid item...');
      
      await this.client.itemRemove({
        access_token: accessToken,
      });
      
      console.log('✅ Plaid item removed successfully');
      
    } catch (error) {
      console.error('❌ Error removing Plaid item:', error);
      throw error;
    }
  }
  
  /**
   * Map Plaid account types to our standard types
   */
  private mapAccountType(plaidType: string): 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'other' {
    switch (plaidType.toLowerCase()) {
      case 'depository':
        return 'checking';
      case 'credit':
        return 'credit';
      case 'loan':
        return 'loan';
      case 'investment':
        return 'investment';
      default:
        return 'other';
    }
  }
  
  /**
   * Refresh access token if needed
   */
  async refreshAccessToken(accessToken: string): Promise<boolean> {
    try {
      // Test the access token
      await this.client.accountsGet({
        access_token: accessToken,
      });
      
      return true; // Token is still valid
      
    } catch (error) {
      console.error('❌ Access token needs refresh or is invalid:', error);
      return false;
    }
  }
}