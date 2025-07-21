import axios from 'axios';
import { config } from '../config/config';
import { CreditScore, CreditReport, AccessTokenData } from '../types/financial';

export class CreditService {
  private tokenStore = new Map(); // In production, use encrypted database
  
  /**
   * Build Credit Karma OAuth authorization URL
   */
  buildCreditKarmaAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.creditKarma.clientId,
      redirect_uri: config.creditKarma.redirectUri,
      scope: 'read:credit_scores read:credit_reports read:financial_profile',
      state
    });
    
    return `${config.creditKarma.baseUrl}/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Build Experian OAuth authorization URL
   */
  buildExperianAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.experian.clientId,
      redirect_uri: config.creditKarma.redirectUri, // Same redirect for simplicity
      scope: 'read:credit_score read:credit_report',
      state
    });
    
    return `${config.experian.baseUrl}/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, provider: string): Promise<any> {
    try {
      let tokenUrl: string;
      let clientId: string;
      let clientSecret: string;
      let redirectUri: string;
      
      switch (provider) {
        case 'experian':
          tokenUrl = `${config.experian.baseUrl}/oauth/token`;
          clientId = config.experian.clientId;
          clientSecret = config.experian.clientSecret;
          redirectUri = config.creditKarma.redirectUri;
          break;
        case 'credit_karma':
        default:
          tokenUrl = `${config.creditKarma.baseUrl}/oauth/token`;
          clientId = config.creditKarma.clientId;
          clientSecret = config.creditKarma.clientSecret;
          redirectUri = config.creditKarma.redirectUri;
          break;
      }
      
      const response = await axios.post(tokenUrl, {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error exchanging code for credit token:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock credit token for development');
        return {
          access_token: `mock_credit_token_${provider}_${Date.now()}`,
          refresh_token: `mock_credit_refresh_${provider}_${Date.now()}`,
          expires_in: 3600,
          scope: 'read:all'
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Store access token for a DID
   */
  async storeAccessToken(did: string, provider: string, tokenData: AccessTokenData): Promise<void> {
    const key = `${did}:${provider}`;
    
    // In production, encrypt and store in database
    this.tokenStore.set(key, {
      ...tokenData,
      updatedAt: Date.now()
    });
    
    console.log(`🔐 Credit access token stored for DID: ${did}, Provider: ${provider}`);\n  }
  
  /**
   * Get access token for a DID and provider
   */
  async getAccessToken(did: string, provider: string): Promise<AccessTokenData | null> {
    const key = `${did}:${provider}`;
    const tokenData = this.tokenStore.get(key);
    
    if (!tokenData) return null;
    
    // Check if token is expired
    if (Date.now() >= tokenData.expiresAt) {
      console.log(`⏰ Credit token expired for DID: ${did}, Provider: ${provider}`);
      this.tokenStore.delete(key);
      return null;
    }
    
    return tokenData;
  }
  
  /**
   * Fetch credit score from Credit Karma
   */
  async fetchCreditScoreFromCreditKarma(did: string): Promise<CreditScore[]> {
    try {
      const accessToken = await this.getAccessToken(did, 'credit_karma');
      if (!accessToken) {
        throw new Error('Credit Karma access token not available');
      }
      
      console.log('📊 Fetching credit score from Credit Karma API...');
      
      const response = await axios.get(`${config.creditKarma.baseUrl}/v1/credit-scores`, {
        headers: {
          'Authorization': `Bearer ${accessToken.accessToken}`,
          'X-API-Key': config.creditKarma.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      const creditScores: CreditScore[] = response.data.credit_scores?.map((score: any) => ({
        id: score.score_id || `ck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        score: score.score_value,
        scoreRange: {
          min: score.score_range?.min || 300,
          max: score.score_range?.max || 850
        },
        provider: 'credit_karma',
        reportDate: score.report_date || new Date().toISOString(),
        factors: score.factors ? {
          paymentHistory: score.factors.payment_history_percentage,
          creditUtilization: score.factors.credit_utilization_percentage,
          lengthOfHistory: score.factors.length_of_history_percentage,
          newCredit: score.factors.new_credit_percentage,
          creditMix: score.factors.credit_mix_percentage
        } : undefined,
        verified: score.verification_status === 'verified'
      })) || [];
      
      console.log(`✅ Fetched ${creditScores.length} credit scores from Credit Karma`);
      return creditScores;
      
    } catch (error) {
      console.error('❌ Error fetching credit score from Credit Karma:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock Credit Karma data for development');
        return [
          {
            id: 'ck_mock_1',
            score: 742,
            scoreRange: { min: 300, max: 850 },
            provider: 'credit_karma',
            reportDate: new Date().toISOString(),
            factors: {
              paymentHistory: 35,
              creditUtilization: 30,
              lengthOfHistory: 15,
              newCredit: 10,
              creditMix: 10
            },
            verified: true
          }
        ];
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch credit score from Experian
   */
  async fetchCreditScoreFromExperian(did: string): Promise<CreditScore[]> {
    try {
      const accessToken = await this.getAccessToken(did, 'experian');
      if (!accessToken) {
        throw new Error('Experian access token not available');
      }
      
      console.log('📊 Fetching credit score from Experian API...');
      
      const response = await axios.get(`${config.experian.baseUrl}/v1/credit/scores`, {
        headers: {
          'Authorization': `Bearer ${accessToken.accessToken}`,
          'X-API-Key': config.experian.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      const creditScores: CreditScore[] = response.data.scores?.map((score: any) => ({
        id: score.id || `experian_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        score: score.value,
        scoreRange: {
          min: score.range?.minimum || 300,
          max: score.range?.maximum || 850
        },
        provider: 'experian',
        reportDate: score.date || new Date().toISOString(),
        verified: score.verified || false
      })) || [];
      
      console.log(`✅ Fetched ${creditScores.length} credit scores from Experian`);
      return creditScores;
      
    } catch (error) {
      console.error('❌ Error fetching credit score from Experian:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock Experian data for development');
        return [
          {
            id: 'experian_mock_1',
            score: 738,
            scoreRange: { min: 300, max: 850 },
            provider: 'experian',
            reportDate: new Date().toISOString(),
            verified: true
          }
        ];
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch credit report from Credit Karma
   */
  async fetchCreditReportFromCreditKarma(did: string): Promise<CreditReport[]> {
    try {
      const accessToken = await this.getAccessToken(did, 'credit_karma');
      if (!accessToken) {
        throw new Error('Credit Karma access token not available');
      }
      
      console.log('📋 Fetching credit report from Credit Karma API...');
      
      const response = await axios.get(`${config.creditKarma.baseUrl}/v1/credit-reports`, {
        headers: {
          'Authorization': `Bearer ${accessToken.accessToken}`,
          'X-API-Key': config.creditKarma.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      const creditReports: CreditReport[] = response.data.reports?.map((report: any) => ({
        id: report.report_id || `ck_report_${Date.now()}`,
        provider: 'credit_karma',
        reportDate: report.report_date || new Date().toISOString(),
        accounts: report.accounts || [],
        inquiries: report.inquiries || [],
        publicRecords: report.public_records || [],
        verified: report.verification_status === 'verified'
      })) || [];
      
      console.log(`✅ Fetched ${creditReports.length} credit reports from Credit Karma`);
      return creditReports;
      
    } catch (error) {
      console.error('❌ Error fetching credit report from Credit Karma:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock credit report data for development');
        return [
          {
            id: 'ck_report_mock_1',
            provider: 'credit_karma',
            reportDate: new Date().toISOString(),
            accounts: [
              {
                id: 'acc_1',
                creditorName: 'Bank of America',
                accountType: 'Credit Card',
                balance: 1250.00,
                creditLimit: 5000.00,
                paymentStatus: 'Current',
                openedDate: '2020-01-15',
                lastUpdated: new Date().toISOString()
              }
            ],
            inquiries: [
              {
                id: 'inq_1',
                creditorName: 'Chase Bank',
                inquiryDate: '2023-11-01',
                inquiryType: 'soft'
              }
            ],
            publicRecords: [],
            verified: true
          }
        ];
      }
      
      throw error;
    }
  }
  
  /**
   * Check authorization status for credit providers
   */
  async checkAuthorizationStatus(did: string): Promise<{ authorized: boolean; providers: string[]; authUrls?: any }> {
    try {
      const creditKarmaToken = await this.getAccessToken(did, 'credit_karma');
      const experianToken = await this.getAccessToken(did, 'experian');
      
      const authorizedProviders = [];
      if (creditKarmaToken) authorizedProviders.push('credit_karma');
      if (experianToken) authorizedProviders.push('experian');
      
      if (authorizedProviders.length === 0) {
        return {
          authorized: false,
          providers: [],
          authUrls: {
            credit_karma: `/oauth/authorizeCredit?did=${did}&provider=credit_karma`,
            experian: `/oauth/authorizeCredit?did=${did}&provider=experian`
          }
        };
      }
      
      return {
        authorized: true,
        providers: authorizedProviders
      };
      
    } catch (error) {
      console.error('Error checking credit authorization status:', error);
      return {
        authorized: false,
        providers: [],
        authUrls: {
          credit_karma: `/oauth/authorizeCredit?did=${did}&provider=credit_karma`,
          experian: `/oauth/authorizeCredit?did=${did}&provider=experian`
        }
      };
    }
  }
  
  /**
   * Verify credit credential authenticity
   */
  async verifyCredential(commitment: string, metadata: any): Promise<{ verified: boolean; confidence: number; sources: string[] }> {
    try {
      console.log('🔍 Verifying credit credential...');
      
      // Mock verification logic
      const verified = Math.random() > 0.05; // 95% verification rate for demo
      const confidence = verified ? 0.98 : 0.12;
      
      return {
        verified,
        confidence,
        sources: ['Credit Karma', 'Experian', 'TransUnion']
      };
      
    } catch (error) {
      console.error('❌ Error verifying credit credential:', error);
      return {
        verified: false,
        confidence: 0,
        sources: []
      };
    }
  }
  
  /**
   * Revoke access for a provider
   */
  async revokeAccess(did: string, provider: string): Promise<void> {
    try {
      const key = `${did}:${provider}`;
      const tokenData = this.tokenStore.get(key);
      
      if (tokenData) {
        // In production, call provider's revoke endpoint
        console.log(`🔓 Credit access revoked for DID: ${did}, Provider: ${provider}`);
        this.tokenStore.delete(key);
      }
      
    } catch (error) {
      console.error('❌ Error revoking credit access:', error);
      throw error;
    }
  }
}