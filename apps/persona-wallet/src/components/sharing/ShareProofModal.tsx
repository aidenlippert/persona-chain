import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Shield, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Clock,
  Zap,
  QrCode,
  Share2,
  Lock
} from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import { SharingRequest, Credential } from '../../types/wallet';
import { CredentialCard } from '../credentials/CredentialCard';
import { QRCodeDisplay } from './QRCodeDisplay';
import { ProofGenerationProgress } from './ProofGenerationProgress';

interface ShareProofModalProps {
  request: SharingRequest;
  onClose: () => void;
  onApprove: (selectedCredentials: string[], consent: boolean) => void;
  onDeny: () => void;
}

export const ShareProofModal: React.FC<ShareProofModalProps> = ({
  request,
  onClose,
  onApprove,
  onDeny,
}) => {
  const { 
    credentials, 
    sharingState,
    selectCredentials,
    giveConsent,
    startProofGeneration,
    completeProofGeneration,
    startSharing,
    completeSharing,
  } = useWalletStore();

  const [currentStep, setCurrentStep] = useState<'review' | 'consent' | 'generate' | 'share' | 'complete'>('review');
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  // Get relevant credentials for each requested proof
  const getRelevantCredentials = (domain: string) => {
    return credentials.filter(cred => 
      cred.domain === domain && 
      cred.status === 'active'
    );
  };

  const allRequestedCredentials = request.requestedProofs.flatMap(proof => 
    getRelevantCredentials(proof.domain)
  );

  const selectedCredentialObjects = credentials.filter(cred => 
    selectedCredentials.includes(cred.id)
  );

  useEffect(() => {
    // Auto-select credentials if only one option per domain
    const autoSelected: string[] = [];
    request.requestedProofs.forEach(proof => {
      const relevant = getRelevantCredentials(proof.domain);
      if (relevant.length === 1) {
        autoSelected.push(relevant[0].id);
      }
    });
    setSelectedCredentials(autoSelected);
  }, [request, credentials]);

  const handleCredentialToggle = (credentialId: string) => {
    setSelectedCredentials(prev => 
      prev.includes(credentialId) 
        ? prev.filter(id => id !== credentialId)
        : [...prev, credentialId]
    );
  };

  const handleProceedToConsent = () => {
    selectCredentials(selectedCredentials);
    setCurrentStep('consent');
  };

  const handleGiveConsent = () => {
    setConsentGiven(true);
    giveConsent(true);
    setCurrentStep('generate');
    handleGenerateProofs();
  };

  const handleDenyConsent = () => {
    setConsentGiven(false);
    giveConsent(false);
    onDeny();
  };

  const handleGenerateProofs = async () => {
    startProofGeneration();
    
    try {
      // Simulate proof generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      completeProofGeneration(true);
      setCurrentStep('share');
      
      // Generate QR code for sharing
      const mockQRData = JSON.stringify({
        type: 'response',
        sessionId: request.sessionId,
        proofs: selectedCredentialObjects.map(cred => ({
          domain: cred.domain,
          verified: true,
        })),
      });
      setQrCodeData(mockQRData);
      
    } catch (error) {
      completeProofGeneration(false);
    }
  };

  const handleShare = async () => {
    startSharing();
    
    try {
      // Simulate sharing process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      completeSharing(true);
      setCurrentStep('complete');
      
      // Auto-close after success
      setTimeout(() => {
        onApprove(selectedCredentials, consentGiven);
      }, 2000);
      
    } catch (error) {
      completeSharing(false);
    }
  };

  const canProceed = () => {
    // Check if all required proofs have selected credentials
    return request.requestedProofs
      .filter(proof => proof.required)
      .every(proof => 
        getRelevantCredentials(proof.domain).some(cred => 
          selectedCredentials.includes(cred.id)
        )
      );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'review':
        return (
          <div className="space-y-6">
            {/* Request overview */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  {request.requester.logoUrl ? (
                    <img 
                      src={request.requester.logoUrl} 
                      alt={request.requester.name}
                      className="w-8 h-8 rounded-lg"
                    />
                  ) : (
                    <Shield className="text-white" size={20} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {request.requester.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {request.purpose}
                  </p>
                  {request.requester.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {request.requester.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Requested proofs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Requested Proofs ({request.requestedProofs.length})
                </h4>
                <motion.button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400"
                  whileTap={{ scale: 0.95 }}
                >
                  {showDetails ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showDetails ? 'Hide' : 'Show'} details</span>
                </motion.button>
              </div>

              <div className="space-y-3">
                {request.requestedProofs.map((proof, index) => {
                  const relevantCreds = getRelevantCredentials(proof.domain);
                  const hasSelected = relevantCreds.some(cred => 
                    selectedCredentials.includes(cred.id)
                  );

                  return (
                    <motion.div
                      key={index}
                      className={`border rounded-xl p-4 ${
                        proof.required && !hasSelected 
                          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                          : hasSelected
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium capitalize text-gray-900 dark:text-white">
                              {proof.domain} Verification
                            </span>
                            {proof.required && (
                              <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {proof.reason}
                          </p>
                          
                          {showDetails && proof.constraints && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <strong>Constraints:</strong> {JSON.stringify(proof.constraints)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {hasSelected ? (
                            <Check size={16} className="text-green-600" />
                          ) : proof.required ? (
                            <AlertCircle size={16} className="text-red-600" />
                          ) : (
                            <Clock size={16} className="text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Available credentials for this proof */}
                      {relevantCreds.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Available credentials:
                          </p>
                          {relevantCreds.map(cred => (
                            <motion.div
                              key={cred.id}
                              whileTap={{ scale: 0.98 }}
                            >
                              <CredentialCard
                                credential={cred}
                                selected={selectedCredentials.includes(cred.id)}
                                onSelect={() => handleCredentialToggle(cred.id)}
                                compact
                                showActions={false}
                              />
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {relevantCreds.length === 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            No credentials available for {proof.domain} verification
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3 pt-4">
              <motion.button
                onClick={onDeny}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Deny Request
              </motion.button>
              <motion.button
                onClick={handleProceedToConsent}
                disabled={!canProceed()}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                  canProceed()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                whileTap={canProceed() ? { scale: 0.98 } : {}}
              >
                Continue
              </motion.button>
            </div>
          </div>
        );

      case 'consent':
        return (
          <div className="space-y-6">
            {/* Consent form */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <Lock size={24} className="text-yellow-600 dark:text-yellow-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Consent Required
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    You are about to share zero-knowledge proofs with <strong>{request.requester.name}</strong> for the purpose of "{request.purpose}".
                  </p>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>• Only proof results will be shared, not your actual data</p>
                    <p>• The requester will know if you meet their criteria</p>
                    <p>• You can revoke this consent at any time</p>
                    <p>• This action will be recorded in your sharing history</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected credentials summary */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Credentials to be used ({selectedCredentialObjects.length})
              </h4>
              <div className="space-y-2">
                {selectedCredentialObjects.map(cred => (
                  <div key={cred.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Check size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {cred.type} from {cred.issuer.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Consent buttons */}
            <div className="flex space-x-3 pt-4">
              <motion.button
                onClick={handleDenyConsent}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Deny
              </motion.button>
              <motion.button
                onClick={handleGiveConsent}
                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Give Consent & Generate Proofs
              </motion.button>
            </div>
          </div>
        );

      case 'generate':
        return (
          <div className="space-y-6">
            <ProofGenerationProgress 
              credentials={selectedCredentialObjects}
              onComplete={() => setCurrentStep('share')}
            />
          </div>
        );

      case 'share':
        return (
          <div className="space-y-6 text-center">
            <div>
              <Zap size={48} className="text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Proofs Generated Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your zero-knowledge proofs are ready to share
              </p>
            </div>

            {qrCodeData && (
              <QRCodeDisplay 
                data={qrCodeData}
                title="Share via QR Code"
                subtitle="Let the requester scan this code"
              />
            )}

            <motion.button
              onClick={handleShare}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              whileTap={{ scale: 0.98 }}
            >
              <Share2 size={18} />
              <span>Send Proofs</span>
            </motion.button>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
            </motion.div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Sharing Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your proofs have been successfully shared with {request.requester.name}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Share Identity Proof
            </h2>
            <motion.button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <X size={18} className="text-gray-500" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {renderStepContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};