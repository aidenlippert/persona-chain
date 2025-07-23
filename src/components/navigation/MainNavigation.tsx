/**
 * Main Navigation - Beautiful Black/White/Orange Design System
 * Enterprise-grade identity wallet navigation
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface NavItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    name: 'Home',
    path: '/dashboard',
    icon: '🏠',
    description: 'Scan QR / Present QR'
  },
  {
    id: 'credentials',
    name: 'Credentials',
    path: '/credentials',
    icon: '🎫',
    description: 'Manage verifiable credentials'
  },
  {
    id: 'proofs',
    name: 'Proofs',
    path: '/proofs',
    icon: '🔐',
    description: 'Zero-knowledge proofs'
  },
  {
    id: 'connections',
    name: 'Connections',
    path: '/connections',
    icon: '🔗',
    description: 'Trusted issuers & verifiers'
  },
  {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    icon: '⚙️',
    description: 'Security & preferences'
  }
];

export const MainNavigation = () => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-black via-gray-900 to-black shadow-2xl z-50 border-r-4 border-orange-500">
        <div className="p-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-white via-orange-500 to-white bg-clip-text text-transparent mb-2">
                Persona
              </div>
              <div className="text-gray-400 text-sm">
                Decentralized Identity Wallet
              </div>
            </div>
          </motion.div>

          {/* Navigation Items */}
          <div className="space-y-4">
            {navItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={item.path}
                  className={`group relative block p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        {item.name}
                      </div>
                      <div className={`text-sm ${
                        isActive(item.path) ? 'text-orange-100' : 'text-gray-400'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Active indicator */}
                  {isActive(item.path) && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* User Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 p-4 bg-gray-800/50 rounded-xl border border-gray-700"
          >
            <div className="text-white font-semibold mb-1">
              Identity Status
            </div>
            <div className="text-green-400 text-sm flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Connected
            </div>
          </motion.div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-md z-50 border-b border-orange-500">
          <div className="flex items-center justify-between p-4">
            <div className="text-xl font-bold bg-gradient-to-r from-white to-orange-500 bg-clip-text text-transparent">
              Persona
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white p-2 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Mobile Menu */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ 
            opacity: isExpanded ? 1 : 0, 
            y: isExpanded ? 0 : -100 
          }}
          transition={{ duration: 0.3 }}
          className={`fixed top-16 left-0 right-0 bg-black/95 backdrop-blur-md z-40 border-b border-orange-500 ${
            isExpanded ? 'block' : 'hidden'
          }`}
        >
          <div className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setIsExpanded(false)}
                className={`block p-4 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm opacity-75">{item.description}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-orange-500 z-50">
          <div className="flex justify-around items-center py-2">
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'text-orange-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};