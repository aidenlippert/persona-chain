/**
 * Professional Terms and Conditions Component
 * Production-ready legal agreements with proper consent flow
 */

import React, { useState } from 'react';
import { logger } from '../../services/monitoringService';

interface TermsAndConditionsProps {
  onAccept: (termsAccepted: boolean, privacyAccepted: boolean) => void;
  onBack: () => void;
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
  onAccept,
  onBack,
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [activeDocument, setActiveDocument] = useState<'terms' | 'privacy' | null>(null);

  const handleAccept = () => {
    if (termsAccepted && privacyAccepted) {
      logger.info('Terms and conditions accepted', { 
        termsAccepted, 
        privacyAccepted,
        timestamp: new Date().toISOString()
      });
      onAccept(termsAccepted, privacyAccepted);
    }
  };

  const canProceed = termsAccepted && privacyAccepted;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Terms & Privacy</h2>
        <p className="text-gray-600">
          Please review and accept our terms of service and privacy policy to continue.
        </p>
      </div>

      <div className="space-y-6">
        {/* Terms of Service */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Terms of Service</h3>
            <button
              onClick={() => setActiveDocument('terms')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Read Full Terms
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
            <div className="text-sm text-gray-700 space-y-3">
              <p><strong>1. Service Overview</strong></p>
              <p>PersonaPass provides decentralized identity management services including DID creation, verifiable credential storage, and zero-knowledge proof generation.</p>
              
              <p><strong>2. User Responsibilities</strong></p>
              <p>You are responsible for maintaining the security of your wallet, private keys, and seed phrases. PersonaPass cannot recover lost credentials.</p>
              
              <p><strong>3. Privacy & Data Protection</strong></p>
              <p>We implement privacy-by-design principles. Your identity data is stored locally and encrypted. We do not have access to your private keys.</p>
              
              <p><strong>4. Service Availability</strong></p>
              <p>While we strive for 99.9% uptime, blockchain services may experience occasional interruptions due to network congestion or maintenance.</p>
              
              <p><strong>5. Prohibited Activities</strong></p>
              <p>Users may not use PersonaPass for illegal activities, fraudulent claims, or any purpose that violates applicable laws and regulations.</p>
            </div>
          </div>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the Terms of Service
            </span>
          </label>
        </div>

        {/* Privacy Policy */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Privacy Policy</h3>
            <button
              onClick={() => setActiveDocument('privacy')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Read Full Policy
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
            <div className="text-sm text-gray-700 space-y-3">
              <p><strong>1. Data Collection</strong></p>
              <p>We collect minimal data necessary for service operation: wallet addresses, transaction hashes, and usage analytics. No personal information is required.</p>
              
              <p><strong>2. Data Storage</strong></p>
              <p>Your identity data is stored locally on your device using encrypted browser storage. Credentials are never transmitted to our servers.</p>
              
              <p><strong>3. Data Usage</strong></p>
              <p>We use aggregated, anonymized data for service improvement and security monitoring. Individual user data is never sold or shared.</p>
              
              <p><strong>4. Third-Party Services</strong></p>
              <p>We integrate with blockchain networks and credential issuers. These services have their own privacy policies.</p>
              
              <p><strong>5. Data Rights</strong></p>
              <p>You maintain full control over your data. You can export, delete, or modify your information at any time through the dashboard.</p>
            </div>
          </div>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the Privacy Policy
            </span>
          </label>
        </div>

        {/* Key Points Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-3">Key Points Summary</h4>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✅ Your private keys never leave your device</li>
            <li>✅ All data is encrypted and stored locally</li>
            <li>✅ You maintain full control over your identity</li>
            <li>✅ Open source and auditable smart contracts</li>
            <li>✅ Compliance with privacy regulations (GDPR, CCPA)</li>
            <li>✅ Regular security audits and penetration testing</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        
        <button
          onClick={handleAccept}
          disabled={!canProceed}
          className={`px-8 py-2 rounded-lg font-semibold transition-colors ${
            canProceed
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Accept & Continue
        </button>
      </div>

      {/* Full Document Modal */}
      {activeDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">
                {activeDocument === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h3>
              <button
                onClick={() => setActiveDocument(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {activeDocument === 'terms' ? <FullTermsOfService /> : <FullPrivacyPolicy />}
            </div>
            
            <div className="p-6 border-t">
              <button
                onClick={() => setActiveDocument(null)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FullTermsOfService: React.FC = () => (
  <div className="prose prose-sm max-w-none">
    <h1>PersonaPass Terms of Service</h1>
    <p><em>Effective Date: {new Date().toLocaleDateString()}</em></p>
    
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using PersonaPass, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
    
    <h2>2. Service Description</h2>
    <p>PersonaPass provides decentralized identity management services including:</p>
    <ul>
      <li>Decentralized Identifier (DID) creation and management</li>
      <li>Verifiable Credential storage and verification</li>
      <li>Zero-knowledge proof generation and verification</li>
      <li>Multi-chain wallet integration</li>
      <li>Enterprise API access for verified organizations</li>
    </ul>
    
    <h2>3. User Responsibilities</h2>
    <p>You are responsible for:</p>
    <ul>
      <li>Maintaining the security of your wallet and private keys</li>
      <li>Backing up your seed phrases and recovery information</li>
      <li>Using the service in compliance with applicable laws</li>
      <li>Not sharing your credentials with unauthorized parties</li>
    </ul>
    
    <h2>4. Privacy and Data Protection</h2>
    <p>We implement privacy-by-design principles. Your identity data is encrypted and stored locally. We do not have access to your private keys or personal information.</p>
    
    <h2>5. Service Availability</h2>
    <p>While we strive for high availability, blockchain services may experience interruptions due to network congestion, maintenance, or other factors beyond our control.</p>
    
    <h2>6. Prohibited Activities</h2>
    <p>Users may not:</p>
    <ul>
      <li>Use the service for illegal activities or fraudulent claims</li>
      <li>Attempt to compromise the security of the service</li>
      <li>Reverse engineer or exploit the service</li>
      <li>Create false or misleading credentials</li>
    </ul>
    
    <h2>7. Limitation of Liability</h2>
    <p>PersonaPass is provided "as is" without warranties. We are not liable for any damages arising from the use of the service.</p>
    
    <h2>8. Updates to Terms</h2>
    <p>We may update these terms periodically. Users will be notified of significant changes.</p>
  </div>
);

const FullPrivacyPolicy: React.FC = () => (
  <div className="prose prose-sm max-w-none">
    <h1>PersonaPass Privacy Policy</h1>
    <p><em>Effective Date: {new Date().toLocaleDateString()}</em></p>
    
    <h2>1. Information We Collect</h2>
    <p>We collect minimal data necessary for service operation:</p>
    <ul>
      <li>Wallet addresses for blockchain transactions</li>
      <li>Transaction hashes for verification</li>
      <li>Usage analytics for service improvement</li>
      <li>Error logs for debugging and security</li>
    </ul>
    
    <h2>2. How We Use Information</h2>
    <p>We use collected information to:</p>
    <ul>
      <li>Provide and improve our services</li>
      <li>Ensure security and prevent fraud</li>
      <li>Comply with legal requirements</li>
      <li>Generate anonymized analytics</li>
    </ul>
    
    <h2>3. Data Storage and Security</h2>
    <p>Your identity data is stored locally on your device using encrypted browser storage. Credentials are never transmitted to our servers unencrypted.</p>
    
    <h2>4. Data Sharing</h2>
    <p>We do not sell or share your personal information with third parties, except:</p>
    <ul>
      <li>When required by law or legal process</li>
      <li>To prevent fraud or security breaches</li>
      <li>With your explicit consent</li>
    </ul>
    
    <h2>5. Third-Party Services</h2>
    <p>We integrate with blockchain networks and credential issuers. These services have their own privacy policies that you should review.</p>
    
    <h2>6. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
      <li>Access your data at any time</li>
      <li>Export your credentials and settings</li>
      <li>Delete your account and associated data</li>
      <li>Opt out of analytics collection</li>
    </ul>
    
    <h2>7. International Data Transfers</h2>
    <p>Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place.</p>
    
    <h2>8. Contact Information</h2>
    <p>For privacy-related questions, contact us at privacy@personapass.com</p>
  </div>
);

export default TermsAndConditions;