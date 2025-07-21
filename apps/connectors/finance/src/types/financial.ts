export interface BankAccount {
  id: string;
  institutionId: string;
  institutionName: string;
  accountType: 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'other';
  accountSubtype: string;
  balance: number;
  availableBalance?: number;
  currency: string;
  accountNumber?: string; // Masked/partial
  routingNumber?: string; // Masked/partial
  verified: boolean;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  date: string;
  category: string[];
  subcategory?: string;
  description: string;
  merchantName?: string;
  pending: boolean;
  transactionType: 'debit' | 'credit';
  verified: boolean;
}

export interface CreditScore {
  id: string;
  score: number;
  scoreRange: {
    min: number;
    max: number;
  };
  provider: 'credit_karma' | 'experian' | 'equifax' | 'transunion';
  reportDate: string;
  factors?: {
    paymentHistory: number;
    creditUtilization: number;
    lengthOfHistory: number;
    newCredit: number;
    creditMix: number;
  };
  verified: boolean;
}

export interface CreditReport {
  id: string;
  provider: string;
  reportDate: string;
  accounts: CreditAccount[];
  inquiries: CreditInquiry[];
  publicRecords: PublicRecord[];
  verified: boolean;
}

export interface CreditAccount {
  id: string;
  creditorName: string;
  accountType: string;
  balance: number;
  creditLimit?: number;
  paymentStatus: string;
  openedDate: string;
  lastUpdated: string;
}

export interface CreditInquiry {
  id: string;
  creditorName: string;
  inquiryDate: string;
  inquiryType: 'hard' | 'soft';
}

export interface PublicRecord {
  id: string;
  type: string;
  amount?: number;
  filedDate: string;
  status: string;
}

export interface FinancialProfile {
  did: string;
  accounts: BankAccount[];
  creditScores: CreditScore[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  debtToIncomeRatio?: number;
  creditUtilization?: number;
  lastUpdated: string;
}

export interface PlaidLinkToken {
  linkToken: string;
  expiration: string;
  requestId: string;
}

export interface AccessTokenData {
  accessToken: string;
  itemId: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  institutionId?: string;
  institutionName?: string;
}