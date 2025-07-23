/**
 * Identity Manager - Simple DID Creation & Management
 * Clean interface for creating and managing decentralized identities
 */

import { useState, useEffect } from "react";
import { PersonaWallet } from "../../services/personaChainService";

interface IdentityManagerProps {
  wallet: PersonaWallet | null;
}

export const IdentityManager: React.FC<IdentityManagerProps> = ({ wallet }) => {
  // Use existing DID from wallet instead of creating new one
  const [currentDID, setCurrentDID] = useState<string | null>(
    wallet?.did || null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update DID when wallet changes
  useEffect(() => {
    if (wallet?.did) {
      setCurrentDID(wallet.did);
    }
  }, [wallet?.did]);

  const generateDID = async () => {
    setIsGenerating(true);

    // Simulate DID generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const newDID = `did:key:z6Mk${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setCurrentDID(newDID);
    setIsGenerating(false);
  };

  const copyToClipboard = async () => {
    if (currentDID) {
      await navigator.clipboard.writeText(currentDID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Your Digital Identity
        </h1>
        <p className="text-gray-600 text-lg">
          {wallet?.did
            ? "Manage your decentralized identifier (DID)"
            : "Create and manage your decentralized identifier (DID)"}
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {!currentDID ? (
          /* Create Identity Card */
          <div className="bg-white rounded-lg p-12 border border-gray-200 shadow-sm text-center">
            <h2 className="text-3xl font-light text-gray-900 mb-6 tracking-tight">
              Create Identity
            </h2>
            <p className="text-gray-600 mb-12 max-w-md mx-auto text-lg leading-relaxed">
              Generate your decentralized identifier
            </p>

            <button
              onClick={generateDID}
              disabled={isGenerating}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-4 px-12 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              {isGenerating ? (
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing</span>
                </div>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        ) : (
          /* Identity Display Card */
          <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-light text-gray-900 tracking-tight">
                Active Identity
              </h2>
              <div className="bg-gray-900 text-white px-4 py-2 rounded-md text-xs font-medium uppercase tracking-wider">
                Live
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                    Identifier
                  </p>
                  <p className="text-gray-900 font-mono text-sm break-all">
                    {currentDID}
                  </p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="ml-4 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-xs font-medium uppercase tracking-wider transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="border-r border-gray-200 pr-6">
                <div className="text-2xl font-light text-gray-900 mb-1">1</div>
                <div className="text-gray-500 text-xs uppercase tracking-wider">
                  Credentials
                </div>
              </div>
              <div className="border-r border-gray-200 pr-6">
                <div className="text-2xl font-light text-gray-900 mb-1">0</div>
                <div className="text-gray-500 text-xs uppercase tracking-wider">
                  Shared
                </div>
              </div>
              <div>
                <div className="text-2xl font-light text-gray-900 mb-1">∞</div>
                <div className="text-gray-500 text-xs uppercase tracking-wider">
                  Control
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {[
          {
            title: "Self-Sovereign",
            description:
              "Complete ownership and control of your digital identity",
          },
          {
            title: "Interoperable",
            description: "Works seamlessly across platforms and services",
          },
          {
            title: "Privacy-First",
            description: "Selective disclosure with zero-knowledge proofs",
          },
        ].map((feature, index) => (
          <div key={index} className="text-center py-8">
            <h3 className="text-lg font-light text-gray-900 mb-3 tracking-tight">
              {feature.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
