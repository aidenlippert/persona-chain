/**
 * Real Dashboard with DID and Credential Management
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storageService } from "../../services/storageService";
import { didService, DIDKeyPair } from "../../services/didService";
import { personaChainService } from "../../services/personaChainService";
import { vcManagerService } from "../../services/vcManagerService";
import type { VerifiableCredential } from "../../types/credentials";
import { errorService } from "@/services/errorService";
// Using console for logging in production

export const RealDashboard = () => {
  const navigate = useNavigate();
  const [didKeyPair, setDidKeyPair] = useState<DIDKeyPair | null>(null);
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [showCreateCredential, setShowCreateCredential] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Check if onboarding completed
      const onboardingCompleted = await storageService.getItem('onboarding_completed');
      if (!onboardingCompleted) {
        navigate('/onboarding');
        return;
      }

      // Load wallet address
      const address = await storageService.getItem('wallet_address') || '';
      setWalletAddress(address);

      // Load DID
      const currentDID = await storageService.getCurrentDID();
      if (currentDID) {
        const did = await storageService.getDID(currentDID);
        if (did) {
          setDidKeyPair(did);
        }
      }

      // Load credentials
      const storedCreds = await storageService.getCredentials();
      setCredentials(storedCreds);

      setIsLoading(false);
    } catch (error) {
      errorService.logError("Failed to load user data", error);
      setIsLoading(false);
    }
  };

  const handleCreateBasicCredential = async () => {
    if (!didKeyPair) return;

    try {
      const credential = await vcManagerService.createVC({
        type: ['VerifiableCredential', 'BasicIdentityCredential'],
        issuer: didKeyPair.did,
        holder: didKeyPair.did,
        claims: {
          id: didKeyPair.did,
          name: "PersonaPass User",
          walletAddress: walletAddress,
          createdAt: new Date().toISOString()
        }
      });

      await storageService.storeCredential(credential);
      await loadUserData(); // Reload to show new credential
      setShowCreateCredential(false);
    } catch (error) {
      errorService.logError("Failed to create credential", error);
      notify.error("Failed to create credential");
    }
  };

  const handleVerifyDID = async () => {
    if (!didKeyPair) return;

    try {
      const didDoc = await personaChainService.queryDID(didKeyPair.did);
      if (didDoc) {
        notify.success("✅ Your DID is verified on PersonaChain!");
      } else {
        notify.info("❌ DID not found on chain. It may still be processing.");
      }
    } catch (error) {
      errorService.logError("Failed to verify DID", error);
      notify.error("Failed to verify DID");
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      storageService.clear();
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your identity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-gray-900">PersonaPass Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* DID Section */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Digital Identity</h2>
          {didKeyPair ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">DID:</p>
                  <p className="font-mono text-sm text-gray-900">
                    {didKeyPair.did.slice(0, 30)}...{didKeyPair.did.slice(-20)}
                  </p>
                </div>
                <button
                  onClick={handleVerifyDID}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Verify on Chain
                </button>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-green-600">Active</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No DID found</p>
          )}
        </div>

        {/* Credentials Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Verifiable Credentials</h2>
            <button
              onClick={() => setShowCreateCredential(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Create Credential
            </button>
          </div>

          {credentials.length > 0 ? (
            <div className="space-y-3">
              {credentials.map((cred, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {cred.type[cred.type.length - 1]}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Issued: {new Date(cred.issuanceDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      Valid
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No credentials yet. Create your first credential to get started.
            </p>
          )}
        </div>

        {/* Create Credential Modal */}
        {showCreateCredential && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create Basic Identity Credential
              </h3>
              <p className="text-gray-600 mb-6">
                This will create a basic identity credential that proves your DID ownership.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateCredential(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBasicCredential}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};