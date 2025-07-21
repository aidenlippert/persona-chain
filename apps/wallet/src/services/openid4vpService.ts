/**
 * OpenID4VP Service - Draft 24 Implementation
 * Handles OpenID for Verifiable Presentations with DCQL query support
 */

import { CryptoService } from "./cryptoService";
import { StorageService } from "./storageService";
import { JWTService } from "./jwtService";
import type {
  VerifiableCredential,
  VerifiablePresentation,
  PresentationDefinition,
  WalletCredential,
  DID,
} from "../types/wallet";

// OpenID4VP Draft 24 Types
export interface OpenID4VPRequest {
  client_id: string;
  client_id_scheme?:
    | "redirect_uri"
    | "entity_id"
    | "did"
    | "verifier_attestation"
    | "x509_san_dns"
    | "x509_san_uri";
  response_uri?: string;
  response_mode?:
    | "direct_post"
    | "direct_post.jwt"
    | "fragment"
    | "form_post"
    | "query";
  presentation_definition?: PresentationDefinition;
  presentation_definition_uri?: string;
  scope?: string;
  nonce: string;
  state?: string;
  response_type: "vp_token" | "id_token vp_token";
  client_metadata?: ClientMetadata;
  request_uri?: string;
  request?: string; // JWT request object
  // Draft 24 additions
  client_assertion_type?: string;
  client_assertion?: string;
  wallet_issuer?: string;
  user_hint?: string;
}

export interface ClientMetadata {
  client_name?: string;
  logo_uri?: string;
  policy_uri?: string;
  tos_uri?: string;
  client_purpose?: string;
  vp_formats?: VPFormats;
  authorization_endpoint?: string;
  response_types_supported?: string[];
  scopes_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
  request_object_signing_alg_values_supported?: string[];
  subject_syntax_types_supported?: string[];
  id_token_types_supported?: string[];
}

export interface VPFormats {
  jwt_vp?: JWTVPFormat;
  jwt_vc?: JWTVCFormat;
  ldp_vp?: LDPVPFormat;
  ldp_vc?: LDPVCFormat;
}

export interface JWTVPFormat {
  alg: string[];
}

export interface JWTVCFormat {
  alg: string[];
}

export interface LDPVPFormat {
  proof_type: string[];
}

export interface LDPVCFormat {
  proof_type: string[];
}

// DCQL (Data Consumer Query Language) Types
export interface DCQLQuery {
  selector: DCQLSelector;
  reason?: string;
  purpose?: string;
  retention?: DCQLRetention;
}

export interface DCQLSelector {
  credential_type?: string[];
  issuer?: string[];
  schema?: string[];
  subject_id?: string;
  fields?: DCQLFieldSelector[];
  constraints?: DCQLConstraints;
}

export interface DCQLFieldSelector {
  path: string[];
  filter?: DCQLFilter;
  essential?: boolean;
  intent_to_retain?: boolean;
}

export interface DCQLFilter {
  type?: string;
  pattern?: string;
  const?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

export interface DCQLConstraints {
  limit_disclosure?: "required" | "preferred";
  statuses?: {
    active?: DCQLStatusConstraint;
    suspended?: DCQLStatusConstraint;
    revoked?: DCQLStatusConstraint;
  };
}

export interface DCQLStatusConstraint {
  directive: "allowed" | "disallowed";
}

export interface DCQLRetention {
  duration?: string; // ISO 8601 duration
  purpose?: string;
}

export interface OpenID4VPResponse {
  vp_token: string | string[];
  presentation_submission?: PresentationSubmission;
  state?: string;
  id_token?: string;
}

export interface PresentationSubmission {
  id: string;
  definition_id: string;
  descriptor_map: DescriptorMap[];
}

export interface DescriptorMap {
  id: string;
  format: string;
  path: string;
  path_nested?: DescriptorMap;
}

export class OpenID4VPService {
  private cryptoService: CryptoService;
  private storageService: StorageService;
  private jwtService: JWTService;

  constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.storageService = StorageService.getInstance();
    this.jwtService = new JWTService();
  }

  /**
   * Parse OpenID4VP authorization request with DCQL support
   */
  async parseAuthorizationRequest(
    requestUri: string | OpenID4VPRequest,
  ): Promise<{
    request: OpenID4VPRequest;
    presentationDefinition?: PresentationDefinition;
    dcqlQueries?: DCQLQuery[];
    clientMetadata?: ClientMetadata;
  }> {
    try {
      let request: OpenID4VPRequest;

      if (typeof requestUri === "string") {
        if (requestUri.startsWith("http")) {
          // Fetch request from URI
          const response = await fetch(requestUri);
          if (!response.ok) {
            throw new Error(`Failed to fetch request: ${response.statusText}`);
          }

          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/jwt")) {
            // JWT request object
            const jwt = await response.text();
            request = await this.parseJWTRequest(jwt);
          } else {
            // JSON request
            request = await response.json();
          }
        } else {
          // Parse URL parameters
          request = this.parseRequestParameters(requestUri);
        }
      } else {
        request = requestUri;
      }

      // Validate required parameters
      this.validateRequest(request);

      // Fetch presentation definition if URI provided
      let presentationDefinition = request.presentation_definition;
      if (request.presentation_definition_uri && !presentationDefinition) {
        const response = await fetch(request.presentation_definition_uri);
        if (response.ok) {
          presentationDefinition = await response.json();
        }
      }

      // Parse DCQL queries from presentation definition
      const dcqlQueries = presentationDefinition
        ? this.extractDCQLQueries(presentationDefinition)
        : undefined;

      // Get client metadata
      const clientMetadata = request.client_metadata;

      return {
        request,
        presentationDefinition,
        dcqlQueries,
        clientMetadata,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse authorization request: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract DCQL queries from presentation definition
   */
  private extractDCQLQueries(
    presentationDefinition: PresentationDefinition,
  ): DCQLQuery[] {
    const dcqlQueries: DCQLQuery[] = [];

    if (!presentationDefinition.input_descriptors) {
      return dcqlQueries;
    }

    for (const descriptor of presentationDefinition.input_descriptors) {
      const dcqlQuery: DCQLQuery = {
        selector: {
          fields: [],
        },
        reason: descriptor.purpose,
        purpose: descriptor.purpose,
      };

      // Extract credential type constraints
      if (descriptor.constraints?.fields) {
        for (const field of descriptor.constraints.fields) {
          const dcqlField: DCQLFieldSelector = {
            path: field.path,
            essential: field.predicate === "required",
          };

          if (field.filter) {
            dcqlField.filter = {
              type: field.filter.type,
              pattern: field.filter.pattern,
              const: field.filter.const,
              enum: field.filter.enum,
            };
          }

          dcqlQuery.selector.fields?.push(dcqlField);
        }
      }

      // Set retention policy if specified
      if (descriptor.constraints?.limit_disclosure) {
        dcqlQuery.retention = {
          purpose:
            "Credential verification as specified in presentation request",
        };
      }

      dcqlQueries.push(dcqlQuery);
    }

    return dcqlQueries;
  }

  /**
   * Find matching credentials for DCQL queries
   */
  async findMatchingCredentials(dcqlQueries: DCQLQuery[]): Promise<
    {
      query: DCQLQuery;
      matchingCredentials: WalletCredential[];
      compatibilityScore: number;
    }[]
  > {
    const results = [];
    const allCredentials = await this.storageService.getCredentials();

    for (const query of dcqlQueries) {
      const matchingCredentials: WalletCredential[] = [];
      let totalScore = 0;

      for (const walletCred of allCredentials) {
        const score = await this.calculateCredentialCompatibility(
          walletCred,
          query,
        );
        if (score > 0.5) {
          // 50% compatibility threshold
          matchingCredentials.push(walletCred);
          totalScore += score;
        }
      }

      const compatibilityScore =
        matchingCredentials.length > 0
          ? totalScore / matchingCredentials.length
          : 0;

      results.push({
        query,
        matchingCredentials,
        compatibilityScore,
      });
    }

    return results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * Calculate compatibility score between credential and DCQL query
   */
  private async calculateCredentialCompatibility(
    credential: WalletCredential,
    query: DCQLQuery,
  ): Promise<number> {
    let score = 0;
    let maxScore = 0;

    const cred = credential.credential as VerifiableCredential;

    // Check credential type match
    if (query.selector.credential_type) {
      maxScore += 1;
      for (const requiredType of query.selector.credential_type) {
        if (cred.type.includes(requiredType)) {
          score += 1;
          break;
        }
      }
    }

    // Check issuer match
    if (query.selector.issuer) {
      maxScore += 1;
      const issuer =
        typeof cred.issuer === "string" ? cred.issuer : cred.issuer.id;
      if (query.selector.issuer.includes(issuer)) {
        score += 1;
      }
    }

    // Check field availability and constraints
    if (query.selector.fields) {
      for (const field of query.selector.fields) {
        maxScore += field.essential ? 2 : 1;

        const fieldValue = this.getNestedValue(
          cred.credentialSubject,
          field.path,
        );
        if (fieldValue !== undefined) {
          let fieldScore = field.essential ? 2 : 1;

          // Apply filter constraints
          if (field.filter && !this.matchesFilter(fieldValue, field.filter)) {
            fieldScore = 0;
          }

          score += fieldScore;
        }
      }
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Create OpenID4VP response with presentation submission
   */
  async createAuthorizationResponse(
    request: OpenID4VPRequest,
    selectedCredentials: WalletCredential[],
    holderDID: DID,
    responseFormat: "jwt_vp" | "ldp_vp" = "jwt_vp",
  ): Promise<OpenID4VPResponse> {
    try {
      // Create verifiable presentation
      const presentation = await this.createVerifiablePresentation(
        selectedCredentials,
        request.nonce,
        request.client_id,
        holderDID,
      );

      // Create presentation submission
      const presentationSubmission = this.createPresentationSubmission(
        request,
        selectedCredentials,
      );

      let vpToken: string;

      if (responseFormat === "jwt_vp") {
        // Create JWT VP token
        vpToken = await this.createJWTVPToken(
          presentation,
          holderDID,
          request.nonce,
        );
      } else {
        // Use JSON-LD format
        vpToken = JSON.stringify(presentation);
      }

      const response: OpenID4VPResponse = {
        vp_token: vpToken,
        presentation_submission: presentationSubmission,
      };

      if (request.state) {
        response.state = request.state;
      }

      return response;
    } catch (error) {
      throw new Error(
        `Failed to create authorization response: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Submit authorization response to verifier
   */
  async submitAuthorizationResponse(
    request: OpenID4VPRequest,
    response: OpenID4VPResponse,
  ): Promise<{ success: boolean; redirectUri?: string; error?: string }> {
    try {
      if (!request.response_uri) {
        throw new Error("No response URI provided");
      }

      const submitResponse = await fetch(request.response_uri, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          vp_token: Array.isArray(response.vp_token)
            ? response.vp_token[0]
            : response.vp_token,
          presentation_submission: JSON.stringify(
            response.presentation_submission,
          ),
          ...(response.state && { state: response.state }),
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error_description || `HTTP ${submitResponse.status}`,
        );
      }

      // Handle response based on content type
      const contentType = submitResponse.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const result = await submitResponse.json();
        return {
          success: true,
          redirectUri: result.redirect_uri,
        };
      } else {
        // Successful submission
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate OpenID4VP request parameters
   */
  private validateRequest(request: OpenID4VPRequest): void {
    if (!request.client_id) {
      throw new Error("Missing required parameter: client_id");
    }

    if (!request.nonce) {
      throw new Error("Missing required parameter: nonce");
    }

    if (!request.response_type || !request.response_type.includes("vp_token")) {
      throw new Error("Invalid response_type: must include vp_token");
    }

    if (
      !request.presentation_definition &&
      !request.presentation_definition_uri &&
      !request.scope
    ) {
      throw new Error(
        "Must provide presentation_definition, presentation_definition_uri, or scope",
      );
    }
  }

  /**
   * Parse JWT request object using jose library
   */
  private async parseJWTRequest(jwt: string): Promise<OpenID4VPRequest> {
    try {
      // Verify and decode the JWT
      const payload = await this.jwtService.verifyJWT(jwt);

      // Extract OpenID4VP request parameters from JWT payload
      const request: OpenID4VPRequest = {
        client_id: (payload.client_id as string) || "",
        nonce: (payload.nonce as string) || "",
        response_uri: payload.response_uri as string,
        response_mode: payload.response_mode as string,
        scope: payload.scope as string,
        state: payload.state as string,
        client_id_scheme: payload.client_id_scheme as any,
        presentation_definition:
          payload.presentation_definition as PresentationDefinition,
        presentation_definition_uri:
          payload.presentation_definition_uri as string,
      };

      return request;
    } catch (error) {
      throw new Error(
        `Failed to parse JWT request: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Parse request parameters from URL
   */
  private parseRequestParameters(url: string): OpenID4VPRequest {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    const request: OpenID4VPRequest = {
      client_id: params.get("client_id") || "",
      nonce: params.get("nonce") || "",
      response_type: (params.get("response_type") as "vp_token") || "vp_token",
    };

    // Optional parameters
    if (params.get("client_id_scheme")) {
      request.client_id_scheme = params.get("client_id_scheme") as any;
    }
    if (params.get("response_uri")) {
      request.response_uri = params.get("response_uri") || undefined;
    }
    if (params.get("response_mode")) {
      request.response_mode = params.get("response_mode") as any;
    }
    if (params.get("presentation_definition_uri")) {
      request.presentation_definition_uri =
        params.get("presentation_definition_uri") || undefined;
    }
    if (params.get("scope")) {
      request.scope = params.get("scope") || undefined;
    }
    if (params.get("state")) {
      request.state = params.get("state") || undefined;
    }

    return request;
  }

  /**
   * Create verifiable presentation from selected credentials
   */
  private async createVerifiablePresentation(
    credentials: WalletCredential[],
    challenge: string,
    domain: string,
    holderDID: DID,
  ): Promise<VerifiablePresentation> {
    const presentation: VerifiablePresentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ["VerifiablePresentation"],
      holder: `${holderDID.method}:${holderDID.identifier}`,
      verifiableCredential: credentials.map(
        (cred) => cred.credential as VerifiableCredential,
      ),
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: `${holderDID.method}:${holderDID.identifier}#key-1`,
        proofPurpose: "authentication",
        challenge,
        domain,
        proofValue: await this.cryptoService.generateHash(
          JSON.stringify({ challenge, domain, credentials }),
        ),
      },
    };

    return presentation;
  }

  /**
   * Create JWT VP token using jose library with RS256 signature
   */
  private async createJWTVPToken(
    presentation: VerifiablePresentation,
    holderDID: DID,
    nonce: string,
  ): Promise<string> {
    const holderDidString = `${holderDID.method}:${holderDID.identifier}`;
    const audience = presentation.proof.domain;

    // Use the JWT service to create a properly signed OpenID4VP response
    return await this.jwtService.createOpenID4VPResponse(
      holderDidString,
      audience,
      nonce,
      presentation,
    );
  }

  /**
   * Create presentation submission descriptor
   */
  private createPresentationSubmission(
    request: OpenID4VPRequest,
    credentials: WalletCredential[],
  ): PresentationSubmission {
    const submission: PresentationSubmission = {
      id: crypto.randomUUID(),
      definition_id: request.presentation_definition?.id || "default",
      descriptor_map: [],
    };

    // Map credentials to input descriptors
    credentials.forEach((credential, index) => {
      submission.descriptor_map.push({
        id: `credential_${index}`,
        format: "jwt_vc",
        path: `$.verifiableCredential[${index}]`,
      });
    });

    return submission;
  }

  /**
   * Get nested value from object using path array
   */
  private getNestedValue(obj: any, path: string[]): unknown {
    let current = obj;
    for (const key of path) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }

  /**
   * Check if value matches DCQL filter
   */
  private matchesFilter(value: unknown, filter: DCQLFilter): boolean {
    if (filter.const !== undefined) {
      return value === filter.const;
    }

    if (filter.enum !== undefined) {
      return filter.enum.includes(value);
    }

    if (typeof value === "string") {
      if (filter.pattern && !new RegExp(filter.pattern).test(value)) {
        return false;
      }
      if (filter.minLength !== undefined && value.length < filter.minLength) {
        return false;
      }
      if (filter.maxLength !== undefined && value.length > filter.maxLength) {
        return false;
      }
    }

    if (typeof value === "number") {
      if (filter.minimum !== undefined && value < filter.minimum) {
        return false;
      }
      if (filter.maximum !== undefined && value > filter.maximum) {
        return false;
      }
    }

    return true;
  }
}
