/**
 * 🏆 ENTERPRISE CREDENTIAL CARD - State-of-the-Art Credential Management
 * ✨ ZK Proof Generation | 🔄 Live Updates | 📅 Lifecycle Management | 📜 Version History
 * 🛡️ Security Analytics | 🔗 Integration Status | 💼 Professional Features
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  ArrowPathIcon,
  EyeIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  CogIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolid,
  ClockIcon as ClockSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid
} from '@heroicons/react/24/solid';

interface CredentialMetadata {
  id: string;
  version: number;
  createdAt: string;
  updatedAt?: string;
  lastVerified?: string;
  expiresAt?: string;
  lifecycle: 'active' | 'expiring' | 'expired' | 'revoked' | 'suspended';
  trustScore: number;
  verificationCount: number;
  shareCount: number;
  source: string;
  autoUpdate: boolean;
  zkProofGenerated: boolean;
  integrationStatus: 'connected' | 'disconnected' | 'error';
  sensitivityLevel: 'public' | 'private' | 'confidential' | 'restricted';
  complianceFlags: string[];
  history: CredentialHistoryEntry[];
}

interface CredentialHistoryEntry {
  version: number;
  action: 'created' | 'updated' | 'verified' | 'shared' | 'zk_proof_generated' | 'refreshed';
  timestamp: string;
  actor: string;
  changes?: string[];
  metadata?: any;
}

interface EnhancedCredentialCardProps {
  credential: any;
  metadata: CredentialMetadata;
  onUpdate?: (credentialId: string) => Promise<void>;
  onGenerateZKProof?: (credentialId: string) => Promise<void>;
  onShare?: (credentialId: string) => void;
  onRevoke?: (credentialId: string) => Promise<void>;
  onArchive?: (credentialId: string) => Promise<void>;
  onDelete?: (credentialId: string) => Promise<void>;
}

export const EnhancedCredentialCard: React.FC<EnhancedCredentialCardProps> = ({
  credential,
  metadata,
  onUpdate,
  onGenerateZKProof,
  onShare,
  onRevoke,
  onArchive,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingZK, setIsGeneratingZK] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  
  // Calculate days until expiration
  const daysUntilExpiry = metadata.expiresAt 
    ? Math.ceil((new Date(metadata.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);
  
  // Determine card status and styling
  const getStatusConfig = () => {
    switch (metadata.lifecycle) {
      case 'active':
        return {
          color: 'emerald',
          icon: CheckCircleSolid,
          label: 'Active',
          bgGradient: 'from-emerald-500/10 to-green-500/10',
          borderColor: 'border-emerald-500/30'
        };
      case 'expiring':
        return {
          color: 'yellow',
          icon: ClockSolid,
          label: `Expires in ${daysUntilExpiry} days`,
          bgGradient: 'from-yellow-500/10 to-orange-500/10',
          borderColor: 'border-yellow-500/30'
        };
      case 'expired':
        return {
          color: 'red',
          icon: ExclamationTriangleSolid,
          label: 'Expired',
          bgGradient: 'from-red-500/10 to-red-600/10',
          borderColor: 'border-red-500/30'
        };
      case 'revoked':
        return {
          color: 'red',
          icon: ShieldExclamationIcon,
          label: 'Revoked',
          bgGradient: 'from-red-500/10 to-red-600/10',
          borderColor: 'border-red-500/30'
        };
      default:
        return {
          color: 'gray',
          icon: InformationCircleIcon,
          label: metadata.lifecycle,
          bgGradient: 'from-gray-500/10 to-gray-600/10',
          borderColor: 'border-gray-500/30'
        };
    }
  };

  const statusConfig = getStatusConfig();

  const handleUpdate = async () => {
    if (!onUpdate) return;
    setIsUpdating(true);
    try {
      await onUpdate(credential.id);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateZKProof = async () => {
    if (!onGenerateZKProof) return;
    setIsGeneratingZK(true);
    try {
      await onGenerateZKProof(credential.id);
    } finally {
      setIsGeneratingZK(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-gradient-to-br ${statusConfig.bgGradient} backdrop-blur-sm border ${statusConfig.borderColor} rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 group`}
    >
      {/* Status Indicator */}
      <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-${statusConfig.color}-500/20 rounded-full`}>
        <statusConfig.icon className={`h-4 w-4 text-${statusConfig.color}-400`} />
        <span className={`text-xs font-medium text-${statusConfig.color}-400`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Main Credential Info */}
      <div className="pr-24 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">
              {credential.credentialSubject?.platform === 'github' ? '🐙 GitHub Developer' :
               credential.type?.[1] || credential.credentialSubject?.credentialType || 'Credential'}
              <span className="ml-2 text-sm text-gray-400">v{metadata.version}</span>
            </h3>
            <p className="text-sm text-gray-400">
              {credential.issuer || 'Unknown Issuer'}
            </p>
          </div>
        </div>

        {/* Credential Details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-sm">
            <span className="text-gray-400">Trust Score:</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    metadata.trustScore >= 90 ? 'bg-emerald-500' :
                    metadata.trustScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${metadata.trustScore}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${
                metadata.trustScore >= 90 ? 'text-emerald-400' :
                metadata.trustScore >= 70 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {metadata.trustScore}%
              </span>
            </div>
          </div>
          
          <div className="text-sm">
            <span className="text-gray-400">Sensitivity:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              metadata.sensitivityLevel === 'public' ? 'bg-green-500/20 text-green-400' :
              metadata.sensitivityLevel === 'private' ? 'bg-yellow-500/20 text-yellow-400' :
              metadata.sensitivityLevel === 'confidential' ? 'bg-orange-500/20 text-orange-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {metadata.sensitivityLevel}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <EyeIcon className="h-4 w-4" />
            <span>{metadata.verificationCount} verifications</span>
          </div>
          <div className="flex items-center gap-1">
            <ShareIcon className="h-4 w-4" />
            <span>{metadata.shareCount} shares</span>
          </div>
          {metadata.zkProofGenerated && (
            <div className="flex items-center gap-1 text-purple-400">
              <ShieldCheckIcon className="h-4 w-4" />
              <span>ZK Ready</span>
            </div>
          )}
        </div>

        {/* Integration Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              metadata.integrationStatus === 'connected' ? 'bg-green-400' :
              metadata.integrationStatus === 'disconnected' ? 'bg-gray-400' : 'bg-red-400'
            }`} />
            <span className="text-xs text-gray-400">
              {metadata.integrationStatus === 'connected' ? 'Live Connection' : 
               metadata.integrationStatus === 'disconnected' ? 'Manual Only' : 'Connection Error'}
            </span>
            {metadata.autoUpdate && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Auto-Update</span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            Updated {new Date(credential.issuanceDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mb-4">
        {/* Update Button */}
        <button
          onClick={handleUpdate}
          disabled={isUpdating || metadata.integrationStatus === 'error'}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 text-sm"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Updating...' : 'Update'}
        </button>

        {/* ZK Proof Button */}
        <button
          onClick={handleGenerateZKProof}
          disabled={isGeneratingZK}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 text-sm"
        >
          <ShieldCheckIcon className={`h-4 w-4 ${isGeneratingZK ? 'animate-pulse' : ''}`} />
          {isGeneratingZK ? 'Generating...' : metadata.zkProofGenerated ? 'Generate New ZK' : 'Generate ZK Proof'}
        </button>

        {/* More Actions */}
        <div className="relative" ref={actionsRef}>
          <button
            onClick={() => setShowActions(!showActions)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors text-sm"
          >
            <CogIcon className="h-4 w-4" />
            More
          </button>
          
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 bottom-full mb-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-2 z-[9999] min-w-56 max-h-96 overflow-y-auto"
              >
                <button
                  onClick={() => {
                    onShare?.(credential.id);
                    setShowActions(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ShareIcon className="h-4 w-4" />
                  Share Credential
                </button>
                
                <button
                  onClick={() => {
                    setShowHistory(true);
                    setShowActions(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  View History
                </button>
                
                <button
                  onClick={() => {
                    onArchive?.(credential.id);
                    setShowActions(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArchiveBoxIcon className="h-4 w-4" />
                  Archive
                </button>
                
                {metadata.lifecycle === 'active' && (
                  <button
                    onClick={() => {
                      onRevoke?.(credential.id);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    Revoke
                  </button>
                )}
                
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to permanently delete this credential? This action cannot be undone.')) {
                      onDelete?.(credential.id);
                      setShowActions(false);
                    }
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border-t border-gray-600/30 mt-1 pt-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-600/30 pt-4 mt-4"
          >
            {/* Credential Subject Details */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Credential Details</h4>
              <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
                {Object.entries(credential.credentialSubject || {}).map(([key, value]) => (
                  key !== 'id' && (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-gray-200">{String(value)}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Compliance Flags */}
            {metadata.complianceFlags.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Compliance</h4>
                <div className="flex flex-wrap gap-2">
                  {metadata.complianceFlags.map((flag) => (
                    <span key={flag} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 pt-4 border-t border-gray-600/30 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <span>{isExpanded ? 'Less Details' : 'More Details'}</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowPathIcon className="h-4 w-4" />
        </motion.div>
      </button>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Credential History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {metadata.history.map((entry, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-gray-700/30 rounded-xl">
                    <div className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white capitalize">
                          {entry.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Version {entry.version} by {entry.actor}
                      </p>
                      {entry.changes && entry.changes.length > 0 && (
                        <ul className="mt-2 text-xs text-gray-400 space-y-1">
                          {entry.changes.map((change, idx) => (
                            <li key={idx}>• {change}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedCredentialCard;