import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/config';
import { FHIRService } from './services/FHIRService';
import { HealthOAuthService } from './services/HealthOAuthService';
import { 
  validateJWT, 
  validateAPIKey, 
  rateLimiter, 
  hipaaCompliance,
  validateFHIRToken,
  validatePatientContext,
  encrypt,
  decrypt,
  generateCommitment,
  HealthAuthRequest
} from './middleware/auth';
import { 
  globalErrorHandler, 
  handleNotFound, 
  handleUncaughtException, 
  handleUnhandledRejection,
  catchAsync,
  APIError
} from './middleware/errorHandler';
import { 
  Patient, 
  MedicalCondition, 
  Medication, 
  Allergy, 
  Immunization, 
  VitalSigns, 
  LabResult,
  AccessTokenData 
} from './types/health';

const app = express();
const fhirService = new FHIRService();
const healthOAuthService = new HealthOAuthService();

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

// HIPAA compliant security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://fhir.epic.com", "https://fhir-ehr-code.cerner.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply HIPAA compliance to all routes
app.use(hipaaCompliance);

// Apply rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'health-connector',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// OAuth2 Authentication Routes

/**
 * Start OAuth2 flow for FHIR provider
 */
app.get('/oauth/authorize/:provider', validateAPIKey, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  const { did, patient_id } = req.query;
  
  if (!did) {
    throw new APIError('DID parameter is required', 400);
  }
  
  if (!['epic', 'cerner'].includes(provider)) {
    throw new APIError('Unsupported FHIR provider', 400);
  }
  
  console.log(`🔗 Starting OAuth2 flow for ${provider} - DID: ${did}`);
  
  const { authUrl, state } = await healthOAuthService.buildAuthorizationUrl(
    provider, 
    did as string, 
    patient_id as string
  );
  
  res.json({
    authUrl,
    state,
    provider,
    expiresIn: 3600 // 1 hour
  });
}));

/**
 * Handle OAuth2 callback
 */
app.get('/oauth/callback/:provider', validateAPIKey, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;
  
  if (error) {
    console.error(`❌ OAuth2 error for ${provider}:`, error);
    throw new APIError(`OAuth2 authorization failed: ${error}`, 400);
  }
  
  if (!code || !state) {
    throw new APIError('Authorization code and state are required', 400);
  }
  
  console.log(`🔄 Processing OAuth2 callback for ${provider}...`);
  
  const { tokenData, stateData } = await healthOAuthService.exchangeCodeForToken(
    code as string,
    state as string,
    provider
  );
  
  // Store access token
  await fhirService.storeAccessToken(stateData.did, provider, tokenData);
  
  console.log(`✅ OAuth2 flow completed for ${provider} - DID: ${stateData.did}`);
  
  res.json({
    success: true,
    provider,
    patientId: tokenData.patientId,
    scopes: tokenData.scope?.split(' ') || [],
    expiresAt: new Date(tokenData.expiresAt).toISOString()
  });
}));

/**
 * Refresh OAuth2 token
 */
app.post('/oauth/refresh/:provider', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new APIError('Refresh token is required', 400);
  }
  
  console.log(`🔄 Refreshing token for ${provider}...`);
  
  const newTokenData = await healthOAuthService.refreshAccessToken(provider, refreshToken);
  
  // Update stored token
  await fhirService.storeAccessToken(req.did!, provider, newTokenData);
  
  res.json({
    success: true,
    expiresAt: new Date(newTokenData.expiresAt).toISOString(),
    scope: newTokenData.scope
  });
}));

// FHIR Data Access Routes

/**
 * Get patient information
 */
app.get('/fhir/:provider/patient', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  
  console.log(`👤 Fetching patient data from ${provider} for DID: ${req.did}`);
  
  const patient = await fhirService.fetchPatient(req.did!, provider);
  
  if (!patient) {
    throw new APIError('Patient data not found', 404);
  }
  
  res.json({
    patient,
    provider,
    fetchedAt: new Date().toISOString()
  });
}));

/**
 * Get medical conditions
 */
app.get('/fhir/:provider/conditions', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  
  console.log(`🏥 Fetching conditions from ${provider} for DID: ${req.did}`);
  
  const conditions = await fhirService.fetchConditions(req.did!, provider);
  
  res.json({
    conditions,
    count: conditions.length,
    provider,
    fetchedAt: new Date().toISOString()
  });
}));

/**
 * Get medications
 */
app.get('/fhir/:provider/medications', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  
  console.log(`💊 Fetching medications from ${provider} for DID: ${req.did}`);
  
  const medications = await fhirService.fetchMedications(req.did!, provider);
  
  res.json({
    medications,
    count: medications.length,
    provider,
    fetchedAt: new Date().toISOString()
  });
}));

/**
 * Get allergies
 */
app.get('/fhir/:provider/allergies', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  
  console.log(`🤧 Fetching allergies from ${provider} for DID: ${req.did}`);
  
  const allergies = await fhirService.fetchAllergies(req.did!, provider);
  
  res.json({
    allergies,
    count: allergies.length,
    provider,
    fetchedAt: new Date().toISOString()
  });
}));

/**
 * Get immunizations
 */
app.get('/fhir/:provider/immunizations', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  
  console.log(`💉 Fetching immunizations from ${provider} for DID: ${req.did}`);
  
  const immunizations = await fhirService.fetchImmunizations(req.did!, provider);
  
  res.json({
    immunizations,
    count: immunizations.length,
    provider,
    fetchedAt: new Date().toISOString()
  });
}));

/**
 * Get vital signs
 */
app.get('/fhir/:provider/vitals', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  
  console.log(`📊 Fetching vital signs from ${provider} for DID: ${req.did}`);
  
  const vitals = await fhirService.fetchVitalSigns(req.did!, provider);
  
  res.json({
    vitals,
    count: vitals.length,
    provider,
    fetchedAt: new Date().toISOString()
  });
}));

/**
 * Get laboratory results
 */
app.get('/fhir/:provider/labs', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  
  console.log(`🧪 Fetching lab results from ${provider} for DID: ${req.did}`);
  
  const labs = await fhirService.fetchLabResults(req.did!, provider);
  
  res.json({
    labs,
    count: labs.length,
    provider,
    fetchedAt: new Date().toISOString()
  });
}));

/**
 * Get comprehensive health profile
 */
app.get('/health-profile', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  console.log(`📋 Creating comprehensive health profile for DID: ${req.did}`);
  
  const providers = ['epic', 'cerner'];
  const healthProfile: any = {
    did: req.did,
    patient: null,
    conditions: [],
    medications: [],
    allergies: [],
    immunizations: [],
    vitals: [],
    labs: [],
    providers: [],
    commitment: '',
    createdAt: new Date().toISOString()
  };
  
  // Fetch data from all available providers
  for (const provider of providers) {
    try {
      console.log(`🔍 Checking ${provider} access for DID: ${req.did}`);
      
      const accessToken = await fhirService.getAccessToken(req.did!, provider);
      if (!accessToken) {
        console.log(`⚠️ No access token found for ${provider}`);
        continue;
      }
      
      // Fetch all health data
      const [patient, conditions, medications, allergies, immunizations, vitals, labs] = await Promise.allSettled([
        fhirService.fetchPatient(req.did!, provider),
        fhirService.fetchConditions(req.did!, provider),
        fhirService.fetchMedications(req.did!, provider),
        fhirService.fetchAllergies(req.did!, provider),
        fhirService.fetchImmunizations(req.did!, provider),
        fhirService.fetchVitalSigns(req.did!, provider),
        fhirService.fetchLabResults(req.did!, provider)
      ]);
      
      // Merge data (use first valid patient data)
      if (patient.status === 'fulfilled' && patient.value && !healthProfile.patient) {
        healthProfile.patient = patient.value;
      }
      
      if (conditions.status === 'fulfilled' && conditions.value) {
        healthProfile.conditions.push(...conditions.value.map((c: any) => ({ ...c, provider })));
      }
      
      if (medications.status === 'fulfilled' && medications.value) {
        healthProfile.medications.push(...medications.value.map((m: any) => ({ ...m, provider })));
      }
      
      if (allergies.status === 'fulfilled' && allergies.value) {
        healthProfile.allergies.push(...allergies.value.map((a: any) => ({ ...a, provider })));
      }
      
      if (immunizations.status === 'fulfilled' && immunizations.value) {
        healthProfile.immunizations.push(...immunizations.value.map((i: any) => ({ ...i, provider })));
      }
      
      if (vitals.status === 'fulfilled' && vitals.value) {
        healthProfile.vitals.push(...vitals.value.map((v: any) => ({ ...v, provider })));
      }
      
      if (labs.status === 'fulfilled' && labs.value) {
        healthProfile.labs.push(...labs.value.map((l: any) => ({ ...l, provider })));
      }
      
      healthProfile.providers.push(provider);
      
    } catch (error) {
      console.warn(`⚠️ Could not fetch data from ${provider}:`, error.message);
    }
  }
  
  // Generate commitment hash for ZK proofs
  const commitmentData = {
    did: req.did,
    patient: healthProfile.patient,
    conditionsCount: healthProfile.conditions.length,
    medicationsCount: healthProfile.medications.length,
    allergiesCount: healthProfile.allergies.length,
    immunizationsCount: healthProfile.immunizations.length,
    vitalsCount: healthProfile.vitals.length,
    labsCount: healthProfile.labs.length,
    providers: healthProfile.providers,
    timestamp: Date.now()
  };
  
  healthProfile.commitment = generateCommitment(commitmentData);
  
  console.log(`✅ Health profile created with ${healthProfile.providers.length} providers`);
  
  res.json(healthProfile);
}));

/**
 * Revoke access for a provider
 */
app.delete('/access/:provider', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const { provider } = req.params;
  
  console.log(`🔓 Revoking health access for ${provider} - DID: ${req.did}`);
  
  // Get token to revoke
  const accessToken = await fhirService.getAccessToken(req.did!, provider);
  if (accessToken) {
    // Attempt to revoke with provider
    await healthOAuthService.revokeToken(provider, accessToken.accessToken);
  }
  
  // Remove local access
  await fhirService.revokeAccess(req.did!, provider);
  
  res.json({
    success: true,
    provider,
    message: 'Health data access revoked successfully'
  });
}));

/**
 * Get connection status
 */
app.get('/status', validateAPIKey, validateJWT, catchAsync(async (req: HealthAuthRequest, res) => {
  const providers = ['epic', 'cerner'];
  const connections: any = {};
  
  for (const provider of providers) {
    const accessToken = await fhirService.getAccessToken(req.did!, provider);
    connections[provider] = {
      connected: !!accessToken,
      expiresAt: accessToken?.expiresAt ? new Date(accessToken.expiresAt).toISOString() : null,
      patientId: accessToken?.patientId || null
    };
  }
  
  res.json({
    did: req.did,
    connections,
    timestamp: new Date().toISOString()
  });
}));

// Error handling middleware
app.use(handleNotFound);
app.use(globalErrorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🏥 Health Connector started on port ${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔒 HIPAA compliance: ${config.hipaa.auditLogging ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🔐 Rate limiting: ${config.rateLimiting.max} requests per ${config.rateLimiting.windowMs / 1000} seconds`);
  
  if (config.nodeEnv === 'development') {
    console.log(`📋 Available endpoints:`);
    console.log(`  GET  /health - Service health check`);
    console.log(`  GET  /oauth/authorize/:provider - Start OAuth2 flow`);
    console.log(`  GET  /oauth/callback/:provider - OAuth2 callback`);
    console.log(`  POST /oauth/refresh/:provider - Refresh OAuth2 token`);
    console.log(`  GET  /fhir/:provider/patient - Get patient data`);
    console.log(`  GET  /fhir/:provider/conditions - Get medical conditions`);
    console.log(`  GET  /fhir/:provider/medications - Get medications`);
    console.log(`  GET  /fhir/:provider/allergies - Get allergies`);
    console.log(`  GET  /fhir/:provider/immunizations - Get immunizations`);
    console.log(`  GET  /fhir/:provider/vitals - Get vital signs`);
    console.log(`  GET  /fhir/:provider/labs - Get lab results`);
    console.log(`  GET  /health-profile - Get comprehensive health profile`);
    console.log(`  GET  /status - Get connection status`);
    console.log(`  DEL  /access/:provider - Revoke provider access`);
  }
});

export default app;