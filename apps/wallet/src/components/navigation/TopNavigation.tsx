/**
 * Modern Web3 Navigation - Clean, professional, minimal
 * Inspired by the best Web3 websites like MetaMask, Rainbow, and Cosmos
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bars3Icon, 
  XMarkIcon,
  WalletIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  GiftIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

interface NavItem {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: WalletIcon,
    description: 'Your identity wallet overview'
  },
  {
    id: 'credentials',
    name: 'Credentials',
    path: '/credentials',
    icon: DocumentTextIcon,
    description: 'Manage verifiable credentials'
  },
  {
    id: 'proofs',
    name: 'Proofs',
    path: '/proofs',
    icon: ShieldCheckIcon,
    description: 'Zero-knowledge proofs'
  },
  {
    id: 'marketplace',
    name: 'API Marketplace',
    path: '/marketplace',
    icon: BuildingStorefrontIcon,
    description: 'Browse 40,000+ APIs'
  },
  {
    id: 'token',
    name: 'Rewards',
    path: '/token',
    icon: GiftIcon,
    description: 'PERS token rewards'
  },
  {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    icon: Cog6ToothIcon,
    description: 'Account settings'
  }
];


export const TopNavigation = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname === path;
  };

  return (
    <>
      {/* Modern Web3 Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        {/* Clean backdrop with subtle gradient */}
        <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-800/50"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Modern Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <Link to="/dashboard" className="flex items-center space-x-3 group">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                      <WalletIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    PersonaPass
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Clean Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={item.path}
                      className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 group ${
                        isActive(item.path)
                          ? 'text-white bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{item.name}</span>
                      {isActive(item.path) && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl border border-orange-500/20"
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Connection Status */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-400">Connected</span>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
              >
                {isMobileMenuOpen ? 
                  <XMarkIcon className="h-5 w-5" /> : 
                  <Bars3Icon className="h-5 w-5" />
                }
              </button>
            </div>
          </div>
        </div>

        {/* Modern Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-gray-900/98 backdrop-blur-md border-t border-gray-800/50"
            >
              <div className="max-w-sm mx-auto px-4 py-6">
                <div className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
                          isActive(item.path)
                            ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-white border border-orange-500/30'
                            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="h-16"></div>
    </>
  );
};