/**
 * Elite Credential Card - World-Class VC Display Component
 * Inspired by Apple Card, premium banking apps, and top-tier design systems
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Shield,
  CreditCard,
  Phone,
  Users,
  Star,
  CheckCircle,
  Eye,
  EyeOff,
  Share2,
  Download,
  MoreVertical,
  Trash2,
  Lock,
  Sparkles,
  Award,
  Building,
  ExternalLink,
  Clock,
  AlertCircle
} from 'lucide-react';
import { EliteWeb3Button } from '../ui/EliteWeb3Button';

interface CredentialSubject {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  nationality?: string;
  score?: number;
  level?: string;
  company?: string;
  position?: string;
  [key: string]: any;
}

interface Credential {
  id: string;
  type: string;
  name: string;
  issuer: string;
  issuerLogo?: string;
  status: 'verified' | 'pending' | 'expired' | 'revoked' | 'draft';
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  platform?: string;
  category?: string;
  verificationScore?: number;
  tags?: string[];
  privacy?: 'public' | 'private' | 'selective';
  usageCount?: number;
  lastUsed?: string;
}

interface EliteCredentialCardProps {
  credential: Credential;
  onShare?: () => void;
  onDownload?: () => void;
  onRevoke?: () => void;
  onView?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  showActions?: boolean;
}

const CREDENTIAL_GRADIENTS = {
  identity: 'from-blue-500 via-cyan-500 to-blue-600',
  education: 'from-purple-500 via-violet-500 to-purple-600',
  employment: 'from-emerald-500 via-green-500 to-emerald-600',
  health: 'from-pink-500 via-rose-500 to-pink-600',
  finance: 'from-amber-500 via-yellow-500 to-amber-600',
  social: 'from-indigo-500 via-blue-500 to-indigo-600',
  achievement: 'from-orange-500 via-red-500 to-orange-600',
  license: 'from-teal-500 via-cyan-500 to-teal-600',
  membership: 'from-violet-500 via-purple-500 to-violet-600',
  default: 'from-slate-500 via-gray-500 to-slate-600'
};

const CREDENTIAL_ICONS = {
  identity: Shield,
  education: Award,
  employment: Building,
  health: Phone,
  finance: CreditCard,
  social: Users,
  achievement: Sparkles,
  license: Lock,
  membership: Star,
  default: Shield
};

const STATUS_CONFIG = {
  verified: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'Verified',
    glow: 'shadow-emerald-500/20'
  },
  pending: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    text: 'Pending',
    glow: 'shadow-yellow-500/20'
  },
  expired: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    text: 'Expired',
    glow: 'shadow-red-500/20'
  },
  revoked: {
    icon: AlertCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/30',
    text: 'Revoked',
    glow: 'shadow-gray-500/20'
  },
  draft: {
    icon: Eye,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'Draft',
    glow: 'shadow-blue-500/20'
  }
};

export const EliteCredentialCard: React.FC<EliteCredentialCardProps> = ({
  credential,
  onShare,
  onDownload,
  onRevoke,
  onView,
  isSelected,
  onSelect,
  showActions = true
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPrivate, setIsPrivate] = useState(credential.privacy === 'private');
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const gradient = CREDENTIAL_GRADIENTS[credential.type as keyof typeof CREDENTIAL_GRADIENTS] || CREDENTIAL_GRADIENTS.default;
  const Icon = CREDENTIAL_ICONS[credential.type as keyof typeof CREDENTIAL_ICONS] || CREDENTIAL_ICONS.default;
  const statusConfig = STATUS_CONFIG[credential.status];
  const StatusIcon = statusConfig.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVerificationBadge = () => {
    const score = credential.verificationScore || 0;
    if (score >= 95) return { text: 'PREMIUM', color: 'from-purple-500 to-pink-500' };
    if (score >= 85) return { text: 'VERIFIED', color: 'from-emerald-500 to-green-500' };
    if (score >= 70) return { text: 'BASIC', color: 'from-blue-500 to-cyan-500' };
    return { text: 'PENDING', color: 'from-yellow-500 to-orange-500' };
  };

  const verificationBadge = getVerificationBadge();

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.3, type: "spring", stiffness: 100 }
    },
    hover: { 
      y: -8, 
      scale: 1.02,
      transition: { duration: 0.2, type: "spring", stiffness: 150 }
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const renderFrontSide = () => (
    <div className="absolute inset-0 backface-hidden">
      {/* Background with Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90 rounded-2xl`} />
      
      {/* Glass Morphism Overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20" />
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -inset-10 opacity-30">
          <div className="absolute top-0 left-0 w-20 h-20 bg-white/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse delay-1000" />
        </div>
      </div>

      {/* Content */}
      <div className="relative h-full p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">
                {credential.name}
              </h3>
              <p className="text-white/80 text-sm">
                {credential.issuer}
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusConfig.bg} ${statusConfig.border} border backdrop-blur-sm`}>
            <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
            <span className={`text-xs font-medium ${statusConfig.color}`}>
              {statusConfig.text}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center">
          {credential.credentialSubject.name && (
            <div className="mb-3">
              <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Holder</div>
              <div className="text-white font-semibold text-lg">
                {isPrivate ? '••••••••' : credential.credentialSubject.name}
              </div>
            </div>
          )}
          
          {credential.verificationScore && (
            <div className="mb-3">
              <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Score</div>
              <div className="flex items-center gap-2">
                <div className="text-white font-bold text-xl">
                  {credential.verificationScore}%
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold text-white bg-gradient-to-r ${verificationBadge.color}`}>
                  {verificationBadge.text}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Issued</div>
            <div className="text-white font-medium">
              {formatDate(credential.issuanceDate)}
            </div>
          </div>
          
          {credential.expirationDate && (
            <div className="text-right">
              <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Expires</div>
              <div className={`font-medium ${
                credential.status === 'expired' ? 'text-red-300' : 'text-white'
              }`}>
                {formatDate(credential.expirationDate)}
              </div>
            </div>
          )}
        </div>

        {/* Privacy Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPrivate(!isPrivate);
          }}
          className="absolute top-4 right-16 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors"
        >
          {isPrivate ? (
            <EyeOff className="w-4 h-4 text-white" />
          ) : (
            <Eye className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    </div>
  );

  const renderBackSide = () => (
    <div className="absolute inset-0 backface-hidden rotate-y-180">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50" />
      
      {/* Content */}
      <div className="relative h-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">Credential Details</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFlipped(false);
            }}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Credential Subject Details */}
          {Object.entries(credential.credentialSubject).map(([key, value]) => {
            if (!value || key === 'id') return null;
            
            const formatKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            
            return (
              <div key={key} className="flex items-center justify-between py-2 border-b border-slate-700/30">
                <span className="text-slate-400 text-sm">{formatKey(key)}</span>
                <span className="text-white font-medium">
                  {isPrivate && key !== 'score' && key !== 'level' ? '••••••••' : String(value)}
                </span>
              </div>
            );
          })}

          {/* Metadata */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Credential ID</span>
              <span className="text-slate-300 font-mono text-xs">
                {credential.id.slice(0, 8)}...{credential.id.slice(-8)}
              </span>
            </div>
            
            {credential.usageCount !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Usage Count</span>
                <span className="text-slate-300">{credential.usageCount}</span>
              </div>
            )}
            
            {credential.lastUsed && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Last Used</span>
                <span className="text-slate-300">{formatDate(credential.lastUsed)}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {credential.tags && credential.tags.length > 0 && (
            <div className="pt-4">
              <div className="text-slate-400 text-sm mb-2">Tags</div>
              <div className="flex flex-wrap gap-2">
                {credential.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-slate-800/50 text-slate-300 text-xs rounded border border-slate-700/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`
        relative w-full h-64 cursor-pointer
        ${isSelected ? 'ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-slate-900' : ''}
        group
      `}
      onClick={onSelect}
    >
      {/* 3D Card Container */}
      <div 
        className={`
          relative w-full h-full preserve-3d transition-transform duration-700
          ${isFlipped ? 'rotate-y-180' : ''}
          ${statusConfig.glow} shadow-2xl
        `}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {renderFrontSide()}
        {renderBackSide()}
      </div>

      {/* Actions Overlay */}
      <AnimatePresence>
        {(isHovered || showMenu) && showActions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 flex gap-2"
          >
            <EliteWeb3Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e?.stopPropagation();
                onShare?.();
              }}
              icon={<Share2 className="w-4 h-4" />}
              className="flex-1 backdrop-blur-xl"
            >
              Share
            </EliteWeb3Button>
            
            <EliteWeb3Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e?.stopPropagation();
                setIsFlipped(!isFlipped);
              }}
              icon={<Eye className="w-4 h-4" />}
              className="backdrop-blur-xl"
            >
              Details
            </EliteWeb3Button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="px-3 py-2 bg-slate-900/80 text-slate-300 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 hover:text-white transition-all backdrop-blur-xl"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu Dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            className="absolute bottom-16 right-4 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden z-10 min-w-48"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors flex items-center gap-3"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView?.();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors flex items-center gap-3"
            >
              <ExternalLink className="w-4 h-4" />
              View Details
            </button>
            <div className="border-t border-slate-700/50" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRevoke?.();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4" />
              Revoke
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};