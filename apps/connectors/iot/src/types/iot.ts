export interface IoTDevice {
  id: string;
  name: string;
  type: 'fitness_tracker' | 'smart_home' | 'vehicle' | 'wearable' | 'sensor' | 'security';
  platform: 'fitbit' | 'google_nest' | 'alexa' | 'tesla' | 'homekit' | 'smartthings';
  manufacturer: string;
  model?: string;
  firmwareVersion?: string;
  isOnline: boolean;
  lastSeen?: string;
  location?: IoTLocation;
  verified: boolean;
  lastUpdated: string;
}

export interface IoTLocation {
  type: 'home' | 'work' | 'vehicle' | 'public' | 'unknown';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  geofence?: string;
}

export interface FitnessData {
  id: string;
  deviceId: string;
  userId: string;
  date: string;
  steps: number;
  distance: number; // meters
  calories: number;
  activeMinutes: number;
  heartRate?: HeartRateData;
  sleep?: SleepData;
  activities?: ActivitySession[];
  verified: boolean;
}

export interface HeartRateData {
  restingHeartRate?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  zones?: {
    fatBurn: number;
    cardio: number;
    peak: number;
  };
  variability?: number;
}

export interface SleepData {
  bedTime: string;
  wakeTime: string;
  totalSleepDuration: number; // minutes
  sleepEfficiency: number; // percentage
  stages?: {
    deep: number;
    light: number;
    rem: number;
    wake: number;
  };
  sleepScore?: number;
}

export interface ActivitySession {
  id: string;
  activityType: string;
  startTime: string;
  duration: number; // minutes
  calories: number;
  averageHeartRate?: number;
  steps?: number;
  distance?: number;
}

export interface SmartHomeData {
  id: string;
  deviceId: string;
  homeId: string;
  timestamp: string;
  presenceDetected: boolean;
  occupancyCount?: number;
  environmentalData?: EnvironmentalData;
  securityEvents?: SecurityEvent[];
  energyUsage?: EnergyUsage;
  deviceStates?: DeviceState[];
  verified: boolean;
}

export interface EnvironmentalData {
  temperature: number;
  humidity: number;
  airQuality?: number;
  lightLevel?: number;
  noiseLevel?: number;
  co2Level?: number;
}

export interface SecurityEvent {
  id: string;
  type: 'motion' | 'door' | 'window' | 'camera' | 'alarm';
  triggered: boolean;
  timestamp: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
}

export interface EnergyUsage {
  powerConsumption: number; // watts
  dailyUsage: number; // kWh
  cost?: number;
  carbonFootprint?: number;
}

export interface DeviceState {
  deviceId: string;
  deviceType: string;
  isOn: boolean;
  brightness?: number;
  temperature?: number;
  mode?: string;
}

export interface VehicleData {
  id: string;
  vehicleId: string;
  userId: string;
  timestamp: string;
  location: IoTLocation;
  odometer: number;
  batteryLevel?: number;
  fuelLevel?: number;
  isCharging?: boolean;
  isLocked: boolean;
  speed?: number;
  heading?: number;
  trips?: VehicleTrip[];
  verified: boolean;
}

export interface VehicleTrip {
  id: string;
  startTime: string;
  endTime: string;
  startLocation: IoTLocation;
  endLocation: IoTLocation;
  distance: number;
  duration: number;
  averageSpeed: number;
  fuelUsed?: number;
  energyUsed?: number;
}

export interface BehavioralPattern {
  id: string;
  userId: string;
  patternType: 'daily_routine' | 'sleep_pattern' | 'activity_level' | 'location_pattern' | 'device_usage';
  timeframe: 'daily' | 'weekly' | 'monthly';
  pattern: any; // JSON representation of the pattern
  confidence: number;
  anomalies?: Anomaly[];
  lastUpdated: string;
  verified: boolean;
}

export interface Anomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: string;
  impact: number;
}

export interface PresenceVerification {
  id: string;
  userId: string;
  timestamp: string;
  locationType: 'home' | 'work' | 'travel' | 'other';
  presenceConfidence: number;
  verificationMethods: string[];
  devices: string[];
  duration?: number;
  verified: boolean;
}

export interface IoTCredentials {
  did: string;
  devices: IoTDevice[];
  fitnessData: FitnessData[];
  smartHomeData: SmartHomeData[];
  vehicleData: VehicleData[];
  behavioralPatterns: BehavioralPattern[];
  presenceVerifications: PresenceVerification[];
  aggregateMetrics: {
    totalDevices: number;
    activeDevices: number;
    averageDailySteps: number;
    averageSleepHours: number;
    homeOccupancyRate: number;
    vehicleMilesDriven: number;
    behavioralConsistency: number;
  };
  privacyMetrics: {
    dataPointsCollected: number;
    dataPointsAnonymized: number;
    locationsVisited: number;
    locationAccuracy: number;
    dataRetentionDays: number;
  };
  lastUpdated: string;
  verified: boolean;
}

export interface AccessTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  platform: string;
  userId?: string;
  deviceId?: string;
}

export interface IoTVerification {
  platform: string;
  deviceId: string;
  verificationType: 'device_authenticity' | 'behavioral_consistency' | 'presence_verification' | 'activity_verification';
  verificationLevel: 'basic' | 'standard' | 'enhanced' | 'behavioral';
  verificationChecks: {
    deviceAuthenticity: boolean;
    dataConsistency: boolean;
    behavioralAnalysis: boolean;
    presenceVerification: boolean;
    crossDeviceCorrelation: boolean;
    temporalConsistency: boolean;
  };
  confidenceScore: number;
  behavioralMetrics?: BehavioralMetrics;
  verified: boolean;
  verifiedAt: string;
}

export interface BehavioralMetrics {
  routineConsistency: number;
  activityPatterns: number;
  sleepRegularity: number;
  locationConsistency: number;
  deviceUsagePatterns: number;
  anomalyScore: number;
}

export interface IoTProvider {
  id: string;
  name: string;
  type: 'fitness' | 'smart_home' | 'vehicle' | 'wearable';
  platform: string;
  baseUrl: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  capabilities: string[];
  dataTypes: string[];
  privacyLevel: 'basic' | 'enhanced' | 'premium';
  status: 'active' | 'inactive' | 'maintenance';
  lastVerified: string;
}