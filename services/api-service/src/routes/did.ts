import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { CosmosClient } from '../services/cosmosClient';
import { VeramoAgent } from '../services/veramoAgent';
import { validateRequest } from '../middleware/validation';

export function didRoutes(cosmosClient: CosmosClient, veramoAgent: VeramoAgent) {
  const router = Router();

  // Schema validation
  const createDidSchema = Joi.object({
    method: Joi.string().valid('ethr', 'key', 'persona').default('persona'),
    keyType: Joi.string().valid('Ed25519', 'Secp256k1').default('Ed25519'),
    controller: Joi.string().optional(),
  });

  const updateDidSchema = Joi.object({
    didDocument: Joi.object().required(),
    controller: Joi.string().required(),
  });

  // Generate DID
  router.post('/generate', validateRequest(createDidSchema), async (req, res) => {
    try {
      const { method, keyType, controller } = req.body;
      
      // Generate DID using Veramo
      const did = await veramoAgent.generateDid(method, keyType);
      
      // If persona method, also create on-chain
      if (method === 'persona') {
        const didId = `did:persona:${uuidv4()}`;
        const didDocument = {
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: didId,
          controller: controller || did.controller,
          verificationMethod: did.verificationMethod,
          authentication: [did.verificationMethod[0].id],
          assertionMethod: [did.verificationMethod[0].id],
          keyAgreement: [did.verificationMethod[0].id],
        };

        // Submit to blockchain
        const txResult = await cosmosClient.createDid(
          didId,
          JSON.stringify(didDocument),
          controller || did.controller
        );

        res.json({
          success: true,
          data: {
            did: didId,
            didDocument,
            txHash: txResult.transactionHash,
            keys: did.keys,
          },
        });
      } else {
        res.json({
          success: true,
          data: did,
        });
      }
    } catch (error) {
      console.error('Error generating DID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate DID',
        details: error.message,
      });
    }
  });

  // Get DID document
  router.get('/:didId', async (req, res) => {
    try {
      const { didId } = req.params;
      
      if (didId.startsWith('did:persona:')) {
        // Query from blockchain
        const didDocument = await cosmosClient.getDidDocument(didId);
        res.json({
          success: true,
          data: didDocument,
        });
      } else {
        // Resolve using Veramo
        const didDocument = await veramoAgent.resolveDid(didId);
        res.json({
          success: true,
          data: didDocument,
        });
      }
    } catch (error) {
      console.error('Error getting DID:', error);
      res.status(404).json({
        success: false,
        error: 'DID not found',
        details: error.message,
      });
    }
  });

  // Update DID document
  router.put('/:didId', validateRequest(updateDidSchema), async (req, res) => {
    try {
      const { didId } = req.params;
      const { didDocument, controller } = req.body;

      if (!didId.startsWith('did:persona:')) {
        return res.status(400).json({
          success: false,
          error: 'Only persona DIDs can be updated on-chain',
        });
      }

      const txResult = await cosmosClient.updateDid(
        didId,
        JSON.stringify(didDocument),
        controller
      );

      res.json({
        success: true,
        data: {
          did: didId,
          txHash: txResult.transactionHash,
        },
      });
    } catch (error) {
      console.error('Error updating DID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update DID',
        details: error.message,
      });
    }
  });

  // Deactivate DID
  router.delete('/:didId', async (req, res) => {
    try {
      const { didId } = req.params;
      const { controller } = req.body;

      if (!didId.startsWith('did:persona:')) {
        return res.status(400).json({
          success: false,
          error: 'Only persona DIDs can be deactivated on-chain',
        });
      }

      const txResult = await cosmosClient.deactivateDid(didId, controller);

      res.json({
        success: true,
        data: {
          did: didId,
          txHash: txResult.transactionHash,
        },
      });
    } catch (error) {
      console.error('Error deactivating DID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate DID',
        details: error.message,
      });
    }
  });

  // List all DIDs
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const dids = await cosmosClient.getAllDids(
        Number(page),
        Number(limit)
      );

      res.json({
        success: true,
        data: dids,
      });
    } catch (error) {
      console.error('Error listing DIDs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list DIDs',
        details: error.message,
      });
    }
  });

  return router;
}