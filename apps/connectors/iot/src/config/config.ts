import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3006,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'iot-connector-secret-key',
  
  // Fitbit API configuration
  fitbit: {
    clientId: process.env.FITBIT_CLIENT_ID || 'fitbit-client-id-placeholder',
    clientSecret: process.env.FITBIT_CLIENT_SECRET || 'fitbit-secret-placeholder',
    baseUrl: process.env.FITBIT_BASE_URL || 'https://api.fitbit.com',
    authUrl: process.env.FITBIT_AUTH_URL || 'https://www.fitbit.com/oauth2/authorize',
    tokenUrl: process.env.FITBIT_TOKEN_URL || 'https://api.fitbit.com/oauth2/token',
    redirectUri: process.env.FITBIT_REDIRECT_URI || 'http://localhost:3006/oauth/callbackIoT',
    scope: process.env.FITBIT_SCOPE || 'activity heartrate sleep profile'
  },
  
  // Google Nest/Home API configuration
  googleNest: {
    clientId: process.env.GOOGLE_NEST_CLIENT_ID || 'google-nest-client-id-placeholder',
    clientSecret: process.env.GOOGLE_NEST_CLIENT_SECRET || 'google-nest-secret-placeholder',
    baseUrl: process.env.GOOGLE_NEST_BASE_URL || 'https://smartdevicemanagement.googleapis.com',
    authUrl: process.env.GOOGLE_NEST_AUTH_URL || 'https://nestservices.google.com/partnerconnections',
    tokenUrl: process.env.GOOGLE_NEST_TOKEN_URL || 'https://www.googleapis.com/oauth2/v4/token',
    redirectUri: process.env.GOOGLE_NEST_REDIRECT_URI || 'http://localhost:3006/oauth/callbackIoT',
    scope: process.env.GOOGLE_NEST_SCOPE || 'https://www.googleapis.com/auth/sdm.service'
  },
  
  // Amazon Alexa API configuration
  alexa: {
    clientId: process.env.ALEXA_CLIENT_ID || 'alexa-client-id-placeholder',
    clientSecret: process.env.ALEXA_CLIENT_SECRET || 'alexa-secret-placeholder',
    baseUrl: process.env.ALEXA_BASE_URL || 'https://api.amazonalexa.com',
    authUrl: process.env.ALEXA_AUTH_URL || 'https://www.amazon.com/ap/oa',
    tokenUrl: process.env.ALEXA_TOKEN_URL || 'https://api.amazon.com/auth/o2/token',
    redirectUri: process.env.ALEXA_REDIRECT_URI || 'http://localhost:3006/oauth/callbackIoT',
    scope: process.env.ALEXA_SCOPE || 'alexa::ask:skills:readwrite alexa::skill:proactive_events'
  },
  
  // Tesla API configuration
  tesla: {
    clientId: process.env.TESLA_CLIENT_ID || 'tesla-client-id-placeholder',
    clientSecret: process.env.TESLA_CLIENT_SECRET || 'tesla-secret-placeholder',
    baseUrl: process.env.TESLA_BASE_URL || 'https://owner-api.teslamotors.com',
    authUrl: process.env.TESLA_AUTH_URL || 'https://auth.tesla.com/oauth2/v3/authorize',
    tokenUrl: process.env.TESLA_TOKEN_URL || 'https://auth.tesla.com/oauth2/v3/token',
    redirectUri: process.env.TESLA_REDIRECT_URI || 'http://localhost:3006/oauth/callbackIoT',
    scope: process.env.TESLA_SCOPE || 'vehicle_device_data vehicle_commands'
  },
  
  // Apple HomeKit (via HomeAssistant bridge)
  homekit: {
    baseUrl: process.env.HOMEKIT_BASE_URL || 'http://localhost:8123',
    accessToken: process.env.HOMEKIT_ACCESS_TOKEN || 'homekit-token-placeholder',
    websocketUrl: process.env.HOMEKIT_WS_URL || 'ws://localhost:8123/api/websocket'
  },
  
  // Samsung SmartThings API configuration
  smartthings: {
    apiKey: process.env.SMARTTHINGS_API_KEY || 'smartthings-api-key-placeholder',
    baseUrl: process.env.SMARTTHINGS_BASE_URL || 'https://api.smartthings.com/v1',
    authUrl: process.env.SMARTTHINGS_AUTH_URL || 'https://account.smartthings.com/oauth/authorize',
    tokenUrl: process.env.SMARTTHINGS_TOKEN_URL || 'https://auth-global.api.smartthings.com/oauth/token',
    redirectUri: process.env.SMARTTHINGS_REDIRECT_URI || 'http://localhost:3006/oauth/callbackIoT'
  },
  
  // MQTT configuration for IoT devices
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    clientId: process.env.MQTT_CLIENT_ID || 'personapass-iot-connector',
    topics: {
      presence: 'personapass/presence/+',
      activity: 'personapass/activity/+',
      environment: 'personapass/environment/+',
      security: 'personapass/security/+'
    }
  },
  
  // Redis configuration for caching
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '5')
  },
  
  // IoT verification settings
  verification: {
    minimumDataPoints: parseInt(process.env.MINIMUM_DATA_POINTS || '10'),
    verificationPeriodDays: parseInt(process.env.VERIFICATION_PERIOD_DAYS || '7'),
    enableBehavioralAnalysis: process.env.ENABLE_BEHAVIORAL_ANALYSIS === 'true',
    enablePresenceVerification: process.env.ENABLE_PRESENCE_VERIFICATION === 'true',
    enableActivityVerification: process.env.ENABLE_ACTIVITY_VERIFICATION === 'true',
    enableEnvironmentalVerification: process.env.ENABLE_ENVIRONMENTAL_VERIFICATION === 'true'
  },
  
  // Privacy settings
  privacy: {
    enableDataAggregation: process.env.ENABLE_DATA_AGGREGATION === 'true',
    enableAnonymization: process.env.ENABLE_ANONYMIZATION === 'true',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '30'),
    enableLocationMasking: process.env.ENABLE_LOCATION_MASKING === 'true'
  },
  
  // Security settings
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200 // limit each IP to 200 requests per windowMs (IoT generates lots of data)
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};