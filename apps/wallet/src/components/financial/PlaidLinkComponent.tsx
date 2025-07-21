/**
 * Plaid Link Integration Component
 * Handles financial account linking and verification
 */

import React, { useState, useEffect } from 'react';
import { errorService } from "@/services/errorService";
import { 
  BanknotesIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface PlaidLinkComponentProps {
  userId: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface PlaidLinkData {
  public_token: string;
  metadata: {
    institution: {
      name: string;
      institution_id: string;
    };
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      subtype: string;
      mask: string;
    }>;
  };
}

export const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  userId,
  onSuccess,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<PlaidLinkData | null>(null);

  useEffect(() => {
    createLinkToken();
  }, [userId]);

  const createLinkToken = async () => {
    setIsLoading(true);
    setStatus('loading');
    
    try {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          client_name: 'PersonaPass',
          products: ['transactions', 'identity', 'assets', 'income'],
          country_codes: ['US'],
          language: 'en',
          webhook: 'https://personapass.xyz/api/plaid/webhook',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create link token');
      }

      const data = await response.json();
      setLinkToken(data.link_token);
      setStatus('ready');
    } catch (error) {
      errorService.logError('Error creating link token:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setStatus('error');
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaidSuccess = async (public_token: string, metadata: any) => {
    setStatus('loading');
    
    try {
      // Exchange public token for access token
      const response = await fetch('/api/plaid/exchange-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange public token');
      }

      const data = await response.json();
      
      // Store the link data
      const linkData: PlaidLinkData = {
        public_token,
        metadata
      };
      
      setLinkData(linkData);
      setStatus('success');
      
      // Call success callback
      onSuccess?.(data);
      
    } catch (error) {
      errorService.logError('Error exchanging public token:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setStatus('error');
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handlePlaidError = (error: any) => {
    errorService.logError('Plaid Link error:', error);
    setErrorMessage(error.error_message || 'Unknown error');
    setStatus('error');
    onError?.(error.error_message || 'Unknown error');
  };

  const openPlaidLink = () => {
    if (!linkToken) {
      errorService.logError('No link token available');
      return;
    }

    // Simulate Plaid Link flow (in real implementation, this would open the Plaid Link modal)
    // For now, we'll simulate a successful connection
    setTimeout(() => {
      const mockMetadata = {
        institution: {
          name: 'Chase Bank',
          institution_id: 'ins_56',
        },
        accounts: [
          {
            id: 'account_1',
            name: 'Chase Checking',
            type: 'depository',
            subtype: 'checking',
            mask: '1234',
          },
          {
            id: 'account_2',
            name: 'Chase Savings',
            type: 'depository',
            subtype: 'savings',
            mask: '5678',
          },
        ],
      };

      handlePlaidSuccess('mock_public_token', mockMetadata);
    }, 2000);
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Setting up secure connection...</p>
          </div>
        );

      case 'ready':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <BanknotesIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Connect Your Bank Account
              </h3>
              <p className="text-gray-600 mb-6">
                Securely connect your bank account to verify your financial information.
                We use bank-level security to protect your data.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Secure & Private</h4>
                  <p className="text-sm text-blue-800">
                    Your banking credentials are encrypted and never stored on our servers.
                    We only access the information needed for verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckBadgeIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">Verify account ownership</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckBadgeIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">Confirm income and employment</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckBadgeIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">Validate financial stability</span>
              </div>
            </div>

            <button
              onClick={openPlaidLink}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Connect Bank Account'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By connecting your account, you agree to our Terms of Service and Privacy Policy.
              You can disconnect at any time.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckBadgeIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connection Successful!
            </h3>
            <p className="text-gray-600 mb-6">
              Your bank account has been successfully connected and verified.
            </p>

            {linkData && (
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <div className="text-left">
                  <h4 className="font-medium text-green-900 mb-2">Connected Institution</h4>
                  <p className="text-sm text-green-800 mb-3">
                    {linkData.metadata.institution.name}
                  </p>
                  
                  <h4 className="font-medium text-green-900 mb-2">Connected Accounts</h4>
                  <div className="space-y-1">
                    {linkData.metadata.accounts.map((account, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-green-800">
                          {account.name} (****{account.mask})
                        </span>
                        <span className="text-green-600 capitalize">
                          {account.subtype}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-left">
                  <h4 className="font-medium text-blue-900">What's Next?</h4>
                  <p className="text-sm text-blue-800">
                    Your financial data is now being processed to create your verification proofs.
                    This may take a few minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connection Failed
            </h3>
            <p className="text-gray-600 mb-6">
              {errorMessage || 'There was an error connecting your bank account. Please try again.'}
            </p>

            <button
              onClick={createLinkToken}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ClockIcon className="h-8 w-8 text-gray-600" />
            </div>
            <p className="text-gray-600">Initializing...</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {renderContent()}
    </div>
  );
};

export default PlaidLinkComponent;