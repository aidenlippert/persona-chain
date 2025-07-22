import express from 'express';
import { Request, Response } from 'express';
import crypto from 'crypto';

const router = express.Router();

// In-memory storage for DIDs (in production this would be a database)
const didStorage = new Map<string, any>();
const didByController = new Map<string, string>();

/**
 * PersonaChain DID v1 API Routes
 * Implements the exact endpoints the frontend expects
 */

// GET /persona_chain/did/v1/params
router.get('/params', (req: Request, res: Response) => {
  console.log('[DID-API] Getting DID module parameters');
  
  res.json({
    params: {
      allowed_namespaces: ["persona", "key"],
      fee: {
        amount: "1000",
        denom: "upersona"
      },
      supported_methods: ["persona", "key"]
    }
  });
});

// GET /persona_chain/did/v1/did-by-controller/{controller}
router.get('/did-by-controller/:controller', (req: Request, res: Response) => {
  const controller = req.params.controller;
  console.log(`[DID-API] Looking up DID for controller: ${controller}`);
  
  const didId = didByController.get(controller);
  
  if (didId) {
    const didDocument = didStorage.get(didId);
    if (didDocument) {
      console.log(`[DID-API] Found DID: ${didId}`);
      res.json({
        didDocument,
        found: true
      });
      return;
    }
  }
  
  console.log(`[DID-API] No DID found for controller: ${controller}`);
  res.json({
    didDocument: null,
    found: false
  });
});

// GET /persona_chain/did/v1/did_document/{id}
router.get('/did_document/:id', (req: Request, res: Response) => {
  const didId = req.params.id;
  console.log(`[DID-API] Looking up DID document: ${didId}`);
  
  const didDocument = didStorage.get(didId);
  
  if (didDocument) {
    console.log(`[DID-API] Found DID document: ${didId}`);
    res.json({
      didDocument
    });
  } else {
    console.log(`[DID-API] DID document not found: ${didId}`);
    res.status(404).json({
      error: "DID document not found",
      code: "DID_NOT_FOUND"
    });
  }
});

// GET /persona_chain/did/v1/did_document (list all)
router.get('/did_document', (req: Request, res: Response) => {
  console.log('[DID-API] Listing all DID documents');
  
  const allDids = Array.from(didStorage.values());
  
  res.json({
    didDocument: allDids,
    pagination: {
      next_key: null,
      total: allDids.length.toString()
    }
  });
});

// POST /persona_chain/did/v1/create
router.post('/create', (req: Request, res: Response) => {
  try {
    console.log('[DID-API] Creating new DID');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { id, document, creator, context } = req.body;
    
    if (!id) {
      return res.status(400).json({
        error: "DID ID is required",
        code: "MISSING_DID_ID"
      });
    }
    
    // Check if DID already exists
    if (didStorage.has(id)) {
      console.log(`[DID-API] DID already exists: ${id}`);
      return res.status(409).json({
        error: "DID already exists",
        code: "DID_EXISTS"
      });
    }
    
    // Create DID document
    const didDocument = {
      "@context": context || ["https://www.w3.org/ns/did/v1"],
      id: id,
      controller: creator,
      verificationMethod: [{
        id: `${id}#keys-1`,
        type: "Ed25519VerificationKey2020",
        controller: id,
        publicKeyMultibase: `z${Math.random().toString(36).substring(2, 48)}`
      }],
      authentication: [`${id}#keys-1`],
      assertionMethod: [`${id}#keys-1`],
      capabilityInvocation: [`${id}#keys-1`],
      capabilityDelegation: [`${id}#keys-1`],
      service: [],
      ...document
    };
    
    // Generate transaction hash
    const txHash = `TX_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    
    // Store DID
    didStorage.set(id, didDocument);
    if (creator) {
      didByController.set(creator, id);
    }
    
    console.log(`[DID-API] Successfully created DID: ${id}`);
    console.log(`[DID-API] Transaction hash: ${txHash}`);
    
    res.json({
      success: true,
      txhash: txHash,
      tx_response: {
        txhash: txHash,
        code: 0,
        height: Math.floor(Math.random() * 1000000),
        gas_used: "85432",
        gas_wanted: "100000"
      },
      did: id,
      didDocument
    });
    
  } catch (error) {
    console.error('[DID-API] Error creating DID:', error);
    res.status(500).json({
      error: "Failed to create DID",
      code: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /persona_chain/did/v1/update
router.post('/update', (req: Request, res: Response) => {
  try {
    console.log('[DID-API] Updating DID');
    
    const { id, document, creator } = req.body;
    
    if (!id) {
      return res.status(400).json({
        error: "DID ID is required",
        code: "MISSING_DID_ID"
      });
    }
    
    const existingDocument = didStorage.get(id);
    if (!existingDocument) {
      console.log(`[DID-API] DID not found for update: ${id}`);
      return res.status(404).json({
        error: "DID not found",
        code: "DID_NOT_FOUND"
      });
    }
    
    // Update DID document
    const updatedDocument = {
      ...existingDocument,
      ...document,
      updated: new Date().toISOString()
    };
    
    const txHash = `TX_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    
    // Store updated DID
    didStorage.set(id, updatedDocument);
    
    console.log(`[DID-API] Successfully updated DID: ${id}`);
    
    res.json({
      success: true,
      txhash: txHash,
      tx_response: {
        txhash: txHash,
        code: 0,
        height: Math.floor(Math.random() * 1000000)
      },
      did: id,
      didDocument: updatedDocument
    });
    
  } catch (error) {
    console.error('[DID-API] Error updating DID:', error);
    res.status(500).json({
      error: "Failed to update DID",
      code: "INTERNAL_ERROR"
    });
  }
});

// DELETE /persona_chain/did/v1/deactivate
router.post('/deactivate', (req: Request, res: Response) => {
  try {
    console.log('[DID-API] Deactivating DID');
    
    const { id, creator } = req.body;
    
    if (!id) {
      return res.status(400).json({
        error: "DID ID is required",
        code: "MISSING_DID_ID"
      });
    }
    
    const existingDocument = didStorage.get(id);
    if (!existingDocument) {
      return res.status(404).json({
        error: "DID not found",
        code: "DID_NOT_FOUND"
      });
    }
    
    // Mark as deactivated
    const deactivatedDocument = {
      ...existingDocument,
      deactivated: true,
      updated: new Date().toISOString()
    };
    
    const txHash = `TX_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    
    didStorage.set(id, deactivatedDocument);
    
    console.log(`[DID-API] Successfully deactivated DID: ${id}`);
    
    res.json({
      success: true,
      txhash: txHash,
      tx_response: {
        txhash: txHash,
        code: 0,
        height: Math.floor(Math.random() * 1000000)
      }
    });
    
  } catch (error) {
    console.error('[DID-API] Error deactivating DID:', error);
    res.status(500).json({
      error: "Failed to deactivate DID",
      code: "INTERNAL_ERROR"
    });
  }
});

// POST /persona_chain/did/v1/verify-ownership
router.post('/verify-ownership', (req: Request, res: Response) => {
  try {
    console.log('[DID-VERIFY] Verifying ownership:', req.body);
    const { did, signature, challenge } = req.body;
    
    if (!did || !signature || !challenge) {
      return res.status(400).json({ 
        error: 'DID, signature, and challenge are required',
        valid: false 
      });
    }
    
    // Mock verification logic - in production this would verify the cryptographic signature
    const isValid = did.startsWith('did:') && signature && challenge;
    
    console.log(`[DID-VERIFY] Ownership verification result for ${did}: ${isValid}`);
    
    res.json({
      valid: isValid,
      did,
      timestamp: new Date().toISOString(),
      method: 'mock_verification'
    });
    
  } catch (error) {
    console.error('[DID-VERIFY] Error verifying ownership:', error);
    res.status(500).json({
      valid: false,
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'PersonaChain DID API v1',
    timestamp: new Date().toISOString(),
    didCount: didStorage.size
  });
});

export default router;