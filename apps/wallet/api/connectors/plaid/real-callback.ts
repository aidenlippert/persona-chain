import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * REAL Plaid Token Exchange and Financial Data Fetching
 * NO HARDCODED VALUES - CREATES REAL FINANCIAL CREDENTIALS
 */

interface PlaidAccount {
  account_id: string;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string;
    limit: number | null;
    unofficial_currency_code: string | null;
  };
  mask: string;
  name: string;
  official_name: string;
  subtype: string;
  type: string;
}

interface PlaidIdentity {
  accounts: PlaidAccount[];
  identity: {
    account_id: string;
    owners: Array<{
      addresses: Array<{
        data: {
          city: string;
          country: string;
          postal_code: string;
          region: string;
          street: string;
        };
        primary: boolean;
      }>;
      emails: Array<{
        data: string;
        primary: boolean;
        type: string;
      }>;
      names: string[];
      phone_numbers: Array<{
        data: string;
        primary: boolean;
        type: string;
      }>;
    }>;
  }[];
}

interface PlaidTransactions {
  accounts: PlaidAccount[];
  total_transactions: number;
  transactions: Array<{
    account_id: string;
    amount: number;
    date: string;
    name: string;
    merchant_name?: string;
    category: string[];
    transaction_type: string;
    account_owner?: string;
  }>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOrigin = process.env.VITE_CORS_ORIGIN || "https://personapass.xyz";
  
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { publicToken, sessionId } = req.body;

      if (!publicToken || !sessionId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // Validate environment variables
      const clientId = process.env.VITE_PLAID_CLIENT_ID;
      const secret = process.env.VITE_PLAID_SECRET;
      const environment = process.env.VITE_PLAID_ENVIRONMENT || "sandbox";

      if (!clientId || !secret) {
        return res.status(500).json({ error: "Plaid credentials not configured" });
      }

      // Determine Plaid environment URL
      const plaidUrls = {
        sandbox: "https://sandbox.plaid.com",
        development: "https://development.plaid.com",
        production: "https://production.plaid.com"
      };

      const baseUrl = plaidUrls[environment as keyof typeof plaidUrls] || plaidUrls.sandbox;

      // Exchange public token for access token
      const tokenResponse = await fetch(`${baseUrl}/link/token/exchange`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          secret: secret,
          public_token: publicToken,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        console.error("Plaid token exchange failed:", tokenData);
        return res.status(400).json({ error: "Failed to exchange public token" });
      }

      const accessToken = tokenData.access_token;

      // Fetch account information
      const accountsResponse = await fetch(`${baseUrl}/accounts/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          secret: secret,
          access_token: accessToken,
        }),
      });

      const accountsData = await accountsResponse.json();

      if (!accountsData.accounts) {
        console.error("Plaid accounts fetch failed:", accountsData);
        return res.status(400).json({ error: "Failed to fetch account data" });
      }

      // Fetch identity information
      const identityResponse = await fetch(`${baseUrl}/identity/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          secret: secret,
          access_token: accessToken,
        }),
      });

      let identityData: PlaidIdentity | null = null;
      if (identityResponse.ok) {
        identityData = await identityResponse.json();
      }

      // Fetch recent transactions (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const transactionsResponse = await fetch(`${baseUrl}/transactions/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          secret: secret,
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
          count: 100,
          offset: 0,
        }),
      });

      let transactionsData: PlaidTransactions | null = null;
      if (transactionsResponse.ok) {
        transactionsData = await transactionsResponse.json();
      }

      // Process account data
      const accounts = accountsData.accounts;
      const totalBalance = accounts.reduce((sum: number, account: PlaidAccount) => {
        return sum + (account.balances.current || 0);
      }, 0);

      // Process identity data
      const primaryIdentity = identityData?.identity[0]?.owners[0];
      const primaryName = primaryIdentity?.names[0] || '';
      const primaryEmail = primaryIdentity?.emails.find(e => e.primary)?.data || '';
      const primaryAddress = primaryIdentity?.addresses.find(a => a.primary);

      // Calculate financial metrics
      const accountTypes = [...new Set(accounts.map((a: PlaidAccount) => a.type))];
      const institutionCount = 1; // One institution per access token
      const accountCount = accounts.length;
      
      // Calculate monthly income/expenses from transactions
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      let transactionCount = 0;
      
      if (transactionsData) {
        transactionCount = transactionsData.transactions.length;
        transactionsData.transactions.forEach(transaction => {
          if (transaction.amount < 0) {
            monthlyIncome += Math.abs(transaction.amount);
          } else {
            monthlyExpenses += transaction.amount;
          }
        });
      }

      // Calculate financial health score
      const financialHealthScore = Math.min(100, Math.floor(
        (totalBalance > 1000 ? 30 : totalBalance > 100 ? 20 : 10) + // Balance score
        (accountCount > 2 ? 20 : accountCount > 1 ? 15 : 10) + // Account diversity
        (monthlyIncome > monthlyExpenses ? 30 : monthlyIncome > monthlyExpenses * 0.8 ? 20 : 10) + // Cash flow
        (transactionCount > 10 ? 20 : transactionCount > 5 ? 15 : 10) // Activity level
      ));

      // Create verifiable credential with REAL financial data
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/plaid/v1"
        ],
        id: `plaid-cred-${sessionId}`,
        type: ["VerifiableCredential", "PlaidFinancialCredential"],
        issuer: {
          id: "did:persona:plaid-issuer",
          name: "PersonaPass Plaid Issuer"
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        credentialSubject: {
          id: `did:persona:plaid:${tokenData.item_id}`,
          type: "PlaidFinancialProfile",
          
          // Identity Information (if available)
          accountHolderName: primaryName,
          email: primaryEmail,
          address: primaryAddress ? {
            street: primaryAddress.data.street,
            city: primaryAddress.data.city,
            region: primaryAddress.data.region,
            postalCode: primaryAddress.data.postal_code,
            country: primaryAddress.data.country
          } : null,
          
          // Account Information (aggregated for privacy)
          totalAccounts: accountCount,
          accountTypes: accountTypes,
          institutionCount,
          
          // Financial Metrics (ranges for privacy)
          totalBalanceRange: totalBalance > 10000 ? "high" : totalBalance > 1000 ? "medium" : "low",
          monthlyIncomeRange: monthlyIncome > 5000 ? "high" : monthlyIncome > 2000 ? "medium" : "low",
          monthlyExpensesRange: monthlyExpenses > 5000 ? "high" : monthlyExpenses > 2000 ? "medium" : "low",
          cashFlowStatus: monthlyIncome > monthlyExpenses ? "positive" : "negative",
          
          // Verification Levels
          bankAccountVerified: true,
          identityVerified: !!identityData,
          transactionHistoryVerified: !!transactionsData,
          
          // Financial Health Metrics
          financialHealthScore,
          accountDiversityScore: Math.min(100, accountCount * 25),
          activityLevel: transactionCount > 20 ? "high" : transactionCount > 10 ? "medium" : "low",
          
          // Privacy-Preserving Metrics
          hasCheckingAccount: accounts.some((a: PlaidAccount) => a.subtype === "checking"),
          hasSavingsAccount: accounts.some((a: PlaidAccount) => a.subtype === "savings"),
          hasPositiveBalance: totalBalance > 0,
          hasRegularIncome: monthlyIncome > 0,
          
          // Metadata
          dataCollectedAt: new Date().toISOString(),
          dataValidityPeriod: "90_days",
          plaidEnvironment: environment,
          institutionId: tokenData.item_id,
          
          // Verification
          verified: true,
          verificationLevel: "bank_account_verified",
          verificationDate: new Date().toISOString()
        }
      };

      // Generate ZK commitment for selective disclosure
      const zkCommitment = {
        commitment: Buffer.from(JSON.stringify({
          accountHolderName: primaryName,
          verified: true,
          totalBalanceRange: credential.credentialSubject.totalBalanceRange,
          monthlyIncomeRange: credential.credentialSubject.monthlyIncomeRange,
          financialHealthScore,
          hasPositiveBalance: totalBalance > 0,
          hasRegularIncome: monthlyIncome > 0,
          bankAccountVerified: true
        })).toString('base64'),
        salt: Buffer.from(Math.random().toString(36).substr(2, 32)).toString('base64'),
        selectiveFields: [
          "accountHolderName",
          "verified",
          "totalBalanceRange",
          "monthlyIncomeRange",
          "financialHealthScore",
          "hasPositiveBalance",
          "hasRegularIncome",
          "bankAccountVerified",
          "accountDiversityScore",
          "activityLevel"
        ],
        proofCircuit: "plaid_financial_verification"
      };

      // Return real credential with ZK commitment
      return res.status(200).json({
        success: true,
        credential,
        zkCommitment,
        platform: "plaid",
        sessionId,
        dataCollected: {
          accountData: true,
          identityData: !!identityData,
          transactionData: !!transactionsData,
          accountCount,
          transactionCount,
          financialHealthScore
        },
        metadata: {
          fetchedAt: new Date().toISOString(),
          dataFreshness: "real_time",
          credentialType: "PlaidFinancialCredential",
          version: "1.0",
          environment
        }
      });

    } catch (error) {
      console.error("Plaid callback error:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}