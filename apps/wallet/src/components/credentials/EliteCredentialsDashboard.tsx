/**
 * Elite Credentials Dashboard - World-Class VC Browsing Experience
 * Inspired by Apple's iOS design, Notion's database views, and premium portfolio apps
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  BarChart3,
  Plus,
  Download,
  Upload,
  TrendingUp,
  Award,
  Eye,
  EyeOff,
  SortAsc,
  SortDesc,
  RefreshCw,
  Target,
  CheckCircle
} from 'lucide-react';
import { EliteCredentialCard } from './EliteCredentialCard';
import { EliteWeb3Button } from '../ui/EliteWeb3Button';

interface Credential {
  id: string;
  type: string;
  name: string;
  issuer: string;
  issuerLogo?: string;
  status: 'verified' | 'pending' | 'expired' | 'revoked' | 'draft';
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: any;
  platform?: string;
  category?: string;
  verificationScore?: number;
  tags?: string[];
  privacy?: 'public' | 'private' | 'selective';
  usageCount?: number;
  lastUsed?: string;
}

type ViewMode = 'grid' | 'list' | 'timeline';
type SortField = 'date' | 'name' | 'score' | 'usage' | 'status';
type SortOrder = 'asc' | 'desc';

interface FilterState {
  status: string[];
  category: string[];
  dateRange: [Date | null, Date | null];
  scoreRange: [number, number];
  tags: string[];
  search: string;
}

const MOCK_CREDENTIALS: Credential[] = [
  {
    id: '1',
    type: 'identity',
    name: 'Government ID Verification',
    issuer: 'Department of Motor Vehicles',
    status: 'verified',
    issuanceDate: '2024-01-15',
    expirationDate: '2027-01-15',
    credentialSubject: {
      name: 'John Smith',
      dateOfBirth: '1990-05-15',
      nationality: 'United States',
      documentNumber: 'DL123456789'
    },
    category: 'identity',
    verificationScore: 98,
    tags: ['official', 'government', 'photo-id'],
    privacy: 'private',
    usageCount: 12,
    lastUsed: '2024-01-10'
  },
  {
    id: '2',
    type: 'education',
    name: 'Bachelor of Computer Science',
    issuer: 'Stanford University',
    status: 'verified',
    issuanceDate: '2023-06-15',
    credentialSubject: {
      name: 'John Smith',
      degree: 'Bachelor of Science',
      major: 'Computer Science',
      gpa: '3.8',
      graduationDate: '2023-06-15'
    },
    category: 'education',
    verificationScore: 95,
    tags: ['degree', 'computer-science', 'university'],
    privacy: 'public',
    usageCount: 8,
    lastUsed: '2024-01-08'
  },
  {
    id: '3',
    type: 'employment',
    name: 'Senior Software Engineer',
    issuer: 'TechCorp Inc.',
    status: 'verified',
    issuanceDate: '2023-09-01',
    credentialSubject: {
      name: 'John Smith',
      position: 'Senior Software Engineer',
      department: 'Engineering',
      startDate: '2023-09-01',
      salary: '$125,000'
    },
    category: 'professional',
    verificationScore: 92,
    tags: ['employment', 'tech', 'senior-level'],
    privacy: 'selective',
    usageCount: 15,
    lastUsed: '2024-01-12'
  },
  // Add more mock credentials...
];

// Removed unused CATEGORY_STATS constant

const StatsCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: string;
  color: string;
}> = ({ title, value, subtitle, icon: Icon, trend, color }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.02 }}
    className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          trend.includes('+') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {trend}
        </div>
      )}
    </div>
    <div className="space-y-1">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-slate-400 text-sm">{title}</div>
      <div className="text-slate-500 text-xs">{subtitle}</div>
    </div>
  </motion.div>
);

const FilterPanel: React.FC<{
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ filters, onFiltersChange, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleStatusToggle = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const handleCategoryToggle = (category: string) => {
    const newCategory = filters.category.includes(category)
      ? filters.category.filter(c => c !== category)
      : [...filters.category, category];
    onFiltersChange({ ...filters, category: newCategory });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 z-50 overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Filters</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Status Filter */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Status</h4>
            <div className="space-y-2">
              {['verified', 'pending', 'expired', 'draft'].map(status => (
                <label key={status} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={() => handleStatusToggle(status)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400/50"
                  />
                  <span className="text-slate-300 capitalize">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Category</h4>
            <div className="space-y-2">
              {['identity', 'education', 'professional', 'financial', 'social'].map(category => (
                <label key={category} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.category.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400/50"
                  />
                  <span className="text-slate-300 capitalize">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Score Range */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Verification Score</h4>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.scoreRange[1]}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  scoreRange: [filters.scoreRange[0], parseInt(e.target.value)]
                })}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{filters.scoreRange[0]}%</span>
                <span>{filters.scoreRange[1]}%</span>
              </div>
            </div>
          </div>

          {/* Reset Filters */}
          <EliteWeb3Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => onFiltersChange({
              status: [],
              category: [],
              dateRange: [null, null],
              scoreRange: [0, 100],
              tags: [],
              search: ''
            })}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Reset Filters
          </EliteWeb3Button>
        </div>
      </div>
    </motion.div>
  );
};

export const EliteCredentialsDashboard: React.FC = () => {
  const [credentials] = useState<Credential[]>(MOCK_CREDENTIALS);
  const [selectedCredentials, setSelectedCredentials] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    category: [],
    dateRange: [null, null],
    scoreRange: [0, 100],
    tags: [],
    search: ''
  });

  // Filter and sort credentials
  const filteredCredentials = useMemo(() => {
    let filtered = credentials;

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(cred =>
        cred.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        cred.issuer.toLowerCase().includes(filters.search.toLowerCase()) ||
        cred.tags?.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(cred => filters.status.includes(cred.status));
    }

    // Apply category filter
    if (filters.category.length > 0) {
      filtered = filtered.filter(cred => filters.category.includes(cred.category || cred.type));
    }

    // Apply score filter
    filtered = filtered.filter(cred => {
      const score = cred.verificationScore || 0;
      return score >= filters.scoreRange[0] && score <= filters.scoreRange[1];
    });

    // Sort credentials
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.issuanceDate);
          bValue = new Date(b.issuanceDate);
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'score':
          aValue = a.verificationScore || 0;
          bValue = b.verificationScore || 0;
          break;
        case 'usage':
          aValue = a.usageCount || 0;
          bValue = b.usageCount || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [credentials, filters, sortField, sortOrder]);

  const handleCredentialSelect = useCallback((id: string) => {
    const newSelected = new Set(selectedCredentials);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCredentials(newSelected);
  }, [selectedCredentials]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const statsData = [
    {
      title: 'Total Credentials',
      value: credentials.length,
      subtitle: 'Across all platforms',
      icon: Award,
      trend: '+12%',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Verified',
      value: credentials.filter(c => c.status === 'verified').length,
      subtitle: 'Ready to use',
      icon: CheckCircle,
      trend: '+8%',
      color: 'from-emerald-500 to-green-500'
    },
    {
      title: 'Avg. Score',
      value: Math.round(credentials.reduce((acc, c) => acc + (c.verificationScore || 0), 0) / credentials.length),
      subtitle: 'Verification quality',
      icon: Target,
      trend: '+5%',
      color: 'from-purple-500 to-violet-500'
    },
    {
      title: 'Usage This Month',
      value: credentials.reduce((acc, c) => acc + (c.usageCount || 0), 0),
      subtitle: 'Times shared',
      icon: TrendingUp,
      trend: '+25%',
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Header */}
      <div className="p-8 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                My Credentials
              </h1>
              <p className="text-slate-400">
                Manage and share your verifiable credentials securely
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  isPrivacyMode 
                    ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' 
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:text-white'
                }`}
              >
                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <EliteWeb3Button
                variant="primary"
                size="md"
                icon={<Plus className="w-4 h-4" />}
              >
                Create Credential
              </EliteWeb3Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsData.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
          </div>

          {/* Search and Controls */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search credentials, issuers, or tags..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 backdrop-blur-xl"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-xl border transition-all ${
                  showFilters 
                    ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' 
                    : 'bg-slate-900/60 border-slate-700/50 text-slate-300 hover:text-white'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
              
              <div className="flex bg-slate-900/60 border border-slate-700/50 rounded-xl">
                {[
                  { mode: 'grid', icon: Grid3X3 },
                  { mode: 'list', icon: List },
                  { mode: 'timeline', icon: BarChart3 }
                ].map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as ViewMode)}
                    className={`px-3 py-3 transition-all ${
                      viewMode === mode 
                        ? 'bg-cyan-500/20 text-cyan-400' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-slate-400 text-sm">Sort by:</span>
            {[
              { field: 'date', label: 'Date' },
              { field: 'name', label: 'Name' },
              { field: 'score', label: 'Score' },
              { field: 'usage', label: 'Usage' }
            ].map(({ field, label }) => (
              <button
                key={field}
                onClick={() => handleSort(field as SortField)}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                  sortField === field 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
                {sortField === field && (
                  sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Credentials Grid */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredCredentials.map((credential) => (
                  <motion.div
                    key={credential.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <EliteCredentialCard
                      credential={credential}
                      isSelected={selectedCredentials.has(credential.id)}
                      onSelect={() => handleCredentialSelect(credential.id)}
                      onShare={() => console.log('Share', credential.id)}
                      onDownload={() => console.log('Download', credential.id)}
                      onRevoke={() => console.log('Revoke', credential.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty State */}
          {filteredCredentials.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-12 h-12 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No credentials found</h3>
              <p className="text-slate-400 mb-6">
                {filters.search || filters.status.length > 0 || filters.category.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Start by creating your first verifiable credential'
                }
              </p>
              <EliteWeb3Button
                variant="primary"
                size="lg"
                icon={<Plus className="w-5 h-5" />}
              >
                Create Your First Credential
              </EliteWeb3Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowFilters(false)}
            />
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedCredentials.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <span className="text-white font-medium">
                {selectedCredentials.size} selected
              </span>
              <div className="flex gap-2">
                <EliteWeb3Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>
                  Export
                </EliteWeb3Button>
                <EliteWeb3Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />}>
                  Share
                </EliteWeb3Button>
                <button
                  onClick={() => setSelectedCredentials(new Set())}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};