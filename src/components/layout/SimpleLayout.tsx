/**
 * Simple Layout - Clean, Trustworthy Design
 * Professional layout with wallet integration
 */

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  IdentificationIcon,
  DocumentTextIcon,
  QrCodeIcon,
  HomeIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { PersonaWallet } from "../../services/personaChainService";
import { BlockchainStatus } from "../common/BlockchainStatus";

interface SimpleLayoutProps {
  children: React.ReactNode;
  wallet?: PersonaWallet | null;
  onLogout?: () => void;
}

export const SimpleLayout: React.FC<SimpleLayoutProps> = ({
  children,
  wallet,
  onLogout,
}) => {
  const location = useLocation();
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const navItems = [
    { path: "/", label: "Dashboard", icon: HomeIcon },
    { path: "/identity", label: "Identity", icon: IdentificationIcon },
    { path: "/credentials", label: "Credentials", icon: DocumentTextIcon },
    { path: "/share", label: "Share", icon: QrCodeIcon },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Skip to main content for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-orange-500 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header
        className="bg-white border-b border-gray-200 shadow-sm"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Persona</h1>
            </div>

            {/* Blockchain Status */}
            <div className="flex items-center space-x-4">
              <BlockchainStatus />
            </div>

            {/* Navigation */}
            <nav
              className="hidden md:flex space-x-1"
              role="navigation"
              aria-label="Main navigation"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-orange-50 text-orange-900 border border-orange-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Wallet Info */}
            {wallet && (
              <div className="relative">
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {wallet.address.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {wallet.address.slice(0, 8)}...
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                </button>

                {/* Wallet Dropdown */}
                {showWalletMenu && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {wallet.address.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Connected Wallet
                          </p>
                          <p className="text-xs text-gray-500">
                            PersonaChain Mainnet
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500">
                          Wallet Address
                        </label>
                        <button
                          onClick={() => copyToClipboard(wallet.address)}
                          className="block w-full text-left text-xs font-mono text-gray-900 bg-gray-50 p-2 rounded mt-1 hover:bg-gray-100 transition-colors"
                          title="Click to copy"
                        >
                          {wallet.address}
                        </button>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">
                          DID
                        </label>
                        <button
                          onClick={() => copyToClipboard(wallet.did)}
                          className="block w-full text-left text-xs font-mono text-gray-900 bg-gray-50 p-2 rounded mt-1 hover:bg-gray-100 transition-colors"
                          title="Click to copy"
                        >
                          {wallet.did}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-2">
                      <button
                        onClick={() => {
                          setShowWalletMenu(false);
                          onLogout?.();
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav
        className="md:hidden bg-white border-b border-gray-200"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "text-orange-600"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        role="main"
      >
        <div className="min-h-[calc(100vh-200px)]">{children}</div>
      </main>

      {/* Footer */}
      <footer
        className="bg-gray-50 border-t border-gray-200"
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>© 2025 Persona</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                Decentralized Identity Platform
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <a
                href="#"
                className="text-gray-600 hover:text-orange-600 transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-orange-600 transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-orange-600 transition-colors"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Click outside to close dropdown */}
      {showWalletMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowWalletMenu(false)}
        />
      )}
    </div>
  );
};
