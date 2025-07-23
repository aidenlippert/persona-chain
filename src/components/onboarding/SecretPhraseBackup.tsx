/**
 * Professional Secret Phrase Backup Component
 * Secure backup flow with verification and security best practices
 */

import React, { useState } from 'react';
import { DIDStorageService } from '../../services/didService';
import { logger } from '../../services/monitoringService';

interface SecretPhraseBackupProps {
  secretPhrase: string;
  didKeyPair: any;
  onBackupComplete: () => void;
  onError: (error: string) => void;
}

export const SecretPhraseBackup: React.FC<SecretPhraseBackupProps> = ({
  secretPhrase,
  didKeyPair,
  onBackupComplete,
  onError,
}) => {
  const [backupStep, setBackupStep] = useState<'display' | 'verify' | 'storage'>('display');
  const [userPhrase, setUserPhrase] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [backupMethods, setBackupMethods] = useState({
    written: false,
    printed: false,
    secure: false,
  });

  const words = secretPhrase.split(' ');
  const userWords = userPhrase.split(' ');

  const handleRevealPhrase = () => {
    setIsRevealed(true);
    logger.info('Secret phrase revealed', { did: didKeyPair.did });
  };

  const handleContinueToVerify = () => {
    const allMethodsChecked = Object.values(backupMethods).every(method => method);
    if (allMethodsChecked) {
      setBackupStep('verify');
      logger.info('Proceeding to phrase verification', { did: didKeyPair.did });
    }
  };

  const handleVerifyPhrase = () => {
    if (userPhrase.trim() === secretPhrase.trim()) {
      setBackupStep('storage');
      logger.info('Secret phrase verified successfully', { did: didKeyPair.did });
    } else {
      onError('The entered phrase does not match. Please try again.');
      logger.warn('Secret phrase verification failed', { did: didKeyPair.did });
    }
  };

  const handleCompleteBackup = async () => {
    try {
      // Store DID in secure storage
      await DIDStorageService.storeDID('primary', didKeyPair);
      
      // Clear sensitive data from memory
      setUserPhrase('');
      
      logger.info('DID backup completed successfully', { did: didKeyPair.did });
      onBackupComplete();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(`Failed to complete backup: ${errorMessage}`);
      logger.error('Backup completion failed', { error, did: didKeyPair.did });
    }
  };

  const handleDownloadBackup = () => {
    const backupData = {
      did: didKeyPair.did,
      secretPhrase: secretPhrase,
      createdAt: new Date().toISOString(),
      backupType: 'PersonaPass Identity Backup',
      warning: 'Keep this file secure and never share it with anyone'
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personapass-backup-${didKeyPair.did.slice(-8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logger.info('Backup file downloaded', { did: didKeyPair.did });
  };

  if (backupStep === 'display') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Backup Your Secret Phrase</h2>
          <p className="text-gray-600">
            Your secret phrase is the only way to recover your identity. Store it securely and never share it.
          </p>
        </div>

        {/* Security Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Critical Security Warning</h3>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                <li>• Never share your secret phrase with anyone</li>
                <li>• Store it offline in a secure location</li>
                <li>• We cannot recover your phrase if lost</li>
                <li>• Anyone with this phrase can access your identity</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Secret Phrase Display */}
        <div className="border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Secret Phrase</h3>
          
          {!isRevealed ? (
            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-8 mb-4">
                <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L9.878 9.878z" />
                </svg>
                <p className="text-gray-600">Click to reveal your secret phrase</p>
              </div>
              <button
                onClick={handleRevealPhrase}
                className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Reveal Secret Phrase
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {words.map((word, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                    <span className="bg-white px-3 py-2 rounded border text-sm font-mono">
                      {word}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={handleDownloadBackup}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Backup File</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Backup Methods Checklist */}
        {isRevealed && (
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Confirmation</h3>
            <p className="text-gray-600 mb-4">
              Please confirm you have securely backed up your secret phrase:
            </p>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupMethods.written}
                  onChange={(e) => setBackupMethods(prev => ({ ...prev, written: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  I have written down my secret phrase on paper
                </span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupMethods.printed}
                  onChange={(e) => setBackupMethods(prev => ({ ...prev, printed: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  I have stored it in a secure location (not on my computer)
                </span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupMethods.secure}
                  onChange={(e) => setBackupMethods(prev => ({ ...prev, secure: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  I understand that PersonaPass cannot recover my phrase if lost
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={handleContinueToVerify}
            disabled={!isRevealed || !Object.values(backupMethods).every(method => method)}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
              isRevealed && Object.values(backupMethods).every(method => method)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue to Verification
          </button>
        </div>
      </div>
    );
  }

  if (backupStep === 'verify') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Secret Phrase</h2>
          <p className="text-gray-600">
            Please enter your secret phrase to confirm you have backed it up correctly.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter your 12-word secret phrase
          </label>
          <textarea
            value={userPhrase}
            onChange={(e) => setUserPhrase(e.target.value)}
            placeholder="Enter your secret phrase here..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          
          {/* Word Count Indicator */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">
              Words entered: {userWords.length}/12
            </span>
            <span className={`text-sm ${
              userWords.length === 12 ? 'text-green-600' : 'text-gray-500'
            }`}>
              {userWords.length === 12 ? '✓ Complete' : 'Incomplete'}
            </span>
          </div>
        </div>

        {/* Verification Status */}
        {userPhrase.trim() && (
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, index) => {
                const userWord = userWords[index] || '';
                const correctWord = words[index] || '';
                const isCorrect = userWord === correctWord;
                const hasUserWord = userWord.trim() !== '';
                
                return (
                  <div key={index} className={`px-2 py-1 rounded text-xs text-center ${
                    !hasUserWord ? 'bg-gray-100 text-gray-400' :
                    isCorrect ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {index + 1}. {hasUserWord ? (isCorrect ? '✓' : '✗') : '—'}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setBackupStep('display')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Phrase
          </button>
          
          <button
            onClick={handleVerifyPhrase}
            disabled={userPhrase.trim() !== secretPhrase.trim()}
            className={`px-8 py-2 rounded-lg font-semibold transition-colors ${
              userPhrase.trim() === secretPhrase.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Verify Phrase
          </button>
        </div>
      </div>
    );
  }

  if (backupStep === 'storage') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Phrase Verified Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your secret phrase has been verified. We'll now securely store your DID locally.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-green-900 mb-2">Your Identity is Secure</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>✅ DID created and verified</li>
            <li>✅ Secret phrase backed up securely</li>
            <li>✅ Private keys stored locally</li>
            <li>✅ Ready to use PersonaPass</li>
          </ul>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-2">Your DID Information</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>DID:</strong> <code className="bg-white px-2 py-1 rounded">{didKeyPair.did}</code></p>
            <p><strong>Created:</strong> {new Date().toLocaleString()}</p>
            <p><strong>Storage:</strong> Encrypted local storage</p>
          </div>
        </div>

        <button
          onClick={handleCompleteBackup}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Complete Setup
        </button>
      </div>
    );
  }

  return null;
};

export default SecretPhraseBackup;