/**
 * Persona Wallet Layout Component
 * Main layout with sidebar navigation and header
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useWalletStore } from "../../store/walletStore";
import {
  HomeIcon,
  CreditCardIcon,
  LinkIcon,
  ShareIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  LockClosedIcon,
  UserCircleIcon,
  GlobeEuropeAfricaIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";

interface WalletLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Credentials", href: "/credentials", icon: CreditCardIcon },
  { name: "Connections", href: "/connections", icon: LinkIcon },
  { name: "Sharing", href: "/sharing", icon: ShareIcon },
  { name: "Performance", href: "/performance", icon: BoltIcon },
  { name: "EUDI Compliance", href: "/eudi", icon: GlobeEuropeAfricaIcon },
  { name: "Settings", href: "/settings", icon: CogIcon },
];

export const WalletLayout: React.FC<WalletLayoutProps> = ({ children }) => {
  const location = useLocation();
  const {
    sidebarOpen,
    setSidebarOpen,
    currentDID,
    notifications,
    lock,
    online,
    syncing,
  } = useWalletStore();

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <div className="h-screen flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Persona
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Current DID */}
          {currentDID && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <UserCircleIcon className="h-10 w-10 text-gray-400" />
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {currentDID.identifier.slice(0, 8)}...
                    {currentDID.identifier.slice(-8)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {currentDID.method.toUpperCase()} DID
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={clsx(
                      "mr-3 h-6 w-6 flex-shrink-0",
                      isActive
                        ? "text-blue-500 dark:text-blue-300"
                        : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300",
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Status indicators */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div
                  className={clsx(
                    "w-2 h-2 rounded-full mr-2",
                    online ? "bg-green-400" : "bg-red-400",
                  )}
                />
                {online ? "Online" : "Offline"}
              </div>
              {syncing && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse" />
                  Syncing
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

              <h1 className="ml-4 lg:ml-0 text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {location.pathname.slice(1) || "Dashboard"}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                <BellIcon className="h-6 w-6" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </button>

              {/* Lock button */}
              <button
                onClick={lock}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Lock Wallet"
              >
                <LockClosedIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="h-full p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
