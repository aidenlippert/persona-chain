/**
 * 🔍 ESSENTIAL API DISCOVERY ENGINE
 * Only contains critical APIs for professional identity verification
 * Clean, curated list of essential services only
 */

// 📋 DISCOVERED API STRUCTURE
export interface DiscoveredAPI {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  baseUrl: string;
  authType: 'none' | 'api-key' | 'oauth2' | 'bearer' | 'basic';
  authFields?: string[];
  pricing: 'free' | 'freemium' | 'paid';
  freeQuota?: number;
  endpoints: APIEndpoint[];
  openApiSpec?: string;
  docsUrl?: string;
  termsUrl?: string;
  verified: boolean;
  rating: number;
  popularity: number;
  tags: string[];
  credentialTemplate: CredentialTemplate;
  integrationGuide: IntegrationGuide;
}

interface APIEndpoint {
  name: string;
  path: string;
  method: string;
  description: string;
  parameters: Parameter[];
  responseSchema?: any;
  credentialFields?: string[];
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
}

interface CredentialTemplate {
  type: string[];
  subjectFields: string[];
  evidenceFields: string[];
  proofRequirements: string[];
}

interface IntegrationGuide {
  setupSteps: string[];
  codeExamples: { [language: string]: string };
  testingInstructions: string[];
  troubleshooting: string[];
}

/**
 * 🔍 ESSENTIAL API DISCOVERY ENGINE
 * Only contains critical professional identity APIs
 */
export class APIDiscoveryService {
  private discoveredAPIs: Map<string, DiscoveredAPI> = new Map();
  private isDiscovering: boolean = false;

  constructor() {
    this.initializeEssentialAPIs();
  }

  /**
   * 🎯 Initialize only essential APIs
   */
  private initializeEssentialAPIs(): void {
    const essentialAPIs: DiscoveredAPI[] = [
      // 💳 FINANCE & BANKING
      {
        id: 'plaid-banking',
        name: 'Plaid Banking & Income Verification',
        description: 'Connect bank accounts, verify balances, transaction history, and income for 12,000+ financial institutions',
        category: 'Finance & Banking',
        provider: 'Plaid',
        baseUrl: 'https://production.plaid.com',
        authType: 'api-key',
        pricing: 'freemium',
        freeQuota: 100,
        endpoints: [
          {
            name: 'Account Verification',
            path: '/accounts/get',
            method: 'POST',
            description: 'Verify bank account ownership and balances',
            parameters: [
              { name: 'access_token', type: 'string', required: true, description: 'User access token' },
              { name: 'account_ids', type: 'array', required: false, description: 'Specific account IDs' }
            ],
            credentialFields: ['account_id', 'account_type', 'balance', 'account_name', 'bank_name']
          },
          {
            name: 'Income Verification',
            path: '/income/verification/get',
            method: 'POST',
            description: 'Verify employment and income data',
            parameters: [
              { name: 'access_token', type: 'string', required: true, description: 'User access token' }
            ],
            credentialFields: ['annual_income', 'employer', 'pay_frequency', 'verification_status']
          }
        ],
        docsUrl: 'https://plaid.com/docs/',
        verified: true,
        rating: 4.9,
        popularity: 98,
        tags: ['banking', 'income-verification', 'account-verification', 'transactions', 'financial'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'BankAccountCredential'],
          subjectFields: ['accountHolder', 'bankName', 'accountType', 'verifiedBalance'],
          evidenceFields: ['bankStatement', 'accountVerification'],
          proofRequirements: ['bankConnection', 'accountOwnership']
        },
        integrationGuide: {
          setupSteps: [
            'Create Plaid account at plaid.com',
            'Get API keys from dashboard',
            'Implement Plaid Link for user authentication',
            'Set up webhooks for account updates'
          ],
          codeExamples: {
            javascript: `// Plaid Account Verification
const plaidClient = new PlaidApi(configuration);
const response = await plaidClient.accountsGet({
  access_token: userAccessToken
});`
          },
          testingInstructions: ['Use Plaid Sandbox environment', 'Test with sample bank credentials'],
          troubleshooting: ['Check API key validity', 'Verify Link integration', 'Review webhook setup']
        }
      },

      {
        id: 'experian-credit',
        name: 'Experian Credit Score & Report',
        description: 'Official credit scores, credit reports, and comprehensive financial identity verification',
        category: 'Credit & Lending',
        provider: 'Experian',
        baseUrl: 'https://api.experian.com',
        authType: 'oauth2',
        pricing: 'freemium',
        freeQuota: 50,
        endpoints: [
          {
            name: 'Credit Score',
            path: '/credit/v1/scores',
            method: 'GET',
            description: 'Get current credit score and grade',
            parameters: [
              { name: 'customer_id', type: 'string', required: true, description: 'Customer identifier' }
            ],
            credentialFields: ['credit_score', 'score_model', 'credit_grade', 'report_date', 'score_factors']
          },
          {
            name: 'Credit Report',
            path: '/credit/v1/reports',
            method: 'GET',
            description: 'Get detailed credit report information',
            parameters: [
              { name: 'customer_id', type: 'string', required: true, description: 'Customer identifier' }
            ],
            credentialFields: ['credit_accounts', 'payment_history', 'credit_inquiries', 'public_records']
          }
        ],
        docsUrl: 'https://developer.experian.com/',
        verified: true,
        rating: 4.8,
        popularity: 95,
        tags: ['credit-score', 'credit-report', 'financial-identity', 'fico', 'creditworthiness'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'CreditScoreCredential'],
          subjectFields: ['creditScore', 'creditGrade', 'scoreModel', 'reportDate'],
          evidenceFields: ['creditReport', 'bureauVerification'],
          proofRequirements: ['creditBureauVerification']
        },
        integrationGuide: {
          setupSteps: [
            'Register with Experian Developer Portal',
            'Apply for credit API access',
            'Complete compliance and security review',
            'Implement OAuth2 flow'
          ],
          codeExamples: {
            javascript: `// Experian Credit Score API
const response = await fetch('https://api.experian.com/credit/v1/scores', {
  headers: {
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json'
  }
});`
          },
          testingInstructions: ['Use sandbox customer IDs', 'Test credit report parsing'],
          troubleshooting: ['Verify API permissions', 'Check compliance requirements']
        }
      },

      // 💼 PROFESSIONAL & EMPLOYMENT
      {
        id: 'linkedin-professional',
        name: 'LinkedIn Professional Verification',
        description: 'Professional work history, skills, endorsements, and network verification through LinkedIn',
        category: 'Professional & Employment',
        provider: 'LinkedIn',
        baseUrl: 'https://api.linkedin.com',
        authType: 'oauth2',
        pricing: 'freemium',
        freeQuota: 500,
        endpoints: [
          {
            name: 'Profile Data',
            path: '/v2/people/~',
            method: 'GET',
            description: 'Get professional profile information',
            parameters: [
              { name: 'fields', type: 'string', required: false, description: 'Profile fields to retrieve' }
            ],
            credentialFields: ['professional_headline', 'current_position', 'industry', 'location', 'summary']
          },
          {
            name: 'Work Experience',
            path: '/v2/positions',
            method: 'GET',
            description: 'Get employment history and positions',
            parameters: [
              { name: 'person', type: 'string', required: true, description: 'Person identifier' }
            ],
            credentialFields: ['positions', 'companies', 'duration', 'titles', 'descriptions']
          }
        ],
        docsUrl: 'https://docs.microsoft.com/en-us/linkedin/',
        verified: true,
        rating: 4.7,
        popularity: 92,
        tags: ['professional', 'employment', 'skills', 'network', 'career', 'work-history'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'ProfessionalCredential'],
          subjectFields: ['professionalTitle', 'currentCompany', 'workHistory', 'skillsEndorsed'],
          evidenceFields: ['linkedinProfile', 'employmentHistory', 'professionalNetwork'],
          proofRequirements: ['linkedinVerification', 'professionalConnections']
        },
        integrationGuide: {
          setupSteps: [
            'Create LinkedIn Developer Application',
            'Configure OAuth2 scopes and permissions',
            'Implement LinkedIn Sign In flow',
            'Test profile data access'
          ],
          codeExamples: {
            javascript: `// LinkedIn Professional API
const response = await fetch('https://api.linkedin.com/v2/people/~', {
  headers: {
    'Authorization': 'Bearer ' + accessToken,
    'X-Restli-Protocol-Version': '2.0.0'
  }
});`
          },
          testingInstructions: ['Use LinkedIn test accounts', 'Verify OAuth permissions'],
          troubleshooting: ['Check OAuth scopes', 'Verify app permissions', 'Review rate limits']
        }
      },

      {
        id: 'github-developer',
        name: 'GitHub Developer Profile & Skills',
        description: 'Open source contributions, repository statistics, coding activity, and developer reputation verification',
        category: 'Professional Skills & Development',
        provider: 'GitHub',
        baseUrl: 'https://api.github.com',
        authType: 'oauth2',
        pricing: 'free',
        freeQuota: 5000,
        endpoints: [
          {
            name: 'User Profile',
            path: '/user',
            method: 'GET',
            description: 'Get developer profile and statistics',
            parameters: [],
            credentialFields: ['username', 'public_repos', 'followers', 'following', 'created_at']
          },
          {
            name: 'Repository Stats',
            path: '/users/{username}/repos',
            method: 'GET',
            description: 'Get repository and contribution statistics',
            parameters: [
              { name: 'username', type: 'string', required: true, description: 'GitHub username' },
              { name: 'sort', type: 'string', required: false, description: 'Sort order' }
            ],
            credentialFields: ['total_stars', 'languages', 'commit_count', 'repo_count', 'contributions']
          }
        ],
        docsUrl: 'https://docs.github.com/en/rest',
        verified: true,
        rating: 4.9,
        popularity: 88,
        tags: ['coding', 'open-source', 'repositories', 'contributions', 'developer-skills'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'DeveloperSkillCredential'],
          subjectFields: ['githubUsername', 'repositoryCount', 'contributionScore', 'programmingLanguages'],
          evidenceFields: ['repositoryData', 'contributionGraph', 'codeQuality'],
          proofRequirements: ['githubVerification', 'codeContributions']
        },
        integrationGuide: {
          setupSteps: [
            'Create GitHub OAuth Application',
            'Configure authorization scopes',
            'Implement GitHub OAuth flow',
            'Parse repository and contribution data'
          ],
          codeExamples: {
            javascript: `// GitHub Developer API
const response = await fetch('https://api.github.com/user/repos', {
  headers: {
    'Authorization': 'token ' + accessToken,
    'Accept': 'application/vnd.github.v3+json'
  }
});`
          },
          testingInstructions: ['Test with personal GitHub account', 'Verify repository access'],
          troubleshooting: ['Check token scopes', 'Review rate limiting', 'Verify repository permissions']
        }
      },

      // 🎓 EDUCATION & CERTIFICATIONS
      {
        id: 'coursera-education',
        name: 'Coursera Course Certificates & Education',
        description: 'University course completions, certificates, and verified learning achievements from top institutions worldwide',
        category: 'Education & Certifications',
        provider: 'Coursera',
        baseUrl: 'https://api.coursera.org',
        authType: 'oauth2',
        pricing: 'freemium',
        freeQuota: 100,
        endpoints: [
          {
            name: 'Course Completions',
            path: '/api/onDemandCourseCompletions.v1',
            method: 'GET',
            description: 'Get completed courses and certificates',
            parameters: [
              { name: 'userId', type: 'string', required: true, description: 'Coursera user ID' }
            ],
            credentialFields: ['course_name', 'completion_date', 'certificate_url', 'university', 'grade']
          },
          {
            name: 'Specializations',
            path: '/api/onDemandSpecializationCompletions.v1',
            method: 'GET',
            description: 'Get completed specialization programs',
            parameters: [
              { name: 'userId', type: 'string', required: true, description: 'Coursera user ID' }
            ],
            credentialFields: ['specialization_name', 'completion_date', 'certificate_url', 'courses_completed']
          }
        ],
        docsUrl: 'https://tech.coursera.org/app-platform/catalog/',
        verified: true,
        rating: 4.6,
        popularity: 85,
        tags: ['education', 'certificates', 'courses', 'universities', 'online-learning'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'EducationCredential'],
          subjectFields: ['courseName', 'institution', 'completionDate', 'certificateUrl'],
          evidenceFields: ['courseCompletion', 'gradingData', 'assignmentSubmissions'],
          proofRequirements: ['courseraVerification', 'institutionEndorsement']
        },
        integrationGuide: {
          setupSteps: [
            'Apply for Coursera Partner API access',
            'Get approved for education data access',
            'Implement OAuth2 authentication',
            'Parse certificate and course data'
          ],
          codeExamples: {
            javascript: `// Coursera Education API
const response = await fetch('https://api.coursera.org/api/onDemandCourseCompletions.v1', {
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
});`
          },
          testingInstructions: ['Test with Coursera learner account', 'Verify certificate URLs'],
          troubleshooting: ['Check API approval status', 'Verify OAuth scopes']
        }
      },

      // 🏥 HEALTH & WELLNESS
      {
        id: 'apple-health',
        name: 'Apple Health & Fitness Data',
        description: 'Comprehensive health metrics, fitness data, wellness insights, and activity tracking from Apple Health',
        category: 'Health & Wellness',
        provider: 'Apple',
        baseUrl: 'https://developer.apple.com/health-fitness/',
        authType: 'oauth2',
        pricing: 'free',
        freeQuota: 1000,
        endpoints: [
          {
            name: 'Fitness Metrics',
            path: '/fitness/activities',
            method: 'GET',
            description: 'Get step count, distance, and activity data',
            parameters: [
              { name: 'date_range', type: 'string', required: true, description: 'Date range for data' }
            ],
            credentialFields: ['daily_steps', 'active_minutes', 'distance_walked', 'calories_burned']
          },
          {
            name: 'Health Vitals',
            path: '/health/vitals',
            method: 'GET',
            description: 'Get heart rate, sleep, and vital sign data',
            parameters: [
              { name: 'metric_types', type: 'array', required: true, description: 'Types of health metrics' }
            ],
            credentialFields: ['heart_rate', 'sleep_hours', 'weight', 'blood_pressure']
          }
        ],
        docsUrl: 'https://developer.apple.com/documentation/healthkit',
        verified: true,
        rating: 4.8,
        popularity: 90,
        tags: ['health', 'fitness', 'wellness', 'vitals', 'activity', 'apple-health'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'HealthMetricsCredential'],
          subjectFields: ['fitnessLevel', 'healthMetrics', 'activityGoals', 'wellnessScore'],
          evidenceFields: ['healthKitData', 'deviceMeasurements', 'activityLogs'],
          proofRequirements: ['deviceAuthentication', 'healthDataConsent']
        },
        integrationGuide: {
          setupSteps: [
            'Implement HealthKit framework in iOS app',
            'Request appropriate health permissions',
            'Handle user privacy controls',
            'Process and aggregate health data'
          ],
          codeExamples: {
            javascript: `// Apple Health (via iOS HealthKit)
const healthStore = new HKHealthStore();
await healthStore.requestAuthorization(readTypes, writeTypes);`
          },
          testingInstructions: ['Test on physical iOS device', 'Verify health permissions'],
          troubleshooting: ['Check HealthKit entitlements', 'Review privacy permissions']
        }
      },

      // 🎵 LIFESTYLE & DIGITAL IDENTITY
      {
        id: 'spotify-music',
        name: 'Spotify Music & Lifestyle Profile',
        description: 'Music listening habits, top artists, playlists, and audio preferences for personality and lifestyle insights',
        category: 'Lifestyle & Digital Identity',
        provider: 'Spotify',
        baseUrl: 'https://api.spotify.com',
        authType: 'oauth2',
        pricing: 'free',
        freeQuota: 1000,
        endpoints: [
          {
            name: 'Listening Profile',
            path: '/v1/me/top/artists',
            method: 'GET',
            description: 'Get top artists and listening statistics',
            parameters: [
              { name: 'time_range', type: 'string', required: false, description: 'Time range for data' },
              { name: 'limit', type: 'integer', required: false, description: 'Number of results' }
            ],
            credentialFields: ['top_artists', 'top_genres', 'listening_time', 'musical_diversity']
          },
          {
            name: 'Playlist Analysis',
            path: '/v1/me/playlists',
            method: 'GET',
            description: 'Get user playlists and music preferences',
            parameters: [
              { name: 'limit', type: 'integer', required: false, description: 'Number of playlists' }
            ],
            credentialFields: ['playlist_count', 'music_genres', 'playlist_themes', 'social_sharing']
          }
        ],
        docsUrl: 'https://developer.spotify.com/documentation/web-api/',
        verified: true,
        rating: 4.7,
        popularity: 87,
        tags: ['music', 'lifestyle', 'preferences', 'personality', 'entertainment', 'culture'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'LifestyleCredential'],
          subjectFields: ['musicalPreferences', 'culturalInterests', 'socialBehavior', 'personalityTraits'],
          evidenceFields: ['listeningHistory', 'playlistData', 'socialSharing'],
          proofRequirements: ['spotifyVerification', 'accountHistory']
        },
        integrationGuide: {
          setupSteps: [
            'Create Spotify Developer Application',
            'Configure OAuth2 scopes for user data',
            'Implement Spotify authentication flow',
            'Process listening and preference data'
          ],
          codeExamples: {
            javascript: `// Spotify Web API
const response = await fetch('https://api.spotify.com/v1/me/top/artists', {
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
});`
          },
          testingInstructions: ['Test with personal Spotify account', 'Verify data access permissions'],
          troubleshooting: ['Check OAuth scopes', 'Verify app registration', 'Review rate limits']
        }
      },

      // 🏠 SMART HOME & IOT
      {
        id: 'google-nest',
        name: 'Google Nest Smart Home & IoT',
        description: 'Smart home device usage, energy efficiency patterns, security events, and home automation insights',
        category: 'IoT & Smart Home',
        provider: 'Google Nest',
        baseUrl: 'https://smartdevicemanagement.googleapis.com',
        authType: 'oauth2',
        pricing: 'freemium',
        freeQuota: 250,
        endpoints: [
          {
            name: 'Device Status',
            path: '/v1/enterprises/{project_id}/devices',
            method: 'GET',
            description: 'Get smart home device status and usage',
            parameters: [
              { name: 'project_id', type: 'string', required: true, description: 'Google Cloud project ID' }
            ],
            credentialFields: ['device_types', 'energy_usage', 'security_events', 'automation_rules']
          },
          {
            name: 'Energy Insights',
            path: '/v1/enterprises/{project_id}/structures',
            method: 'GET',
            description: 'Get home energy efficiency and usage patterns',
            parameters: [
              { name: 'project_id', type: 'string', required: true, description: 'Google Cloud project ID' }
            ],
            credentialFields: ['energy_consumption', 'efficiency_score', 'carbon_footprint', 'cost_savings']
          }
        ],
        docsUrl: 'https://developers.google.com/nest/device-access',
        verified: true,
        rating: 4.5,
        popularity: 75,
        tags: ['smart-home', 'energy', 'security', 'automation', 'iot', 'sustainability'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'SmartHomeCredential'],
          subjectFields: ['homeAutomation', 'energyEfficiency', 'securityLevel', 'deviceOwnership'],
          evidenceFields: ['deviceLogs', 'energyData', 'automationRules'],
          proofRequirements: ['deviceAuthentication', 'homeOwnership']
        },
        integrationGuide: {
          setupSteps: [
            'Enable Google Device Access Console',
            'Create cloud project and configure OAuth',
            'Link Nest account and devices',
            'Set up device access permissions'
          ],
          codeExamples: {
            javascript: `// Google Nest Device Access API
const response = await fetch('https://smartdevicemanagement.googleapis.com/v1/enterprises/{project_id}/devices', {
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
});`
          },
          testingInstructions: ['Test with linked Nest devices', 'Verify device permissions'],
          troubleshooting: ['Check Device Access setup', 'Verify OAuth scopes', 'Review device linking']
        }
      },

      // 🎮 GAMING & DIGITAL REPUTATION
      {
        id: 'steam-gaming',
        name: 'Steam Gaming Profile & Achievements',
        description: 'Gaming achievements, playtime statistics, game library value, community reputation, and digital collectibles',
        category: 'Gaming & Digital Reputation',
        provider: 'Steam',
        baseUrl: 'https://api.steampowered.com',
        authType: 'api-key',
        pricing: 'free',
        freeQuota: 100000,
        endpoints: [
          {
            name: 'Player Summary',
            path: '/ISteamUser/GetPlayerSummaries/v0002/',
            method: 'GET',
            description: 'Get player profile and basic statistics',
            parameters: [
              { name: 'steamids', type: 'string', required: true, description: 'Steam ID of the player' }
            ],
            credentialFields: ['steam_id', 'profile_level', 'games_owned', 'account_creation_date']
          },
          {
            name: 'Achievement Statistics',
            path: '/ISteamUserStats/GetPlayerAchievements/v0001/',
            method: 'GET',
            description: 'Get gaming achievements and completion statistics',
            parameters: [
              { name: 'steamid', type: 'string', required: true, description: 'Steam ID' },
              { name: 'appid', type: 'string', required: true, description: 'Game application ID' }
            ],
            credentialFields: ['total_achievements', 'completion_rate', 'rare_achievements', 'playtime_hours']
          }
        ],
        docsUrl: 'https://steamcommunity.com/dev',
        verified: true,
        rating: 4.8,
        popularity: 80,
        tags: ['gaming', 'achievements', 'digital-assets', 'community', 'entertainment'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'GamingCredential'],
          subjectFields: ['gamingSkill', 'achievementScore', 'communityRating', 'digitalAssetValue'],
          evidenceFields: ['achievementData', 'playtimeRecords', 'communityActivity'],
          proofRequirements: ['steamVerification', 'achievementAuthenticity']
        },
        integrationGuide: {
          setupSteps: [
            'Get Steam Web API key from Steam',
            'Implement Steam ID resolution system',
            'Handle profile privacy settings',
            'Process achievement and game data'
          ],
          codeExamples: {
            javascript: `// Steam Web API
const response = await fetch('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=YOUR_API_KEY&steamids=STEAM_ID');`
          },
          testingInstructions: ['Test with public Steam profiles', 'Verify API key functionality'],
          troubleshooting: ['Check API key validity', 'Handle private profiles', 'Review rate limits']
        }
      },

      // 📱 COMMUNICATION & VERIFICATION
      {
        id: 'twilio-verify',
        name: 'Twilio Phone & Identity Verification',
        description: 'Phone number verification, SMS validation, identity confirmation, and communication security services',
        category: 'Identity & Communication',
        provider: 'Twilio',
        baseUrl: 'https://verify.twilio.com',
        authType: 'api-key',
        pricing: 'freemium',
        freeQuota: 100,
        endpoints: [
          {
            name: 'Phone Verification',
            path: '/v2/Services/{ServiceSid}/Verifications',
            method: 'POST',
            description: 'Verify phone number ownership via SMS or voice call',
            parameters: [
              { name: 'To', type: 'string', required: true, description: 'Phone number to verify' },
              { name: 'Channel', type: 'string', required: true, description: 'Verification channel (sms/call)' }
            ],
            credentialFields: ['phone_number', 'country_code', 'verification_date', 'carrier_info']
          },
          {
            name: 'Verification Check',
            path: '/v2/Services/{ServiceSid}/VerificationCheck',
            method: 'POST',
            description: 'Check verification code and confirm ownership',
            parameters: [
              { name: 'To', type: 'string', required: true, description: 'Phone number being verified' },
              { name: 'Code', type: 'string', required: true, description: 'Verification code' }
            ],
            credentialFields: ['verification_status', 'verified_timestamp', 'attempt_count']
          }
        ],
        docsUrl: 'https://www.twilio.com/docs/verify/api',
        verified: true,
        rating: 4.9,
        popularity: 95,
        tags: ['phone-verification', 'sms', 'identity-confirmation', 'security', 'communication'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'PhoneVerificationCredential'],
          subjectFields: ['phoneNumber', 'countryCode', 'carrierInfo', 'verificationDate'],
          evidenceFields: ['smsVerification', 'carrierData', 'verificationAttempts'],
          proofRequirements: ['phoneOwnership', 'carrierVerification']
        },
        integrationGuide: {
          setupSteps: [
            'Create Twilio account and get API credentials',
            'Set up Verify service in Twilio Console',
            'Configure verification channels (SMS/Voice)',
            'Implement verification flow and webhooks'
          ],
          codeExamples: {
            javascript: `// Twilio Verify API
const client = require('twilio')(accountSid, authToken);
await client.verify.services(serviceSid).verifications.create({
  to: '+1234567890',
  channel: 'sms'
});`
          },
          testingInstructions: ['Test with valid phone numbers', 'Verify SMS delivery'],
          troubleshooting: ['Check Twilio credentials', 'Verify service configuration', 'Review webhook setup']
        }
      },

      // Keep existing healthcare API
      {
        id: 'pverify-insurance',
        name: 'pVerify Healthcare Insurance Verification',
        description: 'Real-time health insurance eligibility verification and benefits information for healthcare providers',
        category: 'Health & Medical',
        provider: 'pVerify',
        baseUrl: 'https://api.pverify.com',
        authType: 'api-key',
        pricing: 'paid',
        freeQuota: 25,
        endpoints: [
          {
            name: 'Insurance Eligibility',
            path: '/api/Eligibility',
            method: 'POST',
            description: 'Check health insurance eligibility and coverage',
            parameters: [
              { name: 'memberId', type: 'string', required: true, description: 'Insurance member ID' },
              { name: 'payerId', type: 'string', required: true, description: 'Insurance payer ID' }
            ],
            credentialFields: ['eligibility_status', 'coverage_details', 'copay_info', 'deductible']
          }
        ],
        docsUrl: 'https://www.pverify.com/api-documentation/',
        verified: true,
        rating: 4.8,
        popularity: 82,
        tags: ['healthcare', 'insurance', 'eligibility', 'benefits', 'medical-verification'],
        credentialTemplate: {
          type: ['VerifiableCredential', 'HealthInsuranceCredential'],
          subjectFields: ['memberId', 'insuranceProvider', 'coverageType', 'eligibilityStatus'],
          evidenceFields: ['eligibilityResponse', 'benefitsData', 'payerVerification'],
          proofRequirements: ['insuranceVerification', 'membershipProof']
        },
        integrationGuide: {
          setupSteps: [
            'Register with pVerify and complete compliance',
            'Get API credentials and configure endpoints',
            'Set up secure HTTPS connections',
            'Implement HIPAA-compliant data handling'
          ],
          codeExamples: {
            javascript: `// pVerify Insurance API
const response = await fetch('https://api.pverify.com/api/Eligibility', {
  method: 'POST',
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ memberId, payerId })
});`
          },
          testingInstructions: ['Use test member IDs', 'Verify sandbox payer connections'],
          troubleshooting: ['Check HIPAA compliance', 'Verify payer connectivity', 'Review member ID formats']
        }
      }
    ];

    essentialAPIs.forEach(api => {
      this.discoveredAPIs.set(api.id, api);
    });

    console.log('🔍 Initialized essential APIs:', essentialAPIs.length);
  }

  /**
   * 🚀 Discover APIs (now just loads essential APIs)
   */
  async discoverAPIs(forceRefresh: boolean = false): Promise<void> {
    if (this.isDiscovering) return;

    this.isDiscovering = true;
    try {
      console.log('🔍 Loading essential APIs...');
      
      // Essential APIs are already loaded in constructor
      // This method exists for compatibility with existing code
      
      console.log('✅ Essential API loading completed');
    } catch (error) {
      console.error('❌ Failed to load essential APIs:', error);
      throw error;
    } finally {
      this.isDiscovering = false;
    }
  }

  /**
   * 🔍 Search APIs
   */
  searchAPIs(query: string, category?: string, limit: number = 50): DiscoveredAPI[] {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const results: { api: DiscoveredAPI; score: number }[] = [];
    
    for (const api of this.discoveredAPIs.values()) {
      let score = 0;
      const searchText = `${api.name} ${api.description} ${api.provider}`.toLowerCase();
      
      // Category filter
      if (category && category !== 'all' && !api.category.toLowerCase().includes(category.toLowerCase())) {
        continue;
      }
      
      // Score based on search terms
      for (const term of searchTerms) {
        if (api.name.toLowerCase().includes(term)) score += 10;
        if (api.description.toLowerCase().includes(term)) score += 5;
        if (api.tags.some(tag => tag.includes(term))) score += 3;
        if (searchText.includes(term)) score += 1;
      }
      
      if (score > 0 || !query) {
        results.push({ api, score: score || api.popularity });
      }
    }
    
    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.api);
  }

  /**
   * 📊 Get API categories with counts
   */
  getCategories(): { name: string; count: number; apis: string[] }[] {
    const categories = new Map<string, string[]>();
    
    for (const api of this.discoveredAPIs.values()) {
      if (!categories.has(api.category)) {
        categories.set(api.category, []);
      }
      categories.get(api.category)!.push(api.id);
    }
    
    return Array.from(categories.entries())
      .map(([name, apis]) => ({ name, count: apis.length, apis }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 🔄 Get discovery status
   */
  getDiscoveryStatus(): {
    isDiscovering: boolean;
    totalAPIs: number;
    sources: { name: string; enabled: boolean; lastSync?: string }[];
  } {
    return {
      isDiscovering: this.isDiscovering,
      totalAPIs: this.discoveredAPIs.size,
      sources: [
        { name: 'Essential APIs', enabled: true, lastSync: new Date().toISOString() }
      ]
    };
  }

  /**
   * 🎯 Get API by ID
   */
  getAPI(id: string): DiscoveredAPI | undefined {
    return this.discoveredAPIs.get(id);
  }

  /**
   * ⭐ Get featured APIs
   */
  getFeaturedAPIs(limit: number = 10): DiscoveredAPI[] {
    return Array.from(this.discoveredAPIs.values())
      .filter(api => api.verified && api.rating > 4.5)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }
}

// 🏭 Export singleton instance
export const apiDiscoveryService = new APIDiscoveryService();