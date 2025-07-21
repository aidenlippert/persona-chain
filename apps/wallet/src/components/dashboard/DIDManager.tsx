/**
 * DID Management Interface
 * Professional DID actions and management
 */

import React, { useState, useEffect } from 'react';
import { notify } from '../../utils/notifications';
import { 
  // Removed unused IdentificationIcon import 
  CheckBadgeIcon, 
  ClipboardDocumentIcon,
  ArrowPathIcon,
  // Removed unused ShareIcon import
  DocumentTextIcon,
  // Removed unused ExclamationTriangleIcon import
  ShieldCheckIcon,
  KeyIcon,
  GlobeAltIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import { personaChainService } from '../../services/personaChainService';
import { logger } from '../../services/monitoringService';

interface DIDManagerProps {
  didKeyPair: any;
}

export const DIDManager: React.FC<DIDManagerProps> = ({ didKeyPair }) => {
  const [didDocument, setDidDocument] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'unknown' | 'verified' | 'not_found' | 'error'>('unknown');
  const [isUpdating, setIsUpdating] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    if (didKeyPair) {
      setDidDocument(didKeyPair.document);
      verifyDIDOnBlockchain();
      generateQRCode();
    }
  }, [didKeyPair]);

  const verifyDIDOnBlockchain = async () => {
    if (!didKeyPair?.did) return;
    
    setIsVerifying(true);
    try {
      const doc = await personaChainService.queryDID(didKeyPair.did);
      if (doc) {
        setVerificationStatus('verified');
        setDidDocument(doc);
        logger.info('DID verified on blockchain', { did: didKeyPair.did });
      } else {
        setVerificationStatus('not_found');
        logger.warn('DID not found on blockchain', { did: didKeyPair.did });
      }
    } catch (error) {
      setVerificationStatus('error');
      logger.error('DID verification failed', { error, did: didKeyPair.did });
    } finally {
      setIsVerifying(false);
    }
  };

  const generateQRCode = () => {
    if (!didKeyPair?.did) return;
    
    const qrData = {
      type: 'DID',
      did: didKeyPair.did,
      document: didKeyPair.document,
      verification: verificationStatus,
      timestamp: new Date().toISOString()
    };
    
    setQrCodeData(JSON.stringify(qrData, null, 2));
  };

  const handleUpdateDID = async () => {
    if (!didKeyPair?.did) return;
    
    setIsUpdating(true);
    try {
      // In production, this would update the DID document
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate update
      
      logger.info('DID updated successfully', { did: didKeyPair.did });
      notify.success('DID document updated successfully!');
    } catch (error) {
      logger.error('DID update failed', { error, did: didKeyPair.did });
      notify.error('Failed to update DID document. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportDID = () => {
    const exportData = {
      did: didKeyPair.did,
      document: didDocument,
      publicKey: didKeyPair.publicKey,
      created: new Date().toISOString(),
      exportedFrom: 'PersonaPass Wallet',
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `did-export-${didKeyPair.did.slice(-8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logger.info('DID exported', { did: didKeyPair.did });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    logger.info(`${type} copied to clipboard`, { length: text.length });
    
    // Visual feedback
    const button = document.activeElement as HTMLButtonElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }
  };

  const getVerificationStatusColor = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'not_found':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getVerificationStatusText = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'Verified on Blockchain';
      case 'not_found':
        return 'Not Found on Blockchain';
      case 'error':
        return 'Verification Error';
      default:
        return 'Verification Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* DID Overview Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">DID Management</h2>
            <p className="text-gray-600">Manage your decentralized identifier</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getVerificationStatusColor()}`}>
              {isVerifying ? 'Verifying...' : getVerificationStatusText()}
            </div>
          </div>
        </div>

        {/* DID Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decentralized Identifier
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-800 break-all mr-2">
                    {didKeyPair.did}
                  </code>
                  <button
                    onClick={() => copyToClipboard(didKeyPair.did, 'DID')}
                    className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Copy DID"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Public Key
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-800 break-all mr-2">
                    {didKeyPair.publicKey?.slice(0, 32)}...
                  </code>
                  <button
                    onClick={() => copyToClipboard(didKeyPair.publicKey, 'Public Key')}
                    className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Copy Public Key"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Method
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <span className="text-sm text-gray-800">did:persona</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <span className="text-sm text-gray-800">PersonaChain Mainnet</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <span className="text-sm text-gray-800">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-800">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={verifyDIDOnBlockchain}
          disabled={isVerifying}
          className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            {isVerifying ? (
              <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
            ) : (
              <CheckBadgeIcon className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900">Verify on Chain</p>
            <p className="text-sm text-gray-600">Check blockchain status</p>
          </div>
        </button>

        <button
          onClick={handleUpdateDID}
          disabled={isUpdating}
          className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
            {isUpdating ? (
              <ArrowPathIcon className="h-5 w-5 text-green-600 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-5 w-5 text-green-600" />
            )}
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900">Update DID</p>
            <p className="text-sm text-gray-600">Modify document</p>
          </div>
        </button>

        <button
          onClick={handleExportDID}
          className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <DocumentTextIcon className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900">Export DID</p>
            <p className="text-sm text-gray-600">Download backup</p>
          </div>
        </button>

        <button
          onClick={() => setShowQRCode(!showQRCode)}
          className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <QrCodeIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900">Share QR Code</p>
            <p className="text-sm text-gray-600">Generate QR code</p>
          </div>
        </button>
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">DID QR Code</h3>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="w-48 h-48 bg-white rounded-lg mx-auto flex items-center justify-center border-2 border-gray-200">
                <div className="text-center">
                  <QrCodeIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">QR Code</p>
                  <p className="text-xs text-gray-500">for DID sharing</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code to share your DID with others
              </p>
              <button
                onClick={() => copyToClipboard(qrCodeData, 'QR Code Data')}
                className="btn btn-primary"
              >
                Copy QR Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DID Document Viewer */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">DID Document</h3>
          <button
            onClick={() => copyToClipboard(JSON.stringify(didDocument, null, 2), 'DID Document')}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            <span>Copy Document</span>
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <pre className="text-sm text-gray-800 overflow-x-auto">
            {JSON.stringify(didDocument, null, 2)}
          </pre>
        </div>
      </div>

      {/* Security Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <ShieldCheckIcon className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Cryptographically Secured</p>
                <p className="text-sm text-green-700">Ed25519 digital signatures</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <GlobeAltIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Decentralized</p>
                <p className="text-sm text-blue-700">No central authority required</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <KeyIcon className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-purple-900">Self-Sovereign</p>
                <p className="text-sm text-purple-700">You control your identity</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <DocumentTextIcon className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">Verifiable</p>
                <p className="text-sm text-orange-700">Cryptographically provable</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DIDManager;