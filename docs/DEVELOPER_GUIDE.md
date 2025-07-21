# PersonaPass Developer Guide 👨‍💻

> **Complete developer integration guide** - Everything you need to build applications that integrate with PersonaPass Identity Platform, from quick start to advanced implementations.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [SDK Reference](#sdk-reference)
- [Integration Patterns](#integration-patterns)
- [Verification Workflows](#verification-workflows)
- [Credential Issuance](#credential-issuance)
- [Mobile Integration](#mobile-integration)
- [Advanced Features](#advanced-features)
- [Testing & Debugging](#testing--debugging)

## 🚀 Quick Start

### 📦 Installation

#### TypeScript/JavaScript
```bash
npm install @personapass/sdk
# or
yarn add @personapass/sdk
```

#### Python
```bash
pip install personapass-sdk
```

#### Go
```bash
go get github.com/personapass/personapass-go
```

#### React Native
```bash
npm install @personapass/react-native-sdk
```

### 🔧 Basic Setup

#### Initialize SDK
```typescript
import { PersonaPassSDK, VerificationRequest } from '@personapass/sdk';

// Initialize SDK
const sdk = new PersonaPassSDK({
  verifierId: 'your-verifier-id',
  apiKey: process.env.PERSONAPASS_API_KEY,
  environment: 'production', // 'staging' or 'development'
  endpoint: 'https://api.personapass.id'
});

// Test connection
await sdk.healthCheck();
console.log('✅ PersonaPass SDK initialized successfully');
```

#### Environment Configuration
```typescript
// .env file
PERSONAPASS_API_KEY=pk_live_1234567890abcdef...
PERSONAPASS_VERIFIER_ID=verifier_abc123
PERSONAPASS_ENVIRONMENT=production
PERSONAPASS_WEBHOOK_SECRET=whsec_1234567890abcdef...

// SDK configuration
const config = {
  verifierId: process.env.PERSONAPASS_VERIFIER_ID!,
  apiKey: process.env.PERSONAPASS_API_KEY!,
  environment: process.env.PERSONAPASS_ENVIRONMENT as 'production' | 'staging',
  webhook: {
    secret: process.env.PERSONAPASS_WEBHOOK_SECRET!,
    endpoint: 'https://yourapp.com/webhooks/personapass'
  },
  options: {
    timeout: 30000,
    retries: 3,
    debug: process.env.NODE_ENV === 'development'
  }
};
```

### 🎯 First Integration - Age Verification

```typescript
// Simple age verification example
async function verifyAge(): Promise<void> {
  try {
    // Create presentation request
    const request = await sdk.createPresentationRequest({
      presentationDefinition: {
        id: 'age-verification',
        name: 'Age Verification',
        purpose: 'Verify you are 21 or older',
        input_descriptors: [{
          id: 'age-proof',
          name: 'Age Credential',
          constraints: {
            fields: [{
              path: ['$.credentialSubject.age'],
              filter: {
                type: 'number',
                minimum: 21
              }
            }]
          }
        }]
      },
      options: {
        timeout: 300000, // 5 minutes
        biometricBinding: true,
        zkProof: true // Use zero-knowledge proof
      }
    });

    console.log('📱 Show this QR code to user:', request.qrCode);
    console.log('🔗 Or send this deep link:', request.deepLink);

    // Wait for user response
    const presentation = await sdk.waitForPresentation(request.id, {
      timeout: 300000,
      pollingInterval: 2000
    });

    // Verify the presentation
    const verification = await sdk.verifyPresentation(presentation, {
      checkRevocation: true,
      requireBiometric: true,
      verifyZkProof: true
    });

    if (verification.verified) {
      console.log('✅ Age verification successful!');
      console.log('User is over 21:', verification.claims.ageOver21);
    } else {
      console.log('❌ Age verification failed');
      console.log('Errors:', verification.errors);
    }

  } catch (error) {
    console.error('💥 Verification error:', error);
  }
}
```

## 📚 SDK Reference

### 🔧 Core SDK Classes

#### PersonaPassSDK
Main SDK class for all operations:

```typescript
class PersonaPassSDK {
  constructor(config: SDKConfig);
  
  // Health & Status
  async healthCheck(): Promise<HealthStatus>;
  async getStatus(): Promise<SystemStatus>;
  
  // Presentation Requests
  async createPresentationRequest(request: PresentationRequestOptions): Promise<PresentationRequest>;
  async getPresentationRequest(id: string): Promise<PresentationRequest>;
  async cancelPresentationRequest(id: string): Promise<void>;
  
  // Presentation Handling
  async waitForPresentation(requestId: string, options?: WaitOptions): Promise<VerifiablePresentation>;
  async verifyPresentation(presentation: VerifiablePresentation, options?: VerificationOptions): Promise<VerificationResult>;
  
  // Batch Operations
  async createBatchPresentationRequest(requests: PresentationRequestOptions[]): Promise<BatchPresentationRequest>;
  async verifyPresentations(presentations: VerifiablePresentation[]): Promise<BatchVerificationResult>;
  
  // Credential Issuance (for issuers)
  async issueCredential(request: CredentialIssuanceRequest): Promise<CredentialIssuanceResult>;
  async revokeCredential(credentialId: string, reason: string): Promise<void>;
  
  // Analytics & Monitoring
  async getAnalytics(timeframe: TimeFrame): Promise<AnalyticsData>;
  async getUsageStats(): Promise<UsageStats>;
  
  // Event Handling
  onPresentationReceived(callback: (presentation: VerifiablePresentation, requestId: string) => void): void;
  onError(callback: (error: Error, context: any) => void): void;
  onVerificationComplete(callback: (result: VerificationResult) => void): void;
}
```

#### Configuration Options
```typescript
interface SDKConfig {
  // Required
  verifierId: string;
  apiKey: string;
  environment: 'production' | 'staging' | 'development';
  
  // Optional
  endpoint?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
  
  // Webhook configuration
  webhook?: {
    secret: string;
    endpoint: string;
  };
  
  // Advanced options
  options?: {
    userAgent?: string;
    proxy?: string;
    customHeaders?: Record<string, string>;
  };
}
```

### 🎯 Presentation Request Builder

#### Simple Request Builder
```typescript
import { PresentationRequestBuilder } from '@personapass/sdk';

const request = new PresentationRequestBuilder()
  .setId('age-verification-001')
  .setName('Age Verification')
  .setPurpose('Verify you are 21 or older')
  .addCredentialType('DriverLicense', {
    required: true,
    fields: ['age', 'dateOfBirth'],
    constraints: {
      age: { minimum: 21 }
    }
  })
  .setTimeout(300000) // 5 minutes
  .enableBiometricBinding()
  .enableZkProof()
  .build();

const presentationRequest = await sdk.createPresentationRequest(request);
```

#### Advanced Request Builder
```typescript
const complexRequest = new PresentationRequestBuilder()
  .setId('comprehensive-identity-check')
  .setName('Comprehensive Identity Verification')
  .setPurpose('Complete identity verification for high-value transaction')
  
  // Primary identity credential
  .addInputDescriptor({
    id: 'government-id',
    name: 'Government Issued ID',
    purpose: 'Verify legal identity',
    constraints: {
      fields: [
        {
          path: ['$.type'],
          filter: {
            type: 'array',
            contains: { const: 'GovernmentID' }
          }
        },
        {
          path: ['$.credentialSubject.fullName'],
          filter: { type: 'string' }
        },
        {
          path: ['$.credentialSubject.dateOfBirth'],
          filter: { type: 'string', format: 'date' }
        }
      ]
    }
  })
  
  // Address verification
  .addInputDescriptor({
    id: 'address-proof',
    name: 'Address Verification',
    purpose: 'Confirm current residence',
    constraints: {
      fields: [{
        path: ['$.credentialSubject.address.country'],
        filter: {
          type: 'string',
          enum: ['US', 'CA', 'GB', 'AU'] // Allowed countries
        }
      }]
    }
  })
  
  // Financial verification (optional)
  .addInputDescriptor({
    id: 'income-verification',
    name: 'Income Verification',
    purpose: 'Verify financial capability',
    optional: true,
    constraints: {
      fields: [{
        path: ['$.credentialSubject.annualIncome'],
        filter: {
          type: 'number',
          minimum: 50000
        }
      }]
    }
  })
  
  .setSubmissionRequirements([
    {
      name: 'Identity Group',
      rule: 'pick',
      count: 1,
      from: 'A'
    },
    {
      name: 'Address Group', 
      rule: 'pick',
      count: 1,
      from: 'B'
    }
  ])
  
  .setTimeout(600000) // 10 minutes for complex verification
  .enableBiometricBinding()
  .requireLivenessDetection()
  .enableZkProof()
  .setCallbackUrl('https://yourapp.com/verification-complete')
  .build();
```

### 📱 Mobile SDK Integration

#### React Native Integration
```typescript
import { PersonaPassRN } from '@personapass/react-native-sdk';

// Initialize for React Native
const mobileSDK = new PersonaPassRN({
  verifierId: 'your-verifier-id',
  apiKey: 'your-api-key',
  environment: 'production'
});

// Request presentation with native UI
const verifyIdentity = async (): Promise<void> => {
  try {
    const result = await mobileSDK.requestPresentation({
      presentationDefinition: {
        id: 'mobile-identity-check',
        input_descriptors: [{
          id: 'id-card',
          constraints: {
            fields: [{
              path: ['$.credentialSubject.fullName']
            }]
          }
        }]
      },
      options: {
        useNativeUI: true,
        biometricRequired: true,
        timeout: 300000
      }
    });

    if (result.verified) {
      console.log('✅ Identity verified:', result.claims);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
};

// Handle deep links
import { Linking } from 'react-native';

Linking.addEventListener('url', (event) => {
  if (event.url.startsWith('personapass://')) {
    mobileSDK.handleDeepLink(event.url);
  }
});
```

#### Android Native Integration
```kotlin
// Android SDK integration
import com.personapass.sdk.PersonaPassSDK
import com.personapass.sdk.PresentationRequest

class MainActivity : AppCompatActivity() {
    private lateinit var personaPassSDK: PersonaPassSDK
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize SDK
        personaPassSDK = PersonaPassSDK.Builder()
            .setVerifierId("your-verifier-id")
            .setApiKey("your-api-key")
            .setEnvironment(PersonaPassSDK.Environment.PRODUCTION)
            .build()
    }
    
    private suspend fun verifyAge() {
        try {
            val request = PresentationRequest.Builder()
                .setId("age-verification")
                .addCredentialType("DriverLicense")
                .addConstraint("age", mapOf("minimum" to 21))
                .enableBiometric(true)
                .setTimeout(300000)
                .build()
            
            val result = personaPassSDK.requestPresentation(request)
            
            if (result.verified) {
                showSuccess("Age verified successfully!")
            } else {
                showError("Age verification failed")
            }
        } catch (e: Exception) {
            showError("Error: ${e.message}")
        }
    }
}
```

## 🔄 Integration Patterns

### 🎯 Common Integration Patterns

#### 1. E-Commerce Age Verification
```typescript
// E-commerce checkout age verification
class AgeVerificationService {
  private sdk: PersonaPassSDK;
  
  constructor(sdk: PersonaPassSDK) {
    this.sdk = sdk;
  }
  
  async verifyAgeForPurchase(
    productType: 'alcohol' | 'tobacco' | 'adult_content',
    userId: string,
    sessionId: string
  ): Promise<AgeVerificationResult> {
    const minimumAge = this.getMinimumAge(productType);
    
    const request = await this.sdk.createPresentationRequest({
      presentationDefinition: {
        id: `age-verification-${sessionId}`,
        name: `Age Verification for ${productType}`,
        purpose: `Verify you are ${minimumAge} or older to purchase ${productType}`,
        input_descriptors: [{
          id: 'age-credential',
          constraints: {
            fields: [{
              path: ['$.credentialSubject.age'],
              filter: {
                type: 'number',
                minimum: minimumAge
              }
            }]
          }
        }]
      },
      options: {
        timeout: 300000,
        biometricBinding: true,
        zkProof: true // Don't reveal exact age
      }
    });
    
    // Store request in session
    await this.storeVerificationRequest(userId, sessionId, request.id);
    
    return {
      requestId: request.id,
      qrCode: request.qrCode,
      deepLink: request.deepLink,
      expiresAt: request.expiresAt
    };
  }
  
  async completeAgeVerification(
    requestId: string,
    sessionId: string
  ): Promise<VerificationResult> {
    try {
      // Wait for presentation with timeout
      const presentation = await this.sdk.waitForPresentation(requestId, {
        timeout: 300000
      });
      
      // Verify the presentation
      const verification = await this.sdk.verifyPresentation(presentation, {
        checkRevocation: true,
        requireBiometric: true,
        verifyZkProof: true
      });
      
      if (verification.verified) {
        // Update session with verification status
        await this.updateSessionVerification(sessionId, true);
        
        // Log successful verification
        await this.auditLogger.log('age_verification_success', {
          sessionId,
          requestId,
          timestamp: new Date()
        });
      }
      
      return verification;
    } catch (error) {
      await this.auditLogger.log('age_verification_error', {
        sessionId,
        requestId,
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }
  
  private getMinimumAge(productType: string): number {
    const ageRequirements = {
      alcohol: 21,
      tobacco: 18,
      adult_content: 18
    };
    return ageRequirements[productType] || 18;
  }
}
```

#### 2. Employee Onboarding
```typescript
// HR onboarding with credential verification
class EmployeeOnboardingService {
  private sdk: PersonaPassSDK;
  
  async startOnboarding(employeeId: string): Promise<OnboardingSession> {
    const session = await this.createOnboardingSession(employeeId);
    
    // Step 1: Identity Verification
    const identityRequest = await this.sdk.createPresentationRequest({
      presentationDefinition: {
        id: `identity-check-${employeeId}`,
        name: 'Identity Verification',
        purpose: 'Verify your legal identity for employment',
        input_descriptors: [{
          id: 'government-id',
          name: 'Government ID',
          constraints: {
            fields: [
              { path: ['$.credentialSubject.fullName'] },
              { path: ['$.credentialSubject.dateOfBirth'] },
              { path: ['$.credentialSubject.nationality'] }
            ]
          }
        }]
      },
      options: {
        timeout: 600000, // 10 minutes
        biometricBinding: true
      }
    });
    
    // Step 2: Education Verification
    const educationRequest = await this.sdk.createPresentationRequest({
      presentationDefinition: {
        id: `education-check-${employeeId}`,
        name: 'Education Verification',
        purpose: 'Verify your educational qualifications',
        input_descriptors: [{
          id: 'degree-certificate',
          name: 'Degree Certificate',
          constraints: {
            fields: [
              { path: ['$.credentialSubject.degree'] },
              { path: ['$.credentialSubject.institution'] },
              { path: ['$.credentialSubject.graduationDate'] }
            ]
          }
        }]
      }
    });
    
    session.steps = [
      {
        name: 'Identity Verification',
        requestId: identityRequest.id,
        qrCode: identityRequest.qrCode,
        status: 'pending'
      },
      {
        name: 'Education Verification',
        requestId: educationRequest.id,
        qrCode: educationRequest.qrCode,
        status: 'pending'
      }
    ];
    
    return session;
  }
  
  async checkOnboardingProgress(sessionId: string): Promise<OnboardingStatus> {
    const session = await this.getOnboardingSession(sessionId);
    const status: OnboardingStatus = {
      sessionId,
      completedSteps: 0,
      totalSteps: session.steps.length,
      steps: []
    };
    
    for (const step of session.steps) {
      try {
        const request = await this.sdk.getPresentationRequest(step.requestId);
        
        if (request.status === 'completed') {
          status.completedSteps++;
          status.steps.push({
            name: step.name,
            status: 'completed',
            completedAt: request.completedAt
          });
        } else {
          status.steps.push({
            name: step.name,
            status: 'pending'
          });
        }
      } catch (error) {
        status.steps.push({
          name: step.name,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return status;
  }
}
```

#### 3. Financial Services KYC
```typescript
// KYC compliance for financial services
class KYCService {
  private sdk: PersonaPassSDK;
  
  async performKYC(
    customerId: string,
    kycLevel: 'basic' | 'enhanced' | 'premium'
  ): Promise<KYCResult> {
    const requirements = this.getKYCRequirements(kycLevel);
    
    const request = await this.sdk.createPresentationRequest({
      presentationDefinition: {
        id: `kyc-${kycLevel}-${customerId}`,
        name: `${kycLevel.toUpperCase()} KYC Verification`,
        purpose: 'Complete Know Your Customer verification for financial services',
        input_descriptors: requirements.descriptors,
        submission_requirements: requirements.submissions
      },
      options: {
        timeout: 1800000, // 30 minutes for KYC
        biometricBinding: true,
        requireLiveness: true,
        zkProof: false // KYC typically requires full disclosure
      }
    });
    
    return {
      kycId: request.id,
      level: kycLevel,
      qrCode: request.qrCode,
      deepLink: request.deepLink,
      expiresAt: request.expiresAt,
      requirements: requirements.summary
    };
  }
  
  private getKYCRequirements(level: string): KYCRequirements {
    const baseRequirements = {
      descriptors: [
        {
          id: 'government-id',
          name: 'Government Issued ID',
          constraints: {
            fields: [
              { path: ['$.credentialSubject.fullName'] },
              { path: ['$.credentialSubject.dateOfBirth'] },
              { path: ['$.credentialSubject.nationality'] },
              { path: ['$.credentialSubject.documentNumber'] }
            ]
          }
        },
        {
          id: 'address-proof',
          name: 'Proof of Address',
          constraints: {
            fields: [
              { path: ['$.credentialSubject.address'] },
              { path: ['$.credentialSubject.issueDate'] }
            ]
          }
        }
      ],
      submissions: [
        {
          name: 'Basic Identity',
          rule: 'pick',
          count: 2,
          from: 'A'
        }
      ]
    };
    
    if (level === 'enhanced' || level === 'premium') {
      baseRequirements.descriptors.push({
        id: 'income-verification',
        name: 'Income Verification',
        constraints: {
          fields: [
            { path: ['$.credentialSubject.annualIncome'] },
            { path: ['$.credentialSubject.employer'] }
          ]
        }
      });
    }
    
    if (level === 'premium') {
      baseRequirements.descriptors.push({
        id: 'wealth-verification',
        name: 'Wealth Verification',
        constraints: {
          fields: [
            { path: ['$.credentialSubject.netWorth'] },
            { path: ['$.credentialSubject.liquidAssets'] }
          ]
        }
      });
    }
    
    return {
      descriptors: baseRequirements.descriptors,
      submissions: baseRequirements.submissions,
      summary: `${level.toUpperCase()} KYC requires ${baseRequirements.descriptors.length} types of verification`
    };
  }
}
```

### 🔄 Webhook Integration

#### Setting Up Webhooks
```typescript
// Webhook handler for real-time updates
import express from 'express';
import crypto from 'crypto';

const app = express();

// Webhook endpoint
app.post('/webhooks/personapass', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-personapass-signature'] as string;
  const payload = req.body;
  
  // Verify webhook signature
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(payload.toString());
  
  // Handle different event types
  switch (event.type) {
    case 'presentation.submitted':
      handlePresentationSubmitted(event.data);
      break;
    case 'verification.completed':
      handleVerificationCompleted(event.data);
      break;
    case 'presentation.expired':
      handlePresentationExpired(event.data);
      break;
    case 'error.occurred':
      handleError(event.data);
      break;
    default:
      console.log('Unknown event type:', event.type);
  }
  
  res.status(200).send('OK');
});

function verifyWebhookSignature(
  payload: Buffer,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expectedSignature}`),
    Buffer.from(signature)
  );
}

async function handlePresentationSubmitted(data: any): Promise<void> {
  console.log('📨 Presentation submitted:', data.requestId);
  
  // Update your database
  await updatePresentationStatus(data.requestId, 'submitted');
  
  // Notify relevant services
  await notifyVerificationService(data.requestId);
}

async function handleVerificationCompleted(data: any): Promise<void> {
  console.log('✅ Verification completed:', data.requestId);
  
  if (data.verified) {
    // Grant access or complete transaction
    await grantAccess(data.userId, data.requestId);
  } else {
    // Handle verification failure
    await handleVerificationFailure(data.userId, data.requestId, data.errors);
  }
}
```

### 🎭 Custom Event Handling

```typescript
// Custom event handling with the SDK
class PersonaPassEventHandler {
  private sdk: PersonaPassSDK;
  private eventQueue: EventQueue;
  
  constructor(sdk: PersonaPassSDK) {
    this.sdk = sdk;
    this.eventQueue = new EventQueue();
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // Handle presentation received
    this.sdk.onPresentationReceived(async (presentation, requestId) => {
      await this.eventQueue.add('presentation_received', {
        presentation,
        requestId,
        timestamp: new Date()
      });
    });
    
    // Handle verification completion
    this.sdk.onVerificationComplete(async (result) => {
      await this.eventQueue.add('verification_complete', {
        result,
        timestamp: new Date()
      });
      
      // Custom business logic
      if (result.verified) {
        await this.handleSuccessfulVerification(result);
      } else {
        await this.handleFailedVerification(result);
      }
    });
    
    // Handle errors
    this.sdk.onError(async (error, context) => {
      await this.eventQueue.add('error', {
        error: error.message,
        context,
        timestamp: new Date()
      });
      
      // Error recovery logic
      await this.handleError(error, context);
    });
  }
  
  private async handleSuccessfulVerification(result: VerificationResult): Promise<void> {
    // Log successful verification
    await this.auditLogger.log('verification_success', {
      requestId: result.requestId,
      userId: result.userId,
      claims: result.claims,
      timestamp: new Date()
    });
    
    // Business logic
    await this.grantAccess(result.userId);
    await this.sendSuccessNotification(result.userId);
  }
  
  private async handleFailedVerification(result: VerificationResult): Promise<void> {
    // Log failed verification
    await this.auditLogger.log('verification_failure', {
      requestId: result.requestId,
      userId: result.userId,
      errors: result.errors,
      timestamp: new Date()
    });
    
    // Business logic
    await this.incrementFailureCount(result.userId);
    await this.sendFailureNotification(result.userId, result.errors);
    
    // Rate limiting for failed attempts
    const failureCount = await this.getFailureCount(result.userId);
    if (failureCount >= 3) {
      await this.temporaryBlock(result.userId, '24h');
    }
  }
}
```

## 🔧 Testing & Debugging

### 🧪 Test Environment Setup

#### Unit Testing
```typescript
// Jest unit tests for PersonaPass integration
import { PersonaPassSDK } from '@personapass/sdk';
import { MockPersonaPassSDK } from '@personapass/sdk/testing';

describe('PersonaPass Integration', () => {
  let sdk: PersonaPassSDK;
  
  beforeEach(() => {
    // Use mock SDK for testing
    sdk = new MockPersonaPassSDK({
      verifierId: 'test-verifier',
      apiKey: 'test-key',
      environment: 'development'
    });
  });
  
  test('should create age verification request', async () => {
    const request = await sdk.createPresentationRequest({
      presentationDefinition: {
        id: 'test-age-verification',
        input_descriptors: [{
          id: 'age-proof',
          constraints: {
            fields: [{
              path: ['$.credentialSubject.age'],
              filter: { type: 'number', minimum: 21 }
            }]
          }
        }]
      }
    });
    
    expect(request).toHaveProperty('id');
    expect(request).toHaveProperty('qrCode');
    expect(request).toHaveProperty('deepLink');
  });
  
  test('should verify valid presentation', async () => {
    // Mock valid presentation
    const mockPresentation = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: [{
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'AgeCredential'],
        credentialSubject: {
          id: 'did:key:test',
          age: 25
        },
        proof: { /* valid proof */ }
      }],
      proof: { /* valid proof */ }
    };
    
    const result = await sdk.verifyPresentation(mockPresentation);
    
    expect(result.verified).toBe(true);
    expect(result.claims.age).toBe(25);
  });
  
  test('should handle verification timeout', async () => {
    const request = await sdk.createPresentationRequest({
      presentationDefinition: { /* definition */ },
      options: { timeout: 1000 } // 1 second timeout
    });
    
    await expect(
      sdk.waitForPresentation(request.id, { timeout: 1000 })
    ).rejects.toThrow('Presentation request timed out');
  });
});
```

#### Integration Testing
```typescript
// Integration tests with real sandbox environment
describe('PersonaPass Integration Tests', () => {
  let sdk: PersonaPassSDK;
  
  beforeAll(() => {
    sdk = new PersonaPassSDK({
      verifierId: process.env.TEST_VERIFIER_ID!,
      apiKey: process.env.TEST_API_KEY!,
      environment: 'staging'
    });
  });
  
  test('should complete full verification flow', async () => {
    // Create request
    const request = await sdk.createPresentationRequest({
      presentationDefinition: {
        id: 'integration-test',
        input_descriptors: [{
          id: 'test-credential',
          constraints: {
            fields: [{ path: ['$.credentialSubject.name'] }]
          }
        }]
      }
    });
    
    // Simulate user interaction (would be manual in real test)
    const mockWallet = new MockWallet();
    const presentation = await mockWallet.createPresentation(request);
    
    // Submit presentation
    await sdk.submitPresentation(request.id, presentation);
    
    // Verify presentation
    const result = await sdk.waitForPresentation(request.id);
    expect(result).toBeDefined();
  }, 30000); // 30 second timeout
});
```

### 🐛 Debugging Tools

#### SDK Debug Mode
```typescript
// Enable debug mode for detailed logging
const sdk = new PersonaPassSDK({
  verifierId: 'your-verifier-id',
  apiKey: 'your-api-key',
  environment: 'development',
  debug: true, // Enable debug logging
  options: {
    logLevel: 'debug',
    logRequests: true,
    logResponses: true
  }
});

// Custom debug logger
sdk.setLogger({
  debug: (message: string, data?: any) => {
    console.log(`🐛 [DEBUG] ${message}`, data);
  },
  info: (message: string, data?: any) => {
    console.log(`ℹ️ [INFO] ${message}`, data);
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ [WARN] ${message}`, data);
  },
  error: (message: string, data?: any) => {
    console.error(`❌ [ERROR] ${message}`, data);
  }
});
```

#### Request Debugging
```typescript
// Debug presentation request issues
async function debugPresentationRequest(requestId: string): Promise<void> {
  try {
    // Get request details
    const request = await sdk.getPresentationRequest(requestId);
    console.log('📋 Request Details:', JSON.stringify(request, null, 2));
    
    // Check request status
    console.log('📊 Status:', request.status);
    console.log('⏰ Created:', request.createdAt);
    console.log('⏳ Expires:', request.expiresAt);
    
    // Validate presentation definition
    const validationResult = await sdk.validatePresentationDefinition(
      request.presentationDefinition
    );
    console.log('✅ Definition Valid:', validationResult.valid);
    
    if (!validationResult.valid) {
      console.log('❌ Validation Errors:', validationResult.errors);
    }
    
    // Check for common issues
    await this.checkCommonIssues(request);
    
  } catch (error) {
    console.error('💥 Debug Error:', error);
  }
}

async function checkCommonIssues(request: PresentationRequest): Promise<void> {
  const issues: string[] = [];
  
  // Check timeout
  if (request.timeout < 60000) {
    issues.push('⚠️ Timeout may be too short (< 1 minute)');
  }
  
  // Check presentation definition
  if (!request.presentationDefinition.input_descriptors.length) {
    issues.push('❌ No input descriptors defined');
  }
  
  // Check constraints
  request.presentationDefinition.input_descriptors.forEach((desc, i) => {
    if (!desc.constraints?.fields?.length) {
      issues.push(`❌ Input descriptor ${i} has no field constraints`);
    }
  });
  
  if (issues.length > 0) {
    console.log('🚨 Potential Issues Found:');
    issues.forEach(issue => console.log(issue));
  } else {
    console.log('✅ No common issues detected');
  }
}
```

#### Performance Monitoring
```typescript
// Performance monitoring and optimization
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await operation();
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      const metric: PerformanceMetric = {
        name: operationName,
        duration: endTime - startTime,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        timestamp: new Date(),
        success: true
      };
      
      this.metrics.set(operationName, metric);
      this.logPerformance(metric);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      const metric: PerformanceMetric = {
        name: operationName,
        duration: endTime - startTime,
        memoryDelta: 0,
        timestamp: new Date(),
        success: false,
        error: error.message
      };
      
      this.metrics.set(operationName, metric);
      this.logPerformance(metric);
      
      throw error;
    }
  }
  
  private logPerformance(metric: PerformanceMetric): void {
    const status = metric.success ? '✅' : '❌';
    const duration = `${metric.duration.toFixed(2)}ms`;
    const memory = `${(metric.memoryDelta / 1024 / 1024).toFixed(2)}MB`;
    
    console.log(`${status} ${metric.name}: ${duration} (${memory})`);
    
    if (metric.error) {
      console.log(`   Error: ${metric.error}`);
    }
    
    // Alert on slow operations
    if (metric.duration > 5000) {
      console.warn(`⚠️ Slow operation detected: ${metric.name} took ${duration}`);
    }
  }
  
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }
  
  getAverageMetrics(): Record<string, AverageMetric> {
    const grouped = new Map<string, PerformanceMetric[]>();
    
    for (const metric of this.metrics.values()) {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric);
    }
    
    const averages: Record<string, AverageMetric> = {};
    
    for (const [name, metrics] of grouped) {
      const durations = metrics.map(m => m.duration);
      const successCount = metrics.filter(m => m.success).length;
      
      averages[name] = {
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        successRate: successCount / metrics.length,
        totalCalls: metrics.length
      };
    }
    
    return averages;
  }
}

// Usage
const monitor = new PerformanceMonitor();

const request = await monitor.measureOperation(
  'createPresentationRequest',
  () => sdk.createPresentationRequest(requestOptions)
);

const verification = await monitor.measureOperation(
  'verifyPresentation',
  () => sdk.verifyPresentation(presentation)
);
```

---

<div align="center">

**👨‍💻 Build the future of digital identity**

[📖 Back to Documentation](README.md) | [🔌 Integration Examples](https://github.com/personapass/examples) | [💬 Developer Community](https://discord.gg/personapass-dev)

*Making identity verification simple for developers* 🚀

</div>