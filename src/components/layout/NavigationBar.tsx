import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  CreditCardIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../ui/Button";
import { GlobalSearch } from "../ui/GlobalSearch";
import { Breadcrumbs, credentialsBreadcrumbs, dashboardBreadcrumbs } from "../ui/Breadcrumbs";
import { motion, AnimatePresence } from 'framer-motion';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: HomeIcon,
    description: "Overview and quick actions",
  },
  {
    name: "Credentials",
    href: "/credentials",
    icon: CreditCardIcon,
    description: "Manage your verifiable credentials",
  },
  {
    name: "Proof Requests",
    href: "/proof-requests",
    icon: QrCodeIcon,
    description: "Handle identity verification requests",
  },
  {
    name: "Identity",
    href: "/identity",
    icon: ShieldCheckIcon,
    description: "DID management and security",
  },
  {
    name: "Profile",
    href: "/profile",
    icon: UserCircleIcon,
    description: "Account settings and preferences",
  },
];

interface NavigationBarProps {
  className?: string;
  showBreadcrumbs?: boolean;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  className = "",
  showBreadcrumbs = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActiveRoute = (href: string) => {
    return (
      location.pathname === href ||
      (href !== "/" && location.pathname.startsWith(href))
    );
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getCurrentBreadcrumbs = () => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'credentials';
    
    if (path.startsWith('/credentials')) {
      return credentialsBreadcrumbs(currentTab);
    }
    return dashboardBreadcrumbs;
  };

  return (
    <>
      {/* Desktop Navigation */}
      <motion.nav
        className={`bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-lg ${className}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center space-x-3 group"
                aria-label="Persona Home"
              >
                <motion.div 
                  className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <SparklesIcon className="w-6 h-6 text-white" />
                </motion.div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  PersonaPass
                </span>
              </Link>
            </div>

            {/* Global Search - Desktop */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <GlobalSearch className="w-full" />
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);

                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={item.href}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative group
                        ${
                          isActive
                            ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 shadow-lg border border-blue-200/50 backdrop-blur-sm"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/60 backdrop-blur-sm"
                        }
                      `}
                      aria-label={`${item.name} - ${item.description}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Icon
                          className={`w-4 h-4 transition-colors duration-200 ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}
                        />
                      </motion.div>
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div 
                          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        />
                      )}
                      <span>{item.name}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Settings and Mobile Menu */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex"
                aria-label="Settings"
              >
                <Link to="/settings" className="flex items-center">
                  <CogIcon className="w-4 h-4" />
                </Link>
              </Button>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="md:hidden"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
              >
                <div className="relative w-5 h-5">
                  <Bars3Icon 
                    className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                      isMobileMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                    }`} 
                  />
                  <XMarkIcon 
                    className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                      isMobileMenuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
                    }`} 
                  />
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {showBreadcrumbs && (
          <motion.div 
            className="border-t border-gray-100/50 bg-gray-50/30 backdrop-blur-sm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <Breadcrumbs items={getCurrentBreadcrumbs()} />
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="md:hidden fixed inset-0 z-50 bg-black/20 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="flex flex-col h-full bg-white"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                <Link
                  to="/"
                  className="flex items-center space-x-3 group"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="PersonaPass Home"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    PersonaPass
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileMenu}
                  aria-label="Close menu"
                >
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              </div>

              {/* Mobile Search */}
              <div className="px-6 py-4 border-b border-gray-100">
                <GlobalSearch placeholder="Search..." />
              </div>

              {/* Mobile Navigation Links */}
              <div className="flex-1 px-6 py-8 space-y-3 overflow-y-auto">
                {navigation.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.href);

                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <Link
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`
                          flex items-center space-x-4 p-4 rounded-2xl transition-all duration-300 group
                          ${
                            isActive
                              ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 shadow-lg border border-blue-200/50"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/60"
                          }
                        `}
                        aria-label={`${item.name} - ${item.description}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                          ${isActive ? 'bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg' : 'bg-gray-100 group-hover:bg-gray-200'}
                        `}>
                          <Icon
                            className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-sm text-gray-500">
                            {item.description}
                          </div>
                        </div>
                        {isActive && (
                          <motion.div 
                            className="w-2 h-2 bg-blue-600 rounded-full"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}

                {/* Settings Link in Mobile */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navigation.length * 0.1, duration: 0.3 }}
                >
                  <Link
                    to="/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 p-4 rounded-2xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-300"
                    aria-label="Settings"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <CogIcon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">Settings</div>
                      <div className="text-sm text-gray-500">
                        App preferences and configuration
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavigationBar;
