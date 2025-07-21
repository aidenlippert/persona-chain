import axios from 'axios';
import { config } from '../config/config';
import { 
  Patient, 
  MedicalCondition, 
  Medication, 
  Allergy, 
  Immunization, 
  VitalSigns, 
  LabResult,
  FHIRBundle,
  CodeableConcept,
  AccessTokenData
} from '../types/health';

export class FHIRService {
  private tokenStore = new Map(); // In production, use encrypted database
  
  /**
   * Store access token for a DID and provider
   */
  async storeAccessToken(did: string, provider: string, tokenData: AccessTokenData): Promise<void> {
    const key = `${did}:${provider}`;
    
    // In production, encrypt and store in database with HIPAA compliance
    this.tokenStore.set(key, {
      ...tokenData,
      updatedAt: Date.now()
    });
    
    console.log(`🔐 Health access token stored for DID: ${did}, Provider: ${provider}`);
    
    // HIPAA audit logging
    if (config.hipaa.auditLogging) {
      console.log(`📋 AUDIT: Health data access granted - DID: ${did}, Provider: ${provider}, Timestamp: ${new Date().toISOString()}`);
    }
  }
  
  /**
   * Get access token for a DID and provider
   */
  async getAccessToken(did: string, provider: string): Promise<AccessTokenData | null> {
    const key = `${did}:${provider}`;
    const tokenData = this.tokenStore.get(key);
    
    if (!tokenData) return null;
    
    // Check if token is expired
    if (Date.now() >= tokenData.expiresAt) {
      console.log(`⏰ Health token expired for DID: ${did}, Provider: ${provider}`);
      this.tokenStore.delete(key);
      return null;
    }
    
    // HIPAA access logging
    if (config.hipaa.accessLogging) {
      console.log(`📋 AUDIT: Health data accessed - DID: ${did}, Provider: ${provider}, Timestamp: ${new Date().toISOString()}`);
    }
    
    return tokenData;
  }
  
  /**
   * Get FHIR base URL for provider
   */
  private getFhirBaseUrl(provider: string): string {
    switch (provider) {
      case 'epic':
        return config.epic.fhirUrl;
      case 'cerner':
        return config.cerner.fhirUrl;
      case 'allscripts':
        return config.allscripts.baseUrl;
      default:
        throw new Error(`Unsupported FHIR provider: ${provider}`);
    }
  }
  
  /**
   * Make authenticated FHIR API request
   */
  private async makeFhirRequest(
    provider: string, 
    endpoint: string, 
    accessToken: string,
    params?: any
  ): Promise<any> {
    try {
      const baseUrl = this.getFhirBaseUrl(provider);
      const url = `${baseUrl}/${endpoint}`;\n      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json'
        },
        params,
        timeout: 30000
      });
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ FHIR API request failed for ${provider}:`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Fetch patient information
   */
  async fetchPatient(did: string, provider: string): Promise<Patient | null> {
    try {
      const accessToken = await this.getAccessToken(did, provider);
      if (!accessToken || !accessToken.patientId) {
        throw new Error(`Patient access token not available for ${provider}`);
      }
      
      console.log(`👤 Fetching patient data from ${provider} FHIR API...`);
      
      const patientData = await this.makeFhirRequest(
        provider,
        `Patient/${accessToken.patientId}`,
        accessToken.accessToken
      );
      
      // Transform FHIR Patient resource to our format
      const patient: Patient = {
        id: patientData.id,
        identifier: patientData.identifier?.map((id: any) => id.value) || [],
        name: this.extractPatientName(patientData.name),
        gender: patientData.gender,
        birthDate: patientData.birthDate,
        address: patientData.address || [],
        telecom: patientData.telecom || [],
        verified: true,
        lastUpdated: patientData.meta?.lastUpdated || new Date().toISOString()
      };
      
      console.log(`✅ Patient data fetched from ${provider}`);
      return patient;
      
    } catch (error) {
      console.error(`❌ Error fetching patient from ${provider}:`, error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log(`🔄 Using mock patient data for ${provider}`);
        return {
          id: `${provider}_patient_mock`,
          name: 'John Doe',
          gender: 'male',
          birthDate: '1990-01-15',
          verified: true,
          lastUpdated: new Date().toISOString()
        };
      }
      
      return null;
    }
  }
  
  /**
   * Fetch medical conditions
   */
  async fetchConditions(did: string, provider: string): Promise<MedicalCondition[]> {
    try {
      const accessToken = await this.getAccessToken(did, provider);
      if (!accessToken || !accessToken.patientId) {
        throw new Error(`Patient access token not available for ${provider}`);
      }
      
      console.log(`🏥 Fetching conditions from ${provider} FHIR API...`);
      
      const conditionsBundle: FHIRBundle = await this.makeFhirRequest(
        provider,
        'Condition',
        accessToken.accessToken,
        { patient: accessToken.patientId, _count: 100 }
      );
      
      const conditions: MedicalCondition[] = conditionsBundle.entry?.map((entry: any) => {
        const condition = entry.resource;
        return {
          id: condition.id,
          code: condition.code,
          category: condition.category || [],
          clinicalStatus: condition.clinicalStatus?.coding?.[0]?.code || 'unknown',
          verificationStatus: condition.verificationStatus?.coding?.[0]?.code,
          severity: condition.severity,
          onsetDateTime: condition.onsetDateTime,
          recordedDate: condition.recordedDate,
          note: condition.note?.[0]?.text,
          verified: true
        };
      }) || [];
      
      console.log(`✅ Fetched ${conditions.length} conditions from ${provider}`);
      return conditions;
      
    } catch (error) {
      console.error(`❌ Error fetching conditions from ${provider}:`, error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log(`🔄 Using mock conditions data for ${provider}`);
        return [
          {
            id: `${provider}_condition_mock_1`,
            code: {
              coding: [{ code: 'I10', display: 'Essential hypertension', system: 'http://hl7.org/fhir/sid/icd-10-cm' }],
              text: 'High Blood Pressure'
            },
            clinicalStatus: 'active',
            verificationStatus: 'confirmed',
            recordedDate: '2023-01-15',
            verified: true
          }
        ];
      }
      
      return [];
    }
  }
  
  /**
   * Fetch medications
   */
  async fetchMedications(did: string, provider: string): Promise<Medication[]> {
    try {
      const accessToken = await this.getAccessToken(did, provider);
      if (!accessToken || !accessToken.patientId) {
        throw new Error(`Patient access token not available for ${provider}`);
      }
      
      console.log(`💊 Fetching medications from ${provider} FHIR API...`);
      
      const medicationsBundle: FHIRBundle = await this.makeFhirRequest(
        provider,
        'MedicationRequest',
        accessToken.accessToken,
        { patient: accessToken.patientId, _count: 100 }
      );
      
      const medications: Medication[] = medicationsBundle.entry?.map((entry: any) => {
        const medication = entry.resource;
        return {
          id: medication.id,
          medicationCodeableConcept: medication.medicationCodeableConcept || medication.medicationReference,
          status: medication.status || 'unknown',
          intent: medication.intent,
          priority: medication.priority,
          authoredOn: medication.authoredOn,
          dosageInstruction: medication.dosageInstruction || [],
          note: medication.note?.[0]?.text,
          verified: true
        };
      }) || [];
      
      console.log(`✅ Fetched ${medications.length} medications from ${provider}`);
      return medications;
      
    } catch (error) {
      console.error(`❌ Error fetching medications from ${provider}:`, error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log(`🔄 Using mock medications data for ${provider}`);
        return [
          {
            id: `${provider}_medication_mock_1`,
            medicationCodeableConcept: {
              coding: [{ code: '308136', display: 'Lisinopril 10mg', system: 'http://www.nlm.nih.gov/research/umls/rxnorm' }],
              text: 'Lisinopril 10mg'
            },
            status: 'active',
            intent: 'order',
            authoredOn: '2023-01-15',
            verified: true
          }
        ];
      }
      
      return [];
    }
  }
  
  /**
   * Fetch allergies
   */
  async fetchAllergies(did: string, provider: string): Promise<Allergy[]> {
    try {
      const accessToken = await this.getAccessToken(did, provider);
      if (!accessToken || !accessToken.patientId) {
        throw new Error(`Patient access token not available for ${provider}`);
      }
      
      console.log(`🤧 Fetching allergies from ${provider} FHIR API...`);
      
      const allergiesBundle: FHIRBundle = await this.makeFhirRequest(
        provider,
        'AllergyIntolerance',
        accessToken.accessToken,
        { patient: accessToken.patientId, _count: 100 }
      );
      
      const allergies: Allergy[] = allergiesBundle.entry?.map((entry: any) => {
        const allergy = entry.resource;
        return {
          id: allergy.id,
          code: allergy.code,
          clinicalStatus: allergy.clinicalStatus?.coding?.[0]?.code || 'unknown',
          verificationStatus: allergy.verificationStatus?.coding?.[0]?.code,
          category: allergy.category || [],
          criticality: allergy.criticality,
          allergen: allergy.code || { text: 'Unknown allergen' },
          reaction: allergy.reaction || [],
          recordedDate: allergy.recordedDate,
          verified: true
        };
      }) || [];
      
      console.log(`✅ Fetched ${allergies.length} allergies from ${provider}`);
      return allergies;
      
    } catch (error) {
      console.error(`❌ Error fetching allergies from ${provider}:`, error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log(`🔄 Using mock allergies data for ${provider}`);
        return [
          {
            id: `${provider}_allergy_mock_1`,
            allergen: {
              coding: [{ code: '227493005', display: 'Cashew nuts', system: 'http://snomed.info/sct' }],
              text: 'Cashew nuts'
            },
            clinicalStatus: 'active',
            verificationStatus: 'confirmed',
            category: ['food'],
            criticality: 'high',
            recordedDate: '2022-03-10',
            verified: true
          }
        ];
      }
      
      return [];
    }
  }
  
  /**
   * Fetch immunizations
   */
  async fetchImmunizations(did: string, provider: string): Promise<Immunization[]> {
    try {
      const accessToken = await this.getAccessToken(did, provider);
      if (!accessToken || !accessToken.patientId) {
        throw new Error(`Patient access token not available for ${provider}`);
      }
      
      console.log(`💉 Fetching immunizations from ${provider} FHIR API...`);
      
      const immunizationsBundle: FHIRBundle = await this.makeFhirRequest(
        provider,
        'Immunization',
        accessToken.accessToken,
        { patient: accessToken.patientId, _count: 100 }
      );
      
      const immunizations: Immunization[] = immunizationsBundle.entry?.map((entry: any) => {
        const immunization = entry.resource;
        return {
          id: immunization.id,
          vaccineCode: immunization.vaccineCode,
          status: immunization.status || 'completed',
          occurrenceDateTime: immunization.occurrenceDateTime,
          primarySource: immunization.primarySource,
          manufacturer: immunization.manufacturer?.display,
          lotNumber: immunization.lotNumber,
          expirationDate: immunization.expirationDate,
          site: immunization.site,
          route: immunization.route,
          doseQuantity: immunization.doseQuantity,
          note: immunization.note?.[0]?.text,
          verified: true
        };
      }) || [];
      
      console.log(`✅ Fetched ${immunizations.length} immunizations from ${provider}`);
      return immunizations;
      
    } catch (error) {
      console.error(`❌ Error fetching immunizations from ${provider}:`, error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log(`🔄 Using mock immunizations data for ${provider}`);
        return [
          {
            id: `${provider}_immunization_mock_1`,
            vaccineCode: {
              coding: [{ code: '207', display: 'COVID-19 mRNA vaccine', system: 'http://hl7.org/fhir/sid/cvx' }],
              text: 'COVID-19 Vaccine'
            },
            status: 'completed',
            occurrenceDateTime: '2023-09-15',
            primarySource: true,
            manufacturer: 'Pfizer',
            verified: true
          }
        ];
      }
      
      return [];
    }
  }
  
  /**
   * Fetch vital signs observations
   */
  async fetchVitalSigns(did: string, provider: string): Promise<VitalSigns[]> {
    try {
      const accessToken = await this.getAccessToken(did, provider);
      if (!accessToken || !accessToken.patientId) {
        throw new Error(`Patient access token not available for ${provider}`);
      }
      
      console.log(`📊 Fetching vital signs from ${provider} FHIR API...`);
      
      const vitalsBundle: FHIRBundle = await this.makeFhirRequest(
        provider,
        'Observation',
        accessToken.accessToken,
        { 
          patient: accessToken.patientId, 
          category: 'vital-signs',
          _count: 50,
          _sort: '-date'
        }
      );
      
      const vitalSigns: VitalSigns[] = vitalsBundle.entry?.map((entry: any) => {
        const vital = entry.resource;
        return {
          id: vital.id,
          category: vital.category || [],
          code: vital.code,
          effectiveDateTime: vital.effectiveDateTime,
          valueQuantity: vital.valueQuantity,
          component: vital.component || [],
          interpretation: vital.interpretation || [],
          note: vital.note?.[0]?.text,
          verified: true
        };
      }) || [];
      
      console.log(`✅ Fetched ${vitalSigns.length} vital signs from ${provider}`);
      return vitalSigns;
      
    } catch (error) {
      console.error(`❌ Error fetching vital signs from ${provider}:`, error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log(`🔄 Using mock vital signs data for ${provider}`);
        return [
          {
            id: `${provider}_vital_mock_1`,
            category: [{
              coding: [{ code: 'vital-signs', display: 'Vital Signs', system: 'http://terminology.hl7.org/CodeSystem/observation-category' }]
            }],
            code: {
              coding: [{ code: '85354-9', display: 'Blood pressure panel', system: 'http://loinc.org' }],
              text: 'Blood Pressure'
            },
            effectiveDateTime: '2023-12-01',
            component: [
              {
                code: {
                  coding: [{ code: '8480-6', display: 'Systolic blood pressure', system: 'http://loinc.org' }]
                },
                valueQuantity: { value: 120, unit: 'mmHg' }
              },
              {
                code: {
                  coding: [{ code: '8462-4', display: 'Diastolic blood pressure', system: 'http://loinc.org' }]
                },
                valueQuantity: { value: 80, unit: 'mmHg' }
              }
            ],
            verified: true
          }
        ];
      }
      
      return [];
    }
  }
  
  /**
   * Fetch laboratory results
   */
  async fetchLabResults(did: string, provider: string): Promise<LabResult[]> {
    try {
      const accessToken = await this.getAccessToken(did, provider);
      if (!accessToken || !accessToken.patientId) {
        throw new Error(`Patient access token not available for ${provider}`);
      }
      
      console.log(`🧪 Fetching lab results from ${provider} FHIR API...`);
      
      const labsBundle: FHIRBundle = await this.makeFhirRequest(
        provider,
        'Observation',
        accessToken.accessToken,
        { 
          patient: accessToken.patientId, 
          category: 'laboratory',
          _count: 50,
          _sort: '-date'
        }
      );
      
      const labResults: LabResult[] = labsBundle.entry?.map((entry: any) => {
        const lab = entry.resource;
        return {
          id: lab.id,
          category: lab.category || [],
          code: lab.code,
          effectiveDateTime: lab.effectiveDateTime,
          valueQuantity: lab.valueQuantity,
          valueString: lab.valueString,
          valueCodeableConcept: lab.valueCodeableConcept,
          interpretation: lab.interpretation || [],
          referenceRange: lab.referenceRange || [],
          note: lab.note?.[0]?.text,
          verified: true
        };
      }) || [];
      
      console.log(`✅ Fetched ${labResults.length} lab results from ${provider}`);
      return labResults;
      
    } catch (error) {
      console.error(`❌ Error fetching lab results from ${provider}:`, error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log(`🔄 Using mock lab results data for ${provider}`);
        return [
          {
            id: `${provider}_lab_mock_1`,
            category: [{
              coding: [{ code: 'laboratory', display: 'Laboratory', system: 'http://terminology.hl7.org/CodeSystem/observation-category' }]
            }],
            code: {
              coding: [{ code: '33747-0', display: 'General blood chemistry panel', system: 'http://loinc.org' }],
              text: 'Comprehensive Metabolic Panel'
            },
            effectiveDateTime: '2023-11-15',
            valueQuantity: { value: 95, unit: 'mg/dL' },
            interpretation: [{
              coding: [{ code: 'N', display: 'Normal', system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation' }]
            }],
            referenceRange: [{
              low: { value: 70, unit: 'mg/dL' },
              high: { value: 100, unit: 'mg/dL' },
              text: '70-100 mg/dL'
            }],
            verified: true
          }
        ];
      }
      
      return [];
    }
  }
  
  /**
   * Extract patient name from FHIR format
   */
  private extractPatientName(names: any[]): string {
    if (!names || names.length === 0) return 'Unknown Patient';
    
    const officialName = names.find(n => n.use === 'official') || names[0];
    
    const given = officialName.given?.join(' ') || '';
    const family = officialName.family || '';
    
    return `${given} ${family}`.trim() || 'Unknown Patient';
  }
  
  /**
   * Revoke access for a provider
   */
  async revokeAccess(did: string, provider: string): Promise<void> {
    try {
      const key = `${did}:${provider}`;
      const tokenData = this.tokenStore.get(key);
      
      if (tokenData) {
        // HIPAA audit logging
        if (config.hipaa.auditLogging) {
          console.log(`📋 AUDIT: Health data access revoked - DID: ${did}, Provider: ${provider}, Timestamp: ${new Date().toISOString()}`);
        }
        
        console.log(`🔓 Health access revoked for DID: ${did}, Provider: ${provider}`);
        this.tokenStore.delete(key);
      }
      
    } catch (error) {
      console.error('❌ Error revoking health access:', error);
      throw error;
    }
  }
}