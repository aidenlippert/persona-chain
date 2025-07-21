/**
 * Professional Main Layout Component
 * Modern, responsive layout with glassmorphism and smooth animations
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDID } from "../../hooks/useDID";

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
  description: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDID, storedDIDs } = useDID();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications] = useState(3);

  const navItems: NavItem[] = [
    {
      path: "/",
      label: "Dashboard",
      icon: "🏠",
      description: "Wallet overview and quick actions",
    },
    {
      path: "/did-manager",
      label: "Identity",
      icon: "🆔",
      badge: storedDIDs.length,
      description: "Manage your decentralized identities",
    },
    {
      path: "/credentials",
      label: "Credentials",
      icon: "📋",
      badge: 5,
      description: "Verifiable credentials and certificates",
    },
    {
      path: "/share",
      label: "Share",
      icon: "📱",
      description: "QR codes and secure sharing",
    },
    {
      path: "/biometric",
      label: "Security",
      icon: "🔒",
      description: "Biometric authentication and security",
    },
    {
      path: "/privacy",
      label: "Privacy",
      icon: "🎭",
      description: "Zero-knowledge proofs and privacy",
    },
    {
      path: "/settings",
      label: "Settings",
      icon: "⚙️",
      badge: notifications > 0 ? notifications : undefined,
      description: "Wallet configuration and preferences",
    },
  ];

  const currentPath = location.pathname;

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMenuOpen(false);
  }, [currentPath]);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)",
        backgroundSize: "200% 200%",
        animation: "gradient 15s ease infinite",
      }}
    >
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Header */}
      <header className="relative z-50">
        <div className="pp-glass border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Title */}
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-xl font-bold text-white">P</span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <h1 className="text-xl font-bold text-white">Persona</h1>
                  <p className="text-sm text-white/70">
                    Digital Identity Wallet
                  </p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:block">
                <div className="pp-nav">
                  {navItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`pp-nav-item ${currentPath === item.path ? "active" : ""}`}
                      title={item.description}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                      {item.badge && (
                        <span className="ml-2 bg-accent-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </nav>

              {/* User Status and Mobile Menu */}
              <div className="flex items-center space-x-4">
                {/* Connection Status */}
                <div className="hidden sm:flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${currentDID ? "bg-success-500" : "bg-amber-500"} animate-pulse`}
                  />
                  <span className="text-sm text-white/80">
                    {currentDID ? "Connected" : "Setup Required"}
                  </span>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="lg:hidden pp-btn pp-btn-ghost p-2"
                  aria-label="Toggle navigation menu"
                >
                  <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                    <div
                      className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? "rotate-45 translate-y-1.5" : ""}`}
                    />
                    <div
                      className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? "opacity-0" : ""}`}
                    />
                    <div
                      className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden animate-slide-in-right">
            <div className="pp-glass-dark border-t border-white/10">
              <div className="px-4 py-6 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                      currentPath === item.path
                        ? "bg-white/20 text-white"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{item.icon}</span>
                      <div className="text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-white/60">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="bg-accent-500 text-white text-xs rounded-full px-2 py-1 min-w-[24px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-fade-in-scale">{children}</div>
        </div>
      </main>

      {/* Status Bar */}
      <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 z-40">
        <div className="pp-glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-success-500 to-accent-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  Wallet Active
                </div>
                <div className="text-xs text-white/70">
                  {currentDID
                    ? `${storedDIDs.length} DIDs • 5 Credentials`
                    : "Setup in progress"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/70">Security Level</div>
              <div className="text-sm font-medium text-success-400">High</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Setup Progress</span>
              <span>{currentDID ? "100%" : "60%"}</span>
            </div>
            <div className="pp-progress-bar">
              <div
                className="pp-progress-fill"
                style={{ width: currentDID ? "100%" : "60%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-success-500/5 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>
    </div>
  );
};
