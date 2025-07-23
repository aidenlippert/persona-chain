/**
 * WalletConnect - Clean Web3 Authentication Component
 * Integrates with PersonaChain blockchain via Keplr wallet
 */

import { useState, useEffect } from "react";
import { errorService } from "@/services/errorService";
import {
  personaChainService,
  PersonaWallet,
} from "../../services/personaChainService";

interface WalletConnectProps {
  onWalletConnected: (wallet: PersonaWallet) => void;
  onError: (error: string) => void;
}

export function WalletConnect({
  onWalletConnected,
  onError,
}: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [blockchainHealth, setBlockchainHealth] = useState<boolean | null>(
    null,
  );
  const [blockHeight, setBlockHeight] = useState<number>(0);

  useEffect(() => {
    checkBlockchainStatus();
  }, []);

  const checkBlockchainStatus = async () => {
    try {
      const [health, height] = await Promise.all([
        personaChainService.checkBlockchainHealth(),
        personaChainService.getCurrentBlockHeight(),
      ]);
      setBlockchainHealth(health);
      setBlockHeight(height);
    } catch (error) {
      setBlockchainHealth(false);
      errorService.logError("Blockchain status check failed:", error);
    }
  };

  const connectKeplrWallet = async () => {
    setIsConnecting(true);
    try {
      const wallet = await personaChainService.connectKeplr();
      if (wallet) {
        onWalletConnected(wallet);
      } else {
        onError("Failed to connect wallet. Please check Keplr installation.");
      }
    } catch (error: any) {
      errorService.logError("Keplr wallet connection failed:", error);
      let errorMessage = "Wallet connection failed";

      if (error.message.includes("not installed")) {
        errorMessage =
          "Keplr wallet is not installed. Please install Keplr and try again.";
      } else if (error.message.includes("rejected")) {
        errorMessage =
          "Connection was rejected. Please approve the connection in Keplr.";
      } else if (error.message.includes("network")) {
        errorMessage =
          "Network error: Unable to connect to PersonaChain. Please check your connection.";
      } else if (error.message.includes("permission")) {
        errorMessage =
          "Permission denied. Please enable PersonaChain in Keplr settings.";
      }

      onError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const installKeplr = () => {
    window.open(
      "https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap",
      "_blank",
    );
  };

  const hasKeplr = typeof window !== "undefined" && window.keplr;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-gray-900 mb-4 tracking-tight">
            Persona
          </h1>
          <p className="text-gray-600 text-lg">
            Decentralized Identity Platform
          </p>
        </div>

        {/* Blockchain Status */}
        <div
          className="bg-white rounded-xl border border-gray-200 p-4 mb-6"
          role="region"
          aria-labelledby="blockchain-status-heading"
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              id="blockchain-status-heading"
              className="text-sm font-medium text-gray-700"
            >
              Blockchain Status
            </h2>
            <div
              className={`w-2 h-2 rounded-full ${blockchainHealth ? "bg-green-500" : "bg-red-500"}`}
              role="img"
              aria-label={
                blockchainHealth ? "Blockchain online" : "Blockchain offline"
              }
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Network</span>
              <span className="text-gray-900 font-mono">persona-mainnet-1</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Block Height</span>
              <span className="text-gray-900 font-mono">
                {blockHeight.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span
                className={`font-medium ${blockchainHealth ? "text-green-600" : "text-red-600"}`}
                role="status"
                aria-live="polite"
              >
                {blockchainHealth ? "Synced" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Connection Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {!hasKeplr ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Get Started with Keplr
              </h3>
              <p className="text-gray-600 mb-6">
                Keplr is the most trusted Cosmos wallet with 30M+ users
                worldwide
              </p>
              <button
                onClick={installKeplr}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                aria-describedby="keplr-install-description"
              >
                Install Keplr Wallet
              </button>
              <p id="keplr-install-description" className="sr-only">
                This will open the Chrome Web Store to install the Keplr wallet
                extension
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Connect
              </h3>
              <p className="text-gray-600 mb-6">
                Securely connect to PersonaChain and create your digital
                identity
              </p>
              <button
                onClick={connectKeplrWallet}
                disabled={isConnecting || !blockchainHealth}
                className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                aria-describedby="keplr-connect-description"
                aria-live="polite"
              >
                {isConnecting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  "Connect with Keplr"
                )}
              </button>
              <p id="keplr-connect-description" className="sr-only">
                This will connect your Keplr wallet to PersonaChain to create
                your decentralized identity
              </p>
              {!blockchainHealth && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠ Blockchain offline - please try again later
                </p>
              )}
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="w-5 h-5 text-gray-400 mt-0.5 mr-3">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Privacy & Security First
              </h4>
              <p className="text-xs text-gray-600">
                Your credentials are stored on-chain with W3C standards. Private
                keys remain in your control at all times.
              </p>
            </div>
          </div>
        </div>

        {/* Powered by */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Powered by <span className="font-medium">Cosmos SDK</span> &{" "}
            <span className="font-medium">W3C Standards</span>
          </p>
        </div>
      </div>
    </div>
  );
}
