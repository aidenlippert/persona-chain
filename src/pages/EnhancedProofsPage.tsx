/**
 * Elite ZK Proofs Dashboard - Premium Web3 Design
 * Features: Glass morphism, elegant animations, premium styling
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ZKProofMetadata {
  id: string;
  name: string;
  description: string;
  type: 'age_verification' | 'employment_status' | 'financial_threshold' | 'education_level' | 'github_contributions' | 'membership_proof';
  status: 'valid' | 'invalid' | 'pending' | 'expired';
  credentialType: string;
  proofHash: string;
  circuitName: string;
  publicSignals: any;
  proof: any;
  createdAt: string;
  lastVerified: string;
  usageCount: number;
  isShared: boolean;
  apiCallHistory: APICall[];
  blockchainTxHash?: string;
  isSelected?: boolean;
}

interface APICall {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status: 'success' | 'failed' | 'pending';
  responseCode: number;
  duration: number;
  operation: string;
}

interface ProofType {
  id: string;
  name: string;
  description: string;
  icon: string;
  circuit: string;
  requiredFields: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: string;
  requiredCredentials: string[];
}

export const EnhancedProofsPage = () => {
  const [proofs, setProofs] = useState<ZKProofMetadata[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [selectedProofType, setSelectedProofType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'pending' | 'shared'>('all');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load proofs and credentials on mount
  useEffect(() => {
    loadProofs();
    loadCredentials();
  }, []);

  const loadCredentials = useCallback(() => {
    const stored = localStorage.getItem('credentials');
    if (stored) {
      setCredentials(JSON.parse(stored));
    }
  }, []);

  const proofTypes: ProofType[] = [
    {
      id: 'age_verification',
      name: 'Age Verification',
      description: 'Prove you are over 18 without revealing your exact age',
      icon: '[AGE]',
      circuit: 'age_verification.circom',
      requiredFields: ['birthDate'],
      requiredCredentials: ['IDCredential', 'PassportCredential', 'DriverLicenseCredential'],
      complexity: 'low',
      estimatedTime: '30s'
    },
    {
      id: 'employment_status',
      name: 'Employment Status',
      description: 'Prove employment without revealing employer details',
      icon: '[WORK]',
      circuit: 'employment_verification.circom',
      requiredFields: ['company', 'position', 'startDate'],
      requiredCredentials: ['LinkedInCredential', 'EmploymentCredential', 'PayrollCredential'],
      complexity: 'medium',
      estimatedTime: '1m'
    },
    {
      id: 'financial_threshold',
      name: 'Financial Threshold',
      description: 'Prove income above threshold without revealing exact amount',
      icon: '[MONEY]',
      circuit: 'income_threshold.circom',
      requiredFields: ['income', 'currency'],
      requiredCredentials: ['PlaidCredential', 'BankCredential', 'PayrollCredential', 'TaxCredential'],
      complexity: 'high',
      estimatedTime: '2m'
    },
    {
      id: 'education_level',
      name: 'Education Level',
      description: 'Prove education level without revealing institution',
      icon: '[EDUCATION]',
      circuit: 'education_verification.circom',
      requiredFields: ['degree', 'graduationYear'],
      requiredCredentials: ['EducationCredential', 'DiplomaCredential', 'TranscriptCredential'],
      complexity: 'medium',
      estimatedTime: '45s'
    },
    {
      id: 'github_contributions',
      name: 'GitHub Activity',
      description: 'Prove development activity without revealing repositories',
      icon: '[GITHUB]',
      circuit: 'github_activity.circom',
      requiredFields: ['contributions', 'publicRepos'],
      requiredCredentials: ['GitHubCredential'],
      complexity: 'medium',
      estimatedTime: '1m'
    },
    {
      id: 'membership_proof',
      name: 'Membership Proof',
      description: 'Prove membership in a group without revealing identity',
      icon: '[LOCK]',
      circuit: 'membership_proof.circom',
      requiredFields: ['membershipId', 'groupId'],
      requiredCredentials: ['MembershipCredential', 'AssociationCredential', 'ClubCredential'],
      complexity: 'high',
      estimatedTime: '90s'
    }
  ];

  const loadProofs = useCallback(() => {
    // Mock data with beautiful structure
    const mockProofs: ZKProofMetadata[] = [
      {
        id: 'proof_001',
        name: 'Age Verification Proof',
        description: 'ZK proof for GitHub credential age verification',
        type: 'age_verification',
        status: 'valid',
        credentialType: 'GitHubCredential',
        proofHash: '0x7f9f8e5d4c3b2a1e9f8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d',
        circuitName: 'age_verification.circom',
        publicSignals: {
          isOver18: true,
          proofTimestamp: Math.floor(Date.now() / 1000)
        },
        proof: {
          pi_a: ['0x1234567890abcdef', '0xfedcba0987654321'],
          pi_b: [['0xabcdef1234567890', '0x0987654321fedcba'], ['0x1111111111111111', '0x2222222222222222']],
          pi_c: ['0x3333333333333333', '0x4444444444444444'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        createdAt: '2024-07-18T10:30:00Z',
        lastVerified: '2024-07-18T10:30:00Z',
        usageCount: 5,
        isShared: true,
        apiCallHistory: [
          {
            id: 'api_001',
            timestamp: '2024-07-18T10:30:00Z',
            endpoint: '/api/zk/generate',
            method: 'POST',
            status: 'success',
            responseCode: 200,
            duration: 2500,
            operation: 'proof_generation'
          },
          {
            id: 'api_002',
            timestamp: '2024-07-18T09:15:00Z',
            endpoint: '/api/zk/verify',
            method: 'POST',
            status: 'success',
            responseCode: 200,
            duration: 800,
            operation: 'proof_verification'
          }
        ],
        blockchainTxHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        isSelected: true
      },
      {
        id: 'proof_002',
        name: 'Employment Status Proof',
        description: 'ZK proof for LinkedIn employment verification',
        type: 'employment_status',
        status: 'valid',
        credentialType: 'LinkedInCredential',
        proofHash: '0x8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
        circuitName: 'employment_verification.circom',
        publicSignals: {
          isEmployed: true,
          hasValidEmployment: true,
          proofTimestamp: Math.floor(Date.now() / 1000)
        },
        proof: {
          pi_a: ['0x5555555555555555', '0x6666666666666666'],
          pi_b: [['0x7777777777777777', '0x8888888888888888'], ['0x9999999999999999', '0xaaaaaaaaaaaaaaaa']],
          pi_c: ['0xbbbbbbbbbbbbbbbb', '0xcccccccccccccccc'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        createdAt: '2024-07-17T14:20:00Z',
        lastVerified: '2024-07-18T08:45:00Z',
        usageCount: 3,
        isShared: false,
        apiCallHistory: [
          {
            id: 'api_003',
            timestamp: '2024-07-18T08:45:00Z',
            endpoint: '/api/zk/verify',
            method: 'POST',
            status: 'success',
            responseCode: 200,
            duration: 950,
            operation: 'proof_verification'
          },
          {
            id: 'api_004',
            timestamp: '2024-07-17T14:20:00Z',
            endpoint: '/api/zk/generate',
            method: 'POST',
            status: 'success',
            responseCode: 200,
            duration: 3200,
            operation: 'proof_generation'
          }
        ],
        blockchainTxHash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c'
      },
      {
        id: 'proof_003',
        name: 'Financial Threshold Proof',
        description: 'ZK proof for income verification',
        type: 'financial_threshold',
        status: 'pending',
        credentialType: 'PlaidCredential',
        proofHash: '0x9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
        circuitName: 'income_threshold.circom',
        publicSignals: {
          meetsThreshold: true,
          threshold: 50000,
          proofTimestamp: Math.floor(Date.now() / 1000)
        },
        proof: null,
        createdAt: '2024-07-18T11:00:00Z',
        lastVerified: '2024-07-18T11:00:00Z',
        usageCount: 1,
        isShared: false,
        apiCallHistory: [
          {
            id: 'api_005',
            timestamp: '2024-07-18T11:00:00Z',
            endpoint: '/api/zk/generate',
            method: 'POST',
            status: 'pending',
            responseCode: 202,
            duration: 4500,
            operation: 'proof_generation'
          }
        ]
      }
    ];

    // Group by type and auto-select first proof
    const groupedProofs = mockProofs.reduce((acc, proof) => {
      if (!acc[proof.type]) {
        acc[proof.type] = [];
      }
      acc[proof.type].push(proof);
      return acc;
    }, {} as Record<string, ZKProofMetadata[]>);

    // Sort by creation date and auto-select first proof of each type
    Object.keys(groupedProofs).forEach(type => {
      groupedProofs[type].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (groupedProofs[type].length > 0 && !groupedProofs[type][0].isSelected) {
        groupedProofs[type][0].isSelected = true;
      }
    });

    setProofs(mockProofs);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'invalid':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'pending':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'expired':
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'text-emerald-400 bg-emerald-400/10';
      case 'medium':
        return 'text-amber-400 bg-amber-400/10';
      case 'high':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const checkRequirements = (proofType: ProofType) => {
    const userCredentialTypes = credentials.map(cred => 
      cred.type?.find((t: string) => t !== 'VerifiableCredential') || 'UnknownCredential'
    );
    
    const hasRequired = proofType.requiredCredentials.some(req => 
      userCredentialTypes.includes(req)
    );
    
    const missing = proofType.requiredCredentials.filter(req => 
      !userCredentialTypes.includes(req)
    );
    
    return {
      hasRequired,
      missing,
      available: userCredentialTypes.filter(type => 
        proofType.requiredCredentials.includes(type)
      )
    };
  };

  const filteredProofs = proofs.filter(proof => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'shared') return proof.isShared;
    return proof.status === filterStatus;
  });

  const filteredProofsBySearch = filteredProofs.filter(proof => 
    proof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proof.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proof.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProofs = filteredProofsBySearch.reduce((acc, proof) => {
    if (!acc[proof.type]) {
      acc[proof.type] = [];
    }
    acc[proof.type].push(proof);
    return acc;
  }, {} as Record<string, ZKProofMetadata[]>);

  const generateProof = async (proofType: ProofType) => {
    const requirements = checkRequirements(proofType);
    
    if (!requirements.hasRequired) {
      notify.error(`[ERROR] Missing Required Credentials!\n\nNeeded: ${requirements.missing.join(', ')}\n\nPlease add the required credentials first.`);
      return;
    }

    setIsGenerating(true);
    setSelectedProofType(proofType.id);

    try {
      // Simulate proof generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      notify.success(`[SUCCESS] ZK Proof Generated!\n\nType: ${proofType.name}\nComplexity: ${proofType.complexity}\nEstimated time: ${proofType.estimatedTime}`);
      
      // Reload proofs to show new one
      loadProofs();
    } catch (error) {
      notify.error('[ERROR] Failed to generate proof. Please try again.');
    } finally {
      setIsGenerating(false);
      setSelectedProofType(null);
    }
  };

  const shareProof = async (proof: ZKProofMetadata) => {
    try {
      await navigator.clipboard.writeText(proof.proofHash);
      notify.success('[SUCCESS] Proof hash copied to clipboard!');
    } catch (error) {
      notify.error('[ERROR] Failed to copy proof hash');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                ZK Proofs Dashboard
              </h1>
              <p className="text-slate-400 text-lg">
                Generate and manage zero-knowledge proofs with privacy-preserving verification
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 cursor-pointer"
              >
                [SPARKLE] Generate New Proof
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search proofs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 backdrop-blur-sm transition-all duration-300"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Filter Buttons */}
              {['all', 'valid', 'pending', 'shared'].map((filter) => (
                <motion.button
                  key={filter}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilterStatus(filter as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    filterStatus === filter
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </motion.button>
              ))}

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-800/50 border border-slate-700/50 rounded-lg p-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === 'grid'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === 'list'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Proof Types Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Available Proof Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proofTypes.map((proofType) => {
              const requirements = checkRequirements(proofType);
              return (
                <motion.div
                  key={proofType.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 cursor-pointer group hover:border-cyan-500/30 transition-all duration-300"
                  onClick={() => generateProof(proofType)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">{proofType.icon}</div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getComplexityColor(proofType.complexity)}`}>
                      {proofType.complexity}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">
                    {proofType.name}
                  </h3>
                  
                  <p className="text-slate-400 text-sm mb-4">
                    {proofType.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Est. {proofType.estimatedTime}
                    </span>
                    <div className={`flex items-center space-x-1 ${
                      requirements.hasRequired ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        requirements.hasRequired ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      <span>
                        {requirements.hasRequired ? 'Ready' : `Need ${requirements.missing.length} creds`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Generated Proofs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">Your ZK Proofs</h2>
          
          {Object.keys(groupedProofs).length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-12 text-center"
            >
              <div className="text-6xl mb-4">[LOCK]</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Proofs Generated Yet</h3>
              <p className="text-slate-400 mb-6">
                Generate your first zero-knowledge proof from the available types above
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
              >
                Generate First Proof
              </motion.button>
            </motion.div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
              <AnimatePresence>
                {Object.entries(groupedProofs).map(([type, typeProofs]) => (
                  typeProofs.map((proof, index) => (
                    <motion.div
                      key={proof.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -4 }}
                      className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 group hover:border-cyan-500/30 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(proof.status)}`}>
                          {proof.status.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-2">
                          {proof.isShared && (
                            <div className="w-2 h-2 bg-cyan-400 rounded-full" title="Shared"></div>
                          )}
                          <span className="text-slate-400 text-sm">
                            Used {proof.usageCount}x
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">
                        {proof.name}
                      </h3>
                      
                      <p className="text-slate-400 text-sm mb-4">
                        {proof.description}
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Created</span>
                          <span className="text-slate-300">
                            {new Date(proof.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Circuit</span>
                          <span className="text-slate-300 font-mono">
                            {proof.circuitName}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => shareProof(proof)}
                          className="flex-1 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors duration-300"
                        >
                          Share
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowHistory(showHistory === proof.id ? null : proof.id)}
                          className="flex-1 py-2 bg-slate-700/50 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600/50 transition-colors duration-300"
                        >
                          History
                        </motion.button>
                      </div>
                      
                      <AnimatePresence>
                        {showHistory === proof.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-slate-700/50"
                          >
                            <h4 className="text-sm font-medium text-white mb-2">API Call History</h4>
                            <div className="space-y-2">
                              {proof.apiCallHistory.map((call) => (
                                <div key={call.id} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400">{call.operation}</span>
                                  <span className={`font-medium ${
                                    call.status === 'success' ? 'text-emerald-400' : 
                                    call.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                                  }`}>
                                    {call.responseCode}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center max-w-md mx-4"
              >
                <div className="w-16 h-16 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Generating ZK Proof
                </h3>
                <p className="text-slate-400">
                  Creating cryptographic proof with zero-knowledge verification...
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};