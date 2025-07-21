import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3005,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'government-connector-secret-key',
  encryptionKey: process.env.ENCRYPTION_KEY || 'government-encryption-key-32bytes!',
  apiKey: process.env.GOVERNMENT_API_KEY || 'government-connector-api-key',
  
  // US Census Bureau API configuration (Real Production API)
  census: {
    apiKey: process.env.CENSUS_API_KEY || 'census-api-key-placeholder',
    baseUrl: process.env.CENSUS_BASE_URL || 'https://api.census.gov/data',
    vintageUrl: process.env.CENSUS_VINTAGE_URL || 'https://api.census.gov/data/2022/acs/acs1',
    geographyUrl: process.env.CENSUS_GEOGRAPHY_URL || 'https://geocoding.geo.census.gov/geocoder',
    version: process.env.CENSUS_API_VERSION || '2022',
    endpoints: {
      population: '/2022/dec/pl',
      demographics: '/2022/acs/acs1',
      housing: '/2022/acs/acs1/subject',
      economics: '/2022/acs/acs1/profile',
      geocoding: '/locations/onelineaddress'
    }
  },
  
  // DMV API configuration (Mock/Representative APIs)
  dmv: {
    clientId: process.env.DMV_CLIENT_ID || 'dmv-client-id-placeholder',
    clientSecret: process.env.DMV_CLIENT_SECRET || 'dmv-secret-placeholder',
    baseUrl: process.env.DMV_BASE_URL || 'https://api.dmv.ca.gov', // California DMV as example
    authUrl: process.env.DMV_AUTH_URL || 'https://api.dmv.ca.gov/oauth/authorize',
    tokenUrl: process.env.DMV_TOKEN_URL || 'https://api.dmv.ca.gov/oauth/token',
    redirectUri: process.env.DMV_REDIRECT_URI || 'http://localhost:3005/oauth/callback/dmv',
    apiKey: process.env.DMV_API_KEY || 'dmv-api-key-placeholder',
    scope: 'license_verification vehicle_registration',
    // Real DMV endpoints vary by state
    endpoints: {
      licenseVerification: '/v1/license/verify',
      vehicleRegistration: '/v1/vehicle/registration',
      driverRecord: '/v1/driver/record'
    }
  },
  
  // USPS Address Verification API configuration
  usps: {
    userId: process.env.USPS_USER_ID || 'usps-user-id-placeholder',
    clientId: process.env.USPS_CLIENT_ID || 'usps-client-id-placeholder',
    clientSecret: process.env.USPS_CLIENT_SECRET || 'usps-secret-placeholder',
    baseUrl: process.env.USPS_BASE_URL || 'https://secure.shippingapis.com/ShippingAPI.dll',
    addressVerifyUrl: process.env.USPS_ADDRESS_VERIFY_URL || 'https://secure.shippingapis.com/ShippingAPI.dll',
    trackingUrl: process.env.USPS_TRACKING_URL || 'https://secure.shippingapis.com/ShippingAPI.dll',
    redirectUri: process.env.USPS_REDIRECT_URI || 'http://localhost:3005/oauth/callbackGovernment',
    apiVersion: process.env.USPS_API_VERSION || 'v3'
  },
  
  // Social Security Administration (hypothetical API for demonstration)
  ssa: {
    clientId: process.env.SSA_CLIENT_ID || 'ssa-client-id-placeholder',
    clientSecret: process.env.SSA_CLIENT_SECRET || 'ssa-secret-placeholder',
    baseUrl: process.env.SSA_BASE_URL || 'https://api.ssa.gov',
    redirectUri: process.env.SSA_REDIRECT_URI || 'http://localhost:3005/oauth/callbackGovernment',
    apiKey: process.env.SSA_API_KEY || 'ssa-api-key-placeholder'
  },
  
  // FEMA Disaster Assistance (hypothetical API for demonstration)
  fema: {
    clientId: process.env.FEMA_CLIENT_ID || 'fema-client-id-placeholder',
    clientSecret: process.env.FEMA_CLIENT_SECRET || 'fema-secret-placeholder',
    baseUrl: process.env.FEMA_BASE_URL || 'https://api.fema.gov',
    redirectUri: process.env.FEMA_REDIRECT_URI || 'http://localhost:3005/oauth/callbackGovernment',
    apiKey: process.env.FEMA_API_KEY || 'fema-api-key-placeholder'
  },
  
  // Redis configuration for caching
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '4')
  },
  
  // Government compliance settings
  compliance: {
    requireSSLVerification: process.env.REQUIRE_SSL_VERIFICATION === 'true',
    encryptSensitiveData: process.env.ENCRYPT_SENSITIVE_DATA === 'true',
    auditLogging: process.env.AUDIT_LOGGING === 'true',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '2555'), // 7 years
    privacyActCompliance: process.env.PRIVACY_ACT_COMPLIANCE === 'true',
    fipsCompliance: process.env.FIPS_COMPLIANCE === 'true'
  },
  
  // Tax verification settings
  taxVerification: {
    currentTaxYear: parseInt(process.env.CURRENT_TAX_YEAR || new Date().getFullYear().toString()),
    allowedVerificationTypes: process.env.ALLOWED_VERIFICATION_TYPES?.split(',') || [
      'income_verification',
      'filing_status',
      'dependents_count',
      'address_on_file'
    ],
    minimumIncomeThreshold: parseInt(process.env.MINIMUM_INCOME_THRESHOLD || '0'),
    requireAuthentication: process.env.REQUIRE_TAX_AUTHENTICATION === 'true'
  },
  
  // Address verification settings
  addressVerification: {
    enableStandardization: process.env.ENABLE_ADDRESS_STANDARDIZATION === 'true',
    validateZipPlus4: process.env.VALIDATE_ZIP_PLUS4 === 'true',
    enableGeocoding: process.env.ENABLE_GEOCODING === 'true',
    requireExactMatch: process.env.REQUIRE_EXACT_MATCH === 'false'
  },
  
  // Security settings
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25 // limit each IP to 25 requests per windowMs (very strict for government data)
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};