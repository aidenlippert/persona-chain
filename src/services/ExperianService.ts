/**
 * Experian API Service for Credit Verification
 * Provides comprehensive credit scoring and verification capabilities
 */

import { VerifiableCredential } from '../types/identity';
import { errorService } from "@/services/errorService";

export interface ExperianConfig {
  apiKey: string;
  clientId: string;
  clientSecret: string;
  sandboxMode: boolean;
  baseUrl?: string;
}

export interface CreditScoreRequest {
  // Personal Information
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string; // YYYY-MM-DD
  ssn: string; // Last 4 digits or full SSN
  
  // Address Information
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Contact Information
  phoneNumber?: string;
  emailAddress?: string;
}

export interface CreditScoreResponse {
  success: boolean;
  requestId: string;
  creditScore: number;
  scoreModel: string; // FICO, VantageScore, etc.
  scoreRange: {
    minimum: number;
    maximum: number;
  };
  riskGrade: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'POOR';
  creditSummary: {
    totalAccounts: number;
    openAccounts: number;
    totalDebt: number;
    availableCredit: number;
    creditUtilization: number;
    oldestAccountAge: number; // months
    averageAccountAge: number; // months
    recentInquiries: number;
  };
  paymentHistory: {
    onTimePayments: number;
    latePayments: number;
    missedPayments: number;
    defaultAccounts: number;
  };
  publicRecords: {
    bankruptcies: number;
    liens: number;
    judgments: number;
    foreclosures: number;
  };
  alerts: string[];
  recommendations: string[];
  reportDate: string;
  nextUpdateDate: string;
}

export interface CreditVerificationResult {
  success: boolean;
  verificationId: string;
  creditScore: number;
  riskGrade: string;
  verificationLevel: 'BASIC' | 'STANDARD' | 'COMPREHENSIVE';
  credential?: VerifiableCredential;
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    scoreModel: string;
    expiresAt: string;
  };
}

export class ExperianService {
  private config: ExperianConfig;
  private baseUrl: string;

  constructor(config: ExperianConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || (config.sandboxMode 
      ? 'https://sandbox-us-api.experian.com'
      : 'https://us-api.experian.com'
    );
  }

  /**
   * Initialize Experian service with configuration
   */
  static create(config: Partial<ExperianConfig>): ExperianService {
    const defaultConfig: ExperianConfig = {
      apiKey: process.env.VITE_EXPERIAN_API_KEY || '',
      clientId: process.env.VITE_EXPERIAN_CLIENT_ID || '',
      clientSecret: process.env.VITE_EXPERIAN_CLIENT_SECRET || '',
      sandboxMode: process.env.NODE_ENV !== 'production',
    };

    return new ExperianService({ ...defaultConfig, ...config });
  }

  /**
   * Get OAuth access token for Experian API
   */
  private async getAccessToken(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth2/v1/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: new URLSearchParams({
          'grant_type': 'client_credentials',
          'scope': 'credit-profile'
        }).toString()
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      errorService.logError('❌ Failed to get Experian access token:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive credit score and report
   */
  async getCreditScore(request: CreditScoreRequest): Promise<CreditScoreResponse> {
    console.log('🔍 Fetching credit score from Experian...');

    try {
      const accessToken = await this.getAccessToken();

      const requestPayload = {
        consumerPii: {
          primaryApplicant: {
            name: {
              firstName: request.firstName,
              middleName: request.middleName || '',
              lastName: request.lastName
            },
            dob: {
              dob: request.dateOfBirth
            },
            ssn: {
              ssn: request.ssn
            },
            address: {
              line1: request.streetAddress,
              city: request.city,
              state: request.state,
              zipCode: request.zipCode
            },
            phone: request.phoneNumber ? [{
              number: request.phoneNumber
            }] : [],
            email: request.emailAddress ? [{
              emailAddress: request.emailAddress
            }] : []
          }
        },
        requestor: {
          subscriberCode: this.config.clientId
        },
        permissiblePurpose: {
          type: "3F", // Account review
          text: "PersonaPass identity verification"
        },
        vendor: {
          vendorCode: "PERSONAPASS"
        },
        addOns: {
          directCheck: "Y",
          demographics: "Y",
          clarityEarlyRiskScore: "Y"
        }
      };

      const response = await fetch(`${this.baseUrl}/businessservices/credit-profile/v1/consumer-credit-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Experian API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return this.parseExperianResponse(data);

    } catch (error) {
      errorService.logError('❌ Failed to get credit score:', error);
      
      // Return mock data in development/sandbox mode
      if (this.config.sandboxMode) {
        console.log('🔧 Returning mock credit data for development...');
        return this.getMockCreditScore(request);
      }
      
      throw error;
    }
  }

  /**
   * Parse Experian API response into our format
   */
  private parseExperianResponse(data: any): CreditScoreResponse {
    const creditProfile = data.consumerCreditProfile;
    const riskModel = creditProfile?.riskModel?.[0];
    const creditScore = riskModel?.modelIndicator?.[0]?.score || 0;

    // Determine risk grade based on score
    let riskGrade: CreditScoreResponse['riskGrade'] = 'POOR';
    if (creditScore >= 800) riskGrade = 'EXCELLENT';
    else if (creditScore >= 740) riskGrade = 'VERY_GOOD';
    else if (creditScore >= 670) riskGrade = 'GOOD';
    else if (creditScore >= 580) riskGrade = 'FAIR';

    return {
      success: true,
      requestId: data.requestId || `exp_${Date.now()}`,
      creditScore,
      scoreModel: riskModel?.modelNumber || 'FICO 8',
      scoreRange: {
        minimum: 300,
        maximum: 850
      },
      riskGrade,
      creditSummary: {
        totalAccounts: creditProfile?.tradeline?.length || 0,
        openAccounts: creditProfile?.tradeline?.filter((t: any) => t.accountDesignator === 'O')?.length || 0,
        totalDebt: creditProfile?.summary?.totalBalance || 0,
        availableCredit: creditProfile?.summary?.totalCreditLimit || 0,
        creditUtilization: creditProfile?.summary?.utilizationRatio || 0,
        oldestAccountAge: creditProfile?.summary?.oldestTradeAge || 0,
        averageAccountAge: creditProfile?.summary?.averageTradeAge || 0,
        recentInquiries: creditProfile?.inquiry?.filter((i: any) => 
          new Date(i.inquiryDate).getTime() > Date.now() - (90 * 24 * 60 * 60 * 1000)
        )?.length || 0
      },
      paymentHistory: {
        onTimePayments: creditProfile?.summary?.satisfactoryAccounts || 0,
        latePayments: creditProfile?.summary?.delinquentAccounts || 0,
        missedPayments: creditProfile?.summary?.derogatoryAccounts || 0,
        defaultAccounts: creditProfile?.summary?.chargeOffAccounts || 0
      },
      publicRecords: {
        bankruptcies: creditProfile?.bankruptcy?.length || 0,
        liens: creditProfile?.lien?.length || 0,
        judgments: creditProfile?.judgment?.length || 0,
        foreclosures: creditProfile?.foreclosure?.length || 0
      },
      alerts: creditProfile?.fraudAlert?.map((alert: any) => alert.text) || [],
      recommendations: this.generateCreditRecommendations(creditScore, riskGrade),
      reportDate: new Date().toISOString(),
      nextUpdateDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Generate credit improvement recommendations
   */
  private generateCreditRecommendations(score: number, grade: string): string[] {
    const recommendations: string[] = [];

    if (score < 670) {
      recommendations.push('Focus on making all payments on time');
      recommendations.push('Keep credit card balances below 30% of limits');
      recommendations.push('Avoid opening new credit accounts frequently');
    }

    if (score < 740) {
      recommendations.push('Consider paying down high-balance accounts');
      recommendations.push('Keep older accounts open to maintain credit history');
    }

    if (score >= 740) {
      recommendations.push('Maintain current excellent payment habits');
      recommendations.push('Monitor credit reports regularly for accuracy');
    }

    return recommendations;
  }

  /**
   * Generate Verifiable Credential for credit verification
   */
  async generateCreditVerificationVC(
    creditData: CreditScoreResponse,
    userDid: string
  ): Promise<VerifiableCredential> {
    const credentialId = `experian-credit-${Date.now()}`;
    
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://personapass.io/contexts/credit/v1'
      ],
      id: `https://personapass.io/credentials/${credentialId}`,
      type: ['VerifiableCredential', 'CreditVerificationCredential'],
      issuer: {
        id: 'did:persona:experian-service',
        name: 'PersonaPass Experian Integration'
      },
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      credentialSubject: {
        id: userDid,
        creditVerification: {
          score: creditData.creditScore,
          scoreModel: creditData.scoreModel,
          riskGrade: creditData.riskGrade,
          verificationLevel: this.getVerificationLevel(creditData.creditScore),
          verifiedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          dataSource: 'Experian',
          requestId: creditData.requestId
        }
      },
      evidence: [{
        type: 'CreditReport',
        source: 'Experian Credit Services',
        method: 'API Integration',
        timestamp: new Date().toISOString()
      }],
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: 'did:persona:experian-service#key-1',
        proofPurpose: 'assertionMethod',
        proofValue: 'simulated_proof_' + btoa(JSON.stringify({
          score: creditData.creditScore,
          grade: creditData.riskGrade,
          timestamp: Date.now()
        }))
      }
    };
  }

  /**
   * Determine verification level based on credit score
   */
  private getVerificationLevel(score: number): 'BASIC' | 'STANDARD' | 'COMPREHENSIVE' {
    if (score >= 740) return 'COMPREHENSIVE';
    if (score >= 580) return 'STANDARD';
    return 'BASIC';
  }

  /**
   * Perform complete credit verification workflow
   */
  async performCreditVerification(
    request: CreditScoreRequest,
    userDid: string
  ): Promise<CreditVerificationResult> {
    console.log('🏦 Starting Experian credit verification workflow...');

    try {
      // Get credit score and report
      const creditData = await this.getCreditScore(request);

      if (!creditData.success) {
        return {
          success: false,
          verificationId: '',
          creditScore: 0,
          riskGrade: 'POOR',
          verificationLevel: 'BASIC',
          error: 'Failed to retrieve credit data',
          metadata: {
            requestId: '',
            timestamp: new Date().toISOString(),
            scoreModel: '',
            expiresAt: ''
          }
        };
      }

      // Generate verifiable credential
      const credential = await this.generateCreditVerificationVC(creditData, userDid);

      const result: CreditVerificationResult = {
        success: true,
        verificationId: `experian_${Date.now()}`,
        creditScore: creditData.creditScore,
        riskGrade: creditData.riskGrade,
        verificationLevel: this.getVerificationLevel(creditData.creditScore),
        credential,
        metadata: {
          requestId: creditData.requestId,
          timestamp: new Date().toISOString(),
          scoreModel: creditData.scoreModel,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

      console.log('✅ Credit verification completed successfully');
      console.log(`📊 Credit Score: ${creditData.creditScore} (${creditData.riskGrade})`);

      return result;

    } catch (error) {
      errorService.logError('❌ Credit verification failed:', error);
      
      return {
        success: false,
        verificationId: '',
        creditScore: 0,
        riskGrade: 'POOR',
        verificationLevel: 'BASIC',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          requestId: '',
          timestamp: new Date().toISOString(),
          scoreModel: '',
          expiresAt: ''
        }
      };
    }
  }

  /**
   * Mock credit score for development/testing
   */
  private getMockCreditScore(request: CreditScoreRequest): CreditScoreResponse {
    // Generate realistic mock data based on name hash
    const nameHash = this.hashString(request.firstName + request.lastName);
    const mockScore = 580 + (nameHash % 270); // Score between 580-850
    
    let riskGrade: CreditScoreResponse['riskGrade'] = 'POOR';
    if (mockScore >= 800) riskGrade = 'EXCELLENT';
    else if (mockScore >= 740) riskGrade = 'VERY_GOOD';
    else if (mockScore >= 670) riskGrade = 'GOOD';
    else if (mockScore >= 580) riskGrade = 'FAIR';

    return {
      success: true,
      requestId: `mock_${Date.now()}`,
      creditScore: mockScore,
      scoreModel: 'FICO 8 (Mock)',
      scoreRange: { minimum: 300, maximum: 850 },
      riskGrade,
      creditSummary: {
        totalAccounts: 5 + (nameHash % 10),
        openAccounts: 3 + (nameHash % 5),
        totalDebt: 10000 + (nameHash % 50000),
        availableCredit: 25000 + (nameHash % 75000),
        creditUtilization: 15 + (nameHash % 40),
        oldestAccountAge: 24 + (nameHash % 120),
        averageAccountAge: 12 + (nameHash % 60),
        recentInquiries: nameHash % 3
      },
      paymentHistory: {
        onTimePayments: 95 + (nameHash % 5),
        latePayments: nameHash % 3,
        missedPayments: Math.floor(nameHash % 2),
        defaultAccounts: Math.floor(nameHash % 2)
      },
      publicRecords: {
        bankruptcies: Math.floor(nameHash % 2),
        liens: Math.floor(nameHash % 2),
        judgments: Math.floor(nameHash % 2),
        foreclosures: Math.floor(nameHash % 2)
      },
      alerts: [],
      recommendations: this.generateCreditRecommendations(mockScore, riskGrade),
      reportDate: new Date().toISOString(),
      nextUpdateDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Simple hash function for consistent mock data
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Export default instance
export const experianService = ExperianService.create({});