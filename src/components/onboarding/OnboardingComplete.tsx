/**
 * Onboarding Complete Component
 * Welcome users to their new PersonaPass identity with quick actions
 */

import React from 'react';
import { logger } from '../../services/monitoringService';

interface OnboardingCompleteProps {
  wallet: any;
  didKeyPair: any;
}

export const OnboardingComplete: React.FC<OnboardingCompleteProps> = ({
  wallet,
  didKeyPair,
}) => {
  const handleLaunchDashboard = () => {
    logger.info('Launching dashboard after onboarding completion', { 
      did: didKeyPair.did 
    });
    // Navigate to dashboard
    window.location.href = '/dashboard';
  };

  const handleLearnMore = () => {
    logger.info('User clicked learn more', { did: didKeyPair.did });
    window.open('https://docs.personapass.com/getting-started', '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-8">
        <div className="mx-auto h-20 w-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-6">
          <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to PersonaPass!</h1>
        <p className="text-gray-600 text-lg">
          Your decentralized identity is ready to use
        </p>
      </div>

      {/* Success Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Identity Created</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ Secure DID generated</li>
              <li>✅ Wallet connected</li>
              <li>✅ Blockchain anchored</li>
              <li>✅ Backup completed</li>
            </ul>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Ready to Use</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ Verifiable credentials</li>
              <li>✅ Zero-knowledge proofs</li>
              <li>✅ Multi-chain support</li>
              <li>✅ Enterprise features</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Identity Information */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Your Identity Details</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">DID:</span>
            <code className="text-sm bg-white px-2 py-1 rounded border">
              {didKeyPair.did}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Wallet:</span>
            <code className="text-sm bg-white px-2 py-1 rounded border">
              {wallet.address}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Created:</span>
            <span className="text-sm text-gray-700">
              {new Date().toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Get Credentials</h4>
          <p className="text-sm text-gray-600">
            Connect to GitHub, LinkedIn, or other services to obtain verifiable credentials
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Generate Proofs</h4>
          <p className="text-sm text-gray-600">
            Create zero-knowledge proofs to verify claims without revealing personal data
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Manage Identity</h4>
          <p className="text-sm text-gray-600">
            Update your profile, manage credentials, and control your digital identity
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleLaunchDashboard}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
        >
          Launch Dashboard
        </button>
        
        <button
          onClick={handleLearnMore}
          className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Learn More
        </button>
      </div>

      {/* Support Links */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-4">Need help getting started?</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/docs" className="text-sm text-blue-600 hover:text-blue-800">
            Documentation
          </a>
          <a href="/support" className="text-sm text-blue-600 hover:text-blue-800">
            Support Center
          </a>
          <a href="/community" className="text-sm text-blue-600 hover:text-blue-800">
            Community Forum
          </a>
          <a href="/tutorials" className="text-sm text-blue-600 hover:text-blue-800">
            Video Tutorials
          </a>
        </div>
      </div>
    </div>
  );
};

export default OnboardingComplete;