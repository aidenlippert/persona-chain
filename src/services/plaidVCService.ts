/**
 * Plaid Verifiable Credential Service
 * Creates VCs from Plaid financial data and identity verification
 */

import { DIDService } from "./didService";
import { cryptoService } from "./cryptoService";
import { storageService } from "./storageService";
import { rateLimitService } from "./rateLimitService";
import { errorService, ErrorCategory, ErrorSeverity, handleErrors } from "./errorService";
import type {
  VerifiableCredential,
  WalletCredential,
  DID,
} from "../types/wallet";

export interface PlaidIdentity {
  accounts: Array<{
    account_id: string;
    balances: {
      available: number | null;
      current: number | null;
      limit: number | null;
      iso_currency_code: string;
    };
    mask: string;
    name: string;
    official_name: string;
    subtype: string;
    type: string;
  }>;
  identity: {
    addresses: Array<{
      data: {
        street: string;
        city: string;
        region: string;
        postal_code: string;
        country: string;
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
  };
}

export interface PlaidIncome {
  income: {
    income_streams: Array<{
      confidence: number;
      days: number;
      monthly_income: number;
      name: string;
    }>;
    last_year_income: number;
    last_year_income_before_tax: number;
    max_number_of_overlapping_income_streams: number;
    number_of_income_streams: number;
    projected_yearly_income: number;
    projected_yearly_income_before_tax: number;
  };
}

import { configService } from '../config';
import { errorService } from "@/services/errorService";

export interface PlaidAssets {
  accounts: Array<{
    account_id: string;
    balances: {
      available: number;
      current: number;
      limit: number;
      iso_currency_code: string;
    };
    days_available: number;
    historical_balances: Array<{
      current: number;
      date: string;
      iso_currency_code: string;
    }>;
    name: string;
    official_name: string;
    owners: Array<{
      names: string[];
      addresses: Array<{
        data: {
          street: string;
          city: string;
          region: string;
          postal_code: string;
          country: string;
        };
      }>;
    }>;
    type: string;
    subtype: string;
  }>;
}

export interface PlaidTransactions {
  transactions: Array<{
    account_id: string;
    amount: number;
    iso_currency_code: string;
    category: string[];
    category_id: string;
    date: string;
    name: string;
    merchant_name?: string;
    transaction_id: string;
    transaction_type: string;
  }>;
}

export class PlaidVCService {
  private accessToken: string | null = null;
  private clientId: string;
  private secret: string;
  private baseURL = "https://production.plaid.com"; // Use sandbox for testing

  constructor(
    clientId: string,
    secret: string,
    environment: "sandbox" | "development" | "production" = "sandbox",
  ) {
    this.clientId = clientId;
    this.secret = secret;
    this.baseURL =
      environment === "sandbox"
        ? "https://sandbox.plaid.com"
        : environment === "development"
          ? "https://development.plaid.com"
          : "https://production.plaid.com";
  }

  /**
   * Set Plaid access token
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Create Identity Verification Credential
   */
  async createIdentityCredential(
    userDID: DID,
    privateKey: Uint8Array,
  ): Promise<WalletCredential> {
    if (!this.accessToken) {
      throw new Error("Plaid access token required");
    }

    try {
      const identity = await this.fetchIdentity();

      const credential: VerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/financial-identity/v1",
        ],
        id: `urn:uuid:plaid-identity-${Date.now()}`,
        type: [
          "VerifiableCredential",
          "IdentityCredential",
          "FinancialIdentityCredential",
        ],
        issuer: {
          id: "did:web:plaid.com",
          name: "Plaid Inc.",
          url: "https://plaid.com",
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(
          Date.now() + 180 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 6 months
        credentialSubject: {
          id: userDID,
          type: "Person",
          personalInfo: {
            names: identity.identity.names,
            addresses: identity.identity.addresses.map((addr) => ({
              street: addr.data.street,
              city: addr.data.city,
              region: addr.data.region,
              postalCode: addr.data.postal_code,
              country: addr.data.country,
              isPrimary: addr.primary,
            })),
            emails: identity.identity.emails.map((email) => ({
              address: email.data,
              type: email.type,
              isPrimary: email.primary,
            })),
            phoneNumbers: identity.identity.phone_numbers.map((phone) => ({
              number: phone.data,
              type: phone.type,
              isPrimary: phone.primary,
            })),
          },
          accounts: identity.accounts.map((account) => ({
            institutionName: account.official_name || account.name,
            accountType: account.type,
            accountSubtype: account.subtype,
            mask: account.mask,
            currency: account.balances.iso_currency_code,
          })),
          verificationData: {
            verifiedAt: new Date().toISOString(),
            method: "plaid-identity-verification",
            accountsVerified: identity.accounts.length,
            dataPoints: [
              "name",
              "address",
              "email",
              "phone",
              "bank_accounts",
            ].filter((dp) => this.hasDataPoint(identity, dp)),
          },
        },
        proof: await this.createProof(userDID, privateKey, identity),
      };

      const walletCredential: WalletCredential = {
        id: credential.id,
        credential,
        metadata: {
          name: "Financial Identity Verification",
          description: "Bank-verified identity credential via Plaid",
          tags: ["identity", "financial", "plaid", "verified", "kyc"],
          source: "plaid",
          issuer: "Plaid Inc.",
          issuedAt: credential.issuanceDate,
          expiresAt: credential.expirationDate,
          credentialType: "IdentityCredential",
        },
        storage: {
          encrypted: true,
          pinned: true,
          synced: true,
        },
      };

      await storageService.storeCredential(walletCredential);
      return walletCredential;
    } catch (error) {
      throw new Error(
        `Failed to create Plaid identity credential: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create Income Verification Credential
   */
  async createIncomeCredential(
    userDID: DID,
    privateKey: Uint8Array,
  ): Promise<WalletCredential> {
    if (!this.accessToken) {
      throw new Error("Plaid access token required");
    }

    try {
      const income = await this.fetchIncome();

      const credential: VerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/income/v1",
        ],
        id: `urn:uuid:plaid-income-${Date.now()}`,
        type: [
          "VerifiableCredential",
          "IncomeCredential",
          "FinancialIncomeCredential",
        ],
        issuer: {
          id: "did:web:plaid.com",
          name: "Plaid Inc.",
          url: "https://plaid.com",
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 3 months
        credentialSubject: {
          id: userDID,
          type: "IncomeEarner",
          incomeData: {
            projectedYearlyIncome: income.income.projected_yearly_income,
            projectedYearlyIncomeBeforeTax:
              income.income.projected_yearly_income_before_tax,
            lastYearIncome: income.income.last_year_income,
            lastYearIncomeBeforeTax: income.income.last_year_income_before_tax,
            numberOfIncomeStreams: income.income.number_of_income_streams,
            maxOverlappingStreams:
              income.income.max_number_of_overlapping_income_streams,
            incomeStreams: income.income.income_streams.map((stream) => ({
              name: stream.name,
              monthlyIncome: stream.monthly_income,
              confidence: stream.confidence,
              daysOfData: stream.days,
            })),
            incomeCategory: this.categorizeIncome(
              income.income.projected_yearly_income,
            ),
            currency: "USD",
          },
          verificationData: {
            verifiedAt: new Date().toISOString(),
            method: "plaid-income-verification",
            dataSource: "bank_transactions",
            analysisPeriodsMonths: 12,
            confidenceScore: this.calculateOverallConfidence(
              income.income.income_streams,
            ),
          },
        },
        proof: await this.createProof(userDID, privateKey, income),
      };

      const walletCredential: WalletCredential = {
        id: credential.id,
        credential,
        metadata: {
          name: "Income Verification",
          description: "Bank-verified income credential via Plaid",
          tags: ["income", "financial", "plaid", "verified", "employment"],
          source: "plaid",
          issuer: "Plaid Inc.",
          issuedAt: credential.issuanceDate,
          expiresAt: credential.expirationDate,
          credentialType: "IncomeCredential",
        },
        storage: {
          encrypted: true,
          pinned: true,
          synced: true,
        },
      };

      await storageService.storeCredential(walletCredential);
      return walletCredential;
    } catch (error) {
      throw new Error(
        `Failed to create Plaid income credential: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create Asset Verification Credential
   */
  async createAssetCredential(
    userDID: DID,
    privateKey: Uint8Array,
  ): Promise<WalletCredential> {
    if (!this.accessToken) {
      throw new Error("Plaid access token required");
    }

    try {
      const assets = await this.fetchAssets();

      const totalAssets = assets.accounts.reduce(
        (sum, account) => sum + account.balances.current,
        0,
      );
      const averageBalance = this.calculateAverageBalance(assets.accounts);

      const credential: VerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/assets/v1",
        ],
        id: `urn:uuid:plaid-assets-${Date.now()}`,
        type: [
          "VerifiableCredential",
          "AssetCredential",
          "FinancialAssetCredential",
        ],
        issuer: {
          id: "did:web:plaid.com",
          name: "Plaid Inc.",
          url: "https://plaid.com",
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 1 month
        credentialSubject: {
          id: userDID,
          type: "AssetHolder",
          assetData: {
            totalCurrentBalance: totalAssets,
            averageBalance: averageBalance,
            numberOfAccounts: assets.accounts.length,
            accountTypes: [...new Set(assets.accounts.map((acc) => acc.type))],
            accountSubtypes: [
              ...new Set(assets.accounts.map((acc) => acc.subtype)),
            ],
            currency: assets.accounts[0]?.balances.iso_currency_code || "USD",
            assetCategory: this.categorizeAssets(totalAssets),
            balanceStability: this.assessBalanceStability(assets.accounts),
          },
          accounts: assets.accounts.map((account) => ({
            institutionName: account.official_name || account.name,
            accountType: account.type,
            accountSubtype: account.subtype,
            currentBalance: account.balances.current,
            averageBalance: this.calculateAccountAverageBalance(
              account.historical_balances,
            ),
            daysOfData: account.days_available,
            currency: account.balances.iso_currency_code,
          })),
          verificationData: {
            verifiedAt: new Date().toISOString(),
            method: "plaid-asset-verification",
            dataSource: "bank_balances",
            analysisPeriodsMonths: 3,
            balanceVerificationScore: this.calculateBalanceVerificationScore(
              assets.accounts,
            ),
          },
        },
        proof: await this.createProof(userDID, privateKey, assets),
      };

      const walletCredential: WalletCredential = {
        id: credential.id,
        credential,
        metadata: {
          name: "Asset Verification",
          description: "Bank-verified asset credential via Plaid",
          tags: ["assets", "financial", "plaid", "verified", "wealth"],
          source: "plaid",
          issuer: "Plaid Inc.",
          issuedAt: credential.issuanceDate,
          expiresAt: credential.expirationDate,
          credentialType: "AssetCredential",
        },
        storage: {
          encrypted: true,
          pinned: true,
          synced: true,
        },
      };

      await storageService.storeCredential(walletCredential);
      return walletCredential;
    } catch (error) {
      throw new Error(
        `Failed to create Plaid asset credential: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create comprehensive financial credential combining all financial data
   */
  @handleErrors(ErrorCategory.EXTERNAL_API, ErrorSeverity.HIGH)
  async createFinancialCredential(
    userDID: DID,
    privateKey: Uint8Array,
    accessToken: string,
  ): Promise<WalletCredential> {
    if (!accessToken) {
      throw errorService.createError(
        'PLAID_NO_ACCESS_TOKEN',
        'Plaid access token required',
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'plaid-vc', action: 'create-credential' }),
        {
          retryable: false,
          recoveryActions: ['authenticate_plaid'],
          userMessage: 'Please connect your bank account through Plaid first.',
        }
      );
    }

    // Check rate limit for credential creation
    const rateLimitResult = rateLimitService.checkRateLimit(
      userDID,
      'credential-creation'
    );
    if (!rateLimitResult.allowed) {
      throw errorService.createError(
        'CREDENTIAL_CREATION_RATE_LIMIT',
        'Credential creation rate limit exceeded',
        ErrorCategory.RATE_LIMIT,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'plaid-vc', action: 'create-credential' }),
        {
          retryable: true,
          recoveryActions: ['wait_and_retry'],
          userMessage: `Rate limit exceeded. Please wait ${Math.ceil(rateLimitResult.retryAfter! / 1000)} seconds and try again.`,
        }
      );
    }

    this.setAccessToken(accessToken);

    try {
      // Fetch all financial data in parallel
      const [identity, income, assets] = await Promise.all([
        this.fetchIdentity().catch(() => null),
        this.fetchIncome().catch(() => null),
        this.fetchAssets().catch(() => null),
      ]);

      // Calculate comprehensive financial metrics
      const financialMetrics = this.calculateFinancialMetrics(
        identity,
        income,
        assets,
      );

      const credential: VerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/financial/v1",
        ],
        id: `urn:uuid:plaid-financial-${Date.now()}`,
        type: [
          "VerifiableCredential",
          "FinancialCredential",
          "PlaidFinancialCredential",
        ],
        issuer: {
          id: "did:web:plaid.com",
          name: "Plaid Inc.",
          url: "https://plaid.com",
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 90 days
        credentialSubject: {
          id: userDID,
          type: "FinancialProfile",
          identity: identity
            ? {
                name: identity.name,
                email: identity.email,
                phone: identity.phone,
                address: identity.address,
                dateOfBirth: identity.dateOfBirth,
                taxId: identity.taxId
                  ? "***-**-" + identity.taxId.slice(-4)
                  : undefined, // Mask SSN
              }
            : undefined,
          income: income
            ? {
                totalMonthlyIncome: income.totalMonthlyIncome,
                primaryIncomeSource: income.primaryIncomeSource,
                incomeStability: income.incomeStability,
                employmentType: income.employmentType,
                payrollProvider: income.payrollProvider,
                lastPayDate: income.lastPayDate,
                projectedAnnualIncome: income.totalMonthlyIncome * 12,
              }
            : undefined,
          assets: assets
            ? {
                totalAssets: assets.totalAssets,
                accountsCount: assets.accountsCount,
                balanceStability: assets.balanceStability,
                accountTypes: assets.accountTypes,
                creditScore: assets.creditScore,
                debtToIncomeRatio: income
                  ? (assets.totalDebt || 0) / (income.totalMonthlyIncome * 12)
                  : undefined,
              }
            : undefined,
          financialMetrics: financialMetrics,
          verificationData: {
            verifiedAt: new Date().toISOString(),
            method: "plaid-api-integration",
            dataPoints: [
              identity ? "identity" : null,
              income ? "income" : null,
              assets ? "assets" : null,
            ].filter(Boolean),
            confidenceScore: this.calculateOverallConfidence(
              identity ? 0.9 : 0,
              income ? 0.85 : 0,
              assets ? 0.8 : 0,
            ),
          },
        },
        proof: await this.createProof(userDID, privateKey, {
          identity,
          income,
          assets,
        }),
      };

      const walletCredential: WalletCredential = {
        id: credential.id,
        credential,
        metadata: {
          name: `Financial Profile - ${identity?.name || "Unknown"}`,
          description:
            "Comprehensive financial credential verified through Plaid",
          tags: [
            "financial",
            "plaid",
            "banking",
            "verified",
            "income",
            "assets",
          ],
          source: "plaid",
          issuer: "Plaid Inc.",
          issuedAt: credential.issuanceDate,
          expiresAt: credential.expirationDate,
          credentialType: "FinancialCredential",
        },
        storage: {
          encrypted: true,
          pinned: true,
          synced: true,
        },
      };

      await storageService.storeCredential(walletCredential);

      console.log("✅ Plaid Financial Credential created successfully:", {
        id: credential.id,
        name: identity?.name || "Unknown",
        dataPoints: credential.credentialSubject.verificationData.dataPoints,
      });

      return walletCredential;
    } catch (error) {
      errorService.logError("❌ Failed to create Plaid financial credential:", error);
      throw new Error(
        `Failed to create Plaid financial credential: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Calculate comprehensive financial metrics
   */
  private calculateFinancialMetrics(
    identity: any,
    income: any,
    assets: any,
  ): any {
    const metrics: any = {};

    // Income metrics
    if (income) {
      metrics.monthlyIncome = income.totalMonthlyIncome;
      metrics.annualIncome = income.totalMonthlyIncome * 12;
      metrics.incomeStability = income.incomeStability;
      metrics.primaryIncomeSource = income.primaryIncomeSource;
    }

    // Asset metrics
    if (assets) {
      metrics.totalAssets = assets.totalAssets;
      metrics.liquidAssets = assets.liquidAssets || 0;
      metrics.accountsCount = assets.accountsCount;
      metrics.balanceStability = assets.balanceStability;
    }

    // Combined financial health metrics
    if (income && assets) {
      metrics.savingsRate =
        assets.totalAssets > 0
          ? assets.totalAssets / (income.totalMonthlyIncome * 12)
          : 0;
      metrics.financialHealthScore = this.calculateFinancialHealthScore(
        income,
        assets,
      );
    }

    // Risk assessment
    metrics.riskProfile = this.assessRiskProfile(income, assets);
    metrics.creditworthiness = this.assessCreditworthiness(income, assets);

    return metrics;
  }

  /**
   * Calculate financial health score
   */
  private calculateFinancialHealthScore(income: any, assets: any): number {
    let score = 0;

    // Income stability (0-30 points)
    if (income.incomeStability === "stable") score += 30;
    else if (income.incomeStability === "moderate") score += 20;
    else score += 10;

    // Asset level (0-30 points)
    if (assets.totalAssets > income.totalMonthlyIncome * 6) score += 30;
    else if (assets.totalAssets > income.totalMonthlyIncome * 3) score += 20;
    else if (assets.totalAssets > income.totalMonthlyIncome) score += 10;

    // Balance stability (0-25 points)
    if (assets.balanceStability === "stable") score += 25;
    else if (assets.balanceStability === "moderate") score += 15;
    else score += 5;

    // Account diversity (0-15 points)
    if (assets.accountsCount >= 3) score += 15;
    else if (assets.accountsCount >= 2) score += 10;
    else score += 5;

    return Math.min(score, 100);
  }

  /**
   * Assess risk profile
   */
  private assessRiskProfile(income: any, assets: any): string {
    let riskScore = 0;

    // Income volatility
    if (income.incomeStability === "volatile") riskScore += 3;
    else if (income.incomeStability === "moderate") riskScore += 1;

    // Asset volatility
    if (assets.balanceStability === "volatile") riskScore += 3;
    else if (assets.balanceStability === "moderate") riskScore += 1;

    // Emergency fund coverage
    const emergencyFundMonths = assets.totalAssets / income.totalMonthlyIncome;
    if (emergencyFundMonths < 1) riskScore += 2;
    else if (emergencyFundMonths < 3) riskScore += 1;

    if (riskScore >= 5) return "high";
    else if (riskScore >= 3) return "medium";
    else return "low";
  }

  /**
   * Assess creditworthiness
   */
  private assessCreditworthiness(income: any, assets: any): string {
    let creditScore = 0;

    // Income level
    if (income.totalMonthlyIncome > 10000) creditScore += 3;
    else if (income.totalMonthlyIncome > 5000) creditScore += 2;
    else if (income.totalMonthlyIncome > 2000) creditScore += 1;

    // Income stability
    if (income.incomeStability === "stable") creditScore += 3;
    else if (income.incomeStability === "moderate") creditScore += 1;

    // Asset level
    if (assets.totalAssets > income.totalMonthlyIncome * 6) creditScore += 2;
    else if (assets.totalAssets > income.totalMonthlyIncome * 3)
      creditScore += 1;

    // Balance stability
    if (assets.balanceStability === "stable") creditScore += 2;
    else if (assets.balanceStability === "moderate") creditScore += 1;

    if (creditScore >= 8) return "excellent";
    else if (creditScore >= 6) return "good";
    else if (creditScore >= 4) return "fair";
    else return "poor";
  }

  /**
   * Fetch identity data from Plaid
   */
  private async fetchIdentity(): Promise<PlaidIdentity> {
    // Check rate limit for Plaid API calls
    const rateLimitResult = rateLimitService.checkRateLimit(
      this.accessToken || 'anonymous',
      'plaid-api'
    );
    if (!rateLimitResult.allowed) {
      throw errorService.createError(
        'PLAID_API_RATE_LIMIT',
        'Plaid API rate limit exceeded',
        ErrorCategory.RATE_LIMIT,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'plaid-vc', action: 'fetch-identity' }),
        {
          retryable: true,
          recoveryActions: ['wait_and_retry'],
          userMessage: `Plaid API rate limit exceeded. Please wait ${Math.ceil(rateLimitResult.retryAfter! / 1000)} seconds and try again.`,
        }
      );
    }

    try {
      const response = await fetch(`${this.baseURL}/identity/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "PersonaPass-Wallet/1.0",
        },
        body: JSON.stringify({
          client_id: this.clientId,
          secret: this.secret,
          access_token: this.accessToken,
        }),
      });

      if (!response.ok) {
        rateLimitService.recordFailedRequest(
          this.accessToken || 'anonymous',
          'plaid-api'
        );
        throw errorService.handleAPIError(
          'Plaid',
          { status: response.status, statusText: response.statusText },
          errorService.createContext({ component: 'plaid-vc', action: 'fetch-identity' })
        );
      }

      const identityData = await response.json();
      console.log('✅ Plaid identity data fetched successfully');
      return identityData;
    } catch (error) {
      rateLimitService.recordFailedRequest(
        this.accessToken || 'anonymous',
        'plaid-api'
      );
      if (error instanceof Error && error.name === 'PersonaPassError') {
        throw error;
      }
      throw errorService.handleAPIError(
        'Plaid',
        error,
        errorService.createContext({ component: 'plaid-vc', action: 'fetch-identity' })
      );
    }
  }

  /**
   * Fetch income data from Plaid
   */
  private async fetchIncome(): Promise<PlaidIncome> {
    const response = await fetch(`${this.baseURL}/income/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Persona-Wallet/1.0",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        secret: this.secret,
        access_token: this.accessToken,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Plaid API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Fetch asset data from Plaid
   */
  private async fetchAssets(): Promise<PlaidAssets> {
    const response = await fetch(`${this.baseURL}/assets/report/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Persona-Wallet/1.0",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        secret: this.secret,
        access_token: this.accessToken,
        days_requested: 90,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Plaid API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Check if identity has specific data point
   */
  private hasDataPoint(identity: PlaidIdentity, dataPoint: string): boolean {
    switch (dataPoint) {
      case "name":
        return identity.identity.names.length > 0;
      case "address":
        return identity.identity.addresses.length > 0;
      case "email":
        return identity.identity.emails.length > 0;
      case "phone":
        return identity.identity.phone_numbers.length > 0;
      case "bank_accounts":
        return identity.accounts.length > 0;
      default:
        return false;
    }
  }

  /**
   * Categorize income level
   */
  private categorizeIncome(yearlyIncome: number): string {
    if (yearlyIncome >= 200000) return "high";
    if (yearlyIncome >= 75000) return "upper-middle";
    if (yearlyIncome >= 40000) return "middle";
    if (yearlyIncome >= 25000) return "lower-middle";
    return "low";
  }

  /**
   * Calculate overall confidence from income streams
   */
  private calculateOverallConfidence(streams: any[]): number {
    if (streams.length === 0) return 0;
    const total = streams.reduce((sum, stream) => sum + stream.confidence, 0);
    return Math.round((total / streams.length) * 100) / 100;
  }

  /**
   * Calculate average balance across accounts
   */
  private calculateAverageBalance(accounts: any[]): number {
    if (accounts.length === 0) return 0;
    const total = accounts.reduce(
      (sum, account) => sum + account.balances.current,
      0,
    );
    return Math.round((total / accounts.length) * 100) / 100;
  }

  /**
   * Calculate average balance for a single account
   */
  private calculateAccountAverageBalance(historicalBalances: any[]): number {
    if (historicalBalances.length === 0) return 0;
    const total = historicalBalances.reduce(
      (sum, balance) => sum + balance.current,
      0,
    );
    return Math.round((total / historicalBalances.length) * 100) / 100;
  }

  /**
   * Categorize asset level
   */
  private categorizeAssets(totalAssets: number): string {
    if (totalAssets >= 1000000) return "high-net-worth";
    if (totalAssets >= 250000) return "affluent";
    if (totalAssets >= 50000) return "moderate";
    if (totalAssets >= 10000) return "emerging";
    return "building";
  }

  /**
   * Assess balance stability
   */
  private assessBalanceStability(accounts: any[]): string {
    // Simplified stability assessment
    let stabilityScore = 0;

    accounts.forEach((account) => {
      if (account.historical_balances.length > 0) {
        const balances = account.historical_balances.map((b: any) => b.current);
        const variance = this.calculateVariance(balances);
        const mean =
          balances.reduce((sum: number, val: number) => sum + val, 0) /
          balances.length;
        const coefficientOfVariation = Math.sqrt(variance) / mean;

        if (coefficientOfVariation < 0.1) stabilityScore += 3;
        else if (coefficientOfVariation < 0.3) stabilityScore += 2;
        else stabilityScore += 1;
      }
    });

    const avgStability = stabilityScore / accounts.length;
    if (avgStability >= 2.5) return "very-stable";
    if (avgStability >= 2) return "stable";
    if (avgStability >= 1.5) return "moderate";
    return "variable";
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
    const squaredDiffs = numbers.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / numbers.length;
  }

  /**
   * Calculate balance verification score
   */
  private calculateBalanceVerificationScore(accounts: any[]): number {
    let score = 0;

    accounts.forEach((account) => {
      // Score based on data availability
      if (account.days_available >= 90) score += 30;
      else if (account.days_available >= 60) score += 20;
      else score += 10;

      // Score based on balance consistency
      if (account.historical_balances.length >= 30) score += 20;
      else if (account.historical_balances.length >= 15) score += 15;
      else score += 5;
    });

    return Math.min(100, Math.round(score / accounts.length));
  }

  /**
   * Create cryptographic proof for the credential
   */
  private async createProof(
    userDID: DID,
    privateKey: Uint8Array,
    data: any,
  ): Promise<any> {
    const proofData = {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `${userDID}#key-1`,
      proofPurpose: "assertionMethod",
    };

    const dataToSign = JSON.stringify({
      ...proofData,
      credentialHash: await cryptoService.generateHash(JSON.stringify(data)),
    });

    const signature = await DIDService.signWithDID(
      new TextEncoder().encode(dataToSign),
      privateKey,
    );

    return {
      ...proofData,
      proofValue: Array.from(signature)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    };
  }

  /**
   * Revoke Plaid credential
   */
  async revokeCredential(credentialId: string): Promise<void> {
    try {
      await storageService.deleteCredential(credentialId);
    } catch (error) {
      throw new Error(
        `Failed to revoke Plaid credential: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

// Create PlaidVCService instance with configuration
function createPlaidVCService(): PlaidVCService {
  try {
    const thirdPartyConfig = configService.getThirdPartyConfig();
    return new PlaidVCService(
      thirdPartyConfig.plaid.clientId,
      thirdPartyConfig.plaid.secret,
      thirdPartyConfig.plaid.environment
    );
  } catch (error) {
    console.warn('Configuration service not available, using fallback values:', error);
    return new PlaidVCService(
      import.meta.env.VITE_PLAID_CLIENT_ID || "",
      import.meta.env.VITE_PLAID_SECRET || "",
      (import.meta.env.VITE_PLAID_ENV as "sandbox" | "development" | "production") || "sandbox"
    );
  }
}

export const plaidVCService = createPlaidVCService();
