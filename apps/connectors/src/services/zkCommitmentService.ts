import crypto from 'crypto';
// import { poseidon } from 'circomlib';
import { poseidon2 as poseidon } from 'poseidon-lite';
import { logger } from '../utils/logger';

export interface ZKCommitment {
  commitment: string;
  nullifier: string;
  metadata: {
    platform: string;
    timestamp: string;
    version: string;
  };
}

export interface SelectiveDisclosureProof {
  commitment: string;
  proof: any;
  disclosedFields: string[];
  hiddenFields: string[];
}

export class ZKCommitmentService {
  private readonly SALT_LENGTH = 32;
  private readonly VERSION = '1.0.0';

  /**
   * Generate a salt for commitment generation
   */
  private generateSalt(): string {
    return crypto.randomBytes(this.SALT_LENGTH).toString('hex');
  }

  /**
   * Create Poseidon hash of data
   */
  private async poseidonHash(data: any[]): Promise<string> {
    try {
      // Convert data to field elements
      const fieldElements = data.map(item => {
        if (typeof item === 'string') {
          // Hash string to get consistent field element
          return BigInt('0x' + crypto.createHash('sha256').update(item).digest('hex')) % BigInt(2 ** 253);
        } else if (typeof item === 'number') {
          return BigInt(item);
        } else if (typeof item === 'bigint') {
          return item;
        } else {
          // For complex objects, stringify and hash
          const str = JSON.stringify(item);
          return BigInt('0x' + crypto.createHash('sha256').update(str).digest('hex')) % BigInt(2 ** 253);
        }
      });

      // Use Poseidon hash function
      const hash = poseidon(fieldElements);
      return hash.toString(16);
    } catch (error) {
      logger.error('Poseidon hash error', { error });
      // Fallback to SHA256 if Poseidon fails
      const combinedData = data.map(d => JSON.stringify(d)).join('|');
      return crypto.createHash('sha256').update(combinedData).digest('hex');
    }
  }

  /**
   * Generate a ZK commitment for credential data
   */
  async generateCommitment(
    credentialData: any,
    salt?: string
  ): Promise<string> {
    try {
      const commitmentSalt = salt || this.generateSalt();
      
      // Flatten credential data
      const dataArray = this.flattenObject(credentialData);
      
      // Add salt to data
      dataArray.push(commitmentSalt);
      
      // Generate commitment
      const commitment = await this.poseidonHash(dataArray);
      
      logger.info('ZK commitment generated', {
        fieldCount: dataArray.length - 1,
        hasCustomSalt: !!salt
      });
      
      return commitment;
    } catch (error) {
      logger.error('Failed to generate commitment', { error });
      throw new Error('Failed to generate ZK commitment');
    }
  }

  /**
   * Create a platform-specific commitment with nullifier
   */
  async createPlatformCommitment(
    platform: string,
    credentialData: any
  ): Promise<ZKCommitment> {
    try {
      const salt = this.generateSalt();
      const commitment = await this.generateCommitment(credentialData, salt);
      
      // Generate nullifier (hash of platform + user ID + salt)
      const nullifierData = [
        platform,
        credentialData.id || credentialData.userId,
        salt
      ];
      const nullifier = await this.poseidonHash(nullifierData);
      
      const zkCommitment: ZKCommitment = {
        commitment,
        nullifier,
        metadata: {
          platform,
          timestamp: new Date().toISOString(),
          version: this.VERSION
        }
      };
      
      logger.info('Platform ZK commitment created', {
        platform,
        commitmentLength: commitment.length,
        nullifierLength: nullifier.length
      });
      
      return zkCommitment;
    } catch (error) {
      logger.error('Failed to create platform commitment', { error, platform });
      throw new Error('Failed to create platform ZK commitment');
    }
  }

  /**
   * Generate a selective disclosure proof
   */
  async generateSelectiveDisclosureProof(
    credentialData: any,
    disclosedFields: string[],
    commitment: string,
    salt: string
  ): Promise<SelectiveDisclosureProof> {
    try {
      const allFields = Object.keys(this.flattenObjectWithKeys(credentialData));
      const hiddenFields = allFields.filter(field => !disclosedFields.includes(field));
      
      // Create merkle tree of fields for selective disclosure
      const fieldCommitments = await Promise.all(
        allFields.map(async field => {
          const value = this.getFieldValue(credentialData, field);
          return this.poseidonHash([field, value, salt]);
        })
      );
      
      // Generate proof (simplified for demo)
      const proof = {
        fieldCommitments: fieldCommitments.filter((_, index) => 
          disclosedFields.includes(allFields[index])
        ),
        merkleRoot: await this.poseidonHash(fieldCommitments),
        salt: crypto.createHash('sha256').update(salt).digest('hex'), // Hash the salt for privacy
        timestamp: Date.now()
      };
      
      const sdProof: SelectiveDisclosureProof = {
        commitment,
        proof,
        disclosedFields,
        hiddenFields
      };
      
      logger.info('Selective disclosure proof generated', {
        totalFields: allFields.length,
        disclosedCount: disclosedFields.length,
        hiddenCount: hiddenFields.length
      });
      
      return sdProof;
    } catch (error) {
      logger.error('Failed to generate selective disclosure proof', { error });
      throw new Error('Failed to generate selective disclosure proof');
    }
  }

  /**
   * Verify a commitment matches the data
   */
  async verifyCommitment(
    credentialData: any,
    commitment: string,
    salt: string
  ): Promise<boolean> {
    try {
      const computedCommitment = await this.generateCommitment(credentialData, salt);
      return computedCommitment === commitment;
    } catch (error) {
      logger.error('Commitment verification failed', { error });
      return false;
    }
  }

  /**
   * Flatten an object to an array of values
   */
  private flattenObject(obj: any, prefix = ''): any[] {
    const result: any[] = [];
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
          result.push('');
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          result.push(...this.flattenObject(value, fullKey));
        } else if (Array.isArray(value)) {
          result.push(JSON.stringify(value));
        } else {
          result.push(value.toString());
        }
      }
    }
    
    return result;
  }

  /**
   * Flatten object with keys preserved
   */
  private flattenObjectWithKeys(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
          result[fullKey] = '';
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(result, this.flattenObjectWithKeys(value, fullKey));
        } else {
          result[fullKey] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Get a field value from nested object
   */
  private getFieldValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current[part] === undefined) {
        return '';
      }
      current = current[part];
    }
    
    return current;
  }
}