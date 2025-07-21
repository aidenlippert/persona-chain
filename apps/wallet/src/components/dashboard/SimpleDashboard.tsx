/**
 * Simplified Dashboard with Basic Functionality
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RealCredentialsManager } from "../credentials/RealCredentialsManager";

export const SimpleDashboard = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState("");
  const [did, setDid] = useState("");

  useEffect(() => {
    // Check if onboarding completed
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      navigate('/onboarding');
      return;
    }

    // Load wallet address and DID
    const address = localStorage.getItem('wallet_address') || '';
    const storedDid = localStorage.getItem('did') || '';
    setWalletAddress(address);
    setDid(storedDid);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-gray-900">PersonaPass Dashboard</h1>
            <div className="flex items-center space-x-4">
              {walletAddress && (
                <span className="text-sm text-gray-600">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </span>
              )}
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
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Welcome to PersonaPass!</h2>
          <p className="text-gray-600">
            Your decentralized identity wallet is ready. You can now:
          </p>
          <ul className="mt-4 space-y-2 text-gray-600">
            <li>• Create and manage verifiable credentials</li>
            <li>• Generate zero-knowledge proofs</li>
            <li>• Connect to decentralized applications</li>
            <li>• Control your digital identity</li>
          </ul>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Digital Identity</h3>
            {did ? (
              <>
                <p className="text-gray-600 mb-2">Your DID:</p>
                <p className="font-mono text-xs text-gray-800 break-all mb-4">{did}</p>
                <div className="text-sm text-green-600">✅ Active</div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">No DID found</p>
                <button 
                  onClick={() => navigate('/onboarding')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Create DID →
                </button>
              </>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Credentials</h3>
            <p className="text-gray-600 mb-4">Verifiable credentials linked to your DID</p>
            <div className="text-sm text-blue-600">📄 See below</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ZK Proofs</h3>
            <p className="text-gray-600 mb-4">Privacy-preserving verification</p>
            <div className="text-sm text-green-600">✅ Ready</div>
          </div>
        </div>

        {/* Credentials Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Verifiable Credentials</h2>
          {did && walletAddress ? (
            <RealCredentialsManager did={did} walletAddress={walletAddress} />
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800">
                Please complete onboarding to create credentials.
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Real Blockchain Integration
          </h3>
          <p className="text-blue-700">
            This wallet connects to the PersonaChain blockchain for decentralized identity management.
            Your DID will be anchored on-chain for maximum security and portability.
          </p>
        </div>
      </main>
    </div>
  );
};