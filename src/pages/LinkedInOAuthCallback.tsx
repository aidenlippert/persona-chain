import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { linkedInOAuthService } from '../services/linkedinOAuthService';
import { errorService } from '../services/errorService';

interface CallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
  profile?: any;
}

const LinkedInOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>({
    status: 'loading',
    message: 'Processing LinkedIn authorization...'
  });

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
          let userMessage = 'LinkedIn authorization failed';
          
          switch (error) {
            case 'access_denied':
              userMessage = 'LinkedIn access was denied. Please try again and grant the necessary permissions.';
              break;
            case 'invalid_request':
              userMessage = 'Invalid LinkedIn OAuth request. Please try again.';
              break;
            case 'invalid_client':
              userMessage = 'LinkedIn OAuth configuration error. Please contact support.';
              break;
            case 'invalid_grant':
              userMessage = 'LinkedIn authorization expired. Please try again.';
              break;
            case 'unsupported_response_type':
              userMessage = 'LinkedIn OAuth response type not supported. Please contact support.';
              break;
            default:
              userMessage = errorDescription || 'LinkedIn OAuth failed with unknown error';
          }

          setState({
            status: 'error',
            message: userMessage
          });

          // Navigate back to credentials page after delay
          setTimeout(() => {
            navigate('/credentials?error=linkedin_oauth_failed');
          }, 3000);
          
          return;
        }

        // Handle missing code or state
        if (!code || !state) {
          setState({
            status: 'error',
            message: 'Missing authorization code or state parameter from LinkedIn'
          });
          
          setTimeout(() => {
            navigate('/credentials?error=linkedin_oauth_invalid');
          }, 3000);
          
          return;
        }

        // Exchange code for access token
        setState({
          status: 'loading',
          message: 'Exchanging authorization code for access token...'
        });

        const tokenResponse = await linkedInOAuthService.exchangeCodeForToken(code, state);
        
        setState({
          status: 'loading',
          message: 'Fetching LinkedIn profile information...'
        });

        // Get complete profile data
        const profileData = await linkedInOAuthService.getCompleteProfile(tokenResponse.access_token);
        
        setState({
          status: 'success',
          message: 'LinkedIn profile connected successfully!',
          profile: profileData
        });

        // Store profile data in session storage for the parent component
        sessionStorage.setItem('linkedin_profile_data', JSON.stringify(profileData));
        sessionStorage.setItem('linkedin_access_token', tokenResponse.access_token);

        // Navigate to credentials page with success
        setTimeout(() => {
          navigate('/credentials?success=linkedin_connected');
        }, 2000);

      } catch (error) {
        errorService.logError('LinkedIn OAuth callback error:', error);
        
        let errorMessage = 'LinkedIn OAuth failed';
        
        if (error instanceof Error) {
          // Handle specific error types
          if (error.message.includes('Invalid state parameter')) {
            errorMessage = 'Security validation failed. Please try connecting LinkedIn again.';
          } else if (error.message.includes('Rate limit exceeded')) {
            errorMessage = 'Too many attempts. Please wait a moment before trying again.';
          } else if (error.message.includes('Network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (error.message.includes('401')) {
            errorMessage = 'LinkedIn authorization expired. Please try again.';
          } else if (error.message.includes('403')) {
            errorMessage = 'LinkedIn access denied. Please check your permissions.';
          } else if (error.message.includes('429')) {
            errorMessage = 'Too many requests. Please wait before trying again.';
          } else {
            errorMessage = `LinkedIn OAuth error: ${error.message}`;
          }
        }

        setState({
          status: 'error',
          message: errorMessage
        });

        // Report error to error service
        errorService.reportError(
          errorService.createError(
            'LINKEDIN_OAUTH_CALLBACK_ERROR',
            errorMessage,
            'authentication',
            'medium',
            { component: 'LinkedInOAuthCallback' },
            { originalError: error }
          )
        );

        // Navigate back to credentials page after delay
        setTimeout(() => {
          navigate('/credentials?error=linkedin_oauth_failed');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  const getStatusIcon = () => {
    switch (state.status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        );
      case 'success':
        return (
          <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              LinkedIn OAuth
            </h2>
            
            <p className={`text-sm ${getStatusColor()}`}>
              {state.message}
            </p>

            {state.status === 'success' && state.profile && (
              <div className="mt-4 p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-800">
                  Welcome, {state.profile.formattedProfile.fullName}!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {state.profile.formattedProfile.email}
                </p>
              </div>
            )}

            {state.status === 'error' && (
              <div className="mt-4 p-3 bg-red-50 rounded-md">
                <p className="text-sm text-red-800">
                  Redirecting you back to continue...
                </p>
              </div>
            )}

            {state.status === 'loading' && (
              <div className="mt-4">
                <div className="animate-pulse">
                  <div className="h-2 bg-blue-200 rounded-full w-full">
                    <div className="h-2 bg-blue-600 rounded-full w-1/3 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkedInOAuthCallback;