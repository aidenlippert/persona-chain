import { TestnetClient } from '../src/utils/testnet';

describe('API Integration Tests', () => {
  let client: TestnetClient;

  beforeAll(() => {
    client = new TestnetClient();
  });

  describe('Health and Status', () => {
    test('should get chain health status', async () => {
      const health = await client.getHealth();
      
      expect(health).toMatchObject({
        status: 'healthy',
        chain_id: 'persona-testnet-1',
        height: expect.any(Number),
        timestamp: expect.any(Number),
      });
      
      expect(health.height).toBeGreaterThan(0);
    });

    test('should get node status', async () => {
      const status = await client.getStatus();
      
      expect(status).toHaveProperty('jsonrpc', '2.0');
      expect(status).toHaveProperty('result');
      expect(status.result).toHaveProperty('node_info');
      expect(status.result).toHaveProperty('sync_info');
    });
  });

  describe('Account Management', () => {
    test('should get account balance', async () => {
      const balance = await client.getAccountBalance('cosmos1test1');
      
      expect(balance).toMatchObject({
        balances: expect.arrayContaining([
          expect.objectContaining({
            denom: 'stake',
            amount: expect.any(String),
          }),
        ]),
        pagination: expect.any(Object),
      });
    });
  });

  describe('DID Operations', () => {
    test('should list DID documents', async () => {
      const response = await client.listDIDs();
      
      expect(response).toMatchObject({
        did_documents: expect.any(Array),
        pagination: expect.any(Object),
      });

      if (response.did_documents.length > 0) {
        const did = response.did_documents[0];
        expect(did.id).toBeValidDID();
        expect(did).toHaveProperty('controller');
        expect(did).toHaveProperty('is_active');
      }
    });

    test('should get specific DID document', async () => {
      const didId = 'did:persona:123';
      const response = await client.getDID(didId);
      
      expect(response).toHaveProperty('did_document');
      expect(response.did_document.id).toBe(didId);
      expect(response.did_document).toMatchObject({
        controller: expect.any(String),
        created_at: expect.any(Number),
        updated_at: expect.any(Number),
        is_active: expect.any(Boolean),
      });
    });
  });

  describe('Zero-Knowledge Proofs', () => {
    test('should list ZK proofs', async () => {
      const response = await client.listZKProofs();
      
      expect(response).toMatchObject({
        zk_proofs: expect.any(Array),
        pagination: expect.any(Object),
      });

      if (response.zk_proofs.length > 0) {
        const proof = response.zk_proofs[0];
        expect(proof).toMatchObject({
          id: expect.any(String),
          circuit_id: expect.any(String),
          prover: expect.any(String),
          is_verified: expect.any(Boolean),
          created_at: expect.any(Number),
        });
      }
    });

    test('should list circuits', async () => {
      const response = await client.listCircuits();
      
      expect(response).toMatchObject({
        circuits: expect.any(Array),
        pagination: expect.any(Object),
      });

      if (response.circuits.length > 0) {
        const circuit = response.circuits[0];
        expect(circuit).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          creator: expect.any(String),
          is_active: expect.any(Boolean),
          created_at: expect.any(Number),
        });
      }
    });
  });

  describe('Verifiable Credentials', () => {
    test('should list VC records', async () => {
      const response = await client.listVCs();
      
      expect(response).toMatchObject({
        vc_records: expect.any(Array),
        pagination: expect.any(Object),
      });

      if (response.vc_records.length > 0) {
        const vc = response.vc_records[0];
        expect(vc).toMatchObject({
          id: expect.any(String),
          issuer_did: expect.any(String),
          subject_did: expect.any(String),
          issued_at: expect.any(Number),
          is_revoked: expect.any(Boolean),
        });
        
        expect(vc.issuer_did).toBeValidDID();
        expect(vc.subject_did).toBeValidDID();
      }
    });
  });

  describe('Transaction Broadcasting', () => {
    test('should broadcast transaction successfully', async () => {
      const mockTxData = {
        tx: {
          body: {
            messages: [
              {
                '@type': '/persona.did.v1.MsgCreateDid',
                creator: 'cosmos1test1',
                did_id: 'did:persona:test123',
                did_document: '{"id":"did:persona:test123"}',
              },
            ],
          },
        },
        mode: 'BROADCAST_MODE_BLOCK',
      };

      const response = await client.broadcastTx(mockTxData);
      
      expect(response).toMatchObject({
        txhash: expect.any(String),
        height: expect.any(Number),
        code: 0, // Success
        data: expect.any(String),
      });
      
      expect(response.txhash).toBeValidTxHash();
      expect(response.height).toBeGreaterThan(0);
    });
  });

  describe('Chain Progression', () => {
    test('should wait for chain height progression', async () => {
      const initialHealth = await client.getHealth();
      const initialHeight = initialHealth.height;
      
      // Wait for at least one block progression
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newHealth = await client.getHealth();
      expect(newHealth.height).toBeGreaterThanOrEqual(initialHeight);
    });
  });
});