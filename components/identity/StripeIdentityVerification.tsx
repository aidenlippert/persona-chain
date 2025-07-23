'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripeIdentityVerificationProps {
  onVerificationComplete?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

export default function StripeIdentityVerification({
  onVerificationComplete,
  onError
}: StripeIdentityVerificationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  const startVerification = async () => {
    try {
      setIsLoading(true);
      setVerificationStatus('Creating verification session...');

      // Create verification session
      const response = await fetch('/api/stripe/create-verification-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'document', // or 'id_number' for SSN verification
          metadata: {
            user_id: 'current_user_id', // Replace with actual user ID
            verification_purpose: 'identity_proof'
          }
        })
      });

      const { client_secret, url } = await response.json();

      if (!client_secret) {
        throw new Error('Failed to create verification session');
      }

      setVerificationStatus('Redirecting to verification...');

      // Redirect to Stripe Identity verification
      window.location.href = url;

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('Verification failed');
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Identity Verification</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Verify your identity to create trusted proofs. This process is secure and compliant with KYC requirements.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold text-blue-900 mb-2">What you'll need:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Government-issued photo ID (driver's license, passport, etc.)</li>
            <li>• Good lighting and camera access</li>
            <li>• 2-3 minutes to complete</li>
          </ul>
        </div>
      </div>

      {verificationStatus && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-700">{verificationStatus}</p>
        </div>
      )}

      <button
        onClick={startVerification}
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isLoading
            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Starting Verification...' : 'Start Identity Verification'}
      </button>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          🔒 Your data is encrypted and secure. We comply with SOC 2 Type II and other security standards.
        </p>
      </div>
    </div>
  );
}