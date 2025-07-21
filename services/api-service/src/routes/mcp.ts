import { Router } from 'express';
import { CosmosClient } from '../services/cosmosClient';
import { VeramoAgent } from '../services/veramoAgent';

export function mcpRoutes(cosmosClient: CosmosClient, veramoAgent: VeramoAgent) {
  const router = Router();

  // MCP-compatible tool: Generate DID
  router.post('/tools/generate-did', async (req, res) => {
    try {
      const { method = 'persona', keyType = 'Ed25519', controller } = req.body;
      
      const result = await veramoAgent.generateDid(method, keyType);
      
      if (method === 'persona') {
        const didDocument = {
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: result.did,
          controller: controller || result.controller,
          verificationMethod: result.verificationMethod,
          authentication: [result.verificationMethod[0].id],
          assertionMethod: [result.verificationMethod[0].id],
          keyAgreement: [result.verificationMethod[0].id],
        };

        const txResult = await cosmosClient.createDid(
          result.did,
          JSON.stringify(didDocument),
          controller || result.controller
        );

        return res.json({
          success: true,
          result: {
            did: result.did,
            didDocument,
            txHash: txResult.transactionHash,
            keys: result.keys,
          },
        });
      }

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // MCP-compatible tool: Issue VC
  router.post('/tools/issue-vc', async (req, res) => {
    try {
      const {
        issuerDid,
        subjectDid,
        credentialSubject,
        credentialSchema,
        expirationDate,
      } = req.body;

      const vc = await veramoAgent.issueCredential({
        issuer: issuerDid,
        subject: subjectDid,
        credentialSubject,
        credentialSchema,
        expirationDate,
      });

      // Submit to blockchain
      const vcId = `vc:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      const txResult = await cosmosClient.issueVc(
        vcId,
        issuerDid,
        subjectDid,
        credentialSchema || 'https://schema.org/Person',
        JSON.stringify(credentialSubject),
        JSON.stringify(vc.proof),
        new Date(expirationDate || Date.now() + 365 * 24 * 60 * 60 * 1000).getTime() / 1000
      );

      res.json({
        success: true,
        result: {
          vcId,
          credential: vc,
          txHash: txResult.transactionHash,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // MCP-compatible tool: Compile circuit
  router.post('/tools/compile-circuit', async (req, res) => {
    try {
      const { circuitCode, circuitName, description } = req.body;
      
      // Simulate circuit compilation
      // In a real implementation, this would compile the circuit to WASM
      const compiledCircuit = {
        id: `circuit:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
        name: circuitName,
        description,
        wasmCode: Buffer.from(circuitCode).toString('base64'), // Simulate WASM
        verificationKey: `vk_${Math.random().toString(36).substr(2, 16)}`,
      };

      // Register circuit on blockchain
      const txResult = await cosmosClient.registerCircuit(
        compiledCircuit.id,
        compiledCircuit.name,
        compiledCircuit.description,
        compiledCircuit.wasmCode,
        compiledCircuit.verificationKey
      );

      res.json({
        success: true,
        result: {
          ...compiledCircuit,
          txHash: txResult.transactionHash,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // MCP-compatible tool: Submit ZK proof
  router.post('/tools/submit-proof', async (req, res) => {
    try {
      const { circuitId, publicInputs, proofData } = req.body;
      
      const proofId = `proof:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      
      const txResult = await cosmosClient.submitProof(
        proofId,
        circuitId,
        JSON.stringify(publicInputs),
        proofData
      );

      res.json({
        success: true,
        result: {
          proofId,
          verified: txResult.verified || false,
          txHash: txResult.transactionHash,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // MCP-compatible tool: Add guardian
  router.post('/tools/add-guardian', async (req, res) => {
    try {
      const { didId, guardianAddress, publicKey, controller } = req.body;
      
      const txResult = await cosmosClient.addGuardian(
        didId,
        guardianAddress,
        publicKey,
        controller
      );

      res.json({
        success: true,
        result: {
          didId,
          guardianAddress,
          txHash: txResult.transactionHash,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // MCP tool metadata
  router.get('/tools/manifest', (req, res) => {
    res.json({
      tools: [
        {
          name: 'generate-did',
          description: 'Generate a new DID with optional on-chain registration',
          parameters: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                enum: ['ethr', 'key', 'persona'],
                default: 'persona',
                description: 'DID method to use',
              },
              keyType: {
                type: 'string',
                enum: ['Ed25519', 'Secp256k1'],
                default: 'Ed25519',
                description: 'Key type for the DID',
              },
              controller: {
                type: 'string',
                description: 'Optional controller address',
              },
            },
          },
        },
        {
          name: 'issue-vc',
          description: 'Issue a verifiable credential',
          parameters: {
            type: 'object',
            required: ['issuerDid', 'subjectDid', 'credentialSubject'],
            properties: {
              issuerDid: {
                type: 'string',
                description: 'DID of the credential issuer',
              },
              subjectDid: {
                type: 'string',
                description: 'DID of the credential subject',
              },
              credentialSubject: {
                type: 'object',
                description: 'Credential subject data',
              },
              credentialSchema: {
                type: 'string',
                description: 'Schema URI for the credential',
              },
              expirationDate: {
                type: 'string',
                format: 'date-time',
                description: 'Credential expiration date',
              },
            },
          },
        },
        {
          name: 'compile-circuit',
          description: 'Compile a zero-knowledge circuit',
          parameters: {
            type: 'object',
            required: ['circuitCode', 'circuitName'],
            properties: {
              circuitCode: {
                type: 'string',
                description: 'Circuit source code',
              },
              circuitName: {
                type: 'string',
                description: 'Name of the circuit',
              },
              description: {
                type: 'string',
                description: 'Circuit description',
              },
            },
          },
        },
        {
          name: 'submit-proof',
          description: 'Submit a zero-knowledge proof for verification',
          parameters: {
            type: 'object',
            required: ['circuitId', 'publicInputs', 'proofData'],
            properties: {
              circuitId: {
                type: 'string',
                description: 'ID of the circuit to verify against',
              },
              publicInputs: {
                type: 'array',
                description: 'Public inputs for the proof',
              },
              proofData: {
                type: 'string',
                description: 'Proof data in base64 format',
              },
            },
          },
        },
        {
          name: 'add-guardian',
          description: 'Add a guardian to a DID for recovery purposes',
          parameters: {
            type: 'object',
            required: ['didId', 'guardianAddress', 'publicKey', 'controller'],
            properties: {
              didId: {
                type: 'string',
                description: 'DID to add guardian to',
              },
              guardianAddress: {
                type: 'string',
                description: 'Guardian wallet address',
              },
              publicKey: {
                type: 'string',
                description: 'Guardian public key',
              },
              controller: {
                type: 'string',
                description: 'Current DID controller address',
              },
            },
          },
        },
      ],
    });
  });

  return router;
}