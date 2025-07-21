/**
 * Keplr Wallet Integration Service
 * Handles connection, authentication, and signing with Keplr wallet
 */

import { Window as KeplrWindow } from "@keplr-wallet/types";
import { ChainInfo } from "@keplr-wallet/types";
import { DIDService, DIDKeyPair } from "./didService";
import { blockchainPersistenceService } from "./blockchainPersistenceService";
import { errorService } from "@/services/errorService";

declare global {
  interface Window extends KeplrWindow {}
}

export interface KeplrAccount {
  address: string;
  pubKey: Uint8Array;
  name: string;
  algo: string;
  bech32Address: string;
}

export interface PersonaChainConfig {
  chainId: string;
  chainName: string;
  rpc: string;
  rest: string;
  bip44: { coinType: number };
  bech32Config: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
  currencies: Array<{
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
    coinGeckoId?: string;
  }>;
  feeCurrencies: Array<{
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
    coinGeckoId?: string;
    gasPriceStep?: {
      low: number;
      average: number;
      high: number;
    };
  }>;
  stakeCurrency: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
    coinGeckoId?: string;
  };
}

export class KeplrService {
  private static instance: KeplrService;
  private keplr: any = null;
  private chainConfig: PersonaChainConfig;
  private currentAccount: KeplrAccount | null = null;

  private constructor() {
    // Initialize with LIVE PUBLIC PersonaChain blockchain
    this.chainConfig = {
      chainId: import.meta.env.VITE_CHAIN_ID || "personachain-1",
      chainName: "PersonaChain",
      rpc:
        import.meta.env.VITE_BLOCKCHAIN_RPC || "https://personachain-proxy.aidenlippert.workers.dev",
      rest:
        import.meta.env.VITE_BLOCKCHAIN_REST || "https://personachain-proxy.aidenlippert.workers.dev/api",
      bip44: {
        coinType: 118,
      },
      bech32Config: {
        bech32PrefixAccAddr: "persona",
        bech32PrefixAccPub: "personapub",
        bech32PrefixValAddr: "personavaloper",
        bech32PrefixValPub: "personavaloperpub",
        bech32PrefixConsAddr: "personavalcons",
        bech32PrefixConsPub: "personavalconspub",
      },
      currencies: [
        {
          coinDenom: "PERSONA",
          coinMinimalDenom: "upersona",
          coinDecimals: 6,
          coinGeckoId: "persona",
        },
      ],
      feeCurrencies: [
        {
          coinDenom: "PERSONA",
          coinMinimalDenom: "upersona",
          coinDecimals: 6,
          coinGeckoId: "persona",
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.04,
          },
        },
      ],
      stakeCurrency: {
        coinDenom: "PERSONA",
        coinMinimalDenom: "upersona",
        coinDecimals: 6,
        coinGeckoId: "persona",
      },
    };
  }

  static getInstance(): KeplrService {
    if (!KeplrService.instance) {
      KeplrService.instance = new KeplrService();
    }
    return KeplrService.instance;
  }

  /**
   * Check if Keplr is installed
   */
  isKeplrInstalled(): boolean {
    return typeof window !== "undefined" && !!window.keplr;
  }

  /**
   * Initialize Keplr connection
   */
  async initialize(): Promise<void> {
    if (!this.isKeplrInstalled()) {
      throw new Error("Keplr wallet extension is not installed");
    }

    try {
      this.keplr = window.keplr;

      // Suggest the chain to Keplr
      await this.keplr.experimentalSuggestChain(this.chainConfig);

      // Enable the chain
      await this.keplr.enable(this.chainConfig.chainId);

      console.log("✅ Keplr initialized successfully");
    } catch (error) {
      errorService.logError("❌ Keplr initialization failed:", error);
      throw new Error(
        `Failed to initialize Keplr: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Connect to Keplr wallet
   */
  async connect(): Promise<KeplrAccount> {
    if (!this.keplr) {
      await this.initialize();
    }

    try {
      // Request account access
      const accounts = await this.keplr.getKey(this.chainConfig.chainId);

      const account: KeplrAccount = {
        address: accounts.bech32Address,
        pubKey: accounts.pubKey,
        name: accounts.name,
        algo: accounts.algo,
        bech32Address: accounts.bech32Address,
      };

      this.currentAccount = account;

      console.log("✅ Connected to Keplr wallet:", {
        address: account.address,
        name: account.name,
        algo: account.algo,
      });

      return account;
    } catch (error) {
      errorService.logError("❌ Keplr connection failed:", error);
      throw new Error(
        `Failed to connect to Keplr: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Sign message with Keplr
   */
  async signMessage(message: string): Promise<{
    signature: string;
    pubKey: Uint8Array;
  }> {
    if (!this.keplr || !this.currentAccount) {
      throw new Error("Keplr not connected");
    }

    try {
      const signature = await this.keplr.signArbitrary(
        this.chainConfig.chainId,
        this.currentAccount.address,
        message,
      );

      return {
        signature: signature.signature,
        pubKey: signature.pub_key.value,
      };
    } catch (error) {
      errorService.logError("❌ Message signing failed:", error);
      throw new Error(
        `Failed to sign message: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create DID from Keplr account
   */
  async createDIDFromKeplr(): Promise<DIDKeyPair> {
    if (!this.currentAccount) {
      throw new Error("No Keplr account connected");
    }

    try {
      // Create a deterministic seed from Keplr account (FIXED: removed Date.now() for consistent DIDs)
      const seed = `persona-did-${this.currentAccount.address}`;

      // Generate DID from seed
      const didKeyPair = await DIDService.generateDIDFromSeed(seed);

      console.log("✅ DID created from Keplr account:", {
        did: didKeyPair.did,
        keplrAddress: this.currentAccount.address,
      });

      return didKeyPair;
    } catch (error) {
      errorService.logError("❌ DID creation from Keplr failed:", error);
      throw new Error(
        `Failed to create DID from Keplr: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Register DID on blockchain using Keplr
   */
  async registerDIDOnChain(didKeyPair: DIDKeyPair): Promise<void> {
    if (!this.keplr || !this.currentAccount) {
      throw new Error("Keplr not connected");
    }

    try {
      // Initialize blockchain service
      await blockchainPersistenceService.initialize({
        rpcUrl: this.chainConfig.rpc,
        chainId: 1337, // Default to testnet chain ID
        registryAddress:
          import.meta.env.VITE_DID_REGISTRY_ADDRESS ||
          (() => { throw new Error("DID_REGISTRY_ADDRESS not configured - set VITE_DID_REGISTRY_ADDRESS environment variable"); })(),
        useHSM: false,
      });

      // Register DID on blockchain
      await blockchainPersistenceService.registerDID(didKeyPair);

      console.log("✅ DID registered on blockchain via Keplr");
    } catch (error) {
      errorService.logError("❌ DID blockchain registration failed:", error);
      throw new Error(
        `Failed to register DID on blockchain: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get current account
   */
  getCurrentAccount(): KeplrAccount | null {
    return this.currentAccount;
  }

  /**
   * Disconnect from Keplr
   */
  async disconnect(): Promise<void> {
    this.currentAccount = null;
    this.keplr = null;
    console.log("✅ Disconnected from Keplr wallet");
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{
    denom: string;
    amount: string;
  }> {
    if (!this.keplr || !this.currentAccount) {
      throw new Error("Keplr not connected");
    }

    try {
      const balances = await this.keplr.getBalance(
        this.chainConfig.chainId,
        this.currentAccount.address,
      );

      return {
        denom: balances.denom,
        amount: balances.amount,
      };
    } catch (error) {
      errorService.logError("❌ Balance fetch failed:", error);
      throw new Error(
        `Failed to get balance: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create recovery phrase backup
   */
  async createRecoveryPhrase(): Promise<{
    phrase: string;
    entropy: Uint8Array;
  }> {
    try {
      // Generate a 24-word mnemonic for recovery
      const entropy = crypto.getRandomValues(new Uint8Array(32));

      // Simple word list for demonstration (in production, use BIP39 wordlist)
      const wordList = [
        "abandon",
        "ability",
        "able",
        "about",
        "above",
        "absent",
        "absorb",
        "abstract",
        "absurd",
        "abuse",
        "access",
        "accident",
        "account",
        "accuse",
        "achieve",
        "acid",
        "acoustic",
        "acquire",
        "across",
        "act",
        "action",
        "actor",
        "actress",
        "actual",
        "adapt",
        "add",
        "addict",
        "address",
        "adjust",
        "admit",
        "adult",
        "advance",
        "advice",
        "aerobic",
        "affair",
        "afford",
        "afraid",
        "again",
        "against",
        "age",
        "agent",
        "agree",
        "ahead",
        "aim",
        "air",
        "airport",
        "aisle",
        "alarm",
        "album",
        "alcohol",
        "alert",
        "alien",
        "all",
        "alley",
        "allow",
        "almost",
        "alone",
        "alpha",
        "already",
        "also",
        "alter",
        "always",
        "amateur",
        "amazing",
        "among",
        "amount",
        "amused",
        "analyst",
        "anchor",
        "ancient",
        "anger",
        "angle",
        "angry",
        "animal",
        "ankle",
        "announce",
        "annual",
        "another",
        "answer",
        "antenna",
        "antique",
        "anxiety",
        "any",
        "apart",
        "apology",
        "appear",
        "apple",
        "approve",
        "april",
        "arch",
        "arctic",
        "area",
        "arena",
        "argue",
        "arm",
        "armed",
        "armor",
        "army",
        "around",
        "arrange",
        "arrest",
        "arrive",
        "arrow",
        "art",
        "article",
        "artist",
        "artwork",
        "ask",
        "aspect",
        "assault",
        "asset",
        "assist",
        "assume",
        "asthma",
        "athlete",
        "atom",
        "attack",
        "attend",
        "attitude",
        "attract",
        "auction",
        "audit",
        "august",
        "aunt",
        "author",
        "auto",
        "autumn",
        "average",
        "avocado",
        "avoid",
        "awake",
        "aware",
        "away",
        "awesome",
        "awful",
        "awkward",
      ];

      // Generate 24 words from entropy
      const words: string[] = [];
      for (let i = 0; i < 24; i++) {
        const index = entropy[i] % wordList.length;
        words.push(wordList[index]);
      }

      const phrase = words.join(" ");

      console.log("✅ Recovery phrase generated");

      return {
        phrase,
        entropy,
      };
    } catch (error) {
      errorService.logError("❌ Recovery phrase generation failed:", error);
      throw new Error(
        `Failed to generate recovery phrase: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Listen for account changes
   */
  onAccountChange(callback: (account: KeplrAccount | null) => void): void {
    if (this.keplr) {
      window.addEventListener("keplr_keystorechange", async () => {
        try {
          const account = await this.connect();
          callback(account);
        } catch (error) {
          errorService.logError("Account change error:", error);
          callback(null);
        }
      });
    }
  }

  /**
   * Get chain configuration
   */
  getChainConfig(): PersonaChainConfig {
    return this.chainConfig;
  }
}

export const keplrService = KeplrService.getInstance();
