import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, ArrowRight, X, Filter, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'credential' | 'api' | 'proof' | 'setting';
  url: string;
  icon?: React.ComponentType<any>;
  metadata?: Record<string, any>;
}

interface GlobalSearchProps {
  placeholder?: string;
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  placeholder = "Search credentials, APIs, or features...",
  onResultSelect,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock search data - in real app, this would come from APIs
  const mockSearchData: SearchResult[] = [
    {
      id: '1',
      title: 'Identity Verification',
      description: 'Verify identity using government documents',
      category: 'credential',
      url: '/credentials?type=identity',
      icon: Search
    },
    {
      id: '2', 
      title: 'Plaid Banking API',
      description: 'Connect bank accounts for financial verification',
      category: 'api',
      url: '/credentials?tab=marketplace&api=plaid',
      icon: Zap
    },
    {
      id: '3',
      title: 'Credit Score Proof',
      description: 'Generate zero-knowledge proof for credit score',
      category: 'proof',
      url: '/proofs?type=credit',
      icon: ArrowRight
    }
  ];

  // Simulate search with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const searchTimeout = setTimeout(() => {
      const filtered = mockSearchData.filter(item => {
        const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase()) ||
                            item.description.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        return matchesQuery && matchesCategory;
      });
      setResults(filtered);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, selectedCategory]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [result.title, ...prev.filter(s => s !== result.title)].slice(0, 5);
      return updated;
    });

    onResultSelect?.(result);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'credential': return '🏆';
      case 'api': return '⚡';
      case 'proof': return '🔒';
      case 'setting': return '⚙️';
      default: return '📄';
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div
        className="relative cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <div className="hidden sm:flex items-center space-x-1 ml-3 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden"
          >
            {/* Category Filter */}
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center space-x-2 overflow-x-auto">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {['all', 'credential', 'api', 'proof', 'setting'].map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="flex-shrink-0 text-xs"
                  >
                    {category === 'all' ? 'All' : `${getCategoryIcon(category)} ${category}`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Loading State */}
              {isLoading && (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-gray-500 mt-2">Searching...</p>
                </div>
              )}

              {/* Search Results */}
              {!isLoading && results.length > 0 && (
                <div className="p-2">
                  {results.map((result, index) => (
                    <motion.button
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            {getCategoryIcon(result.category)}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {result.title}
                            </h4>
                            <p className="text-sm text-gray-500">{result.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {!isLoading && query && results.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                </div>
              )}

              {/* Recent Searches */}
              {!query && recentSearches.length > 0 && (
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Recent Searches
                  </h3>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(search)}
                        className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!query && recentSearches.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Start searching</h3>
                  <p className="text-gray-500 text-sm">Find credentials, APIs, and features quickly</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};