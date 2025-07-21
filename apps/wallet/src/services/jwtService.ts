/**
 * JWT Service using jose library for secure token handling
 * Implements RS256 signatures with proper key management
 */

import {
  SignJWT,
  jwtVerify,
  generateKeyPair,
  importPKCS8,
  importSPKI,
  type JWTPayload,
  type KeyLike,
} from "jose";

export interface JWTKeyPair {
  privateKey: string; // PKCS#8 PEM format
  publicKey: string; // SPKI PEM format
}

export interface JWTOptions {
  issuer?: string;
  audience?: string;
  expiresIn?: string; // e.g., '1h', '24h'
  subject?: string;
}

export class JWTService {
  private privateKey: KeyLike | null = null;
  private publicKey: KeyLike | null = null;

  /**
   * Initialize JWT service with key pair from environment
   */
  async initialize(): Promise<void> {
    const privateKeyPem = process.env.JWT_PRIVATE_KEY;
    const publicKeyPem = process.env.JWT_PUBLIC_KEY;

    if (!privateKeyPem || !publicKeyPem) {
      throw new Error(
        "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables must be set",
      );
    }

    try {
      this.privateKey = await importPKCS8(privateKeyPem, "RS256");
      this.publicKey = await importSPKI(publicKeyPem, "RS256");
    } catch (error) {
      throw new Error(
        `Failed to initialize JWT keys: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate a new RSA key pair for JWT signing
   */
  static async generateKeyPair(): Promise<JWTKeyPair> {
    const { privateKey, publicKey } = await generateKeyPair("RS256", {
      modulusLength: 2048,
    });

    // Jose returns KeyLike objects, so we need to export them to PEM format
    // In Node.js, these are typically crypto.KeyObject instances
    let privateKeyPem: string;
    let publicKeyPem: string;

    try {
      // For Node.js crypto.KeyObject instances
      if (
        privateKey &&
        typeof privateKey === "object" &&
        "export" in privateKey
      ) {
        privateKeyPem = (privateKey as any).export({
          type: "pkcs8",
          format: "pem",
        });
      } else if (typeof privateKey === "string") {
        privateKeyPem = privateKey;
      } else {
        throw new Error("Unsupported private key type");
      }

      if (publicKey && typeof publicKey === "object" && "export" in publicKey) {
        publicKeyPem = (publicKey as any).export({
          type: "spki",
          format: "pem",
        });
      } else if (typeof publicKey === "string") {
        publicKeyPem = publicKey;
      } else {
        throw new Error("Unsupported public key type");
      }
    } catch (error) {
      throw new Error(
        `Failed to export key pair: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return {
      privateKey: privateKeyPem,
      publicKey: publicKeyPem,
    };
  }

  /**
   * Sign a JWT with RS256
   */
  async signJWT(
    payload: JWTPayload,
    options: JWTOptions = {},
  ): Promise<string> {
    if (!this.privateKey) {
      await this.initialize();
    }

    if (!this.privateKey) {
      throw new Error("JWT service not properly initialized");
    }

    let jwt: SignJWT;
    try {
      jwt = new SignJWT(payload)
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuedAt()
        .setNotBefore(Math.floor(Date.now() / 1000));
    } catch (error) {
      errorService.logError("Error creating SignJWT:", error);
      errorService.logError("Payload type:", typeof payload);
      errorService.logError("Payload value:", payload);
      throw new Error(
        `Failed to create JWT: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    if (options.issuer) {
      jwt.setIssuer(options.issuer);
    }

    if (options.audience) {
      jwt.setAudience(options.audience);
    }

    if (options.subject) {
      jwt.setSubject(options.subject);
    }

    if (options.expiresIn) {
      const expirationTime = this.parseExpirationTime(options.expiresIn);
      jwt.setExpirationTime(Math.floor(Date.now() / 1000) + expirationTime);
    } else {
      // Default to 1 hour
      jwt.setExpirationTime(Math.floor(Date.now() / 1000) + 3600);
    }

    return await jwt.sign(this.privateKey);
  }

  /**
   * Verify and decode a JWT
   */
  async verifyJWT(
    token: string,
    expectedAudience?: string,
  ): Promise<JWTPayload> {
    if (!this.publicKey) {
      await this.initialize();
    }

    if (!this.publicKey) {
      throw new Error("JWT service not properly initialized");
    }

    try {
      const { payload } = await jwtVerify(token, this.publicKey, {
        algorithms: ["RS256"],
        audience: expectedAudience,
      });

      return payload;
    } catch (error) {
      throw new Error(
        `JWT verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create OpenID4VP authorization response JWT
   */
  async createOpenID4VPResponse(
    holderDID: string,
    audience: string,
    nonce: string,
    vp: any,
  ): Promise<string> {
    const payload = {
      iss: holderDID,
      aud: audience,
      nonce,
      vp,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    return await this.signJWT(payload, {
      issuer: holderDID,
      audience,
      expiresIn: "1h",
    });
  }

  /**
   * Create OpenID4VCI access token
   */
  async createAccessToken(
    subject: string,
    audience: string,
    scope: string[],
  ): Promise<string> {
    const payload = {
      sub: subject,
      scope: scope.join(" "),
      token_type: "Bearer",
    };

    return await this.signJWT(payload, {
      subject,
      audience,
      expiresIn: "24h",
    });
  }

  /**
   * Parse expiration time string to seconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(
        'Invalid expiration time format. Use format like "1h", "24h", "30m"',
      );
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      case "d":
        return value * 86400;
      default:
        throw new Error("Invalid time unit. Use s, m, h, or d");
    }
  }

  /**
   * Extract claims from JWT without verification (for debugging)
   */
  static decodeJWT(token: string): JWTPayload {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      return payload;
    } catch (error) {
      throw new Error(
        `Failed to decode JWT: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Clean up sensitive data from memory
   */
  destroy(): void {
    this.privateKey = null;
    this.publicKey = null;
  }
}
