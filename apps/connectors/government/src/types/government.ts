export interface TaxRecord {
  id: string;
  taxYear: number;
  filingStatus: 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household' | 'qualifying_widow';
  adjustedGrossIncome?: number;
  totalTax?: number;
  refundAmount?: number;
  balanceDue?: number;
  dependentsCount: number;
  filingDate?: string;
  addressOnFile: Address;
  verified: boolean;
  confidenceLevel: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export interface IncomeVerification {
  id: string;
  taxYear: number;
  verificationMethod: 'transcript' | 'return_copy' | 'wage_statement';
  incomeAmount: number;
  incomeType: 'wages' | 'self_employment' | 'investment' | 'retirement' | 'other';
  employerEIN?: string;
  employerName?: string;
  verified: boolean;
  issuedDate: string;
  expirationDate?: string;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  zipPlus4?: string;
  county?: string;
  country?: string;
}

export interface AddressVerification {
  id: string;
  inputAddress: Address;
  standardizedAddress?: Address;
  verificationStatus: 'verified' | 'partially_verified' | 'not_verified' | 'invalid';
  deliveryPoint?: string;
  carrierRoute?: string;
  dpvConfirmation?: boolean; // Delivery Point Validation
  vacantIndicator?: boolean;
  businessIndicator?: boolean;
  centralDeliveryIndicator?: boolean;
  verificationDate: string;
  corrections?: AddressCorrection[];
}

export interface AddressCorrection {
  field: string;
  originalValue: string;
  correctedValue: string;
  reason: string;
}

export interface SocialSecurityVerification {
  id: string;
  ssnLastFour: string; // Only last 4 digits for privacy
  fullNameMatch: boolean;
  dobMatch: boolean;
  addressMatch: boolean;
  employmentHistory?: EmploymentRecord[];
  benefitsStatus?: 'receiving' | 'eligible' | 'not_eligible' | 'unknown';
  verified: boolean;
  verificationDate: string;
}

export interface EmploymentRecord {
  year: number;
  employer: string;
  wages: number;
  quarters: number;
}

export interface GovernmentBenefit {
  id: string;
  programName: string;
  benefitType: 'snap' | 'medicaid' | 'social_security' | 'unemployment' | 'housing' | 'other';
  status: 'active' | 'inactive' | 'pending' | 'denied';
  monthlyAmount?: number;
  startDate?: string;
  endDate?: string;
  eligibilityDate?: string;
  lastPaymentDate?: string;
  verified: boolean;
}

export interface DisasterAssistance {
  id: string;
  disasterNumber: string;
  disasterType: string;
  assistanceType: 'individual' | 'public' | 'hazard_mitigation';
  applicationNumber: string;
  status: 'approved' | 'denied' | 'pending' | 'closed';
  approvedAmount?: number;
  paidAmount?: number;
  assistanceCategories: string[];
  applicationDate: string;
  approvalDate?: string;
  verified: boolean;
}

export interface GovernmentProfile {
  did: string;
  taxRecords: TaxRecord[];
  incomeVerifications: IncomeVerification[];
  addressVerifications: AddressVerification[];
  socialSecurityVerification?: SocialSecurityVerification;
  governmentBenefits: GovernmentBenefit[];
  disasterAssistance: DisasterAssistance[];
  summary: {
    totalTaxYears: number;
    latestFilingYear: number;
    verifiedAddresses: number;
    activeBenefits: number;
    totalDisasterAssistance: number;
  };
  complianceStatus: {
    privacyActCompliant: boolean;
    fipsCompliant: boolean;
    auditTrail: boolean;
    dataEncrypted: boolean;
  };
  lastUpdated: string;
  verified: boolean;
}

export interface AccessTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  agency: string;
  userId?: string;
  certificationLevel?: string;
}

export interface GovernmentVerification {
  agency: string;
  recordId: string;
  verificationType: 'tax_record' | 'address' | 'income' | 'benefits' | 'disaster_assistance';
  verificationLevel: 'basic' | 'standard' | 'enhanced' | 'certified';
  verificationChecks: {
    documentAuthenticity: boolean;
    identityVerification: boolean;
    addressValidation: boolean;
    crossAgencyVerification: boolean;
    biometricCheck: boolean;
  };
  confidenceScore: number;
  complianceCertifications: string[];
  verified: boolean;
  verifiedAt: string;
  expiresAt?: string;
}

export interface USPSTrackingInfo {
  trackingNumber: string;
  status: string;
  deliveryStatus: 'delivered' | 'in_transit' | 'out_for_delivery' | 'exception' | 'pre_shipment';
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddress?: Address;
  trackingEvents: TrackingEvent[];
  verified: boolean;
}

export interface TrackingEvent {
  eventType: string;
  eventDescription: string;
  eventDate: string;
  eventTime: string;
  location: string;
  zipCode?: string;
}

export interface IRSTranscript {
  transcriptType: 'account' | 'record_of_account' | 'return' | 'wage_and_income';
  taxYear: number;
  taxpayerName: string;
  ssn: string; // Masked in actual implementation
  filingStatus: string;
  agi?: number;
  totalTax?: number;
  withheld?: number;
  refundAmount?: number;
  balanceDue?: number;
  transactions: IRSTransaction[];
  issued: string;
  verified: boolean;
}

export interface IRSTransaction {
  code: string;
  description: string;
  amount: number;
  date: string;
  type: 'credit' | 'debit' | 'assessment' | 'payment';
}

export interface GovernmentProvider {
  id: string;
  name: string;
  type: 'federal' | 'state' | 'local';
  agency: string;
  baseUrl: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  capabilities: string[];
  complianceLevel: 'basic' | 'enhanced' | 'certified';
  status: 'active' | 'inactive' | 'maintenance';
  lastVerified: string;
}

// Additional types for Census and DMV services

export interface ResidencyVerification {
  verified: boolean;
  address: string;
  standardizedAddress: string | null;
  confidence: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  source: string;
  verifiedAt: string;
  error?: string;
  metadata?: any;
}

export interface DemographicData {
  geography: 'state' | 'county' | 'tract' | 'block group';
  geoCode: string;
  population: {
    total: number;
    density: number;
  };
  housing: {
    totalUnits: number;
    medianValue: number;
  };
  income: {
    medianHousehold: number;
  };
  education: {
    bachelorsOrHigher: number;
    totalPopulation: number;
  };
  employment: {
    totalCommuters: number;
  };
  source: string;
  year: number;
  fetchedAt: string;
}

export interface GeographicData {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  fipsCodes: {
    state: string;
    county: string;
    tract: string;
    block: string;
  };
  geographies: {
    state: string;
    county: string;
    tract: string;
    congressionalDistrict: string;
    schoolDistrict: string;
  };
  source: string;
  fetchedAt: string;
}

export interface DriverLicenseVerification {
  verified: boolean;
  licenseNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  licenseStatus: string;
  licenseClass: string;
  issuedDate?: string;
  expirationDate?: string;
  restrictions: string[];
  endorsements: string[];
  state: string;
  confidence: number;
  source: string;
  verifiedAt: string;
  metadata?: any;
}

export interface VehicleRegistration {
  verified: boolean;
  licensePlate: string;
  vin?: string;
  registrationStatus: string;
  make?: string;
  model?: string;
  year?: number;
  registeredOwner?: string;
  registrationDate?: string;
  expirationDate?: string;
  state: string;
  confidence: number;
  source: string;
  verifiedAt: string;
  metadata?: any;
}

export interface DriverRecord {
  verified: boolean;
  licenseNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  licenseStatus: string;
  violations: Array<{
    date: string;
    violation: string;
    points: number;
    fine: number;
    location: string;
  }>;
  accidents: Array<{
    date: string;
    type: string;
    atFault: boolean;
    damages: number;
    location: string;
  }>;
  suspensions: Array<{
    startDate: string;
    endDate: string;
    reason: string;
    reinstated: boolean;
  }>;
  pointBalance: number;
  recordPeriod: string;
  safeDriverStatus: boolean;
  source: string;
  fetchedAt: string;
  metadata?: any;
}

export interface GovernmentCredential {
  id: string;
  did: string;
  type: 'residency' | 'driver_license' | 'vehicle_registration' | 'demographic_profile';
  source: 'census' | 'dmv' | 'irs' | 'usps' | 'ssa';
  verified: boolean;
  data: ResidencyVerification | DriverLicenseVerification | VehicleRegistration | DemographicData;
  commitment: string;
  rawDataHash: string;
  createdAt: string;
  expiresAt: string;
}