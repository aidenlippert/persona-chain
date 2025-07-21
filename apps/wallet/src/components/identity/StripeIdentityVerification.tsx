/**
 * Stripe Identity Verification Component - Real-time KYC & ID verification
 * Beautiful UI for government ID verification with live capture
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { stripeIdentityService, VerificationSession } from '../../services/stripeIdentityService';
import { analyticsService } from '../../services/analyticsService';
import { errorService } from "@/services/errorService";

export interface StripeIdentityVerificationProps {
  onVerificationComplete?: (result: any) => void;
  onVerificationError?: (error: string) => void;
  verificationType?: 'full' | 'age' | 'address';
  minimumAge?: number;
  allowedDocumentTypes?: string[];
  className?: string;
}

export const StripeIdentityVerification = ({
  onVerificationComplete,
  onVerificationError,
  verificationType = 'full',
  minimumAge = 18,
  allowedDocumentTypes = ['driving_license', 'passport', 'id_card'],
  className = '',
}: StripeIdentityVerificationProps) => {
  const [verificationState, setVerificationState] = useState<
    'idle' | 'starting' | 'in_progress' | 'completed' | 'error'
  >('idle');
  const [verificationSession, setVerificationSession] = useState<VerificationSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const config = await stripeIdentityService.checkConfiguration();
      setIsConfigured(config.configured);
      if (!config.configured) {
        setError(config.error || 'Stripe Identity not configured');
      }
    } catch (error) {
      setError('Failed to check configuration');
    }
  };

  const startVerification = async () => {
    try {
      setVerificationState('starting');
      setError(null);
      setProgress(25);

      // Track verification start
      analyticsService.trackEvent(
        'identity_verification',
        'verification_started',
        'stripe_identity',
        localStorage.getItem('persona_user_id') || 'anonymous',
        {
          type: verificationType,
          minimumAge: minimumAge.toString(),
          allowedDocumentTypes: JSON.stringify(allowedDocumentTypes),
          timestamp: Date.now(),
        }
      );

      setProgress(50);

      let result;
      switch (verificationType) {
        case 'age':
          result = await stripeIdentityService.verifyAge(minimumAge);
          break;
        case 'address':
          result = await stripeIdentityService.verifyAddress();
          break;
        default:
          result = await stripeIdentityService.startVerification({
            requireIdNumber: true,
            requireLiveCapture: true,
            requireMatchingSelfie: true,
            allowedDocumentTypes,
            metadata: {
              purpose: verificationType,
              timestamp: Date.now().toString(),
            },
          });
      }

      setProgress(100);

      if (result.verified) {
        setVerificationState('completed');
        setVerificationSession(result.session);
        onVerificationComplete?.(result);
      } else {
        setVerificationState('error');
        setError(result.error || 'Verification failed');
        onVerificationError?.(result.error || 'Verification failed');
      }
    } catch (error) {
      errorService.logError('Verification error:', error);
      setVerificationState('error');
      setError(error.message || 'Verification failed');
      onVerificationError?.(error.message || 'Verification failed');
    }
  };

  const resetVerification = () => {
    setVerificationState('idle');
    setVerificationSession(null);
    setError(null);
    setProgress(0);
  };

  const getVerificationTitle = () => {
    switch (verificationType) {
      case 'age':
        return `Age Verification (${minimumAge}+)`;
      case 'address':
        return 'Address Verification';
      default:
        return 'Identity Verification';
    }
  };

  const getVerificationDescription = () => {
    switch (verificationType) {
      case 'age':
        return `Verify you are ${minimumAge} years or older using government-issued ID`;
      case 'address':
        return 'Verify your current address using government-issued ID or utility bill';
      default:
        return 'Verify your identity using government-issued ID with live capture';
    }
  };

  const getVerificationIcon = () => {
    switch (verificationType) {
      case 'age':
        return '🎂';
      case 'address':
        return '🏠';
      default:
        return '🆔';
    }
  };

  if (!isConfigured) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Identity Verification Unavailable
          </h3>
          <p className="text-red-600">
            {error || 'Stripe Identity is not properly configured'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{getVerificationIcon()}</div>
          <h2 className="text-2xl font-bold text-black mb-2">
            {getVerificationTitle()}
          </h2>
          <p className="text-gray-600">
            {getVerificationDescription()}
          </p>
        </div>

        {/* Progress Bar */}
        {verificationState !== 'idle' && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-medium text-gray-900">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {verificationState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <span className="text-2xl">🔒</span>
                  <span className="font-medium">Powered by Stripe Identity</span>
                </div>
                <div className="text-sm text-gray-600">
                  Your personal information is processed securely and never stored
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-black">What you'll need:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl mb-2">📱</div>
                    <div className="text-sm font-medium text-gray-900">Device Camera</div>
                    <div className="text-xs text-gray-600">For live capture</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl mb-2">🪪</div>
                    <div className="text-sm font-medium text-gray-900">Government ID</div>
                    <div className="text-xs text-gray-600">
                      {allowedDocumentTypes.includes('driving_license') && 'Driver\'s License, '}
                      {allowedDocumentTypes.includes('passport') && 'Passport, '}
                      {allowedDocumentTypes.includes('id_card') && 'ID Card'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl mb-2">⏱️</div>
                    <div className="text-sm font-medium text-gray-900">2-3 Minutes</div>
                    <div className="text-xs text-gray-600">Quick process</div>
                  </div>
                </div>
              </div>

              <button
                onClick={startVerification}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start Verification
              </button>
            </motion.div>
          )}

          {verificationState === 'starting' && (
            <motion.div
              key="starting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🔄</div>
              <h3 className="text-xl font-semibold text-black mb-2">
                Preparing Verification
              </h3>
              <p className="text-gray-600 mb-8">
                Setting up secure verification session...
              </p>
              <div className="flex justify-center space-x-2">
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

          {verificationState === 'in_progress' && (
            <motion.div
              key="in_progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-xl font-semibold text-black mb-2">
                Verification in Progress
              </h3>
              <p className="text-gray-600 mb-8">
                Follow the instructions in the verification window
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-800 text-sm">
                  <strong>Tip:</strong> Make sure you have good lighting and hold your ID steady
                </div>
              </div>
            </motion.div>
          )}

          {verificationState === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-green-600 mb-2">
                Verification Complete!
              </h3>
              <p className="text-gray-600 mb-6">
                Your identity has been successfully verified and a credential has been added to your wallet.
              </p>
              
              {verificationSession && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="text-sm text-green-800">
                    <div className="font-medium">Verification Details:</div>
                    <div>Session ID: {verificationSession.id}</div>
                    <div>Verified: {new Date(verificationSession.created * 1000).toLocaleString()}</div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={resetVerification}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Verify Again
                </button>
                <button
                  onClick={() => window.location.href = '/credentials'}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                >
                  View Credential
                </button>
              </div>
            </motion.div>
          )}

          {verificationState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-xl font-semibold text-red-600 mb-2">
                Verification Failed
              </h3>
              <p className="text-gray-600 mb-6">
                {error || 'Something went wrong during verification. Please try again.'}
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-red-800">
                  <div className="font-medium">Common Issues:</div>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Poor lighting or blurry photos</li>
                    <li>Expired or damaged ID</li>
                    <li>Camera permission denied</li>
                    <li>Network connectivity issues</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={resetVerification}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={startVerification}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};