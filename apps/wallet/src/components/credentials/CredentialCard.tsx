import React, { useState } from "react";
import {
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaStackOverflow,
  FaWallet,
  FaShare,
  FaFileExport,
  FaTrash,
  FaShieldAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
} from "react-icons/fa";
import { SiOrcid } from "react-icons/si";

interface CredentialCardProps {
  credential: any;
  onIssue?: () => void;
  onShare?: () => void;
  onRevoke?: () => void;
}

const platformIcons: Record<string, React.ReactNode> = {
  github: <FaGithub className="w-5 h-5" />,
  linkedin: <FaLinkedin className="w-5 h-5" />,
  orcid: <SiOrcid className="w-5 h-5" />,
  plaid: <FaWallet className="w-5 h-5" />,
  twitter: <FaTwitter className="w-5 h-5" />,
  stackexchange: <FaStackOverflow className="w-5 h-5" />,
};

const platformColors: Record<string, string> = {
  github: "bg-gray-800",
  linkedin: "bg-blue-600",
  orcid: "bg-green-600",
  plaid: "bg-indigo-600",
  twitter: "bg-sky-500",
  stackexchange: "bg-orange-600",
};

export const CredentialCard: React.FC<CredentialCardProps> = ({ 
  credential, 
  onIssue,
  onShare,
  onRevoke
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const getCredentialIcon = (type: string) => {
    const icons = {
      'identity': '🆔',
      'education': '🎓',
      'employment': '💼',
      'health': '🏥',
      'finance': '💳',
      'social': '👥',
      'achievement': '🏆',
      'license': '📜',
      'membership': '🎫',
      'default': '📋'
    };
    return icons[type as keyof typeof icons] || icons.default;
  };

  const getStatusIcon = () => {
    switch (credential?.status) {
      case 'verified':
        return <FaCheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <FaClock className="w-4 h-4 text-yellow-500" />;
      case 'expired':
        return <FaExclamationCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FaShieldAlt className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCredentialDetails = () => {
    if (!credential?.credentialSubject) return {};
    
    return Object.entries(credential.credentialSubject).reduce((acc, [key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      acc[formattedKey] = String(value);
      return acc;
    }, {} as Record<string, string>);
  };

  const platform = credential?.platform || 'default';
  const platformIcon = platformIcons[platform] || platformIcons.github;
  const platformColor = platformColors[platform] || platformColors.github;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className={`${platformColor} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {platformIcon}
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {credential?.name || 'Unknown Credential'}
              </h3>
              <p className="text-sm opacity-90">
                {credential?.issuer || 'Unknown Issuer'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {getCredentialIcon(credential?.type || 'default')}
            </span>
            {getStatusIcon()}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="text-sm space-y-2">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Issued</span>
            <span className="text-gray-900 dark:text-white">
              {credential?.issuanceDate ? new Date(credential.issuanceDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          {credential?.expirationDate && (
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Expires</span>
              <span
                className={`${
                  credential.status === "expired"
                    ? "text-red-600"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {new Date(credential.expirationDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Show more details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          {showDetails ? "Hide" : "Show"} details
        </button>

        {showDetails && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div className="text-sm space-y-1">
              {Object.entries(getCredentialDetails()).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    {key}:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={onShare}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <FaShare className="w-3.5 h-3.5" />
            Share
          </button>
          <button
            onClick={onIssue}
            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <FaFileExport className="w-3.5 h-3.5" />
            Issue
          </button>
          <button
            onClick={() => setShowActions(!showActions)}
            className="px-3 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            ⋮
          </button>
        </div>

        {showActions && (
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
            <button
              onClick={onRevoke}
              className="w-full px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex items-center gap-2 text-sm"
            >
              <FaTrash className="w-3.5 h-3.5" />
              Revoke Credential
            </button>
          </div>
        )}
      </div>
    </div>
  );
};