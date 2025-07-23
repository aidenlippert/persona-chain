import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWalletStore } from "../../store/walletStore";
import { LoadingSpinner } from "../common/LoadingSpinner";
import {
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaStackOverflow,
  FaWallet,
} from "react-icons/fa";
import { SiOrcid } from "react-icons/si";
import { errorService } from "@/services/errorService";

export interface ConnectorConfig {
  platform: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  scopes: string[];
}

const connectorConfigs: ConnectorConfig[] = [
  {
    platform: "github",
    name: "GitHub",
    icon: <FaGithub className="w-6 h-6" />,
    color: "bg-gray-800 hover:bg-gray-700",
    description:
      "Connect your GitHub account to verify your developer identity and contributions",
    scopes: ["Profile", "Repositories", "Contributions"],
  },
  {
    platform: "linkedin",
    name: "LinkedIn",
    icon: <FaLinkedin className="w-6 h-6" />,
    color: "bg-blue-600 hover:bg-blue-500",
    description: "Verify your professional identity and career information",
    scopes: ["Basic Profile", "Email Address"],
  },
  {
    platform: "orcid",
    name: "ORCID",
    icon: <SiOrcid className="w-6 h-6" />,
    color: "bg-green-600 hover:bg-green-500",
    description:
      "Connect your ORCID iD to verify your research identity and publications",
    scopes: ["Public Profile", "Works", "Affiliations"],
  },
  {
    platform: "plaid",
    name: "Plaid Identity",
    icon: <FaWallet className="w-6 h-6" />,
    color: "bg-indigo-600 hover:bg-indigo-500",
    description:
      "Verify your identity through secure bank account verification",
    scopes: ["Name", "Email", "Phone", "Address"],
  },
  {
    platform: "twitter",
    name: "Twitter/X",
    icon: <FaTwitter className="w-6 h-6" />,
    color: "bg-sky-500 hover:bg-sky-400",
    description:
      "Connect your Twitter account to verify your social media presence",
    scopes: ["Profile", "Verification Status"],
  },
  {
    platform: "stackexchange",
    name: "Stack Exchange",
    icon: <FaStackOverflow className="w-6 h-6" />,
    color: "bg-orange-600 hover:bg-orange-500",
    description: "Verify your technical expertise and community contributions",
    scopes: ["Profile", "Reputation", "Badges"],
  },
];

interface ConnectorButtonProps {
  config: ConnectorConfig;
  onConnect: (platform: string) => void;
  isConnected?: boolean;
  isLoading?: boolean;
}

export const ConnectorButton: React.FC<ConnectorButtonProps> = ({
  config,
  onConnect,
  isConnected = false,
  isLoading = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${config.color} text-white`}>
            {config.icon}
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {config.name}
            </h3>
            {isConnected && (
              <span className="text-sm text-green-600 dark:text-green-400">
                ✓ Connected
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {config.description}
      </p>

      <div className="mb-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          {showDetails ? "Hide" : "Show"} permissions
        </button>

        {showDetails && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
              This connector will access:
            </p>
            <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
              {config.scopes.map((scope, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                  {scope}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        onClick={() => onConnect(config.platform)}
        disabled={isLoading || isConnected}
        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
          isConnected
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : `${config.color} text-white`
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" />
            <span className="ml-2">Connecting...</span>
          </div>
        ) : isConnected ? (
          "Connected"
        ) : (
          `Connect ${config.name}`
        )}
      </button>
    </div>
  );
};

export const ConnectorGrid: React.FC = () => {
  const navigate = useNavigate();
  const { connectedPlatforms, addNotification } = useWalletStore();
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);

  const handleConnect = async (platform: string) => {
    try {
      setLoadingPlatform(platform);

      // Get user session
      const token = localStorage.getItem("auth_token");
      if (!token) {
        addNotification({
          type: "error",
          title: "Authentication Required",
          message: "Please log in to connect accounts",
        });
        navigate("/auth");
        return;
      }

      // Initiate OAuth flow
      const response = await fetch(
        `${import.meta.env.VITE_CONNECTOR_API_URL}/api/v1/${platform}/auth`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: localStorage.getItem("user_id"),
            callbackUrl: `${import.meta.env.VITE_API_BASE_URL}/api/connectors/${platform}/real-callback`,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to initiate connection");
      }

      const { authUrl, sessionId } = await response.json();

      // Store session ID for callback handling
      sessionStorage.setItem(`oauth_session_${platform}`, sessionId);

      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (error) {
      errorService.logError(`Failed to connect ${platform}:`, error);
      addNotification({
        type: "error",
        title: "Connection Failed",
        message: `Failed to connect ${platform}`,
      });
    } finally {
      setLoadingPlatform(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Connect Your Accounts
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Import verified credentials from trusted platforms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connectorConfigs.map((config) => (
          <ConnectorButton
            key={config.platform}
            config={config}
            onConnect={handleConnect}
            isConnected={connectedPlatforms.includes(config.platform)}
            isLoading={loadingPlatform === config.platform}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Privacy & Security
        </h3>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Your credentials are encrypted and stored locally</li>
          <li>• We never store your platform passwords or tokens</li>
          <li>• You control what information to share</li>
          <li>• Credentials can be revoked at any time</li>
        </ul>
      </div>
    </div>
  );
};
