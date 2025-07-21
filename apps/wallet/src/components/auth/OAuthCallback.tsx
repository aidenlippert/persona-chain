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

      if (error) {
        setStatus('error');
        setMessage(`OAuth failed: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing OAuth parameters');
        return;
      }

      // Get stored session info
      const sessionId = localStorage.getItem(`${platform}_oauth_session`);
      const credentialType = localStorage.getItem('oauth_credential_type');
      const returnUrl = localStorage.getItem('oauth_return_url') || '/dashboard';

      if (!sessionId) {
        setStatus('error');
        setMessage('OAuth session not found');
        return;
      }

      setMessage('Creating credential...');

      // Process OAuth callback
      const response = await fetch(`/api/connectors/${platform}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          state,
          sessionId,
          credentialType
        })
      });

      if (!response.ok) {
        throw new Error(`Callback processing failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage('Credential created successfully!');
        
        // Store credential
        const existingCreds = JSON.parse(localStorage.getItem('credentials') || '[]');
        existingCreds.push(result.credential);
        localStorage.setItem('credentials', JSON.stringify(existingCreds));

        // Clean up OAuth data
        localStorage.removeItem(`${platform}_oauth_session`);
        localStorage.removeItem('oauth_credential_type');
        localStorage.removeItem('oauth_return_url');

        // Redirect back to dashboard
        setTimeout(() => {
          navigate(returnUrl);
        }, 2000);
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to create credential');
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