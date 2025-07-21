import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  Shield, 
  SortAsc, 
  SortDesc,
  Grid3X3,
  List,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import { CredentialCard } from '../credentials/CredentialCard';
import { Credential } from '../../types/wallet';

type SortField = 'name' | 'issuer' | 'date' | 'status' | 'domain';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'active' | 'expired' | 'pending' | 'revoked';
type FilterDomain = 'all' | 'academic' | 'financial' | 'health' | 'social' | 'government' | 'iot';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick, count }) => (
  <motion.button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active 
        ? 'bg-blue-600 text-white' 
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
    }`}
    whileTap={{ scale: 0.95 }}
  >
    {label}
    {count !== undefined && (
      <span className={`ml-1 ${active ? 'text-blue-100' : 'text-gray-500'}`}>
        ({count})
      </span>
    )}
  </motion.button>
);

export const CredentialsPage: React.FC = () => {
  const { credentials, refreshCredentials, pushModal, addNotification } = useWalletStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterDomain, setFilterDomain] = useState<FilterDomain>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter and search credentials
  const filteredCredentials = useMemo(() => {
    return credentials.filter(credential => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        credential.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        credential.issuer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        credential.domain.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = filterStatus === 'all' || credential.status === filterStatus;

      // Domain filter
      const matchesDomain = filterDomain === 'all' || credential.domain === filterDomain;

      return matchesSearch && matchesStatus && matchesDomain;
    });
  }, [credentials, searchQuery, filterStatus, filterDomain]);

  // Sort credentials
  const sortedCredentials = useMemo(() => {
    return [...filteredCredentials].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        case 'issuer':
          aValue = a.issuer.name.toLowerCase();
          bValue = b.issuer.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.issuedAt);
          bValue = new Date(b.issuedAt);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'domain':
          aValue = a.domain;
          bValue = b.domain;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCredentials, sortField, sortOrder]);

  // Get counts for filter chips
  const statusCounts = useMemo(() => {
    return credentials.reduce((acc, cred) => {
      acc[cred.status] = (acc[cred.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [credentials]);

  const domainCounts = useMemo(() => {
    return credentials.reduce((acc, cred) => {
      acc[cred.domain] = (acc[cred.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [credentials]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCredentials();
      addNotification({
        type: 'success',
        title: 'Credentials Refreshed',
        message: 'All credentials have been updated with latest information',
        priority: 'low',
        actionable: false,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh credentials. Please try again.',
        priority: 'medium',
        actionable: false,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCredentialAction = (action: string, credential: Credential) => {
    switch (action) {
      case 'generate-proof':
        pushModal('generate-proof', { credentialId: credential.id });
        break;
      case 'view-details':
        pushModal('credential-details', { credentialId: credential.id });
        break;
      case 'menu':
        pushModal('credential-menu', { credentialId: credential.id });
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Credentials
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your verified identity credentials
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </motion.button>
            
            <motion.button
              onClick={() => pushModal('add-credential')}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={18} />
            </motion.button>
          </div>
        </div>

        {/* Search and controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search credentials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* View controls */}
          <div className="flex items-center space-x-2">
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <Filter size={18} />
            </motion.button>

            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <motion.button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <Grid3X3 size={16} />
              </motion.button>
              <motion.button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <List size={16} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Status filters */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Status</h4>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="All"
                  active={filterStatus === 'all'}
                  onClick={() => setFilterStatus('all')}
                  count={credentials.length}
                />
                <FilterChip
                  label="Active"
                  active={filterStatus === 'active'}
                  onClick={() => setFilterStatus('active')}
                  count={statusCounts.active || 0}
                />
                <FilterChip
                  label="Expired"
                  active={filterStatus === 'expired'}
                  onClick={() => setFilterStatus('expired')}
                  count={statusCounts.expired || 0}
                />
                <FilterChip
                  label="Pending"
                  active={filterStatus === 'pending'}
                  onClick={() => setFilterStatus('pending')}
                  count={statusCounts.pending || 0}
                />
                <FilterChip
                  label="Revoked"
                  active={filterStatus === 'revoked'}
                  onClick={() => setFilterStatus('revoked')}
                  count={statusCounts.revoked || 0}
                />
              </div>
            </div>

            {/* Domain filters */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Domain</h4>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="All"
                  active={filterDomain === 'all'}
                  onClick={() => setFilterDomain('all')}
                  count={credentials.length}
                />
                <FilterChip
                  label="Academic"
                  active={filterDomain === 'academic'}
                  onClick={() => setFilterDomain('academic')}
                  count={domainCounts.academic || 0}
                />
                <FilterChip
                  label="Financial"
                  active={filterDomain === 'financial'}
                  onClick={() => setFilterDomain('financial')}
                  count={domainCounts.financial || 0}
                />
                <FilterChip
                  label="Health"
                  active={filterDomain === 'health'}
                  onClick={() => setFilterDomain('health')}
                  count={domainCounts.health || 0}
                />
                <FilterChip
                  label="Social"
                  active={filterDomain === 'social'}
                  onClick={() => setFilterDomain('social')}
                  count={domainCounts.social || 0}
                />
                <FilterChip
                  label="Government"
                  active={filterDomain === 'government'}
                  onClick={() => setFilterDomain('government')}
                  count={domainCounts.government || 0}
                />
                <FilterChip
                  label="IoT"
                  active={filterDomain === 'iot'}
                  onClick={() => setFilterDomain('iot')}
                  count={domainCounts.iot || 0}
                />
              </div>
            </div>

            {/* Sort options */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Sort by</h4>
              <div className="flex flex-wrap gap-2">
                {(['name', 'issuer', 'date', 'status', 'domain'] as SortField[]).map((field) => (
                  <motion.button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                      sortField === field 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="capitalize">{field}</span>
                    {sortField === field && (
                      sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results summary */}
      <motion.div
        className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <span>
          Showing {sortedCredentials.length} of {credentials.length} credentials
        </span>
        
        {sortedCredentials.length > 0 && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <CheckCircle size={14} className="text-green-500" />
              <span>{sortedCredentials.filter(c => c.status === 'active').length} active</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertCircle size={14} className="text-red-500" />
              <span>{sortedCredentials.filter(c => c.status === 'expired').length} expired</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock size={14} className="text-yellow-500" />
              <span>{sortedCredentials.filter(c => c.status === 'pending').length} pending</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Credentials grid/list */}
      <AnimatePresence mode="wait">
        {sortedCredentials.length > 0 ? (
          <motion.div
            key={`${viewMode}-${filteredCredentials.length}`}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-4'
                : 'space-y-3'
            }
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {sortedCredentials.map((credential, index) => (
              <motion.div
                key={credential.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <CredentialCard
                  credential={credential}
                  onAction={handleCredentialAction}
                  compact={viewMode === 'list'}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {searchQuery || filterStatus !== 'all' || filterDomain !== 'all' ? (
              <>
                <Search size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No credentials found
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <motion.button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setFilterDomain('all');
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Clear Filters
                </motion.button>
              </>
            ) : (
              <>
                <Shield size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No credentials yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Start by connecting your accounts to build your digital identity
                </p>
                <motion.button
                  onClick={() => pushModal('add-credential')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Add First Credential
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom spacing */}
      <div className="h-4" />
    </div>
  );
};