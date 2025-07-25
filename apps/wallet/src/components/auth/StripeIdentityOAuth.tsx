/**
 * Stripe Identity OAuth Handler - Seamless KYC integration
 * Handles OAuth flow for Stripe Identity verification
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { stripeIdentityService } from '../../services/stripeIdentityService';
import { analyticsService } from '../../services/analyticsService';
import { errorService } from "@/services/errorService";

export const StripeIdentityOAuth = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing verification...');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    handleVerificationCallback();
  }, []);

  const handleVerificationCallback = async () => {
    try {
      const sessionId = searchParams.get('session_id');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Verification failed: ${error}`);
        return;
      }

      if (!sessionId) {
        setStatus('error');
        setMessage('Missing verification session');
        return;
      }

      setMessage('Retrieving verification results...');

      // Get verification session details
      const session = await stripeIdentityService.getVerificationSession(sessionId);

      if (session.status === 'verified') {
        setStatus('success');
        setMessage('Identity verified successfully!');
        
        // Track successful verification
        analyticsService.trackEvent(
          'user_action',
          'oauth_verification_success',
          'stripe_identity',
          undefined, // userDID - we don't have a DID object here, just a user ID
          {
            sessionId: session.id,
            timestamp: Date.now(),
          }
        );

        // Redirect to credentials page after delay
        setTimeout(() => {
          navigate('/credentials');
        }, 2000);
      } else {
        setStatus('error');
        setMessage(`Verification incomplete: ${session.status}`);
        
        // Track failed verification
        analyticsService.trackEvent(
          'user_action',
          'oauth_verification_failed',
          'stripe_identity',
          undefined, // userDID - we don't have a DID object here, just a user ID
          {
            sessionId: session.id,
            status: session.status,
            timestamp: Date.now(),
          }
        );
      }
    } catch (error) {
      errorService.logError('Verification callback error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred');
      
      // Track error
      analyticsService.trackEvent(
        'error',
        'oauth_verification_error',
        'stripe_identity',
        undefined, // userDID - we don't have a DID object here, just a user ID
        {
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-orange-500"
      >
        {/* Stripe Identity Icon */}
        <motion.div
          animate={status === 'loading' ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: status === 'loading' ? Infinity : 0, ease: "linear" }}
          className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl text-white mx-auto mb-6 shadow-lg"
        >
          🆔
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
                Processing Verification
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
                Verification Complete!
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
                Verification Failed
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            {status === 'success' ? (
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/credentials')}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  View Credentials
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/identity-verification')}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* PersonaPass Branding */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Powered by{' '}
            <span className="font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              PersonaPass
            </span>
            {' '}& Stripe Identity
          </div>
        </div>
      </motion.div>
    </div>
  );
};