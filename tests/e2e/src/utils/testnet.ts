import axios, { AxiosResponse } from 'axios';

export interface ChainStatus {
  status: string;
  chain_id: string;
  height: number;
  timestamp: number;
}

export interface MockTxResponse {
  txhash: string;
  height: number;
  code: number;
  data: string;
}

export interface DIDDocument {
  id: string;
  controller: string;
  created_at: number;
  updated_at: number;
  is_active: boolean;
}

export interface ZKProof {
  id: string;
  circuit_id: string;
  prover: string;
  is_verified: boolean;
  created_at: number;
}

export interface VCRecord {
  id: string;
  issuer_did: string;
  subject_did: string;
  issued_at: number;
  is_revoked: boolean;
}

export class TestnetClient {
  private baseURL: string;

  constructor(baseURL = 'http://localhost:1317') {
    this.baseURL = baseURL;
  }

  async getHealth(): Promise<ChainStatus> {
    const response: AxiosResponse<ChainStatus> = await axios.get(`${this.baseURL}/health`);
    return response.data;
  }

  async getStatus(): Promise<any> {
    const response = await axios.get(`${this.baseURL}/status`);
    return response.data;
  }

  async broadcastTx(txData: any): Promise<MockTxResponse> {
    const response: AxiosResponse<MockTxResponse> = await axios.post(
      `${this.baseURL}/cosmos/tx/v1beta1/txs`,
      txData
    );
    return response.data;
  }

  async getAccountBalance(address: string): Promise<any> {
    const response = await axios.get(`${this.baseURL}/cosmos/bank/v1beta1/balances/${address}`);
    return response.data;
  }

  async listDIDs(): Promise<{ did_documents: DIDDocument[]; pagination: any }> {
    const response = await axios.get(`${this.baseURL}/persona/did/v1beta1/did_documents`);
    return response.data;
  }

  async getDID(id: string): Promise<{ did_document: DIDDocument }> {
    const response = await axios.get(`${this.baseURL}/persona/did/v1beta1/did_documents/${id}`);
    return response.data;
  }

  async listZKProofs(): Promise<{ zk_proofs: ZKProof[]; pagination: any }> {
    const response = await axios.get(`${this.baseURL}/persona/zk/v1beta1/proofs`);
    return response.data;
  }

  async listCircuits(): Promise<{ circuits: any[]; pagination: any }> {
    const response = await axios.get(`${this.baseURL}/persona/zk/v1beta1/circuits`);
    return response.data;
  }

  async listVCs(): Promise<{ vc_records: VCRecord[]; pagination: any }> {
    const response = await axios.get(`${this.baseURL}/persona/vc/v1beta1/credentials`);
    return response.data;
  }

  async waitForHeight(targetHeight: number, timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getHealth();
      if (status.height >= targetHeight) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Timeout waiting for height ${targetHeight}`);
  }

  async waitForTx(txHash: string, timeoutMs = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // In a real implementation, this would query for the tx
        // For our mock, we just simulate successful inclusion
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error(`Timeout waiting for transaction ${txHash}`);
  }
}