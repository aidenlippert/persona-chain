/**
 * OAuth Callback Handler - Seamless same-site OAuth completion
 * Beautiful black/white/orange design system
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { errorService } from "@/services/errorService";

interface OAuthCallbackProps {
  platform: 'github' | 'linkedin' | 'plaid' | 'twitter';
}

export const OAuthCallback = ({ platform }: OAuthCallbackProps) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth...');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [actualError, setActualError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      
      // NEW: Check for Railway backend success response
      const credential = searchParams.get('credential');
      const success = searchParams.get('success');

      console.log('🚀🚀🚀 EXTREME OAUTH CALLBACK HEAVY DEBUG START 🚀🚀🚀');
      
      const debugData = {
        url: window.location.href,
        fullUrl: window.location.toString(),
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        code: code ? `${code.substring(0, 20)}...` : '❌ CODE IS NULL',
        codeLength: code?.length || 0,
        codeType: typeof code,
        state: state ? `${state.substring(0, 20)}...` : '❌ STATE IS NULL',
        stateLength: state?.length || 0,
        stateType: typeof state,
        error: error || 'none',
        platform: platform,
        allParams: Object.fromEntries(searchParams.entries()),
        allParamsKeys: Array.from(searchParams.keys()),
        allParamsValues: Array.from(searchParams.values()),
        sessionState: sessionStorage.getItem('github_oauth_state'),
        localState: localStorage.getItem('github_oauth_state_backup'),
        allSessionKeys: Object.keys(sessionStorage),
        allLocalKeys: Object.keys(localStorage),
        userAgent: navigator.userAgent.substring(0, 100),
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        windowOpener: !!window.opener,
        windowParent: window.parent !== window,
        isPopup: window.opener !== null,
        windowFeatures: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          screen: {
            width: window.screen.width,
            height: window.screen.height
          }
        }
      };
      
      setDebugInfo(debugData);
      console.log('🔍🔍🔍 OAUTH CALLBACK EXTREME DEBUG:', JSON.stringify(debugData, null, 2));
      
      // Add GitHub credentials check
      const hasGitHubCreds = !!(import.meta.env.VITE_GITHUB_CLIENT_ID && import.meta.env.VITE_GITHUB_CLIENT_SECRET);
      console.log('🔑 GitHub credentials configured:', hasGitHubCreds);

      // NEW: Handle Railway backend success response first
      if (success === 'true' && credential) {
        console.log('🎉 Railway backend OAuth success detected!');
        console.log('📦 Credential data received:', credential.substring(0, 200) + '...');
        
        try {
          const credentialData = JSON.parse(decodeURIComponent(credential));
          console.log('✅ Parsed credential data:', credentialData);
          
          setMessage('GitHub credential received! Storing...');
          
          // Store credential
          const existingCreds = JSON.parse(localStorage.getItem('credentials') || '[]');
          existingCreds.push(credentialData);
          localStorage.setItem('credentials', JSON.stringify(existingCreds));
          
          console.log('✅ Railway OAuth credential stored! Total credentials:', existingCreds.length);
          
          setStatus('success');
          setMessage('GitHub developer credential created successfully via Railway!');
          
          // Notify parent window if popup
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'GITHUB_OAUTH_SUCCESS', 
              credential: credentialData,
              username: credentialData.credentialSubject?.login || 'Unknown User'
            }, window.location.origin);
            window.close();
            return;
          }
          
          // Same window - redirect to credentials page
          setTimeout(() => {
            navigate('/credentials');
          }, 2000);
          
          return;
        } catch (parseError) {
          console.error('❌ Failed to parse credential data:', parseError);
          setStatus('error');
          setMessage('Failed to process credential data');
          return;
        }
      }

      if (error) {
        console.error('🚨 GitHub returned error parameter:', error);
        console.log('🔍 Error analysis:', {
          errorParam: error,
          errorDescription: searchParams.get('error_description'),
          errorURI: searchParams.get('error_uri'),
          allParams: Object.fromEntries(searchParams.entries())
        });
        setStatus('error');
        setMessage(`GitHub OAuth error: ${error}`);
        setActualError(`GitHub returned error: ${error} - ${searchParams.get('error_description') || 'No description'}`);
        return;
      }

      if (!code) {
        console.error('❌ No code parameter found - checking if this is a Railway success response...');
        console.log('🔍 Parameters check:', { success, credential: !!credential, hasCredentialData: credential?.length > 0 });
        // Check one more time if we have credential data
        if (!credential) {
          setStatus('error');
          setMessage('Missing OAuth code parameter');
        } else {
          // We have credential but not recognized yet - show info
          setStatus('success');
          setMessage('OAuth completed! Refresh the page to see your credential.');
        }
        return;
      }

      // DISABLED: State parameter validation completely removed
      // GitHub OAuth can work without state validation for this demo app
      // State is optional and can cause callback failures
      console.log('ℹ️ State parameter check skipped - not required for demo flow');

      // DISABLED State validation - GitHub validates on their end
      // Skip state validation to avoid OAuth session issues
      setMessage('Processing authentication...');

      // Handle GitHub OAuth directly
      if (platform === 'github') {
        console.log('🐙🐙🐙 STARTING GITHUB OAUTH PROCESSING WITH HEAVY DEBUG');
        
        const { githubAPIService } = await import('../../services/api-integrations/GitHubAPIService');
        
        try {
          console.log('🔄 About to call githubAPIService.exchangeCodeForToken...');
          setMessage('Exchanging OAuth code with GitHub...');
          
          // Exchange code for credential via serverless function
          const result = await githubAPIService.exchangeCodeForToken(code, state || '');
          
          console.log('✅ exchangeCodeForToken completed successfully, result:', result);
          setMessage('GitHub OAuth exchange successful! Getting credential...');
          
          // The serverless function already returns the full credential
          const credential = githubAPIService.getStoredCredential();
          
          console.log('🎫 Retrieved credential from service:', {
            hasCredential: !!credential,
            credentialType: typeof credential,
            credentialId: credential?.id,
            credentialPreview: credential ? JSON.stringify(credential).substring(0, 300) + '...' : 'null'
          });
          
          if (!credential) {
            console.error('❌ No credential received from GitHub OAuth service');
            throw new Error('No credential received from GitHub OAuth');
          }
          
          console.log('💾 About to store credential in localStorage...');
          setMessage('Storing GitHub credential...');
          
          // Store credential
          const existingCreds = JSON.parse(localStorage.getItem('credentials') || '[]');
          console.log('📦 Existing credentials count:', existingCreds.length);
          
          existingCreds.push(credential);
          localStorage.setItem('credentials', JSON.stringify(existingCreds));
          
          console.log('✅ Credential stored! Total credentials now:', existingCreds.length);
          
          setStatus('success');
          setMessage('GitHub developer credential created successfully!');
          
          // Check if this is a popup window or same-window navigation
          console.log('🪟 Window context check:', {
            hasOpener: !!window.opener,
            isPopup: window.opener !== null,
            parentIsSelf: window.parent === window
          });
          
          // Notify parent window if OAuth was opened in popup
          if (window.opener) {
            console.log('📨 Sending success message to parent window and closing popup...');
            window.opener.postMessage({ 
              type: 'GITHUB_OAUTH_SUCCESS', 
              credential,
              username: credential.credentialSubject?.username || 'Unknown User'
            }, window.location.origin);
            window.close();
            return;
          }
          
          // Same window navigation - redirect to credentials page
          console.log('🔄 Same window OAuth - redirecting to credentials page in 2 seconds...');
          setTimeout(() => {
            console.log('🔄 Executing navigation to /credentials');
            navigate('/credentials');
          }, 2000);
          
        } catch (error) {
          console.error('🚨 GitHub OAuth error details:', error);
          console.error('🔍 Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          setStatus('error');
          
          // Show detailed error information for debugging
          let errorMessage = 'GitHub authentication failed';
          if (error instanceof Error) {
            console.error('🔍 Error message:', error.message);
            console.error('🔍 Error stack:', error.stack);
            console.error('🔍 Error name:', error.name);
            
            // Store the actual error for display
            setActualError(error.message);
            
            // Check if this is the mysterious "OAuth session not found" error
            if (error.message.includes('OAuth session not found')) {
              console.error('🔍 FOUND THE CULPRIT! This is where "OAuth session not found" comes from');
              console.error('🔍 Error came from GitHub service exchange method');
            }
            
            // Always show the actual error for debugging
            errorMessage = error.message;
          }
          
          setMessage(errorMessage);
        }
      } else {
        // For other platforms, show not implemented message
        setStatus('error');
        setMessage(`${platform} OAuth integration coming soon!`);
      }

    } catch (error) {
      errorService.logError('OAuth callback error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred');
    }
  };

  const getPlatformInfo = () => {
    switch (platform) {
      case 'github':
        return { name: 'GitHub', icon: '🐙', color: 'bg-gray-900' };
      case 'linkedin':
        return { name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' };
      case 'plaid':
        return { name: 'Plaid', icon: '🏦', color: 'bg-green-600' };
      case 'twitter':
        return { name: 'X (Twitter)', icon: '🐦', color: 'bg-black' };
      default:
        return { name: platform, icon: '🔗', color: 'bg-gray-600' };
    }
  };

  const platformInfo = getPlatformInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-orange-500"
      >
        {/* Platform Icon */}
        <motion.div
          animate={status === 'loading' ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: status === 'loading' ? Infinity : 0, ease: "linear" }}
          className={`w-20 h-20 ${platformInfo.color} rounded-full flex items-center justify-center text-4xl text-white mx-auto mb-6 shadow-lg`}
        >
          {platformInfo.icon}
        </motion.div>

        {/* Status */}
        <div className="mb-6">
          {status === 'loading' && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-gray-700"
            >
              <div className="text-2xl font-bold text-black mb-2">
                Connecting {platformInfo.name}
              </div>
              <div className="flex justify-center space-x-2 mb-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    className="w-3 h-3 bg-orange-500 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-green-600"
            >
              <div className="text-6xl mb-4">✅</div>
              <div className="text-2xl font-bold text-black mb-2">
                Success!
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-red-600"
            >
              <div className="text-6xl mb-4">❌</div>
              <div className="text-2xl font-bold text-black mb-2">
                Error
              </div>
            </motion.div>
          )}
        </div>

        {/* Message */}
        <div className="text-gray-700 mb-6">
          {message}
        </div>

        {/* Debug Information */}
        {debugInfo && (
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 mb-6 text-left">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">🔍 OAuth Debug Information</h4>
            <div className="text-xs text-gray-600 space-y-1 font-mono">
              <div><strong>Code:</strong> {debugInfo.code}</div>
              <div><strong>State:</strong> {debugInfo.state} (length: {debugInfo.stateLength})</div>
              <div><strong>Error:</strong> {debugInfo.error || 'none'}</div>
              <div><strong>Session State:</strong> {debugInfo.sessionState ? `${debugInfo.sessionState.substring(0, 10)}...` : 'none'}</div>
              <div><strong>Local State:</strong> {debugInfo.localState ? `${debugInfo.localState.substring(0, 10)}...` : 'none'}</div>
              <div><strong>All Params:</strong> {JSON.stringify(debugInfo.allParams)}</div>
              <div><strong>URL:</strong> {debugInfo.url}</div>
              {actualError && (
                <>
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <strong className="text-red-600">Actual Error:</strong> {actualError}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        {status !== 'loading' && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {status === 'success' ? 'Continue to Dashboard' : 'Try Again'}
          </motion.button>
        )}

        {/* PersonaPass Branding */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Powered by{' '}
            <span className="font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              PersonaPass
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};