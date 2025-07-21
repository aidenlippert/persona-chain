import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'health-connector-secret-key',
  encryptionKey: process.env.ENCRYPTION_KEY || 'health-encryption-key-32bytes!',
  apiKey: process.env.HEALTH_API_KEY || 'health-connector-api-key',
  
  // Epic FHIR API configuration (Production Ready)
  epic: {
    clientId: process.env.EPIC_CLIENT_ID || 'epic-client-id-placeholder',
    clientSecret: process.env.EPIC_CLIENT_SECRET || 'epic-secret-placeholder',
    baseUrl: process.env.EPIC_BASE_URL || 'https://fhir.epic.com/interconnect-fhir-oauth',
    fhirUrl: process.env.EPIC_FHIR_URL || 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    redirectUri: process.env.EPIC_REDIRECT_URI || 'http://localhost:3003/oauth/callback/epic',
    apiKey: process.env.EPIC_API_KEY || 'epic-api-key-placeholder',
    scope: 'patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Immunization.read patient/DiagnosticReport.read',
    // Real Epic endpoints
    authUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
    tokenUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
    wellKnownUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/.well-known/smart_configuration'
  },
  
  // Cerner FHIR API configuration (Production Ready) 
  cerner: {
    clientId: process.env.CERNER_CLIENT_ID || 'cerner-client-id-placeholder',
    clientSecret: process.env.CERNER_CLIENT_SECRET || 'cerner-secret-placeholder',
    baseUrl: process.env.CERNER_BASE_URL || 'https://fhir-ehr-code.cerner.com',
    fhirUrl: process.env.CERNER_FHIR_URL || 'https://fhir-ehr-code.cerner.com/r4',
    redirectUri: process.env.CERNER_REDIRECT_URI || 'http://localhost:3003/oauth/callback/cerner',
    apiKey: process.env.CERNER_API_KEY || 'cerner-api-key-placeholder',
    scope: 'patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Immunization.read patient/DiagnosticReport.read',
    // Real Cerner endpoints
    authUrl: 'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/personas/patient/authorize',
    tokenUrl: 'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token',
    wellKnownUrl: 'https://fhir-ehr-code.cerner.com/r4/.well-known/smart_configuration'
  },
  
  // Allscripts API configuration (additional EHR provider)
  allscripts: {
    clientId: process.env.ALLSCRIPTS_CLIENT_ID || 'allscripts-client-id-placeholder',
    clientSecret: process.env.ALLSCRIPTS_CLIENT_SECRET || 'allscripts-secret-placeholder',
    baseUrl: process.env.ALLSCRIPTS_BASE_URL || 'https://fhir.allscripts.com',
    redirectUri: process.env.ALLSCRIPTS_REDIRECT_URI || 'http://localhost:3003/oauth/callbackHealth',
    apiKey: process.env.ALLSCRIPTS_API_KEY || 'allscripts-api-key-placeholder'
  },
  
  // SMART on FHIR configuration
  smartOnFhir: {
    enabled: process.env.SMART_ON_FHIR_ENABLED === 'true',
    wellKnownUrl: process.env.SMART_WELL_KNOWN_URL || 'https://fhir.epic.com/interconnect-fhir-oauth/.well-known/smart_configuration',
    launchUrl: process.env.SMART_LAUNCH_URL || 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize'
  },
  
  // Redis configuration for caching
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '2')
  },
  
  // HIPAA compliance settings
  hipaa: {
    auditLogging: process.env.HIPAA_AUDIT_LOGGING === 'true',
    encryptionRequired: process.env.HIPAA_ENCRYPTION === 'true',
    accessLogging: process.env.HIPAA_ACCESS_LOGGING === 'true',
    retentionDays: parseInt(process.env.HIPAA_RETENTION_DAYS || '2555') // 7 years
  },
  
  // Security settings
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50 // limit each IP to 50 requests per windowMs (stricter for health data)
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};