/**
 * Blockchain Status Indicator
 * Shows real-time connection status to PersonaChain
 */

import React, { useState, useEffect } from "react";
import { personaChainService } from "../../services/personaChainService";
import { errorService } from "@/services/errorService";

interface BlockchainStatusProps {
  className?: string;
}

export const BlockchainStatus: React.FC<BlockchainStatusProps> = ({
  className = "",
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [blockHeight, setBlockHeight] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkBlockchainStatus = async () => {
      try {
        setIsLoading(true);
        const [healthy, height] = await Promise.all([
          personaChainService.checkBlockchainHealth(),
          personaChainService.getCurrentBlockHeight(),
        ]);

        setIsConnected(healthy);
        setBlockHeight(height);
      } catch (error) {
        errorService.logError("Failed to check blockchain status:", error);
        setIsConnected(false);
        setBlockHeight(0);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial check
    checkBlockchainStatus();

    // Set up polling every 30 seconds
    const interval = setInterval(checkBlockchainStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const statusColor = isConnected
    ? "text-green-600 bg-green-50 border-green-200"
    : "text-red-600 bg-red-50 border-red-200";

  const statusIcon = isConnected ? (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );

  const loadingSpinner = (
    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
  );

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full border ${statusColor} ${className}`}
    >
      {isLoading ? loadingSpinner : statusIcon}
      <span>
        {isLoading
          ? "Checking..."
          : isConnected
            ? "PersonaChain Running"
            : "PersonaChain Offline"}
      </span>
      {isConnected && blockHeight > 0 && (
        <span className="text-xs opacity-75">
          #{blockHeight.toLocaleString()}
        </span>
      )}
    </div>
  );
};

export default BlockchainStatus;
