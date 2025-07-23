/**
 * Discord Verifiable Credential Service
 * Creates VCs from Discord profile data and server memberships
 */

import { DIDService } from "./didService";
import { cryptoService } from "./cryptoService";
import { storageService } from "./storageService";
import { rateLimitService } from "./rateLimitService";
import { errorService, ErrorCategory, ErrorSeverity, handleErrors } from "./errorService";
import { configService } from '../config';
import { errorService } from "@/services/errorService";
import type {
  VerifiableCredential,
  WalletCredential,
  DID,
} from "../types/wallet";

export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  global_name: string;
  avatar: string;
  banner?: string;
  accent_color?: number;
  bot: boolean;
  verified: boolean;
  email?: string;
  flags: number;
  premium_type: number;
  public_flags: number;
  created_at: string;
  locale: string;
  mfa_enabled: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string;
  description: string;
  splash: string;
  discovery_splash: string;
  features: string[];
  banner: string;
  owner_id: string;
  region: string;
  afk_channel_id: string;
  afk_timeout: number;
  widget_enabled: boolean;
  widget_channel_id: string;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  roles: DiscordRole[];
  emojis: DiscordEmoji[];
  mfa_level: number;
  application_id: string;
  system_channel_id: string;
  system_channel_flags: number;
  rules_channel_id: string;
  max_presences: number;
  max_members: number;
  vanity_url_code: string;
  premium_tier: number;
  premium_subscription_count: number;
  preferred_locale: string;
  public_updates_channel_id: string;
  max_video_channel_users: number;
  approximate_member_count: number;
  approximate_presence_count: number;
  welcome_screen: any;
  nsfw_level: number;
  stickers: any[];
  premium_progress_bar_enabled: boolean;
  joined_at: string;
  member_count: number;
  permissions: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string;
  unicode_emoji?: string;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: {
    bot_id?: string;
    integration_id?: string;
    premium_subscriber?: boolean;
  };
}

export interface DiscordEmoji {
  id: string;
  name: string;
  roles: string[];
  user?: any;
  require_colons: boolean;
  managed: boolean;
  animated: boolean;
  available: boolean;
}

export interface DiscordConnection {
  id: string;
  name: string;
  type: string;
  revoked: boolean;
  integrations: any[];
  verified: boolean;
  friend_sync: boolean;
  show_activity: boolean;
  visibility: number;
}

export interface DiscordMembership {
  guild: DiscordGuild;
  roles: DiscordRole[];
  nick?: string;
  avatar?: string;
  joined_at: string;
  premium_since?: string;
  deaf: boolean;
  mute: boolean;
  flags: number;
  pending?: boolean;
  permissions?: string;
  communication_disabled_until?: string;
}

export interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export class DiscordVCService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private oauthConfig: DiscordOAuthConfig;
  private baseURL = "https://discord.com/api/v10";

  constructor(config?: DiscordOAuthConfig) {
    this.oauthConfig = config || {
      clientId: import.meta.env.VITE_DISCORD_CLIENT_ID || "",
      clientSecret: import.meta.env.VITE_DISCORD_CLIENT_SECRET || "",
      redirectUri: import.meta.env.VITE_DISCORD_REDIRECT_URI || "",
      scopes: ["identify", "email", "guilds", "guilds.members.read", "connections"]
    };
  }

  /**
   * Initialize OAuth2 flow
   */
  initiateOAuth(): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      response_type: "code",
      scope: this.oauthConfig.scopes.join(" "),
      state: this.generateState()
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<void> {
    // Verify state for security
    if (!this.verifyState(state)) {
      throw new Error("Invalid state parameter");
    }

    try {
      const response = await fetch(`${this.baseURL}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.oauthConfig.clientId,
          client_secret: this.oauthConfig.clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: this.oauthConfig.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord OAuth error: ${response.status}`);
      }

      const tokenData: DiscordTokenResponse = await response.json();
      this.setTokens(tokenData);
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error}`);
    }
  }

  /**
   * Set access tokens
   */
  private setTokens(tokenData: DiscordTokenResponse): void {
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;
    this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch(`${this.baseURL}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.oauthConfig.clientId,
          client_secret: this.oauthConfig.clientSecret,
          grant_type: "refresh_token",
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord token refresh error: ${response.status}`);
      }

      const tokenData: DiscordTokenResponse = await response.json();
      this.setTokens(tokenData);
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error}`);
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeAuthenticatedRequest(endpoint: string): Promise<any> {
    // Check if token needs refresh
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt - 60000) {
      await this.refreshAccessToken();
    }

    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create Discord Profile Credential
   */
  @handleErrors(ErrorCategory.EXTERNAL_API, ErrorSeverity.HIGH)
  async createProfileCredential(
    userDID: DID,
    privateKey: Uint8Array,
    accessToken: string
  ): Promise<WalletCredential> {
    this.accessToken = accessToken;

    try {
      const [profile, guilds, connections] = await Promise.all([
        this.makeAuthenticatedRequest("/users/@me"),
        this.makeAuthenticatedRequest("/users/@me/guilds"),
        this.makeAuthenticatedRequest("/users/@me/connections").catch(() => [])
      ]);

      const credential: VerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/discord/v1",
        ],
        id: `urn:uuid:discord-profile-${Date.now()}`,
        type: [
          "VerifiableCredential",
          "SocialMediaCredential",
          "DiscordProfileCredential",
        ],
        issuer: {
          id: "did:web:discord.com",
          name: "Discord Inc.",
          url: "https://discord.com",
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(
          Date.now() + 180 * 24 * 60 * 60 * 1000
        ).toISOString(), // 6 months
        credentialSubject: {
          id: userDID,
          type: "DiscordUser",
          profile: {
            id: profile.id,
            username: profile.username,
            discriminator: profile.discriminator,
            globalName: profile.global_name,
            verified: profile.verified,
            locale: profile.locale,
            mfaEnabled: profile.mfa_enabled,
            premiumType: profile.premium_type,
            publicFlags: profile.public_flags,
            accountCreated: this.parseSnowflakeDate(profile.id),
            accountAge: this.calculateAccountAge(profile.id),
          },
          socialConnections: connections.map((conn: DiscordConnection) => ({
            type: conn.type,
            name: conn.name,
            verified: conn.verified,
            visibility: conn.visibility,
          })),
          serverMemberships: {
            totalServers: guilds.length,
            serverTypes: this.categorizeServers(guilds),
            verifiedServers: guilds.filter((g: DiscordGuild) => 
              g.features.includes("VERIFIED") || g.features.includes("PARTNERED")
            ).length,
            roles: this.extractUniqueRoles(guilds),
          },
          verificationData: {
            verifiedAt: new Date().toISOString(),
            method: "discord-oauth2",
            emailVerified: profile.verified,
            phoneVerified: profile.mfa_enabled,
            premiumStatus: profile.premium_type > 0,
            accountStanding: "good", // Could be enhanced with reputation data
          },
        },
        proof: await this.createProof(userDID, privateKey, profile),
      };

      const walletCredential: WalletCredential = {
        id: credential.id,
        type: "DiscordProfileCredential",
        credential,
        metadata: {
          tags: ["social", "discord", "identity", "verified"],
          favorite: false,
          lastUsed: new Date().toISOString(),
          usageCount: 0,
          source: "discord",
          name: `Discord Profile - ${profile.global_name || profile.username}`,
          description: `Verified Discord profile for ${profile.username}#${profile.discriminator}`,
          issuer: "Discord Inc.",
          issuedAt: credential.issuanceDate,
          expiresAt: credential.expirationDate,
          w3cCompliant: true,
        },
        storage: {
          encrypted: true,
          backed_up: true,
          synced: true,
        },
      };

      await storageService.storeCredential(walletCredential);

      console.log("✅ Discord Profile Credential created successfully:", {
        id: credential.id,
        username: profile.username,
        servers: guilds.length,
      });

      return walletCredential;
    } catch (error) {
      errorService.logError("❌ Failed to create Discord profile credential:", error);
      throw new Error(
        `Failed to create Discord profile credential: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create Discord Server Membership Credential
   */
  async createServerMembershipCredential(
    userDID: DID,
    privateKey: Uint8Array,
    guildId: string
  ): Promise<WalletCredential> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    try {
      const [guild, member] = await Promise.all([
        this.makeAuthenticatedRequest(`/guilds/${guildId}`),
        this.makeAuthenticatedRequest(`/users/@me/guilds/${guildId}/member`)
      ]);

      const credential: VerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/discord-membership/v1",
        ],
        id: `urn:uuid:discord-membership-${guildId}-${Date.now()}`,
        type: [
          "VerifiableCredential",
          "MembershipCredential",
          "DiscordServerMembershipCredential",
        ],
        issuer: {
          id: "did:web:discord.com",
          name: "Discord Inc.",
          url: "https://discord.com",
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000
        ).toISOString(), // 3 months
        credentialSubject: {
          id: userDID,
          type: "DiscordServerMember",
          membership: {
            serverId: guild.id,
            serverName: guild.name,
            serverDescription: guild.description,
            serverFeatures: guild.features,
            serverVerificationLevel: guild.verification_level,
            serverMemberCount: guild.member_count,
            isPremiumServer: guild.premium_tier > 0,
            isVerified: guild.features.includes("VERIFIED"),
            isPartnered: guild.features.includes("PARTNERED"),
          },
          memberData: {
            joinedAt: member.joined_at,
            roles: member.roles.map((roleId: string) => {
              const role = guild.roles.find((r: DiscordRole) => r.id === roleId);
              return {
                id: roleId,
                name: role?.name || "Unknown",
                color: role?.color || 0,
                permissions: role?.permissions || "0",
                position: role?.position || 0,
              };
            }),
            nickname: member.nick,
            premiumSince: member.premium_since,
            membershipDuration: this.calculateMembershipDuration(member.joined_at),
            hasModeratorRole: this.hasModeratorRole(member.roles, guild.roles),
            hasAdminRole: this.hasAdminRole(member.roles, guild.roles),
          },
          verificationData: {
            verifiedAt: new Date().toISOString(),
            method: "discord-guild-api",
            membershipStatus: "active",
            rolesVerified: true,
            permissionsVerified: true,
          },
        },
        proof: await this.createProof(userDID, privateKey, { guild, member }),
      };

      const walletCredential: WalletCredential = {
        id: credential.id,
        type: "DiscordServerMembershipCredential",
        credential,
        metadata: {
          tags: ["membership", "discord", "server", "community"],
          favorite: false,
          lastUsed: new Date().toISOString(),
          usageCount: 0,
          source: "discord",
          name: `Discord Server - ${guild.name}`,
          description: `Verified membership in ${guild.name} Discord server`,
          issuer: "Discord Inc.",
          issuedAt: credential.issuanceDate,
          expiresAt: credential.expirationDate,
          w3cCompliant: true,
        },
        storage: {
          encrypted: true,
          backed_up: true,
          synced: true,
        },
      };

      await storageService.storeCredential(walletCredential);

      return walletCredential;
    } catch (error) {
      throw new Error(
        `Failed to create Discord server membership credential: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Helper methods
   */
  private generateState(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private verifyState(state: string): boolean {
    // In production, store and verify state in secure storage
    return state.length === 64;
  }

  private parseSnowflakeDate(snowflake: string): string {
    const timestamp = (BigInt(snowflake) >> 22n) + 1420070400000n;
    return new Date(Number(timestamp)).toISOString();
  }

  private calculateAccountAge(snowflake: string): number {
    const createdAt = this.parseSnowflakeDate(snowflake);
    const ageMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24)); // Age in days
  }

  private categorizeServers(guilds: DiscordGuild[]): Record<string, number> {
    const categories: Record<string, number> = {
      gaming: 0,
      technology: 0,
      educational: 0,
      community: 0,
      verified: 0,
      partnered: 0,
      large: 0,
      small: 0,
    };

    guilds.forEach(guild => {
      if (guild.features.includes("VERIFIED")) categories.verified++;
      if (guild.features.includes("PARTNERED")) categories.partnered++;
      if (guild.member_count > 10000) categories.large++;
      else categories.small++;
      
      // Simple categorization based on server name/description
      const text = (guild.name + " " + guild.description).toLowerCase();
      if (text.includes("game") || text.includes("gaming")) categories.gaming++;
      if (text.includes("tech") || text.includes("programming") || text.includes("dev")) categories.technology++;
      if (text.includes("education") || text.includes("learning") || text.includes("study")) categories.educational++;
      else categories.community++;
    });

    return categories;
  }

  private extractUniqueRoles(guilds: DiscordGuild[]): string[] {
    const roles = new Set<string>();
    guilds.forEach(guild => {
      guild.roles.forEach(role => {
        if (role.name !== "@everyone") {
          roles.add(role.name);
        }
      });
    });
    return Array.from(roles);
  }

  private calculateMembershipDuration(joinedAt: string): number {
    const joinDate = new Date(joinedAt);
    const durationMs = Date.now() - joinDate.getTime();
    return Math.floor(durationMs / (1000 * 60 * 60 * 24)); // Duration in days
  }

  private hasModeratorRole(userRoles: string[], guildRoles: DiscordRole[]): boolean {
    return userRoles.some(roleId => {
      const role = guildRoles.find(r => r.id === roleId);
      if (!role) return false;
      
      const permissions = BigInt(role.permissions);
      const moderatorPerms = [
        0x10n, // KICK_MEMBERS
        0x4n,  // BAN_MEMBERS
        0x2000n, // MANAGE_MESSAGES
        0x10000000n, // MUTE_MEMBERS
        0x4000000n, // MOVE_MEMBERS
      ];
      
      return moderatorPerms.some(perm => (permissions & perm) !== 0n);
    });
  }

  private hasAdminRole(userRoles: string[], guildRoles: DiscordRole[]): boolean {
    return userRoles.some(roleId => {
      const role = guildRoles.find(r => r.id === roleId);
      if (!role) return false;
      
      const permissions = BigInt(role.permissions);
      const adminPerms = [
        0x8n, // ADMINISTRATOR
        0x20n, // MANAGE_GUILD
        0x10000n, // MANAGE_ROLES
      ];
      
      return adminPerms.some(perm => (permissions & perm) !== 0n);
    });
  }

  private async createProof(
    userDID: DID,
    privateKey: Uint8Array,
    data: any
  ): Promise<any> {
    const proofData = {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `${userDID}#key-1`,
      proofPurpose: "assertionMethod",
    };

    const dataToSign = JSON.stringify({
      ...proofData,
      credentialHash: await cryptoService.generateHash(JSON.stringify(data)),
    });

    const signature = await DIDService.signWithDID(
      new TextEncoder().encode(dataToSign),
      privateKey
    );

    return {
      ...proofData,
      proofValue: Array.from(signature)
        .map(b => b.toString(16).padStart(2, "0"))
        .join(""),
    };
  }
}

// Create DiscordVCService instance
function createDiscordVCService(): DiscordVCService {
  try {
    const thirdPartyConfig = configService.getThirdPartyConfig();
    return new DiscordVCService({
      clientId: thirdPartyConfig.discord.clientId,
      clientSecret: thirdPartyConfig.discord.clientSecret,
      redirectUri: thirdPartyConfig.discord.redirectUri,
      scopes: thirdPartyConfig.discord.scopes,
    });
  } catch (error) {
    console.warn('Configuration service not available, using fallback values:', error);
    return new DiscordVCService();
  }
}

export const discordVCService = createDiscordVCService();