import React, { useState, useEffect } from "react";
import { useWalletStore } from "../../store/walletStore";
import { CredentialCard } from "./CredentialCard";
import { ConnectorGrid } from "./ConnectorButton";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { FaPlus, FaShieldAlt } from "react-icons/fa";

interface ImportedCredential {
  id: string;
  platform: string;
  type: string;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: any;
  zkCommitment?: {
    commitment: string;
    nullifier: string;
  };
  status: "active" | "expired" | "revoked";
}

// Removed unused getApiUrl import
import { errorService } from "@/services/errorService";
export const CredentialsDashboard: React.FC = () => {
  const { addNotification } = useWalletStore();
  const [loading, setLoading] = useState(true);
  const [showConnectors, setShowConnectors] = useState(false);
  const [, setSelectedCredential] = useState<ImportedCredential | null>(null);
  const [importedCredentials, setImportedCredentials] = useState<
    ImportedCredential[]
  >([]);

  useEffect(() => {
    loadImportedCredentials();
  }, []);

  const loadImportedCredentials = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const userId = localStorage.getItem("user_id");

      if (!token || !userId) {
        setLoading(false);
        return;
      }

      // Load credentials from all connected platforms
      const platforms = [
        "github",
        "linkedin",
        "orcid",
        "plaid",
        "twitter",
        "stackexchange",
      ];
      const credentialPromises = platforms.map(async (platform) => {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_CONNECTOR_API_URL}/api/v1/${platform}/credential/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.ok) {
            const data = await response.json();
            return {
              ...data.credential,
              platform,
              zkCommitment: data.zkCommitment,
              status:
                new Date(data.credential.expirationDate) > new Date()
                  ? "active"
                  : "expired",
            };
          }
          return null;
        } catch (error) {
          errorService.logError(`Failed to load ${platform} credential:`, error);
          return null;
        }
      });

      const results = await Promise.all(credentialPromises);
      const validCredentials = results.filter(Boolean) as ImportedCredential[];
      setImportedCredentials(validCredentials);
    } catch (error) {
      errorService.logError("Failed to load credentials:", error);
      addNotification({
        type: "error",
        title: "Loading Error",
        message: "Failed to load credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCredential = async (credential: ImportedCredential) => {
    try {
      // Navigate to credential issuance flow
      setSelectedCredential(credential);
      // Implementation would involve creating a presentation request
      addNotification({
        type: "info",
        title: "Credential Issuance",
        message: "Credential issuance flow started",
      });
    } catch (error) {
      errorService.logError("Failed to issue credential:", error);
      addNotification({
        type: "error",
        title: "Issuance Error",
        message: "Failed to issue credential",
      });
    }
  };

  const handleShareCredential = async (credential: ImportedCredential) => {
    try {
      // Navigate to credential sharing flow
      setSelectedCredential(credential);
      // Implementation would involve creating a verifiable presentation
      addNotification({
        type: "info",
        title: "Credential Sharing",
        message: "Credential sharing flow started",
      });
    } catch (error) {
      errorService.logError("Failed to share credential:", error);
      addNotification({
        type: "error",
        title: "Sharing Error",
        message: "Failed to share credential",
      });
    }
  };

  const handleRevokeCredential = async (credential: ImportedCredential) => {
    try {
      const token = localStorage.getItem("auth_token");
      const userId = localStorage.getItem("user_id");

      const response = await fetch(
        `${import.meta.env.VITE_CONNECTOR_API_URL}/api/v1/${credential.platform}/credential/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setImportedCredentials((prev) =>
          prev.filter((c) => c.id !== credential.id),
        );
        addNotification({
          type: "success",
          title: "Success",
          message: "Credential revoked successfully",
        });
      } else {
        throw new Error("Failed to revoke credential");
      }
    } catch (error) {
      errorService.logError("Failed to revoke credential:", error);
      addNotification({
        type: "error",
        title: "Revocation Error",
        message: "Failed to revoke credential",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Credentials
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage your verified credentials and connected accounts
          </p>
        </div>
        <button
          onClick={() => setShowConnectors(!showConnectors)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FaPlus className="w-4 h-4" />
          Connect Account
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Total Credentials
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {importedCredentials.length}
              </p>
            </div>
            <FaShieldAlt className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Active Credentials
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {
                  importedCredentials.filter((c) => c.status === "active")
                    .length
                }
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Privacy Enabled
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {importedCredentials.filter((c) => c.zkCommitment).length}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <FaShieldAlt className="w-4 h-4 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Show connectors or credentials */}
      {showConnectors ? (
        <ConnectorGrid />
      ) : (
        <>
          {/* Imported Credentials */}
          {importedCredentials.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Imported Credentials
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {importedCredentials.map((credential) => (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    onIssue={() => handleIssueCredential(credential)}
                    onShare={() => handleShareCredential(credential)}
                    onRevoke={() => handleRevokeCredential(credential)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FaShieldAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No credentials yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Connect your accounts to import verified credentials
              </p>
              <button
                onClick={() => setShowConnectors(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Your First Account
              </button>
            </div>
          )}
        </>
      )}

      {/* Privacy Notice */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Your Privacy, Protected
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          All credentials support zero-knowledge proofs, allowing you to prove
          claims without revealing underlying data.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-gray-700 dark:text-gray-300">
              Selective Disclosure
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-gray-700 dark:text-gray-300">
              Privacy Preserving
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span className="text-gray-700 dark:text-gray-300">
              Cryptographically Secure
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
