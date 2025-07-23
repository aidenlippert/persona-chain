/**
 * Persona Wallet Authentication Screen
 * Handles passkey and password authentication
 */

import React, { useState, useEffect } from "react";
import { useWalletStore } from "@/store/walletStore";

import {
  FingerPrintIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { LoadingSpinner } from "@/components/ui";
import { errorService } from "@/services/errorService";

export const AuthScreen: React.FC = () => {
  const { unlock, loading, error, setError, webauthnService } =
    useWalletStore();

  const [authMethod, setAuthMethod] = useState<"passkey" | "password">(
    "passkey",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [webauthnSupport, setWebAuthnSupport] = useState<{
    supported: boolean;
    platformAvailable: boolean;
    conditionalMediation: boolean;
  }>({
    supported: false,
    platformAvailable: false,
    conditionalMediation: false,
  });

  // Check WebAuthn support and existing passkeys on mount
  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        const support = await webauthnService.testWebAuthnSupport();
        setWebAuthnSupport({
          supported: support.webauthnSupported,
          platformAvailable: support.platformAuthenticatorAvailable,
          conditionalMediation: support.conditionalMediationSupported,
        });

        const hasRegisteredPasskeys =
          await webauthnService.hasRegisteredPasskeys();
        setHasPasskeys(hasRegisteredPasskeys);

        // Default to password if no passkeys available
        if (!hasRegisteredPasskeys || !support.webauthnSupported) {
          setAuthMethod("password");
        }
      } catch (error) {
        errorService.logError("Error checking capabilities:", error);
        setAuthMethod("password");
      }
    };

    checkCapabilities();
  }, [webauthnService]);

  const handlePasskeyAuth = async () => {
    try {
      setError(null);
      await unlock("passkey");
    } catch (error) {
      errorService.logError("Passkey authentication failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Passkey authentication failed",
      );
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    try {
      setError(null);
      await unlock("password", password);
    } catch (error) {
      errorService.logError("Password authentication failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Password authentication failed",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Persona Wallet
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Secure digital identity management
          </p>
        </div>

        {/* Authentication Methods */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          {/* Method Selection */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setAuthMethod("passkey")}
              disabled={!webauthnSupport.supported || !hasPasskeys}
              className={clsx(
                "flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                authMethod === "passkey"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400",
                (!webauthnSupport.supported || !hasPasskeys) &&
                  "opacity-50 cursor-not-allowed",
              )}
            >
              <FingerPrintIcon className="w-4 h-4 mr-2" />
              Passkey
            </button>
            <button
              onClick={() => setAuthMethod("password")}
              className={clsx(
                "flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                authMethod === "password"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400",
              )}
            >
              <KeyIcon className="w-4 h-4 mr-2" />
              Password
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Passkey Authentication */}
          {authMethod === "passkey" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                  {webauthnSupport.platformAvailable ? (
                    <DevicePhoneMobileIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ComputerDesktopIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Use your passkey
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {webauthnSupport.platformAvailable
                    ? "Use your biometric authentication or device PIN"
                    : "Use your security key or external authenticator"}
                </p>
              </div>

              <button
                onClick={handlePasskeyAuth}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <FingerPrintIcon className="w-5 h-5 mr-2" />
                    Authenticate with Passkey
                  </>
                )}
              </button>
            </div>
          )}

          {/* Password Authentication */}
          {authMethod === "password" && (
            <form onSubmit={handlePasswordAuth} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Wallet Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your wallet password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <LoadingSpinner size="sm" /> : "Unlock Wallet"}
              </button>
            </form>
          )}

          {/* WebAuthn Support Info */}
          {!webauthnSupport.supported && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Your browser doesn't support passkeys. Please use password
                authentication or update your browser.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>Persona Wallet v1.0.0</p>
          <p>Secure • Private • Decentralized</p>
        </div>
      </div>
    </div>
  );
};
