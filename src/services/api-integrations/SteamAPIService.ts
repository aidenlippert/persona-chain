/**
 * 🎮 STEAM API INTEGRATION SERVICE
 * Real Steam Web API integration for gaming credentials
 * Profile data + Achievement statistics + Game library analysis
 */

export interface SteamPlayer {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate: number;
  communityvisibilitystate: number;
  profilestate: number;
  lastlogoff: number;
  commentpermission: number;
  realname?: string;
  primaryclanid?: string;
  timecreated: number;
  gameid?: string;
  gameextrainfo?: string;
  cityid?: number;
  loccountrycode?: string;
  locstatecode?: string;
}

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_windows_forever: number;
  playtime_mac_forever: number;
  playtime_linux_forever: number;
  playtime_2weeks?: number;
  img_icon_url?: string;
  img_logo_url?: string;
}

export interface SteamAchievement {
  apiname: string;
  achieved: number;
  unlocktime: number;
  name?: string;
  description?: string;
}

export interface SteamStats {
  totalGames: number;
  totalPlaytime: number;
  averagePlaytime: number;
  recentGames: SteamGame[];
  topGames: SteamGame[];
  accountAge: number;
  profileLevel: number;
  achievementRate: number;
  gamingScore: number;
}

export interface SteamCredentialData {
  player: SteamPlayer;
  stats: SteamStats;
  games: SteamGame[];
  verificationDate: string;
  credentialType: 'GamingCredential';
}

/**
 * 🎮 STEAM API INTEGRATION SERVICE
 */
export class SteamAPIService {
  private apiKey: string;
  private baseURL = 'https://api.steampowered.com';
  
  constructor() {
    const apiKey = import.meta.env.VITE_STEAM_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Steam API key not configured - Steam integration will be disabled');
      this.apiKey = '';
    } else {
      this.apiKey = apiKey;
      console.log('🎮 Steam API Service initialized with key:', `${apiKey.substring(0, 8)}...`);
    }
  }

  /**
   * 🔍 Check if Steam API is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * 🛡️ Ensure Steam API is configured before use
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('Steam API key not configured. Please set VITE_STEAM_API_KEY environment variable.');
    }
  }

  /**
   * 🔍 Convert Steam profile URL or custom URL to Steam ID
   */
  async resolveVanityURL(vanityName: string): Promise<string> {
    this.ensureConfigured();
    try {
      const url = new URL(`${this.baseURL}/ISteamUser/ResolveVanityURL/v0001/`);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('vanityurl', vanityName);
      url.searchParams.set('url_type', '1'); // Individual profile
      url.searchParams.set('format', 'json');

      // Use CORS proxy for browser requests - try multiple proxies for reliability
      let data;
      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url.toString())}`,
        `https://cors-anywhere.herokuapp.com/${url.toString()}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url.toString())}`
      ];

      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl, {
            headers: proxyUrl.includes('allorigins') ? {} : {
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          
          if (!response.ok) {
            console.warn(`❌ CORS proxy failed (${proxyUrl}):`, response.status);
            continue;
          }

          if (proxyUrl.includes('allorigins')) {
            const proxyData = await response.json();
            data = JSON.parse(proxyData.contents);
          } else {
            data = await response.json();
          }
          
          console.log('✅ CORS proxy success:', proxyUrl);
          break;
        } catch (error) {
          console.warn(`❌ CORS proxy error (${proxyUrl}):`, error);
          continue;
        }
      }

      if (!data) {
        throw new Error('All CORS proxies failed. Steam API may be temporarily unavailable.');
      }

      if (data.response.success === 1) {
        return data.response.steamid;
      } else {
        throw new Error('Steam profile not found or private');
      }
    } catch (error) {
      console.error('❌ Failed to resolve Steam vanity URL:', error);
      throw error;
    }
  }

  /**
   * 📝 Get Steam player summary
   */
  async getPlayerSummary(steamId: string): Promise<SteamPlayer> {
    this.ensureConfigured();
    try {
      const url = new URL(`${this.baseURL}/ISteamUser/GetPlayerSummaries/v0002/`);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('steamids', steamId);
      url.searchParams.set('format', 'json');

      // Use CORS proxy for browser requests
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url.toString())}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`CORS Proxy error: ${response.status} ${response.statusText}`);
      }

      const proxyData = await response.json();
      const data = JSON.parse(proxyData.contents);
      
      if (!data.response?.players?.[0]) {
        throw new Error('Steam player not found or profile is private');
      }

      return data.response.players[0];
    } catch (error) {
      console.error('❌ Failed to get Steam player summary:', error);
      throw error;
    }
  }

  /**
   * 🎯 Get owned games for player
   */
  async getOwnedGames(steamId: string): Promise<SteamGame[]> {
    this.ensureConfigured();
    try {
      const url = new URL(`${this.baseURL}/IPlayerService/GetOwnedGames/v0001/`);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('steamid', steamId);
      url.searchParams.set('format', 'json');
      url.searchParams.set('include_appinfo', 'true');
      url.searchParams.set('include_played_free_games', 'true');

      // Use CORS proxy for browser requests
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url.toString())}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`CORS Proxy error: ${response.status} ${response.statusText}`);
      }

      const proxyData = await response.json();
      const data = JSON.parse(proxyData.contents);
      
      if (!data.response?.games) {
        console.warn('⚠️ No games found - profile may be private');
        return [];
      }

      return data.response.games || [];
    } catch (error) {
      console.error('❌ Failed to get Steam owned games:', error);
      throw error;
    }
  }

  /**
   * 🏆 Get recently played games
   */
  async getRecentlyPlayedGames(steamId: string): Promise<SteamGame[]> {
    this.ensureConfigured();
    try {
      const url = new URL(`${this.baseURL}/IPlayerService/GetRecentlyPlayedGames/v0001/`);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('steamid', steamId);
      url.searchParams.set('format', 'json');
      url.searchParams.set('count', '10');

      // Use CORS proxy for browser requests
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url.toString())}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`CORS Proxy error: ${response.status} ${response.statusText}`);
      }

      const proxyData = await response.json();
      const data = JSON.parse(proxyData.contents);
      
      return data.response?.games || [];
    } catch (error) {
      console.error('❌ Failed to get recently played games:', error);
      return [];
    }
  }

  /**
   * 📊 Calculate gaming statistics
   */
  calculateGamingStats(player: SteamPlayer, games: SteamGame[], recentGames: SteamGame[]): SteamStats {
    const now = Date.now() / 1000;
    const accountAge = Math.floor((now - player.timecreated) / (365.25 * 24 * 60 * 60));
    
    const totalPlaytime = games.reduce((sum, game) => sum + game.playtime_forever, 0);
    const averagePlaytime = games.length > 0 ? Math.floor(totalPlaytime / games.length) : 0;
    
    // Sort games by playtime to get top games
    const topGames = [...games]
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, 10);

    // Calculate gaming score based on various factors
    const gamingScore = Math.min(100, Math.round(
      (games.length * 0.5) +           // Game collection size
      (totalPlaytime / 100) +          // Total playtime hours
      (accountAge * 2) +               // Account age bonus
      (recentGames.length * 2)         // Recent activity bonus
    ));

    return {
      totalGames: games.length,
      totalPlaytime: Math.floor(totalPlaytime / 60), // Convert to hours
      averagePlaytime: Math.floor(averagePlaytime / 60), // Convert to hours
      recentGames: recentGames.slice(0, 5),
      topGames,
      accountAge,
      profileLevel: 0, // Would need additional API call
      achievementRate: 0, // Would need achievement data
      gamingScore,
    };
  }

  /**
   * 🎮 Generate comprehensive Steam gaming credential
   */
  async generateGamingCredential(steamIdOrProfile: string): Promise<SteamCredentialData> {
    try {
      console.log('🎮 Generating Steam gaming credential for:', steamIdOrProfile);

      // Resolve Steam ID if custom URL was provided
      let steamId = steamIdOrProfile;
      
      // Check if it's a full Steam profile URL with numeric ID
      const numericIdMatch = steamIdOrProfile.match(/steamcommunity\.com\/profiles\/(\d{17})/);
      if (numericIdMatch) {
        steamId = numericIdMatch[1];
      }
      // Check if it's already a 17-digit Steam ID
      else if (/^\d{17}$/.test(steamIdOrProfile)) {
        steamId = steamIdOrProfile;
      }
      // Otherwise, treat as custom URL and resolve it
      else {
        // Extract custom URL from full profile URL if needed
        const urlMatch = steamIdOrProfile.match(/steamcommunity\.com\/id\/([^\/]+)/);
        const customUrl = urlMatch ? urlMatch[1] : steamIdOrProfile;
        steamId = await this.resolveVanityURL(customUrl);
      }

      console.log('🔍 Using Steam ID:', steamId);

      // Fetch all player data
      const [player, games, recentGames] = await Promise.all([
        this.getPlayerSummary(steamId),
        this.getOwnedGames(steamId),
        this.getRecentlyPlayedGames(steamId),
      ]);

      // Calculate statistics
      const stats = this.calculateGamingStats(player, games, recentGames);

      const credentialData: SteamCredentialData = {
        player,
        stats,
        games: games.slice(0, 50), // Limit games in credential
        verificationDate: new Date().toISOString(),
        credentialType: 'GamingCredential',
      };

      console.log('✅ Steam gaming credential generated:', {
        username: player.personaname,
        totalGames: stats.totalGames,
        totalHours: stats.totalPlaytime,
        gamingScore: stats.gamingScore,
        accountAge: stats.accountAge,
      });

      return credentialData;

    } catch (error) {
      console.error('❌ Failed to generate Steam gaming credential:', error);
      throw error;
    }
  }

  /**
   * 🔍 Test Steam API connection
   */
  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Steam API key not configured'
      };
    }
    
    try {
      // Test with a known public Steam ID (Valve's official account)
      const testSteamId = '76561197960265728';
      
      const player = await this.getPlayerSummary(testSteamId);
      
      return {
        success: true,
        message: `Steam API connection successful. Test profile: ${player.personaname}`,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Steam API error',
      };
    }
  }

  /**
   * 📝 Get Steam profile from URL
   */
  static extractProfileFromURL(profileUrl: string): string | null {
    // Handle different Steam profile URL formats
    const patterns = [
      /steamcommunity\.com\/profiles\/(\d{17})/,    // Direct Steam ID
      /steamcommunity\.com\/id\/([^\/]+)/,          // Custom URL
    ];

    for (const pattern of patterns) {
      const match = profileUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Check if it's already a plain Steam ID
    if (/^\d{17}$/.test(profileUrl)) {
      return profileUrl;
    }

    return null;
  }
}

// 🏭 Export singleton instance
export const steamAPIService = new SteamAPIService();