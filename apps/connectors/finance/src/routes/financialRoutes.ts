import { Router } from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/validation';
import { FinancialService } from '../services/FinancialService';
import { CommitmentService } from '../services/CommitmentService';

const router = Router();
const financialService = new FinancialService();
const commitmentService = new CommitmentService();

// Validation schemas
const getCredentialsSchema = Joi.object({
  did: Joi.string().required().pattern(/^did:persona:[a-zA-Z0-9-]+$/),
  includeAccounts: Joi.boolean().default(true),
  includeTransactions: Joi.boolean().default(false),
  includeCreditScores: Joi.boolean().default(true),
  includeCreditReports: Joi.boolean().default(false),
  transactionDays: Joi.number().min(1).max(90).default(30)
});

const linkTokenSchema = Joi.object({
  did: Joi.string().required().pattern(/^did:persona:[a-zA-Z0-9-]+$/),
  redirectUri: Joi.string().uri().optional()
});

const exchangeTokenSchema = Joi.object({
  did: Joi.string().required().pattern(/^did:persona:[a-zA-Z0-9-]+$/),
  publicToken: Joi.string().required()
});

/**
 * GET /api/financial/credentials
 * Fetch financial credentials for a given DID
 */
router.get('/credentials', validateRequest(getCredentialsSchema, 'query'), async (req, res) => {
  try {
    const { 
      did, 
      includeAccounts, 
      includeTransactions, 
      includeCreditScores, 
      includeCreditReports,
      transactionDays 
    } = req.query;
    
    console.log(`🔍 Fetching financial credentials for DID: ${did}`);
    
    // Check if user has authorized financial data access
    const authStatus = await financialService.checkAuthorizationStatus(did as string);
    if (!authStatus.authorized) {
      return res.status(401).json({
        success: false,
        error: 'Financial data access not authorized',
        authUrls: authStatus.authUrls
      });
    }
    
    const credentials: any = {
      accountCommitments: [],
      transactionCommitments: [],
      creditScoreCommitments: [],
      creditReportCommitments: [],
      financialProfileCommitment: null
    };
    
    // Fetch bank accounts from Plaid
    if (includeAccounts && authStatus.banking) {
      console.log('💳 Fetching bank account data from Plaid...');
      try {
        const accounts = await financialService.fetchBankAccounts(did as string);
        
        for (const account of accounts) {
          const commitment = commitmentService.createCommitment({
            type: 'bank_account',
            accountType: account.accountType,
            institutionName: account.institutionName,
            balance: account.balance,
            availableBalance: account.availableBalance,
            currency: account.currency,
            accountNumber: account.accountNumber,
            verified: account.verified
          });
          
          credentials.accountCommitments.push({
            id: account.id,
            commitment: commitment.hash,
            publicInput: commitment.publicInput,
            metadata: {
              accountType: account.accountType,
              institutionName: account.institutionName,
              currency: account.currency,
              verified: account.verified,
              lastUpdated: account.lastUpdated
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch bank accounts:', error.message);
      }
    }
    
    // Fetch transactions if requested
    if (includeTransactions && authStatus.banking) {
      console.log('💸 Fetching transaction data...');
      try {
        const startDate = new Date(Date.now() - (transactionDays as number) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const transactions = await financialService.fetchTransactions(did as string, startDate);
        
        for (const transaction of transactions) {
          const commitment = commitmentService.createCommitment({
            type: 'transaction',
            amount: transaction.amount,
            currency: transaction.currency,
            date: transaction.date,
            category: transaction.category,
            description: transaction.description,
            merchantName: transaction.merchantName,
            transactionType: transaction.transactionType,
            verified: transaction.verified
          });
          
          credentials.transactionCommitments.push({
            id: transaction.id,
            commitment: commitment.hash,
            publicInput: commitment.publicInput,
            metadata: {
              currency: transaction.currency,
              date: transaction.date,
              category: transaction.category,
              transactionType: transaction.transactionType,
              verified: transaction.verified
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch transactions:', error.message);
      }
    }
    
    // Fetch credit scores
    if (includeCreditScores && authStatus.credit) {
      console.log('📊 Fetching credit score data...');
      try {
        const creditScores = await financialService.fetchCreditScores(did as string);
        
        for (const score of creditScores) {
          const commitment = commitmentService.createCommitment({
            type: 'credit_score',
            score: score.score,
            scoreRange: score.scoreRange,
            provider: score.provider,
            reportDate: score.reportDate,
            factors: score.factors,
            verified: score.verified
          });
          
          credentials.creditScoreCommitments.push({
            id: score.id,
            commitment: commitment.hash,
            publicInput: commitment.publicInput,
            metadata: {
              provider: score.provider,
              scoreRange: score.scoreRange,
              reportDate: score.reportDate,
              verified: score.verified
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch credit scores:', error.message);
      }
    }
    
    // Fetch credit reports if requested
    if (includeCreditReports && authStatus.credit) {
      console.log('📋 Fetching credit report data...');
      try {
        const creditReports = await financialService.fetchCreditReports(did as string);
        
        for (const report of creditReports) {
          const commitment = commitmentService.createCommitment({
            type: 'credit_report',
            provider: report.provider,
            reportDate: report.reportDate,
            accounts: report.accounts,
            inquiries: report.inquiries,
            publicRecords: report.publicRecords,
            verified: report.verified
          });
          
          credentials.creditReportCommitments.push({
            id: report.id,
            commitment: commitment.hash,
            publicInput: commitment.publicInput,
            metadata: {
              provider: report.provider,
              reportDate: report.reportDate,
              accountCount: report.accounts?.length || 0,
              inquiryCount: report.inquiries?.length || 0,
              verified: report.verified
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch credit reports:', error.message);
      }
    }
    
    // Calculate and commit financial profile
    if (authStatus.banking || authStatus.credit) {
      console.log('📊 Calculating financial profile...');
      try {
        const profile = await financialService.calculateFinancialProfile(did as string);
        
        const profileCommitment = commitmentService.createCommitment({
          type: 'financial_profile',
          totalAssets: profile.totalAssets,
          totalLiabilities: profile.totalLiabilities,
          netWorth: profile.netWorth,
          debtToIncomeRatio: profile.debtToIncomeRatio,
          creditUtilization: profile.creditUtilization,
          accounts: profile.accounts,
          creditScores: profile.creditScores,
          lastUpdated: profile.lastUpdated,
          verified: true
        });
        
        credentials.financialProfileCommitment = {
          commitment: profileCommitment.hash,
          publicInput: profileCommitment.publicInput,
          metadata: {
            accountCount: profile.accounts.length,
            creditScoreCount: profile.creditScores.length,
            lastUpdated: profile.lastUpdated,
            verified: true
          }
        };
      } catch (error) {
        console.warn('⚠️ Failed to calculate financial profile:', error.message);
      }
    }
    
    // Log success metrics
    console.log(`✅ Financial credentials fetched successfully:`, {
      did,
      accounts: credentials.accountCommitments.length,
      transactions: credentials.transactionCommitments.length,
      creditScores: credentials.creditScoreCommitments.length,
      creditReports: credentials.creditReportCommitments.length,
      hasProfile: !!credentials.financialProfileCommitment
    });
    
    res.json({
      success: true,
      data: credentials,
      metadata: {
        did,
        fetchedAt: new Date().toISOString(),
        sources: {
          plaid: authStatus.banking,
          creditKarma: authStatus.credit,
          experian: authStatus.credit
        },
        totalCommitments: 
          credentials.accountCommitments.length + 
          credentials.transactionCommitments.length + 
          credentials.creditScoreCommitments.length + 
          credentials.creditReportCommitments.length +
          (credentials.financialProfileCommitment ? 1 : 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching financial credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financial credentials',
      details: error.message
    });
  }
});

/**
 * POST /api/financial/plaid/link-token
 * Create Plaid Link token for frontend initialization
 */
router.post('/plaid/link-token', validateRequest(linkTokenSchema), async (req, res) => {
  try {
    const { did, redirectUri } = req.body;
    
    const linkToken = await financialService.createPlaidLinkToken(did, redirectUri);
    
    res.json({
      success: true,
      data: linkToken
    });
    
  } catch (error) {
    console.error('❌ Error creating Plaid link token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Plaid link token'
    });
  }
});

/**
 * POST /api/financial/plaid/exchange-token
 * Exchange Plaid public token for access token
 */
router.post('/plaid/exchange-token', validateRequest(exchangeTokenSchema), async (req, res) => {
  try {
    const { did, publicToken } = req.body;
    
    await financialService.exchangePlaidPublicToken(did, publicToken);
    
    console.log(`✅ Plaid token exchange completed for DID: ${did}`);
    
    res.json({
      success: true,
      data: {
        exchanged: true,
        did,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error exchanging Plaid token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to exchange Plaid token'
    });
  }
});

/**
 * POST /api/financial/verify
 * Verify financial credential authenticity
 */
router.post('/verify', async (req, res) => {
  try {
    const { commitment, metadata } = req.body;
    
    if (!commitment || !metadata) {
      return res.status(400).json({
        success: false,
        error: 'Missing commitment or metadata'
      });
    }
    
    const verification = await financialService.verifyCredential(commitment, metadata);
    
    res.json({
      success: true,
      data: {
        verified: verification.verified,
        confidence: verification.confidence,
        sources: verification.sources,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error verifying financial credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify financial credential'
    });
  }
});

/**
 * GET /api/financial/status/:did
 * Check authorization and connection status for a DID
 */
router.get('/status/:did', async (req, res) => {
  try {
    const { did } = req.params;
    
    const status = await financialService.getConnectionStatus(did);
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ Error checking financial status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check financial connection status'
    });
  }
});

/**
 * DELETE /api/financial/plaid/revoke
 * Revoke Plaid access
 */
router.delete('/plaid/revoke', async (req, res) => {
  try {
    const { did } = req.body;
    
    if (!did) {
      return res.status(400).json({
        success: false,
        error: 'DID is required'
      });
    }
    
    await financialService.revokePlaidAccess(did);
    
    res.json({
      success: true,
      data: {
        revoked: true,
        did,
        provider: 'plaid'
      }
    });
    
  } catch (error) {
    console.error('❌ Error revoking Plaid access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke Plaid access'
    });
  }
});

/**
 * DELETE /api/financial/credit/revoke
 * Revoke credit provider access
 */
router.delete('/credit/revoke', async (req, res) => {
  try {
    const { did, provider } = req.body;
    
    if (!did || !provider) {
      return res.status(400).json({
        success: false,
        error: 'DID and provider are required'
      });
    }
    
    await financialService.revokeCreditAccess(did, provider);
    
    res.json({
      success: true,
      data: {
        revoked: true,
        did,
        provider
      }
    });
    
  } catch (error) {
    console.error('❌ Error revoking credit access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke credit access'
    });
  }
});

export { router as financialRoutes };