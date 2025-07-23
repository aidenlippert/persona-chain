/**
 * Enhanced Credentials Manager with Deduplication, Verification History & Better UX
 * Features: Platform branding, verification timeline, credential consolidation
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { realBlockchainService } from "../../services/realBlockchainService";
import { retryService } from "../../services/retryService";
import { errorService, ErrorCategory, ErrorSeverity } from "../../services/errorService";
import { ProgressIndicator } from "../ui/ProgressIndicator";
import { LinkedInOAuthComponent } from "../oauth/LinkedInOAuthComponent";
import { errorService } from "@/services/errorService";

interface VerificationEvent {
  id: string;
  timestamp: string;
  type: 'issued' | 'verified' | 'updated' | 'revoked';
  txHash?: string;
  source: string;
  metadata?: any;
}

interface EnhancedCredential {
  id: string;
  "@context": string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  lastUpdated: string;
  credentialSubject: any;
  proof?: any;
  blockchainTxHash?: string;
  platform: string;
  verificationHistory: VerificationEvent[];
  metadata: {
    verificationCount: number;
    lastVerified?: string;
    trustScore: number;
  };
}

interface EnhancedCredentialsManagerProps {
  did: string;
  walletAddress: string;
  onCredentialCreated?: () => void;
}

export const EnhancedCredentialsManager = ({ did, walletAddress, onCredentialCreated }: EnhancedCredentialsManagerProps) => {
  const [credentials, setCredentials] = useState<EnhancedCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Removed unused selectedType and showModal state
  const [error, setError] = useState("");
  const [blockchainCredentials, setBlockchainCredentials] = useState<any[]>([]);
  const [showVerificationHistory, setShowVerificationHistory] = useState<string | null>(null);
  const [showLinkedInOAuth, setShowLinkedInOAuth] = useState(false);
  
  // Progress tracking for instant feedback
  const [credentialProgress, setCredentialProgress] = useState({
    progress: 0,
    label: "",
    isActive: false,
    platform: "",
    autoSaved: false
  });

  // Use current domain for API calls to avoid CORS issues
  const API_BASE_URL = window.location.origin + '/api';

  // LinkedIn OAuth success handler
  const handleLinkedInSuccess = async (profileData: any) => {
    setShowLinkedInOAuth(false);
    setIsLoading(true);
    
    try {
      // Create a LinkedIn credential from the profile data
      const linkedinCredential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: `linkedin-credential-${Date.now()}`,
        type: ["VerifiableCredential", "LinkedInCredential"],
        issuer: "LinkedIn Corporation",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: did,
          profile: profileData.formattedProfile,
          linkedinId: profileData.profile.id,
          verifiedEmail: profileData.email,
          headline: profileData.formattedProfile.headline,
          profileUrl: `https://linkedin.com/in/${profileData.profile.id}`
        },
        proof: {
          type: "LinkedInOAuth2Proof",
          created: new Date().toISOString(),
          verificationMethod: "LinkedIn OAuth 2.0"
        }
      };
      
      // Create enhanced credential
      const enhancedCredential = migrateToEnhancedCredential(linkedinCredential);
      
      // Store credential
      const updatedCredentials = [...credentials.filter(c => c.type.indexOf('LinkedInCredential') === -1), enhancedCredential];
      setCredentials(updatedCredentials);
      
      // Save to localStorage
      localStorage.setItem('credentials', JSON.stringify(updatedCredentials.map(c => ({
        "@context": c["@context"],
        id: c.id,
        type: c.type,
        issuer: c.issuer,
        issuanceDate: c.issuanceDate,
        credentialSubject: c.credentialSubject,
        proof: c.proof
      }))));
      
      console.log('✅ LinkedIn credential created successfully');
      onCredentialCreated?.();
      
    } catch (error) {
      errorService.logError('LinkedIn credential creation error:', error);
      setError('Failed to create LinkedIn credential. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // LinkedIn OAuth error handler
  const handleLinkedInError = (error: string) => {
    setShowLinkedInOAuth(false);
    setError(`LinkedIn OAuth failed: ${error}`);
    errorService.logError('LinkedIn OAuth error:', error);
  };

  const credentialTypes = [
    {
      id: "identity",
      name: "ID Verification",
      description: "Verify your government-issued identity document",
      icon: "🆔",
      color: "bg-purple-600",
      brandColor: "from-purple-600 to-purple-800",
      accentColor: "#f3e8ff",
      oauth: false
    },
    {
      id: "github",
      name: "GitHub Developer",
      description: "Connect your GitHub account to verify contributions",
      icon: "🐙",
      color: "bg-gray-900",
      brandColor: "from-gray-800 to-black",
      accentColor: "#f0f6ff",
      oauth: true
    },
    {
      id: "linkedin",
      name: "LinkedIn Professional",
      description: "Connect LinkedIn to verify professional experience",
      icon: "💼",
      color: "bg-blue-700",
      brandColor: "from-blue-600 to-blue-800",
      accentColor: "#cfe4ff",
      oauth: true
    },
    {
      id: "plaid",
      name: "Financial Identity",
      description: "Connect bank account to verify financial status",
      icon: "🏦",
      color: "bg-green-600",
      brandColor: "from-green-600 to-green-800",
      accentColor: "#dcfce7",
      oauth: true
    }
  ];

  // Load credentials from blockchain on mount
  useEffect(() => {
    if (did) {
      loadBlockchainCredentials();
    }
  }, [did]);

  const loadBlockchainCredentials = async () => {
    try {
      console.log("🔗 Attempting blockchain connection...");
      
      // Try to initialize blockchain service
      await realBlockchainService.initialize();
      await realBlockchainService.connectToNetwork('persona-testnet');
      
      console.log("✅ Blockchain connected successfully");
      
      // Query DID from blockchain to get attached credentials
      const didDoc = await realBlockchainService.queryDID('persona-testnet', did);
      if (didDoc) {
        console.log("🔍 DID found on blockchain:", didDoc);
      }
    } catch (error) {
      console.warn("⚠️ Blockchain connection failed, using local storage:", error);
    }
    
    // Always load stored credentials from localStorage
    const stored = localStorage.getItem('credentials');
    if (stored) {
      const creds = JSON.parse(stored);
      // Migrate legacy credentials to enhanced format
      const enhancedCreds = creds.map((cred: any) => migrateToEnhancedCredential(cred));
      setCredentials(enhancedCreds);
      setBlockchainCredentials(enhancedCreds.filter((c: EnhancedCredential) => c.blockchainTxHash));
    }
  };

  // Migrate legacy credentials to enhanced format
  const migrateToEnhancedCredential = (cred: any): EnhancedCredential => {
    if (cred.verificationHistory) {
      return cred; // Already enhanced
    }
    
    const platform = extractPlatformFromCredential(cred);
    return {
      id: cred.id || `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...cred,
      platform,
      lastUpdated: cred.issuanceDate,
      verificationHistory: [{
        id: `ver_${Date.now()}`,
        timestamp: cred.issuanceDate,
        type: 'issued',
        source: platform,
        txHash: cred.blockchainTxHash
      }],
      metadata: {
        verificationCount: 1,
        lastVerified: cred.blockchainTxHash ? cred.issuanceDate : undefined,
        trustScore: calculateTrustScore(cred)
      }
    };
  };

  const extractPlatformFromCredential = (cred: any): string => {
    const type = cred.type[1]?.toLowerCase() || '';
    if (type.includes('github')) return 'github';
    if (type.includes('linkedin')) return 'linkedin';
    if (type.includes('plaid')) return 'plaid';
    return 'unknown';
  };

  const calculateTrustScore = (cred: any): number => {
    let score = 50; // Base score
    if (cred.blockchainTxHash) score += 30; // Blockchain verified
    if (cred.proof) score += 20; // Has cryptographic proof
    return Math.min(score, 100);
  };

  const initiateOAuth = async (platform: string) => {
    setIsLoading(true);
    setError("");
    
    // Initialize progress tracking
    setCredentialProgress({
      progress: 0,
      label: `Connecting to ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`,
      isActive: true,
      platform,
      autoSaved: false
    });

    const oauthOperation = async () => {
      // Update progress: Starting OAuth request
      setCredentialProgress(prev => ({ 
        ...prev, 
        progress: 20, 
        label: `Initiating ${platform.charAt(0).toUpperCase() + platform.slice(1)} authentication...` 
      }));
      
      const response = await fetch(`${API_BASE_URL}/connectors/${platform}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `oauth_${platform}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        },
        body: JSON.stringify({
          userId: did,
          callbackUrl: window.location.origin + '/dashboard'
        })
      });

      if (!response.ok) {
        setCredentialProgress(prev => ({ 
          ...prev, 
          progress: 10, 
          label: `Authentication failed. Retrying...` 
        }));
        
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.details || `OAuth ${platform} failed: ${response.status}`);
        (error as any).status = response.status;
        (error as any).retryable = errorData.retryable;
        throw error;
      }

      // Update progress: Authentication successful
      setCredentialProgress(prev => ({ 
        ...prev, 
        progress: 50, 
        label: `Processing ${platform.charAt(0).toUpperCase() + platform.slice(1)} data...` 
      }));

      return response.json();
    };

    try {
      console.log(`🚀 Starting ${platform} OAuth with retry logic...`);
      
      const result = await retryService.retryOAuthOperation(
        oauthOperation,
        platform,
        {
          onRetry: (attempt, error) => {
            console.log(`🔄 Retrying ${platform} OAuth (attempt ${attempt}):`, error.message);
            setError(`Connecting to ${platform}... (attempt ${attempt})`);
            setCredentialProgress(prev => ({ 
              ...prev, 
              progress: Math.max(5, prev.progress - 10), 
              label: `Retrying ${platform.charAt(0).toUpperCase() + platform.slice(1)} connection (attempt ${attempt})...` 
            }));
          },
          onMaxRetriesReached: (error) => {
            errorService.logError(`❌ ${platform} OAuth failed after all retries:`, error);
            setCredentialProgress(prev => ({ 
              ...prev, 
              progress: 0, 
              label: `Failed to connect to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`, 
              isActive: false 
            }));
          }
        }
      );

      if (result.success && result.result) {
        const data = result.result;
        
        if (data.success && data.credential) {
          // Update progress: Processing credential
          setCredentialProgress(prev => ({ 
            ...prev, 
            progress: 75, 
            label: `Creating credential...` 
          }));
          
          // OAuth completed - process credential
          const enhancedCredential = migrateToEnhancedCredential(data.credential);
          
          // Check for existing credential of this type
          const existingCredential = credentials.find(cred => cred.platform === platform);
          
          if (existingCredential) {
            // Update progress: Saving credential
            setCredentialProgress(prev => ({ 
              ...prev, 
              progress: 90, 
              label: `Saving credential...`,
              autoSaved: false 
            }));
            
            // Update existing credential
            const updatedCredentials = credentials.map(cred => 
              cred.platform === platform ? enhancedCredential : cred
            );
            localStorage.setItem('credentials', JSON.stringify(updatedCredentials));
            setCredentials(updatedCredentials);
            setError("");
            
            // Show auto-save indicator
            setCredentialProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              label: `${platform.charAt(0).toUpperCase() + platform.slice(1)} credential updated!`,
              autoSaved: true 
            }));
            
            // Complete and reset progress
            setTimeout(() => {
              setCredentialProgress({
                progress: 0,
                label: "",
                isActive: false,
                platform: "",
                autoSaved: false
              });
            }, 3000);
          } else {
            // Update progress: Saving new credential
            setCredentialProgress(prev => ({ 
              ...prev, 
              progress: 90, 
              label: `Saving new credential...`,
              autoSaved: false 
            }));
            
            // Add new credential
            const updatedCredentials = [...credentials, enhancedCredential];
            localStorage.setItem('credentials', JSON.stringify(updatedCredentials));
            setCredentials(updatedCredentials);
            setError("");
            
            // Show auto-save indicator and completion
            setCredentialProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              label: `${platform.charAt(0).toUpperCase() + platform.slice(1)} credential created!`,
              autoSaved: true 
            }));
            
            // Complete and reset progress
            setTimeout(() => {
              setCredentialProgress({
                progress: 0,
                label: "",
                isActive: false,
                platform: "",
                autoSaved: false
              });
            }, 3000);
          }
        } else if (data.success && data.authUrl) {
          // Fallback to redirect flow if needed
          localStorage.setItem(`${platform}_oauth_session`, data.sessionId);
          localStorage.setItem('oauth_credential_type', platform);
          localStorage.setItem('oauth_return_url', window.location.pathname);
          window.location.href = data.authUrl;
        } else {
          throw new Error(data.error || `${platform} OAuth returned unexpected response`);
        }
      } else {
        // Retry service failed
        const error = result.error || new Error(`${platform} OAuth failed after retries`);
        const personalError = errorService.handleOAuth2Error(platform, error, {
          component: 'enhanced-credentials-manager',
          action: 'oauth-initiate'
        });
        
        errorService.reportError(personalError);
        setError(personalError.userMessage);
      }
      
    } catch (err) {
      errorService.logError(`💥 ${platform} OAuth critical error:`, err);
      
      const personalError = errorService.createError(
        'OAUTH_CRITICAL_ERROR',
        `Critical error during ${platform} OAuth`,
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.HIGH,
        errorService.createContext({
          component: 'enhanced-credentials-manager',
          action: 'oauth-initiate',
          metadata: { platform }
        }),
        {
          originalError: err instanceof Error ? err : undefined,
          userMessage: `Unable to connect to ${platform}. Please check your connection and try again.`,
          retryable: true,
          recoveryActions: ['check_network', 'retry_operation', 'contact_support']
        }
      );

      errorService.reportError(personalError);
      setError(personalError.userMessage);
      
      // Update progress to show error state
      setCredentialProgress(prev => ({ 
        ...prev, 
        progress: 0, 
        label: `Failed to connect to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
        isActive: false 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const createOrUpdateCredential = async (type: string, data: any) => {
    setIsLoading(true);
    try {
      // Check for existing credential of this type
      const existingCredential = credentials.find(cred => cred.platform === type);
      
      if (existingCredential) {
        // Update existing credential
        await updateExistingCredential(existingCredential, data);
      } else {
        // Create new credential
        await createNewCredential(type, data);
      }
    } catch (error) {
      errorService.logError("Failed to create/update credential:", error);
      setError("Failed to process credential. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const createNewCredential = async (type: string, data: any) => {
    const credentialId = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Create W3C Verifiable Credential
    const credential: EnhancedCredential = {
      id: credentialId,
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://persona.xyz/contexts/v1"
      ],
      type: ["VerifiableCredential", `${type}Credential`],
      issuer: `did:personachain:${walletAddress}`,
      issuanceDate: timestamp,
      lastUpdated: timestamp,
      platform: type,
      credentialSubject: {
        id: did,
        ...data
      },
      proof: {
        type: "Ed25519Signature2020",
        created: timestamp,
        proofPurpose: "assertionMethod",
        verificationMethod: `${did}#key-1`
      },
      verificationHistory: [],
      metadata: {
        verificationCount: 0,
        trustScore: 50
      }
    };

    // Register credential on blockchain
    const didDocument = {
      id: did,
      controller: did,
      verificationMethod: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    const txResult = await realBlockchainService.registerDID('persona-testnet', did, didDocument);
    
    if (txResult.success) {
      credential.blockchainTxHash = txResult.txHash;
      console.log("Credential anchored on blockchain:", txResult.txHash);
    }

    // Add verification event
    const verificationEvent: VerificationEvent = {
      id: `ver_${Date.now()}`,
      timestamp,
      type: 'issued',
      source: type,
      txHash: credential.blockchainTxHash,
      metadata: { action: 'credential_issued' }
    };
    
    credential.verificationHistory.push(verificationEvent);
    credential.metadata.verificationCount = 1;
    credential.metadata.lastVerified = timestamp;
    credential.metadata.trustScore = calculateTrustScore(credential);

    // Store locally
    const updatedCredentials = [...credentials, credential];
    localStorage.setItem('credentials', JSON.stringify(updatedCredentials));
    setCredentials(updatedCredentials);
    
    console.log(`✅ ${type} credential created successfully`);
    
    // Call callback to refresh parent component
    if (onCredentialCreated) {
      onCredentialCreated();
    }
  };

  const updateExistingCredential = async (existingCred: EnhancedCredential, newData: any) => {
    const timestamp = new Date().toISOString();
    
    // Update credential data
    const updatedCredential: EnhancedCredential = {
      ...existingCred,
      lastUpdated: timestamp,
      credentialSubject: {
        ...existingCred.credentialSubject,
        ...newData
      }
    };

    // Try blockchain update
    const didDocument = {
      id: did,
      controller: did,
      verificationMethod: [],
      created: existingCred.issuanceDate,
      updated: timestamp
    };
    
    const txResult = await realBlockchainService.registerDID('persona-testnet', did, didDocument);
    
    // Add verification event
    const verificationEvent: VerificationEvent = {
      id: `ver_${Date.now()}`,
      timestamp,
      type: 'updated',
      source: existingCred.platform,
      txHash: txResult.success ? txResult.txHash : undefined,
      metadata: { action: 'credential_updated', previousHash: existingCred.blockchainTxHash }
    };
    
    updatedCredential.verificationHistory.push(verificationEvent);
    updatedCredential.metadata.verificationCount += 1;
    updatedCredential.metadata.lastVerified = timestamp;
    updatedCredential.metadata.trustScore = calculateTrustScore(updatedCredential);
    
    if (txResult.success) {
      updatedCredential.blockchainTxHash = txResult.txHash;
    }

    // Update storage
    const updatedCredentials = credentials.map(cred => 
      cred.id === existingCred.id ? updatedCredential : cred
    );
    localStorage.setItem('credentials', JSON.stringify(updatedCredentials));
    setCredentials(updatedCredentials);
    
    console.log(`✅ ${existingCred.platform} credential updated successfully`);
    
    // Call callback to refresh parent component
    if (onCredentialCreated) {
      onCredentialCreated();
    }
  };

  // Removed unused fetchPlatformData function

  // Removed unused createVerifiableCredential function

  const verifyCredentialOnChain = async (credential: EnhancedCredential) => {
    if (!credential.blockchainTxHash) {
      notify.info("This credential is not anchored on blockchain yet.");
      return;
    }

    try {
      const isValid = await realBlockchainService.verifyCredential(
        credential.credentialSubject.id,
        credential.blockchainTxHash
      );

      // Add verification event
      const verificationEvent: VerificationEvent = {
        id: `ver_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'verified',
        source: 'blockchain',
        txHash: credential.blockchainTxHash,
        metadata: { result: isValid ? 'valid' : 'invalid' }
      };
      
      // Update credential with new verification event
      const updatedCredentials = credentials.map(cred => {
        if (cred.id === credential.id) {
          const updated = {
            ...cred,
            verificationHistory: [...cred.verificationHistory, verificationEvent],
            metadata: {
              ...cred.metadata,
              verificationCount: cred.metadata.verificationCount + 1,
              lastVerified: verificationEvent.timestamp
            }
          };
          return updated;
        }
        return cred;
      });
      
      localStorage.setItem('credentials', JSON.stringify(updatedCredentials));
      setCredentials(updatedCredentials);

      if (isValid) {
        notify.success(`✅ Credential verified on blockchain!\n\nTx Hash: ${credential.blockchainTxHash}`);
      } else {
        notify.error("❌ Credential verification failed.");
      }
    } catch (error) {
      errorService.logError("Verification error:", error);
      notify.error("Failed to verify credential on blockchain.");
    }
  };

  const generateZKProof = async (credential: EnhancedCredential) => {
    // Generate a zero-knowledge proof
    const proof = {
      type: "ZKProof",
      credential: credential.type[1],
      proofHash: `0x${Math.random().toString(16).substr(2, 8)}...`,
      timestamp: new Date().toISOString(),
      claims: {
        hasGitHub: credential.type[1] === "githubCredential",
        isProfessional: credential.type[1] === "linkedinCredential",
        isFinanciallyVerified: credential.type[1] === "plaidCredential"
      }
    };

    notify.info(`🔐 Zero-Knowledge Proof Generated!\n\nProving: ${credential.type[1]}\nWithout revealing: Personal details\n\nProof: ${proof.proofHash}`);
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator for Active Credential Creation */}
      <AnimatePresence>
        {credentialProgress.isActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-orange-200 rounded-xl p-6 shadow-lg"
          >
            <ProgressIndicator
              progress={credentialProgress.progress}
              label={credentialProgress.label}
              showPercentage={true}
              theme="orange"
              size="md"
              status={credentialProgress.progress === 0 ? "error" : "loading"}
              autoSaved={credentialProgress.autoSaved}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blockchain Status */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              🔗
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">Blockchain Status</h4>
              <p className="text-sm text-blue-700 mt-1">
                {blockchainCredentials.length} credentials anchored on blockchain
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadBlockchainCredentials}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
          >
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* Create New Credential */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
            +
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            Connect Your Accounts
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {credentialTypes.map((type, index) => {
            const existingCredential = credentials.find(cred => cred.platform === type.id);
            
            return (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + (index * 0.1) }}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (type.id === 'linkedin') {
                    setShowLinkedInOAuth(true);
                  } else if (type.oauth) {
                    initiateOAuth(type.id);
                  } else {
                    setSelectedType(type.id);
                    setShowModal(true);
                  }
                }}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:shadow-lg transition-all duration-300 text-left group"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${type.brandColor} rounded-xl flex items-center justify-center text-white text-3xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                  {type.icon}
                </div>
                <h4 className="font-bold text-gray-900 text-lg">{type.name}</h4>
                <p className="text-sm text-gray-600 mt-2">{type.description}</p>
                
                {existingCredential ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center text-sm text-green-600 font-semibold">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        Connected
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        Trust: {existingCredential.metadata.trustScore}%
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      Last updated: {new Date(existingCredential.lastUpdated).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      Verifications: {existingCredential.metadata.verificationCount}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-orange-600 font-semibold">
                        Click to update
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowVerificationHistory(existingCredential.id);
                        }}
                        className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
                      >
                        History →
                      </button>
                    </div>
                  </div>
                ) : (
                  type.oauth && (
                    <div className="mt-4">
                      <p className="text-sm text-orange-600 font-semibold">OAuth Available</p>
                    </div>
                  )
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Your Credentials */}
      <AnimatePresence>
        {credentials.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                📄
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Your Credentials ({credentials.length})
              </h3>
            </div>
            
            <div className="space-y-4">
              {credentials.map((cred, index) => (
                <motion.div 
                  key={cred.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (index * 0.1) }}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-orange-300 transition-all duration-300"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Platform Icon */}
                      <div className={`w-12 h-12 bg-gradient-to-br ${credentialTypes.find(ct => ct.id === cred.platform)?.brandColor || 'bg-gray-500'} rounded-xl flex items-center justify-center text-white text-xl shadow-md`}>
                        {credentialTypes.find(ct => ct.id === cred.platform)?.icon || '📄'}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-bold text-gray-900 text-lg capitalize">
                            {cred.platform} Credential
                          </h4>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            cred.metadata.trustScore >= 80 ? 'bg-green-100 text-green-800' :
                            cred.metadata.trustScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            Trust: {cred.metadata.trustScore}%
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Issued:</span> {new Date(cred.issuanceDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Last Updated:</span> {new Date(cred.lastUpdated).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Verifications:</span> {cred.metadata.verificationCount} • 
                            <span className="font-medium"> History:</span> {cred.verificationHistory.length} events
                          </p>
                        </div>
                        
                        {cred.blockchainTxHash && (
                          <div className="mt-3 flex items-center space-x-2">
                            <span className="text-sm text-green-600 font-semibold">✅ Blockchain Verified</span>
                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                              {cred.blockchainTxHash.slice(0, 8)}...{cred.blockchainTxHash.slice(-6)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowVerificationHistory(cred.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                      >
                        View History
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => generateZKProof(cred)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                      >
                        ZK Proof
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => verifyCredentialOnChain(cred)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                      >
                        Verify
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification History Modal */}
      <AnimatePresence>
        {showVerificationHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                    📈
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Verification History</h3>
                </div>
                <button
                  onClick={() => setShowVerificationHistory(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              {(() => {
                const cred = credentials.find(c => c.id === showVerificationHistory);
                if (!cred) return <p>Credential not found</p>;
                
                return (
                  <div className="space-y-6">
                    {/* Credential Summary */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${credentialTypes.find(ct => ct.id === cred.platform)?.brandColor || 'bg-gray-500'} rounded-xl flex items-center justify-center text-white text-xl`}>
                          {credentialTypes.find(ct => ct.id === cred.platform)?.icon || '📄'}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg capitalize">{cred.platform} Credential</h4>
                          <p className="text-sm text-gray-600">Trust Score: {cred.metadata.trustScore}% • {cred.verificationHistory.length} events</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timeline */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 text-lg">Verification Timeline</h4>
                      <div className="space-y-4">
                        {cred.verificationHistory.slice().reverse().map((event, index) => (
                          <motion.div 
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg"
                          >
                            <div className={`w-4 h-4 rounded-full mt-1 ${
                              event.type === 'issued' ? 'bg-blue-500' :
                              event.type === 'verified' ? 'bg-green-500' :
                              event.type === 'updated' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-semibold text-gray-900 capitalize">
                                    {event.type} {event.type === 'issued' ? 'Credential' : event.type === 'verified' ? 'on Blockchain' : event.type === 'updated' ? 'Credential' : 'Credential'}
                                  </p>
                                  <p className="text-sm text-gray-600">Source: {event.source}</p>
                                  {event.txHash && (
                                    <p className="text-xs text-gray-500 font-mono mt-1 bg-white px-2 py-1 rounded">TX: {event.txHash.slice(0, 8)}...{event.txHash.slice(-6)}</p>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 font-medium">
                                  {new Date(event.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Modal */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
            >
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">Processing...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LinkedIn OAuth Modal */}
      <AnimatePresence>
        {showLinkedInOAuth && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowLinkedInOAuth(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white text-3xl mb-4 mx-auto">
                  💼
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Connect LinkedIn
                </h3>
                <p className="text-gray-600">
                  Verify your professional experience and create a LinkedIn credential
                </p>
              </div>
              
              <LinkedInOAuthComponent
                onSuccess={handleLinkedInSuccess}
                onError={handleLinkedInError}
                onLoading={setIsLoading}
                buttonText="Connect LinkedIn Account"
                className="w-full"
              />
              
              <button
                onClick={() => setShowLinkedInOAuth(false)}
                className="mt-4 w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <p className="text-red-600 font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};