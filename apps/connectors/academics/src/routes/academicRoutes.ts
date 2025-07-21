import { Router } from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/validation';
import { AcademicService } from '../services/AcademicService';
import { CommitmentService } from '../services/CommitmentService';

const router = Router();
const academicService = new AcademicService();
const commitmentService = new CommitmentService();

// Validation schemas
const getCredentialsSchema = Joi.object({
  did: Joi.string().required().pattern(/^did:persona:[a-zA-Z0-9-]+$/),
  includeTranscripts: Joi.boolean().default(false),
  includeDegrees: Joi.boolean().default(true),
  includeGPA: Joi.boolean().default(true)
});

/**
 * GET /api/academics/credentials
 * Fetch academic credentials for a given DID
 */
router.get('/credentials', validateRequest(getCredentialsSchema, 'query'), async (req, res) => {
  try {
    const { did, includeTranscripts, includeDegrees, includeGPA } = req.query;
    
    console.log(`🔍 Fetching academic credentials for DID: ${did}`);
    
    // Check if user has authorized academic data access
    const authStatus = await academicService.checkAuthorizationStatus(did as string);
    if (!authStatus.authorized) {
      return res.status(401).json({
        success: false,
        error: 'Academic data access not authorized',
        authUrl: authStatus.authUrl
      });
    }
    
    const credentials: any = {
      degreeIds: [],
      gpaCommitments: [],
      transcriptCommitments: [],
      certificationCommitments: []
    };
    
    // Fetch degree data from National Student Clearinghouse
    if (includeDegrees) {
      console.log('📜 Fetching degree data from NSC...');
      const degrees = await academicService.fetchDegreesFromNSC(did as string);
      
      for (const degree of degrees) {
        const commitment = commitmentService.createCommitment({
          type: 'degree',
          institution: degree.institution,
          degreeType: degree.degreeType,
          major: degree.major,
          graduationDate: degree.graduationDate,
          verified: degree.verified
        });
        
        credentials.degreeIds.push({
          id: degree.id,
          commitment: commitment.hash,
          publicInput: commitment.publicInput,
          metadata: {
            institution: degree.institution,
            degreeType: degree.degreeType,
            graduationYear: degree.graduationDate.split('-')[0],
            verified: degree.verified
          }
        });
      }
    }
    
    // Fetch GPA data from Parchment
    if (includeGPA) {
      console.log('📊 Fetching GPA data from Parchment...');
      const gpaData = await academicService.fetchGPAFromParchment(did as string);
      
      for (const gpa of gpaData) {
        const commitment = commitmentService.createCommitment({
          type: 'gpa',
          value: gpa.value,
          scale: gpa.scale,
          institution: gpa.institution,
          semester: gpa.semester,
          verified: gpa.verified
        });
        
        credentials.gpaCommitments.push({
          id: gpa.id,
          commitment: commitment.hash,
          publicInput: commitment.publicInput,
          metadata: {
            scale: gpa.scale,
            institution: gpa.institution,
            semester: gpa.semester,
            verified: gpa.verified
          }
        });
      }
    }
    
    // Fetch transcript data (if requested)
    if (includeTranscripts) {
      console.log('📋 Fetching transcript data...');
      const transcripts = await academicService.fetchTranscriptsFromNSC(did as string);
      
      for (const transcript of transcripts) {
        const commitment = commitmentService.createCommitment({
          type: 'transcript',
          courses: transcript.courses,
          creditHours: transcript.totalCreditHours,
          institution: transcript.institution,
          verified: transcript.verified
        });
        
        credentials.transcriptCommitments.push({
          id: transcript.id,
          commitment: commitment.hash,
          publicInput: commitment.publicInput,
          metadata: {
            institution: transcript.institution,
            totalCreditHours: transcript.totalCreditHours,
            courseCount: transcript.courses.length,
            verified: transcript.verified
          }
        });
      }
    }
    
    // Log success metrics
    console.log(`✅ Academic credentials fetched successfully:`, {
      did,
      degrees: credentials.degreeIds.length,
      gpaRecords: credentials.gpaCommitments.length,
      transcripts: credentials.transcriptCommitments.length
    });
    
    res.json({
      success: true,
      data: credentials,
      metadata: {
        did,
        fetchedAt: new Date().toISOString(),
        sources: {
          nsc: includeDegrees || includeTranscripts,
          parchment: includeGPA
        },
        totalCommitments: 
          credentials.degreeIds.length + 
          credentials.gpaCommitments.length + 
          credentials.transcriptCommitments.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching academic credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch academic credentials',
      details: error.message
    });
  }
});

/**
 * GET /api/academics/institutions
 * Get list of supported institutions
 */
router.get('/institutions', async (req, res) => {
  try {
    const institutions = await academicService.getSupportedInstitutions();
    
    res.json({
      success: true,
      data: {
        institutions: institutions,
        count: institutions.length,
        supportedAPIs: ['NSC', 'Parchment']
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching institutions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supported institutions'
    });
  }
});

/**
 * POST /api/academics/verify
 * Verify academic credential authenticity
 */
router.post('/verify', async (req, res) => {
  try {
    const { commitment, metadata } = req.body;
    
    if (!commitment || !metadata) {
      return res.status(400).json({
        success: false,
        error: 'Missing commitment or metadata'
      });
    }
    
    const verification = await academicService.verifyCredential(commitment, metadata);
    
    res.json({
      success: true,
      data: {
        verified: verification.verified,
        confidence: verification.confidence,
        sources: verification.sources,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error verifying academic credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify academic credential'
    });
  }
});

/**
 * GET /api/academics/status/:did
 * Check authorization and connection status for a DID
 */
router.get('/status/:did', async (req, res) => {
  try {
    const { did } = req.params;
    
    const status = await academicService.getConnectionStatus(did);
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ Error checking academic status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check academic connection status'
    });
  }
});

export { router as academicRoutes };