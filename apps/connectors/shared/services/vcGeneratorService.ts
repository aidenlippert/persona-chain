import { v4 as uuidv4 } from 'uuid';
import { SignJWT, importJWK } from 'jose';
import { ed25519 } from '@noble/curves/ed25519';
import * as u8a from 'uint8arrays';

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string | { id: string; name?: string };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: any;
  credentialSchema?: {
    id: string;
    type: string;
  };
  proof?: any;
}

export interface CredentialSubject {
  id: string;
  [key: string]: any;
}

export interface IssuerConfig {
  id: string;
  name: string;
  privateKey: string; // Ed25519 private key in JWK format
  publicKey: string;  // Ed25519 public key in JWK format
}

export interface VCGenerationOptions {
  expirationDate?: Date;
  credentialSchema?: {
    id: string;
    type: string;
  };
  additionalContext?: string[];
  additionalTypes?: string[];
}

export class VCGeneratorService {
  private issuerConfig: IssuerConfig;

  constructor(issuerConfig: IssuerConfig) {
    this.issuerConfig = issuerConfig;
  }

  /**
   * Generate a W3C Verifiable Credential
   */
  async generateVC(
    credentialType: string,
    credentialSubject: CredentialSubject,
    options: VCGenerationOptions = {}
  ): Promise<VerifiableCredential> {
    const credentialId = `urn:uuid:${uuidv4()}`;
    const issuanceDate = new Date().toISOString();

    // Build context array
    const context = [
      'https://www.w3.org/ns/credentials/v2',
      ...(options.additionalContext || [])
    ];

    // Build type array
    const types = [
      'VerifiableCredential',
      credentialType,
      ...(options.additionalTypes || [])
    ];

    // Create the credential
    const credential: VerifiableCredential = {
      '@context': context,
      id: credentialId,
      type: types,
      issuer: {
        id: this.issuerConfig.id,
        name: this.issuerConfig.name
      },
      issuanceDate,
      credentialSubject
    };

    // Add optional fields
    if (options.expirationDate) {
      credential.expirationDate = options.expirationDate.toISOString();
    }

    if (options.credentialSchema) {
      credential.credentialSchema = options.credentialSchema;
    }

    // Sign the credential
    const signedCredential = await this.signCredential(credential);

    return signedCredential;
  }

  /**
   * Sign a credential using Ed25519
   */
  private async signCredential(credential: VerifiableCredential): Promise<VerifiableCredential> {
    // Create a copy without proof
    const credentialToSign = { ...credential };
    delete credentialToSign.proof;

    // Canonicalize the credential (in production, use proper JSON-LD canonicalization)
    const canonicalCredential = JSON.stringify(credentialToSign, Object.keys(credentialToSign).sort());

    // Import the private key
    const privateKeyJWK = JSON.parse(this.issuerConfig.privateKey);
    const privateKey = await importJWK(privateKeyJWK, 'EdDSA');

    // Create JWT proof
    const jwt = await new SignJWT(credentialToSign)
      .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(this.issuerConfig.id)
      .setJti(credential.id)
      .sign(privateKey);

    // Add proof to credential
    credential.proof = {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${this.issuerConfig.id}#key-1`,
      proofPurpose: 'assertionMethod',
      jws: jwt
    };

    return credential;
  }

  /**
   * Generate credential schemas for different platforms
   */
  static generateCredentialSchema(platform: string): any {
    const schemas: Record<string, any> = {
      github: {
        '$schema': 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uri' },
          username: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          company: { type: 'string' },
          location: { type: 'string' },
          bio: { type: 'string' },
          publicRepos: { type: 'integer', minimum: 0 },
          followers: { type: 'integer', minimum: 0 },
          following: { type: 'integer', minimum: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          verified: { type: 'boolean' },
          contributions: {
            type: 'object',
            properties: {
              totalCommits: { type: 'integer', minimum: 0 },
              totalPRs: { type: 'integer', minimum: 0 },
              totalIssues: { type: 'integer', minimum: 0 },
              totalReviews: { type: 'integer', minimum: 0 }
            }
          }
        },
        required: ['id', 'username', 'createdAt']
      },

      linkedin: {
        '$schema': 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uri' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          headline: { type: 'string' },
          industry: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              country: { type: 'string' },
              city: { type: 'string' }
            }
          },
          profilePicture: { type: 'string', format: 'uri' },
          publicProfileUrl: { type: 'string', format: 'uri' }
        },
        required: ['id', 'email', 'firstName', 'lastName']
      },

      orcid: {
        '$schema': 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX]$' },
          name: {
            type: 'object',
            properties: {
              givenNames: { type: 'string' },
              familyName: { type: 'string' }
            }
          },
          emails: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                verified: { type: 'boolean' },
                primary: { type: 'boolean' }
              }
            }
          },
          affiliations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                organization: { type: 'string' },
                role: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' }
              }
            }
          },
          works: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                type: { type: 'string' },
                publicationDate: { type: 'string' },
                doi: { type: 'string' }
              }
            }
          }
        },
        required: ['id', 'name']
      },

      plaid: {
        '$schema': 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          emails: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                data: { type: 'string', format: 'email' },
                primary: { type: 'boolean' },
                type: { type: 'string', enum: ['primary', 'secondary', 'other'] }
              }
            }
          },
          phoneNumbers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                data: { type: 'string' },
                primary: { type: 'boolean' },
                type: { type: 'string', enum: ['home', 'work', 'mobile', 'other'] }
              }
            }
          },
          addresses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                primary: { type: 'boolean' },
                city: { type: 'string' },
                region: { type: 'string' },
                postalCode: { type: 'string' },
                country: { type: 'string' }
              }
            }
          },
          dateOfBirth: { type: 'string', format: 'date' },
          verifiedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'verifiedAt']
      },

      twitter: {
        '$schema': 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          verified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          followersCount: { type: 'integer', minimum: 0 },
          followingCount: { type: 'integer', minimum: 0 },
          tweetCount: { type: 'integer', minimum: 0 },
          profileImageUrl: { type: 'string', format: 'uri' }
        },
        required: ['id', 'username', 'createdAt']
      },

      stackexchange: {
        '$schema': 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'integer' },
          displayName: { type: 'string' },
          reputation: { type: 'integer', minimum: 1 },
          badges: {
            type: 'object',
            properties: {
              gold: { type: 'integer', minimum: 0 },
              silver: { type: 'integer', minimum: 0 },
              bronze: { type: 'integer', minimum: 0 }
            }
          },
          topTags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tagName: { type: 'string' },
                answerCount: { type: 'integer', minimum: 0 },
                answerScore: { type: 'integer', minimum: 0 },
                questionCount: { type: 'integer', minimum: 0 },
                questionScore: { type: 'integer', minimum: 0 }
              }
            }
          },
          accountCreated: { type: 'string', format: 'date-time' },
          lastSeen: { type: 'string', format: 'date-time' },
          websiteUrl: { type: 'string', format: 'uri' },
          location: { type: 'string' }
        },
        required: ['id', 'displayName', 'reputation', 'accountCreated']
      }
    };

    return schemas[platform] || null;
  }

  /**
   * Create credential subject from platform data
   */
  static mapPlatformDataToCredentialSubject(
    platform: string,
    data: any,
    subjectDid: string
  ): CredentialSubject {
    const mappers: Record<string, (data: any) => CredentialSubject> = {
      github: (data) => ({
        id: subjectDid,
        username: data.login,
        name: data.name,
        email: data.email,
        company: data.company,
        location: data.location,
        bio: data.bio,
        publicRepos: data.public_repos,
        followers: data.followers,
        following: data.following,
        createdAt: data.created_at,
        verified: data.verified || false,
        contributions: data.contributions || {}
      }),

      linkedin: (data) => ({
        id: subjectDid,
        email: data.email,
        firstName: data.firstName?.localized?.en_US || data.firstName,
        lastName: data.lastName?.localized?.en_US || data.lastName,
        headline: data.headline?.localized?.en_US || data.headline,
        industry: data.industry,
        location: data.location,
        profilePicture: data.profilePicture?.displayImage,
        publicProfileUrl: data.vanityName ? `https://linkedin.com/in/${data.vanityName}` : undefined
      }),

      orcid: (data) => ({
        id: subjectDid,
        orcidId: data.orcid_identifier?.path,
        name: {
          givenNames: data.person?.name?.['given-names']?.value,
          familyName: data.person?.name?.['family-name']?.value
        },
        emails: data.person?.emails?.email?.map((email: any) => ({
          email: email.email,
          verified: email.verified,
          primary: email.primary
        })) || [],
        affiliations: data.affiliations || [],
        works: data.works || []
      }),

      plaid: (data) => ({
        id: subjectDid,
        name: data.names?.[0],
        emails: data.emails || [],
        phoneNumbers: data.phone_numbers || [],
        addresses: data.addresses || [],
        dateOfBirth: data.date_of_birth,
        verifiedAt: new Date().toISOString()
      }),

      twitter: (data) => ({
        id: subjectDid,
        twitterId: data.id,
        username: data.username,
        name: data.name,
        description: data.description,
        verified: data.verified || false,
        createdAt: data.created_at,
        followersCount: data.public_metrics?.followers_count || 0,
        followingCount: data.public_metrics?.following_count || 0,
        tweetCount: data.public_metrics?.tweet_count || 0,
        profileImageUrl: data.profile_image_url
      }),

      stackexchange: (data) => ({
        id: subjectDid,
        userId: data.user_id,
        displayName: data.display_name,
        reputation: data.reputation,
        badges: {
          gold: data.badge_counts?.gold || 0,
          silver: data.badge_counts?.silver || 0,
          bronze: data.badge_counts?.bronze || 0
        },
        topTags: data.top_tags || [],
        accountCreated: new Date(data.creation_date * 1000).toISOString(),
        lastSeen: new Date(data.last_access_date * 1000).toISOString(),
        websiteUrl: data.website_url,
        location: data.location
      })
    };

    const mapper = mappers[platform];
    if (!mapper) {
      throw new Error(`No mapper found for platform: ${platform}`);
    }

    return mapper(data);
  }
}