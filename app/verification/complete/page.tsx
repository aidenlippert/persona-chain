'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function VerificationComplete() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id');
    if (sessionIdParam) {
      setSessionId(sessionIdParam);
      checkVerificationStatus(sessionIdParam);
    }
  }, [searchParams]);

  const checkVerificationStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/stripe/verification-status?session_id=${sessionId}`);
      const data = await response.json();
      
      setStatus(data.status);
      
      // If verified, trigger ZKP generation
      if (data.status === 'verified') {
        generateIdentityProof(sessionId, data.verificationData);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setStatus('error');
    }
  };

  const generateIdentityProof = async (sessionId: string, verificationData: any) => {
    try {
      const response = await fetch('/api/zkp/generate-identity-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          verificationData,
          proofType: 'identity_verification'
        })
      });

      const proofData = await response.json();
      console.log('Identity proof generated:', proofData);
    } catch (error) {
      console.error('Error generating identity proof:', error);
    }
  };

  const renderStatus = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking verification status...</p>
          </div>
        );

      case 'verified':
        return (
          <div className="text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Verification Successful!</h2>
            <p className="text-gray-600 mb-4">Your identity has been verified and your proof is being generated.</p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                🎉 You can now create trusted identity proofs for loans, jobs, and more!
              </p>
            </div>
          </div>
        );

      case 'requires_input':
        return (
          <div className="text-center">
            <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-yellow-800 mb-2">Additional Input Required</h2>
            <p className="text-gray-600 mb-4">Please provide additional information to complete verification.</p>
            <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg">
              Continue Verification
            </button>
          </div>
        );

      case 'canceled':
        return (
          <div className="text-center">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Canceled</h2>
            <p className="text-gray-600 mb-4">Your verification was canceled. You can try again anytime.</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
              Start New Verification
            </button>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center">
            <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-4">There was an issue with your verification. Please try again.</p>
            <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
              Try Again
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {renderStatus()}
        
        {sessionId && (
          <div className="mt-6 p-3 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-500">Session ID: {sessionId}</p>
          </div>
        )}
      </div>
    </div>
  );
}