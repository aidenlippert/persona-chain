/**
 * Persona Wallet QR Code Service
 * Handles QR code generation and scanning for credential proof requests
 */

import QRCode from "qrcode";
import jsQR from "jsqr";
import { errorService } from "@/services/errorService";
import type {
  ProofRequest,
  OpenID4VPRequest,
  DIDCommMessage,
} from "@/types/wallet";

export interface QRCodeData {
  type:
    | "proof_request"
    | "openid4vp"
    | "didcomm"
    | "connection_invite"
    | "unknown";
  data: any;
  url?: string;
}

export interface QRScanResult {
  success: boolean;
  data?: QRCodeData;
  error?: string;
}

export interface QRGenerationOptions {
  size: number;
  margin: number;
  color: {
    dark: string;
    light: string;
  };
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
}

export class QRService {
  private static instance: QRService;

  static getInstance(): QRService {
    if (!QRService.instance) {
      QRService.instance = new QRService();
    }
    return QRService.instance;
  }

  /**
   * Generate QR code for a proof request
   */
  async generateProofRequestQR(
    request: ProofRequest,
    options?: Partial<QRGenerationOptions>,
  ): Promise<string> {
    try {
      const defaultOptions: QRGenerationOptions = {
        size: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      };

      const finalOptions = { ...defaultOptions, ...options };

      // Create QR data with proof request
      const qrData = {
        type: "proof_request",
        version: "1.0",
        request: request,
        callback_url: request.callback_url,
        expires: request.expires,
      };

      const dataString = JSON.stringify(qrData);

      return await QRCode.toDataURL(dataString, {
        width: finalOptions.size,
        margin: finalOptions.margin,
        color: finalOptions.color,
        errorCorrectionLevel: finalOptions.errorCorrectionLevel,
      });
    } catch (error) {
      errorService.logError("Error generating proof request QR:", error);
      throw new Error("Failed to generate proof request QR code");
    }
  }

  /**
   * Generate QR code for OpenID4VP request
   */
  async generateOpenID4VPQR(
    request: OpenID4VPRequest,
    options?: Partial<QRGenerationOptions>,
  ): Promise<string> {
    try {
      const defaultOptions: QRGenerationOptions = {
        size: 256,
        margin: 2,
        color: {
          dark: "#3b82f6",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      };

      const finalOptions = { ...defaultOptions, ...options };

      // Create OpenID4VP URL format
      const params = new URLSearchParams();
      params.append("client_id", request.client_id);
      params.append("response_type", request.response_type);
      params.append("nonce", request.nonce);

      if (request.response_uri) {
        params.append("response_uri", request.response_uri);
      }

      if (request.response_mode) {
        params.append("response_mode", request.response_mode);
      }

      if (request.presentation_definition) {
        params.append(
          "presentation_definition",
          JSON.stringify(request.presentation_definition),
        );
      }

      if (request.state) {
        params.append("state", request.state);
      }

      const openidUrl = `openid4vp://?${params.toString()}`;

      return await QRCode.toDataURL(openidUrl, {
        width: finalOptions.size,
        margin: finalOptions.margin,
        color: finalOptions.color,
        errorCorrectionLevel: finalOptions.errorCorrectionLevel,
      });
    } catch (error) {
      errorService.logError("Error generating OpenID4VP QR:", error);
      throw new Error("Failed to generate OpenID4VP QR code");
    }
  }

  /**
   * Generate QR code for DIDComm connection invitation
   */
  async generateConnectionInviteQR(
    inviteMessage: DIDCommMessage,
    options?: Partial<QRGenerationOptions>,
  ): Promise<string> {
    try {
      const defaultOptions: QRGenerationOptions = {
        size: 256,
        margin: 2,
        color: {
          dark: "#059669",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      };

      const finalOptions = { ...defaultOptions, ...options };

      // Create DIDComm invitation URL
      const inviteData = {
        type: "connection_invite",
        version: "2.0",
        message: inviteMessage,
      };

      const dataString = JSON.stringify(inviteData);

      return await QRCode.toDataURL(dataString, {
        width: finalOptions.size,
        margin: finalOptions.margin,
        color: finalOptions.color,
        errorCorrectionLevel: finalOptions.errorCorrectionLevel,
      });
    } catch (error) {
      errorService.logError("Error generating connection invite QR:", error);
      throw new Error("Failed to generate connection invite QR code");
    }
  }

  /**
   * Scan QR code from image data
   */
  async scanQRCode(imageData: ImageData): Promise<QRScanResult> {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (!code) {
        return {
          success: false,
          error: "No QR code detected in image",
        };
      }

      const qrData = this.parseQRData(code.data);

      return {
        success: true,
        data: qrData,
      };
    } catch (error) {
      errorService.logError("Error scanning QR code:", error);
      return {
        success: false,
        error: "Failed to scan QR code",
      };
    }
  }

  /**
   * Scan QR code from video stream
   */
  async scanFromVideoStream(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
  ): Promise<QRScanResult> {
    try {
      const context = canvas.getContext("2d");
      if (!context) {
        return {
          success: false,
          error: "Canvas context not available",
        };
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data from canvas
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      return await this.scanQRCode(imageData);
    } catch (error) {
      errorService.logError("Error scanning from video stream:", error);
      return {
        success: false,
        error: "Failed to scan from video stream",
      };
    }
  }

  /**
   * Parse QR code data from string (public method)
   */
  parseQRCodeData(data: string): QRCodeData {
    return this.parseQRData(data);
  }

  /**
   * Parse QR code data and determine type
   */
  private parseQRData(data: string): QRCodeData {
    try {
      // Try to parse as JSON first
      const jsonData = JSON.parse(data);

      if (jsonData.type === "proof_request") {
        return {
          type: "proof_request",
          data: jsonData.request,
        };
      }

      if (jsonData.type === "connection_invite") {
        return {
          type: "connection_invite",
          data: jsonData.message,
        };
      }

      // Check if it's a DIDComm message
      if (jsonData.type && jsonData.from && jsonData.to) {
        return {
          type: "didcomm",
          data: jsonData,
        };
      }
    } catch (jsonError) {
      // Not JSON, try other formats
    }

    // Check for OpenID4VP URL format
    if (data.startsWith("openid4vp://")) {
      try {
        const url = new URL(data);
        const params = Object.fromEntries(url.searchParams.entries());

        // Parse presentation_definition if present
        if (params.presentation_definition) {
          params.presentation_definition = JSON.parse(
            params.presentation_definition,
          );
        }

        return {
          type: "openid4vp",
          data: params,
          url: data,
        };
      } catch (urlError) {
        errorService.logError("Error parsing OpenID4VP URL:", urlError);
      }
    }

    // Check for HTTPS URLs that might contain proof requests
    if (data.startsWith("https://")) {
      try {
        const url = new URL(data);

        // Check if it's a proof request URL
        if (
          url.pathname.includes("/proof") ||
          url.searchParams.has("presentation_definition")
        ) {
          return {
            type: "openid4vp",
            data: Object.fromEntries(url.searchParams.entries()),
            url: data,
          };
        }
      } catch (urlError) {
        errorService.logError("Error parsing URL:", urlError);
      }
    }

    // Check for DID strings
    if (data.startsWith("did:")) {
      return {
        type: "connection_invite",
        data: { did: data },
      };
    }

    // Default to unknown type
    return {
      type: "unknown",
      data: data,
    };
  }

  /**
   * Validate QR code data structure
   */
  validateQRData(qrData: QRCodeData): boolean {
    try {
      switch (qrData.type) {
        case "proof_request":
          return this.validateProofRequest(qrData.data);

        case "openid4vp":
          return this.validateOpenID4VP(qrData.data);

        case "didcomm":
          return this.validateDIDCommMessage(qrData.data);

        case "connection_invite":
          return this.validateConnectionInvite(qrData.data);

        default:
          return false;
      }
    } catch (error) {
      errorService.logError("Error validating QR data:", error);
      return false;
    }
  }

  /**
   * Validate proof request structure
   */
  private validateProofRequest(data: any): boolean {
    return !!(
      data &&
      data.id &&
      data.type === "ProofRequest" &&
      data.presentation_definition &&
      data.challenge
    );
  }

  /**
   * Validate OpenID4VP request structure
   */
  private validateOpenID4VP(data: any): boolean {
    return !!(
      data &&
      data.client_id &&
      data.response_type === "vp_token" &&
      data.nonce
    );
  }

  /**
   * Validate DIDComm message structure
   */
  private validateDIDCommMessage(data: any): boolean {
    return !!(data && data.id && data.type && data.to && data.body);
  }

  /**
   * Validate connection invite structure
   */
  private validateConnectionInvite(data: any): boolean {
    return !!(data && (data.did || data.message));
  }

  /**
   * Generate QR code for wallet sharing
   */
  async generateWalletShareQR(
    walletInfo: {
      did: string;
      name: string;
      publicKey: string;
    },
    options?: Partial<QRGenerationOptions>,
  ): Promise<string> {
    try {
      const shareData = {
        type: "wallet_share",
        version: "1.0",
        wallet: walletInfo,
        timestamp: new Date().toISOString(),
      };

      return await QRCode.toDataURL(JSON.stringify(shareData), {
        width: options?.size || 256,
        margin: options?.margin || 2,
        color: options?.color || { dark: "#7c3aed", light: "#ffffff" },
        errorCorrectionLevel: options?.errorCorrectionLevel || "M",
      });
    } catch (error) {
      errorService.logError("Error generating wallet share QR:", error);
      throw new Error("Failed to generate wallet share QR code");
    }
  }

  /**
   * Extract metadata from QR code
   */
  extractQRMetadata(qrData: QRCodeData): {
    title: string;
    description: string;
    icon?: string;
    urgency: "low" | "medium" | "high";
  } {
    switch (qrData.type) {
      case "proof_request":
        return {
          title: "Proof Request",
          description: `Verification request from ${qrData.data.metadata?.verifier_name || "Unknown verifier"}`,
          urgency: "high",
        };

      case "openid4vp":
        return {
          title: "OpenID4VP Request",
          description: `Credential verification from ${qrData.data.client_id || "Unknown client"}`,
          urgency: "high",
        };

      case "didcomm":
        return {
          title: "DIDComm Message",
          description: `Message of type ${qrData.data.type}`,
          urgency: "medium",
        };

      case "connection_invite":
        return {
          title: "Connection Invite",
          description: "New connection invitation",
          urgency: "medium",
        };

      default:
        return {
          title: "Unknown QR Code",
          description: "Unrecognized QR code format",
          urgency: "low",
        };
    }
  }
}
