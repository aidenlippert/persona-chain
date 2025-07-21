import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { createHash } from 'crypto';
import { z } from 'zod';
import {
  QRShareData,
  QRShareDataSchema,
  ProofShareRequest,
  ProofShareResponse,
  ValidationError,
} from '../types/sharing.js';

export interface QRCodeServiceConfig {
  baseUrl: string;
  maxDataSize: number; // bytes
  compressionLevel: number; // 0-9
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  enableSigning: boolean;
  signingKey?: string;
}

export interface QRGenerationOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  format?: 'png' | 'svg' | 'utf8';
}

export class QRCodeService {
  private config: QRCodeServiceConfig;

  constructor(config: Partial<QRCodeServiceConfig> = {}) {
    this.config = {
      baseUrl: process.env.SHARING_PROTOCOL_BASE_URL || 'https://share.personapass.dev',
      maxDataSize: 2048, // 2KB max for QR compatibility
      compressionLevel: 6,
      errorCorrectionLevel: 'M', // Medium error correction
      enableSigning: process.env.NODE_ENV === 'production',
      ...config,
    };

    console.log('📱 PersonaPass QR Code Service initialized');
    console.log(`   Base URL: ${this.config.baseUrl}`);
    console.log(`   Max data size: ${this.config.maxDataSize} bytes`);
  }

  /**
   * Generate QR code for a proof share request
   */
  async generateRequestQR(
    request: ProofShareRequest,
    sessionId: string,
    options: QRGenerationOptions = {}
  ): Promise<{
    qrCode: string;
    url: string;
    data: QRShareData;
    size: number;
  }> {
    // Create QR data structure
    const qrData: QRShareData = {
      version: '1.0',
      type: 'request',
      data: request,
      checksum: this.generateChecksum(JSON.stringify(request)),
    };

    // Add signature if enabled
    if (this.config.enableSigning && this.config.signingKey) {
      qrData.signature = this.signData(qrData.data, this.config.signingKey);
    }

    // Validate data size
    const dataStr = JSON.stringify(qrData);
    if (dataStr.length > this.config.maxDataSize) {
      // Use session reference for large data
      return this.generateSessionReferenceQR(sessionId, 'request', options);
    }

    // Generate QR code
    const qrCode = await this.generateQRCode(dataStr, options);
    const url = this.buildSharingUrl(sessionId, 'request');

    console.log(`📱 Generated request QR code for session ${sessionId}`);
    console.log(`   Data size: ${dataStr.length} bytes`);
    console.log(`   URL: ${url}`);

    return {
      qrCode,
      url,
      data: qrData,
      size: dataStr.length,
    };
  }

  /**
   * Generate QR code for a proof share response
   */
  async generateResponseQR(
    response: ProofShareResponse,
    sessionId: string,
    options: QRGenerationOptions = {}
  ): Promise<{
    qrCode: string;
    url: string;
    data: QRShareData;
    size: number;
  }> {
    // Create QR data structure
    const qrData: QRShareData = {
      version: '1.0',
      type: 'response',
      data: response,
      checksum: this.generateChecksum(JSON.stringify(response)),
    };

    // Add signature if enabled
    if (this.config.enableSigning && this.config.signingKey) {
      qrData.signature = this.signData(qrData.data, this.config.signingKey);
    }

    // Validate data size - responses are usually larger, so prefer session reference
    const dataStr = JSON.stringify(qrData);
    if (dataStr.length > this.config.maxDataSize) {
      return this.generateSessionReferenceQR(sessionId, 'response', options);
    }

    // Generate QR code
    const qrCode = await this.generateQRCode(dataStr, options);
    const url = this.buildSharingUrl(sessionId, 'response');

    console.log(`📱 Generated response QR code for session ${sessionId}`);
    console.log(`   Data size: ${dataStr.length} bytes`);

    return {
      qrCode,
      url,
      data: qrData,
      size: dataStr.length,
    };
  }

  /**
   * Generate session reference QR code (for large data)
   */
  async generateSessionReferenceQR(
    sessionId: string,
    type: 'request' | 'response' | 'invitation',
    options: QRGenerationOptions = {}
  ): Promise<{
    qrCode: string;
    url: string;
    data: QRShareData;
    size: number;
  }> {
    const url = this.buildSharingUrl(sessionId, type);
    
    const qrData: QRShareData = {
      version: '1.0',
      type: 'invitation',
      data: {
        sessionId,
        endpoint: `${this.config.baseUrl}/api/sessions/${sessionId}`,
        publicKey: this.config.signingKey ? this.getPublicKey() : undefined,
      },
      checksum: this.generateChecksum(sessionId),
    };

    const dataStr = JSON.stringify(qrData);
    const qrCode = await this.generateQRCode(dataStr, options);

    console.log(`📱 Generated session reference QR for ${sessionId}`);
    console.log(`   Type: ${type}, URL: ${url}`);

    return {
      qrCode,
      url,
      data: qrData,
      size: dataStr.length,
    };
  }

  /**
   * Parse and validate QR code data
   */
  async parseQRCode(imageData: Uint8ClampedArray, width: number, height: number): Promise<QRShareData> {
    try {
      // Decode QR code
      const code = jsQR(imageData, width, height);
      if (!code) {
        throw new ValidationError('No QR code found in image');
      }

      // Parse JSON data
      let qrData: unknown;
      try {
        qrData = JSON.parse(code.data);
      } catch (error) {
        throw new ValidationError('Invalid JSON in QR code');
      }

      // Validate schema
      const validatedData = QRShareDataSchema.parse(qrData);

      // Verify checksum
      if (!this.verifyChecksum(validatedData)) {
        throw new ValidationError('QR code checksum verification failed');
      }

      // Verify signature if present
      if (validatedData.signature && this.config.enableSigning) {
        if (!this.verifySignature(validatedData.data, validatedData.signature)) {
          throw new ValidationError('QR code signature verification failed');
        }
      }

      console.log(`📱 Successfully parsed QR code: ${validatedData.type}`);
      return validatedData;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Failed to parse QR code',
        { originalError: error.message }
      );
    }
  }

  /**
   * Parse QR code from data URL (base64 image)
   */
  async parseQRFromDataURL(dataUrl: string): Promise<QRShareData> {
    // Extract base64 data
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) {
      throw new ValidationError('Invalid data URL format');
    }

    // This is a simplified implementation
    // In a real implementation, you'd need to decode the image and extract pixel data
    throw new ValidationError('Data URL parsing not implemented - use canvas or image processing library');
  }

  /**
   * Generate sharing URL for web-based sharing
   */
  buildSharingUrl(sessionId: string, type: 'request' | 'response' | 'invitation'): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    return `${baseUrl}/share/${type}/${sessionId}`;
  }

  /**
   * Generate QR code image
   */
  private async generateQRCode(data: string, options: QRGenerationOptions = {}): Promise<string> {
    const qrOptions = {
      width: options.width || 256,
      margin: options.margin || 4,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: this.config.errorCorrectionLevel,
    };

    switch (options.format || 'png') {
      case 'png':
        return await QRCode.toDataURL(data, qrOptions);
      case 'svg':
        return await QRCode.toString(data, { ...qrOptions, type: 'svg' });
      case 'utf8':
        return await QRCode.toString(data, { ...qrOptions, type: 'utf8' });
      default:
        throw new ValidationError(`Unsupported QR format: ${options.format}`);
    }
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: string): string {
    return createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Verify checksum
   */
  private verifyChecksum(qrData: QRShareData): boolean {
    const expectedChecksum = this.generateChecksum(JSON.stringify(qrData.data));
    return qrData.checksum === expectedChecksum;
  }

  /**
   * Sign data (simplified implementation)
   */
  private signData(data: any, key: string): string {
    // In production, use proper cryptographic signing
    const dataStr = JSON.stringify(data);
    return createHash('sha256')
      .update(dataStr + key)
      .digest('hex');
  }

  /**
   * Verify signature (simplified implementation)
   */
  private verifySignature(data: any, signature: string): boolean {
    if (!this.config.signingKey) return false;
    const expectedSignature = this.signData(data, this.config.signingKey);
    return signature === expectedSignature;
  }

  /**
   * Get public key for verification (placeholder)
   */
  private getPublicKey(): string {
    // In production, derive from private key
    return 'pubkey_placeholder';
  }

  /**
   * Get service statistics
   */
  getStats(): {
    config: Omit<QRCodeServiceConfig, 'signingKey'>;
    capabilities: {
      maxDataSize: number;
      supportedFormats: string[];
      signingEnabled: boolean;
    };
  } {
    return {
      config: {
        baseUrl: this.config.baseUrl,
        maxDataSize: this.config.maxDataSize,
        compressionLevel: this.config.compressionLevel,
        errorCorrectionLevel: this.config.errorCorrectionLevel,
        enableSigning: this.config.enableSigning,
      },
      capabilities: {
        maxDataSize: this.config.maxDataSize,
        supportedFormats: ['png', 'svg', 'utf8'],
        signingEnabled: this.config.enableSigning,
      },
    };
  }
}