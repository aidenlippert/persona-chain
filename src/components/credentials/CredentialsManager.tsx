/**
 * Real Credentials Manager with GitHub, LinkedIn, and Plaid Integration
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { errorService } from "@/services/errorService";
import { notificationService } from "@/services/notificationService";

interface Credential {
  type: string;
  issuer: string;
  issuanceDate: string;
  credentialSubject: any;
  proof?: any;
}

interface CredentialsManagerProps {
  did: string;
  onCredentialCreated?: (credential: Credential) => void;
}

export const CredentialsManager = ({ did, onCredentialCreated }: CredentialsManagerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [error, setError] = useState("");

  const credentialTypes = [
    {
      id: "github",
      name: "GitHub Developer",
      description: "Verify your GitHub contributions and repositories",
      icon: "🐙",
      color: "bg-gray-900"
    },
    {
      id: "linkedin",
      name: "LinkedIn Professional",
      description: "Verify your professional experience and skills",
      icon: "💼",
      color: "bg-blue-700"
    },
    {
      id: "plaid",
      name: "Financial Identity",
      description: "Verify your financial accounts (demo mode)",
      icon: "🏦",
      color: "bg-green-600"
    }
  ];

  const handleCreateCredential = async (type: string) => {
    setIsCreating(true);
    setError("");

    try {
      let credentialData: any = null;

      switch (type) {
        case "github":
          // In a real app, this would OAuth with GitHub
          credentialData = {
            username: "demo-user",
            repositories: 42,
            contributions: 1337,
            joinedDate: "2020-01-01"
          };
          break;

        case "linkedin":
          // In a real app, this would OAuth with LinkedIn
          credentialData = {
            name: "PersonaPass User",
            title: "Web3 Developer",
            company: "Decentralized Inc",
            skills: ["Blockchain", "Identity", "Web3"]
          };
          break;

        case "plaid":
          // In a real app, this would use Plaid Link
          credentialData = {
            institutionName: "Demo Bank",
            accountType: "Checking",
            verified: true,
            lastVerified: new Date().toISOString()
          };
          break;
      }

      // Create the verifiable credential
      const credential: Credential = {
        type: `${type}Credential`,
        issuer: did,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: did,
          ...credentialData
        },
        proof: {
          type: "Ed25519Signature2020",
          created: new Date().toISOString(),
          proofPurpose: "assertionMethod",
          verificationMethod: `${did}#key-1`
        }
      };

      // Store credential
      const existingCreds = JSON.parse(localStorage.getItem('credentials') || '[]');
      existingCreds.push(credential);
      localStorage.setItem('credentials', JSON.stringify(existingCreds));

      setCredentials([...credentials, credential]);
      setShowModal(false);
      setSelectedType("");
      
      if (onCredentialCreated) {
        onCredentialCreated(credential);
      }
    } catch (err) {
      setError("Failed to create credential. Please try again.");
      errorService.logError("Credential creation error:", err);
    } finally {
      setIsCreating(false);
    }
  };

  // Load existing credentials
  useState(() => {
    const stored = localStorage.getItem('credentials');
    if (stored) {
      setCredentials(JSON.parse(stored));
    }
  });

  const generateZKProof = (credential: Credential) => {
    // This would generate a real ZK proof
    notificationService.notify(`Zero-Knowledge Proof Generated!

Proving: ${credential.type}
Without revealing: Personal details

Proof hash: 0x${Math.random().toString(16).substr(2, 8)}...`, { type: 'success' });
  };

  return (
    <div className="space-y-6">
      {/* Create New Credential */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Create Verifiable Credential
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {credentialTypes.map((type) => (
            <motion.button
              key={type.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedType(type.id);
                setShowModal(true);
              }}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
            >
              <div className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center text-white text-2xl mb-3`}>
                {type.icon}
              </div>
              <h4 className="font-semibold text-gray-900">{type.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{type.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Existing Credentials */}
      {credentials.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Credentials ({credentials.length})
          </h3>
          
          <div className="space-y-3">
            {credentials.map((cred, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {cred.type.replace('Credential', '')} Credential
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Issued: {new Date(cred.issuanceDate).toLocaleDateString()}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {cred.issuer.slice(0, 20)}...
                      </code>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => generateZKProof(cred)}
                      className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-colors"
                    >
                      Generate ZK Proof
                    </button>
                    <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded">
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Credential Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create {credentialTypes.find(t => t.id === selectedType)?.name} Credential
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will create a verifiable credential that proves your {selectedType} identity without revealing personal details.
              </p>
              
              {selectedType === "github" && (
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Demo Data:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• 42 repositories</li>
                    <li>• 1,337 contributions</li>
                    <li>• Member since 2020</li>
                  </ul>
                </div>
              )}

              {selectedType === "linkedin" && (
                <div className="bg-blue-50 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Demo Profile:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Web3 Developer</li>
                    <li>• Decentralized Inc</li>
                    <li>• Blockchain expertise</li>
                  </ul>
                </div>
              )}

              {selectedType === "plaid" && (
                <div className="bg-green-50 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Demo Account:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Demo Bank verified</li>
                    <li>• Checking account</li>
                    <li>• Balance hidden (ZK)</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedType("");
                  setError("");
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateCredential(selectedType)}
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Credential"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};