import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple in-memory storage for demo
const storage = {
  dids: [] as any[],
  credentials: [] as any[],
  proofs: [] as any[]
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Create DID endpoint
app.post('/api/createDid', (req, res) => {
  try {
    const { method, publicKey, service } = req.body;
    
    const did = {
      id: `did:${method || 'persona'}:${uuidv4()}`,
      method: method || 'persona',
      publicKey,
      service,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    storage.dids.push(did);
    
    res.json({
      success: true,
      did: did.id,
      transaction: {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        block: Math.floor(Math.random() * 1000) + 1000
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Issue VC endpoint
app.post('/api/issueVc', (req, res) => {
  try {
    const { issuer, subject, credentialType, claims } = req.body;
    
    const credential = {
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', credentialType || 'PersonaCredential'],
      issuer,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subject,
        ...claims
      },
      proof: {
        type: 'Ed25519Signature2018',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: `${issuer}#key-1`,
        jws: `mock.signature.${Math.random().toString(36)}`
      }
    };
    
    storage.credentials.push(credential);
    
    res.json({
      success: true,
      credential,
      transaction: {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        block: Math.floor(Math.random() * 1000) + 1000
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Submit ZK Proof endpoint
app.post('/api/submitProof', (req, res) => {
  try {
    const { proof, publicInputs, verificationKey, credentialId } = req.body;
    
    const zkProof = {
      id: uuidv4(),
      proof,
      publicInputs,
      verificationKey,
      credentialId,
      verified: true, // Mock verification
      timestamp: new Date().toISOString()
    };
    
    storage.proofs.push(zkProof);
    
    res.json({
      success: true,
      proofId: zkProof.id,
      verified: true,
      transaction: {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        block: Math.floor(Math.random() * 1000) + 1000
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get storage status
app.get('/api/status', (req, res) => {
  res.json({
    dids: storage.dids.length,
    credentials: storage.credentials.length,
    proofs: storage.proofs.length,
    uptime: process.uptime()
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Persona Chain API service running on port ${port}`);
  console.log(`📡 Blockchain endpoints available`);
});

export default app;