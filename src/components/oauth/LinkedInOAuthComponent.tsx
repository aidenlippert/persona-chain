import React, { useState, useEffect } from 'react';
import { linkedInOAuthService } from '../../services/linkedinOAuthService';
import { errorService } from '../../services/errorService';

interface LinkedInOAuthProps {
  onSuccess?: (profile: any) => void;
  onError?: (error: string) => void;
  onLoading?: (loading: boolean) => void;
  buttonText?: string;
  className?: string;
}

export const LinkedInOAuthComponent: React.FC<LinkedInOAuthProps> = ({
  onSuccess,
  onError,
  onLoading,
  buttonText = 'Connect LinkedIn',
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigValid, setIsConfigValid] = useState(true);

  useEffect(() => {
    // Validate LinkedIn OAuth configuration on mount
    const validation = linkedInOAuthService.validateConfig();
    setIsConfigValid(validation.isValid);
    
    if (!validation.isValid) {
      const errorMessage = `LinkedIn OAuth configuration error: ${validation.errors.join(', ')}`;
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  useEffect(() => {
    // Handle OAuth callback if we're on the callback page
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        const errorDescription = urlParams.get('error_description') || 'OAuth authorization failed';
        setError(errorDescription);
        onError?.(errorDescription);
        return;
      }

      if (code && state) {
        setIsLoading(true);
        onLoading?.(true);

        try {
          // Exchange code for access token
          const tokenResponse = await linkedInOAuthService.exchangeCodeForToken(code, state);
          
          // Get complete profile data
          const profileData = await linkedInOAuthService.getCompleteProfile(tokenResponse.access_token);
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          setError(null);
          onSuccess?.(profileData);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'LinkedIn OAuth failed';
          setError(errorMessage);
          onError?.(errorMessage);
        } finally {
          setIsLoading(false);
          onLoading?.(false);
        }
      }
    };

    handleOAuthCallback();
  }, [onSuccess, onError, onLoading]);

  const handleLinkedInLogin = async () => {
    if (!isConfigValid) {
      setError('LinkedIn OAuth is not properly configured');
      return;
    }

    setIsLoading(true);
    setError(null);
    onLoading?.(true);

    try {
      // Generate OAuth URL and redirect
      const authUrl = linkedInOAuthService.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate LinkedIn OAuth';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsLoading(false);
      onLoading?.(false);
    }
  };

  return (
    <div className={`linkedin-oauth-component ${className}`}>
      <button
        onClick={handleLinkedInLogin}
        disabled={isLoading || !isConfigValid}
        className={`
          flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
          ${isLoading || !isConfigValid 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-[#0077B5] hover:bg-[#005885] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0077B5]'
          }
          transition-colors duration-200
        `}
        aria-label="Connect with LinkedIn"
        data-testid="linkedin-oauth-button"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            {buttonText}
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">LinkedIn OAuth Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!isConfigValid && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Configuration Required</h3>
              <p className="mt-1 text-sm text-yellow-700">
                LinkedIn OAuth requires proper configuration. Please set up your LinkedIn application credentials.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkedInOAuthComponent;