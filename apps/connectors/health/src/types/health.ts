export interface Patient {
  id: string;
  identifier?: string[];
  name: string;
  gender?: string;
  birthDate?: string;
  address?: Address[];
  telecom?: ContactPoint[];
  verified: boolean;
  lastUpdated: string;
}

export interface Address {
  use?: string;
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ContactPoint {
  system?: string;
  value?: string;
  use?: string;
}

export interface MedicalCondition {
  id: string;
  code: CodeableConcept;
  category?: CodeableConcept[];
  clinicalStatus: string;
  verificationStatus?: string;
  severity?: CodeableConcept;
  onsetDateTime?: string;
  recordedDate?: string;
  note?: string;
  verified: boolean;
}

export interface Medication {
  id: string;
  medicationCodeableConcept: CodeableConcept;
  status: string;
  intent?: string;
  priority?: string;
  authoredOn?: string;
  dosageInstruction?: Dosage[];
  note?: string;
  verified: boolean;
}

export interface Dosage {
  text?: string;
  timing?: Timing;
  route?: CodeableConcept;
  doseAndRate?: DoseAndRate[];
}

export interface Timing {
  repeat?: {
    frequency?: number;
    period?: number;
    periodUnit?: string;
  };
}

export interface DoseAndRate {
  type?: CodeableConcept;
  doseQuantity?: Quantity;
}

export interface Quantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface Allergy {
  id: string;
  code?: CodeableConcept;
  clinicalStatus: string;
  verificationStatus?: string;
  category?: string[];
  criticality?: string;
  allergen: CodeableConcept;
  reaction?: AllergyReaction[];
  recordedDate?: string;
  verified: boolean;
}

export interface AllergyReaction {
  substance?: CodeableConcept;
  manifestation: CodeableConcept[];
  severity?: string;
  onset?: string;
}

export interface Immunization {
  id: string;
  vaccineCode: CodeableConcept;
  status: string;
  occurrenceDateTime?: string;
  primarySource?: boolean;
  manufacturer?: string;
  lotNumber?: string;
  expirationDate?: string;
  site?: CodeableConcept;
  route?: CodeableConcept;
  doseQuantity?: Quantity;
  note?: string;
  verified: boolean;
}

export interface VitalSigns {
  id: string;
  category: CodeableConcept[];
  code: CodeableConcept;
  effectiveDateTime?: string;
  valueQuantity?: Quantity;
  component?: VitalSignComponent[];
  interpretation?: CodeableConcept[];
  note?: string;
  verified: boolean;
}

export interface VitalSignComponent {
  code: CodeableConcept;
  valueQuantity?: Quantity;
  interpretation?: CodeableConcept[];
}

export interface LabResult {
  id: string;
  category: CodeableConcept[];
  code: CodeableConcept;
  effectiveDateTime?: string;
  valueQuantity?: Quantity;
  valueString?: string;
  valueCodeableConcept?: CodeableConcept;
  interpretation?: CodeableConcept[];
  referenceRange?: ReferenceRange[];
  note?: string;
  verified: boolean;
}

export interface ReferenceRange {
  low?: Quantity;
  high?: Quantity;
  type?: CodeableConcept;
  text?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
  version?: string;
}

export interface HealthProfile {
  did: string;
  patient: Patient;
  conditions: MedicalCondition[];
  medications: Medication[];
  allergies: Allergy[];
  immunizations: Immunization[];
  vitalSigns: VitalSigns[];
  labResults: LabResult[];
  summary: {
    totalConditions: number;
    activeMedications: number;
    knownAllergies: number;
    completedImmunizations: number;
    recentVitals: number;
    recentLabs: number;
  };
  lastUpdated: string;
  verified: boolean;
}

export interface AccessTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  patientId?: string;
  providerId?: string;
  providerName?: string;
}

export interface FHIRBundle {
  resourceType: string;
  id?: string;
  type: string;
  total?: number;
  entry?: FHIRBundleEntry[];
}

export interface FHIRBundleEntry {
  fullUrl?: string;
  resource: any;
  search?: {
    mode?: string;
    score?: number;
  };
}

export interface HealthProvider {
  id: string;
  name: string;
  type: 'epic' | 'cerner' | 'allscripts' | 'smart_on_fhir';
  fhirVersion: string;
  baseUrl: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  capabilities?: string[];
  status: 'active' | 'inactive' | 'maintenance';
}