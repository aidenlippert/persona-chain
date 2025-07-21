import axios from 'axios';
import { config } from '../config/config';
import { OAuthService } from './OAuthService';
import { IDmeService, IDmeStudentProfile } from './IDmeService';
import { hashData } from '../middleware/auth';
import { APIError } from '../middleware/errorHandler';

export interface Degree {
  id: string;
  institution: string;
  degreeType: string;
  major: string;
  graduationDate: string;
  verified: boolean;
  gpa?: number;
  honors?: string;
}

export interface GPARecord {
  id: string;
  value: number;
  scale: number;
  institution: string;
  semester: string;
  verified: boolean;
  courses?: number;
}

export interface Transcript {
  id: string;
  institution: string;
  courses: any[];
  totalCreditHours: number;
  verified: boolean;
  gpa?: number;
}

export interface StudentCredential {
  id: string;
  did: string;
  source: 'idme' | 'nsc' | 'oneroster';
  verified: boolean;
  studentData: {
    enrollment_status: string;
    institution: string;
    degree_type?: string;
    major?: string;
    gpa?: number;
    graduation_date?: string;
    student_id?: string;
  };
  commitment: string;
  rawDataHash: string;
  createdAt: string;
  expiresAt?: string;
}

export class AcademicService {
  private oauthService: OAuthService;
  private idmeService: IDmeService;
  private credentialStore = new Map<string, StudentCredential>(); // In production, use database
  
  constructor() {
    this.oauthService = new OAuthService();
    this.idmeService = new IDmeService();
  }
  
  /**
   * Check if user has authorized academic data access
   */
  async checkAuthorizationStatus(did: string): Promise<{ authorized: boolean; authUrl?: string; providers: string[] }> {
    try {
      const idmeToken = await this.idmeService.getTokenForDID(did);
      const nscToken = await this.oauthService.getAccessToken(did, 'nsc');
      
      const authorizedProviders = [];
      if (idmeToken) authorizedProviders.push('idme');
      if (nscToken) authorizedProviders.push('nsc');
      
      if (authorizedProviders.length === 0) {
        return {
          authorized: false,
          authUrl: `/oauth/authorize?did=${did}&provider=idme`,
          providers: []
        };
      }
      
      return { 
        authorized: true, 
        providers: authorizedProviders 
      };
      
    } catch (error) {
      console.error('Error checking authorization status:', error);
      return {
        authorized: false,
        authUrl: `/oauth/authorize?did=${did}&provider=idme`,
        providers: []
      };
    }
  }

  /**
   * Fetch and process student data from ID.me
   */
  async fetchStudentDataFromIDme(did: string): Promise<StudentCredential> {
    try {
      console.log('🎓 Fetching student data from ID.me...');
      
      const tokenData = await this.idmeService.getTokenForDID(did);
      if (!tokenData) {
        throw new APIError('ID.me access token not available', 401);
      }
      
      const profile = await this.idmeService.getStudentProfile(tokenData.accessToken);
      
      // Transform ID.me profile to our credential format
      const studentData = {
        enrollment_status: profile.student_verification.attributes.enrollment_status,
        institution: profile.student_verification.attributes.institution_name || 'Unknown Institution',
        degree_type: profile.student_verification.attributes.degree_type,
        major: profile.student_verification.attributes.major,
        gpa: profile.student_verification.attributes.gpa,
        graduation_date: profile.student_verification.attributes.expected_graduation,
        student_id: profile.student_verification.attributes.student_id
      };
      
      // Generate commitment and hash
      const rawDataHash = hashData(profile);
      const commitment = hashData({
        did,
        source: 'idme',
        studentData,
        rawDataHash,
        timestamp: Date.now()
      });
      
      const credential: StudentCredential = {
        id: `idme_${did}_${Date.now()}`,
        did,
        source: 'idme',
        verified: profile.student_verification.verified,
        studentData,
        commitment,
        rawDataHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      };
      
      // Store credential (purge raw data after hashing)
      this.credentialStore.set(credential.id, credential);
      
      console.log(`✅ Student credential created from ID.me: ${credential.id}`);
      return credential;
      
    } catch (error) {
      console.error('❌ Error fetching student data from ID.me:', error);
      throw new APIError('Failed to fetch student data from ID.me', 500);
    }
  }
  
  /**
   * Fetch degree data from National Student Clearinghouse
   */
  async fetchDegreesFromNSC(did: string): Promise<Degree[]> {
    try {
      const accessToken = await this.oauthService.getAccessToken(did, 'nsc');
      if (!accessToken) {
        throw new Error('NSC access token not available');
      }
      
      console.log('📜 Fetching degrees from NSC API...');
      
      // Call NSC API
      const response = await axios.get(`${config.nsc.baseUrl}/v2/degrees`, {
        headers: {
          'Authorization': `Bearer ${accessToken.accessToken}`,
          'X-API-Key': config.nsc.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      // Transform NSC response to our format
      const degrees: Degree[] = response.data.degrees?.map((degree: any) => ({
        id: degree.degree_id || `nsc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        institution: degree.institution_name,
        degreeType: degree.degree_type,
        major: degree.major_field,
        graduationDate: degree.graduation_date,
        verified: degree.verification_status === 'verified',
        gpa: degree.gpa,
        honors: degree.honors
      })) || [];
      
      console.log(`✅ Fetched ${degrees.length} degrees from NSC`);
      return degrees;
      
    } catch (error) {
      console.error('❌ Error fetching degrees from NSC:', error);
      
      // Return mock data for development/testing
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock NSC data for development');
        return [
          {
            id: 'nsc_mock_1',
            institution: 'State University',
            degreeType: 'Bachelor of Science',
            major: 'Computer Science',
            graduationDate: '2020-05-15',
            verified: true,
            gpa: 3.7,
            honors: 'Magna Cum Laude'
          },
          {
            id: 'nsc_mock_2',
            institution: 'Tech Institute',
            degreeType: 'Master of Science',
            major: 'Software Engineering',
            graduationDate: '2022-12-18',
            verified: true,
            gpa: 3.9
          }
        ];
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch GPA data from Parchment
   */
  async fetchGPAFromParchment(did: string): Promise<GPARecord[]> {
    try {
      const accessToken = await this.oauthService.getAccessToken(did, 'parchment');
      if (!accessToken) {
        throw new Error('Parchment access token not available');
      }
      
      console.log('📊 Fetching GPA data from Parchment API...');
      
      // Call Parchment API
      const response = await axios.get(`${config.parchment.baseUrl}/v1/academic-records`, {
        headers: {
          'Authorization': `Bearer ${accessToken.accessToken}`,
          'X-API-Key': config.parchment.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      // Transform Parchment response to our format
      const gpaRecords: GPARecord[] = response.data.academic_records?.map((record: any) => ({
        id: record.record_id || `parchment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        value: record.gpa_value,
        scale: record.gpa_scale,
        institution: record.institution_name,
        semester: record.semester,
        verified: record.verification_status === 'verified',
        courses: record.course_count
      })) || [];
      
      console.log(`✅ Fetched ${gpaRecords.length} GPA records from Parchment`);
      return gpaRecords;
      
    } catch (error) {
      console.error('❌ Error fetching GPA from Parchment:', error);
      
      // Return mock data for development/testing
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock Parchment data for development');
        return [
          {
            id: 'parchment_mock_1',
            value: 3.7,
            scale: 4.0,
            institution: 'State University',
            semester: 'Fall 2019 - Spring 2020',
            verified: true,
            courses: 120
          },
          {
            id: 'parchment_mock_2',
            value: 3.9,
            scale: 4.0,
            institution: 'Tech Institute',
            semester: 'Fall 2021 - Spring 2022',
            verified: true,
            courses: 36
          }
        ];
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch transcript data from NSC
   */
  async fetchTranscriptsFromNSC(did: string): Promise<Transcript[]> {
    try {
      const accessToken = await this.oauthService.getAccessToken(did, 'nsc');
      if (!accessToken) {
        throw new Error('NSC access token not available');
      }
      
      console.log('📋 Fetching transcripts from NSC API...');
      
      // Call NSC API for transcripts
      const response = await axios.get(`${config.nsc.baseUrl}/v2/transcripts`, {
        headers: {
          'Authorization': `Bearer ${accessToken.accessToken}`,
          'X-API-Key': config.nsc.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      // Transform NSC transcript response
      const transcripts: Transcript[] = response.data.transcripts?.map((transcript: any) => ({
        id: transcript.transcript_id || `nsc_transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        institution: transcript.institution_name,
        courses: transcript.courses || [],
        totalCreditHours: transcript.total_credit_hours,
        verified: transcript.verification_status === 'verified',
        gpa: transcript.cumulative_gpa
      })) || [];
      
      console.log(`✅ Fetched ${transcripts.length} transcripts from NSC`);
      return transcripts;
      
    } catch (error) {
      console.error('❌ Error fetching transcripts from NSC:', error);
      
      // Return mock data for development/testing
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock transcript data for development');
        return [
          {
            id: 'nsc_transcript_mock_1',
            institution: 'State University',
            courses: [
              { code: 'CS101', title: 'Intro to Computer Science', credits: 3, grade: 'A' },
              { code: 'MATH201', title: 'Calculus I', credits: 4, grade: 'B+' }
            ],
            totalCreditHours: 120,
            verified: true,
            gpa: 3.7
          }
        ];
      }
      
      throw error;
    }
  }
  
  /**
   * Get list of supported institutions
   */
  async getSupportedInstitutions(): Promise<string[]> {
    try {
      // In production, this would fetch from NSC/Parchment APIs
      const institutions = [
        'Harvard University',
        'MIT',
        'Stanford University',
        'UC Berkeley',
        'State University',
        'Tech Institute',
        'Community College Network'
      ];
      
      return institutions;
      
    } catch (error) {
      console.error('❌ Error fetching supported institutions:', error);
      return [];
    }
  }
  
  /**
   * Verify academic credential authenticity
   */
  async verifyCredential(commitment: string, metadata: any): Promise<{ verified: boolean; confidence: number; sources: string[] }> {
    try {
      // In production, this would cross-reference with multiple sources
      console.log('🔍 Verifying academic credential...');
      
      // Mock verification logic
      const verified = Math.random() > 0.1; // 90% verification rate for demo
      const confidence = verified ? 0.95 : 0.15;
      
      return {
        verified,
        confidence,
        sources: ['NSC', 'Parchment', 'Institution Direct']
      };
      
    } catch (error) {
      console.error('❌ Error verifying academic credential:', error);
      return {
        verified: false,
        confidence: 0,
        sources: []
      };
    }
  }
  
  /**
   * Get connection status for a DID
   */
  async getConnectionStatus(did: string): Promise<any> {
    try {
      const nscToken = await this.oauthService.getAccessToken(did, 'nsc');
      const parchmentToken = await this.oauthService.getAccessToken(did, 'parchment');
      
      return {
        did,
        connections: {
          nsc: {
            connected: !!nscToken,
            expiresAt: nscToken?.expiresAt,
            scope: nscToken?.scope
          },
          parchment: {
            connected: !!parchmentToken,
            expiresAt: parchmentToken?.expiresAt,
            scope: parchmentToken?.scope
          }
        },
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error getting connection status:', error);
      throw error;
    }
  }
}