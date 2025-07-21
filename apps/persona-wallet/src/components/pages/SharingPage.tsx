import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  Scan, 
  Share2, 
  Plus,
  History,
  Users,
  Shield,
  Zap,
  ArrowRight,
  Camera,
  Upload
} from 'lucide-react';
import { useWalletStore, useSharing } from '../../stores/walletStore';
import { QRScanner } from '../sharing/QRScanner';
import { ShareProofModal } from '../sharing/ShareProofModal';
import { QRCodeDisplay } from '../sharing/QRCodeDisplay';
import { RecentActivity } from '../activity/RecentActivity';
import { SharingRequest, QRShareData } from '../../types/sharing';

export const SharingPage: React.FC = () => {
  const { 
    proofHistory, 
    pushModal,
    addNotification,
    toggleScanner,
    sharingState,
    setActiveRequest
  } = useWalletStore();
  
  const [showScanner, setShowScanner] = useState(false);
  const [activeModal, setActiveModal] = useState<'share' | 'generate' | null>(null);
  const [mockRequest, setMockRequest] = useState<SharingRequest | null>(null);

  const recentShares = proofHistory.slice(0, 5);
  const totalShares = proofHistory.length;
  const successfulShares = proofHistory.filter(p => p.proofVerified).length;
  const successRate = totalShares > 0 ? Math.round((successfulShares / totalShares) * 100) : 0;

  const handleQRScan = (qrData: QRShareData) => {
    try {
      if (qrData.type === 'request' && typeof qrData.data === 'object' && 'requester' in qrData.data) {
        // Convert QR data to SharingRequest
        const request = qrData.data as SharingRequest;
        setMockRequest(request);
        setActiveRequest(request);
        setActiveModal('share');
        
        addNotification({
          type: 'proof_request',
          title: 'New Proof Request',
          message: `${request.requester.name} is requesting identity verification`,
          priority: 'high',
          actionable: true,
        });
      } else if (qrData.type === 'invitation' && typeof qrData.data === 'object' && 'sessionId' in qrData.data) {
        // Handle session invitation
        addNotification({
          type: 'system',
          title: 'Session Invitation',
          message: 'Opening sharing session...',
          priority: 'medium',
          actionable: false,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Invalid Request',
        message: 'The scanned QR code is not a valid sharing request',
        priority: 'medium',
        actionable: false,
      });
    }
  };

  const handleManualRequest = () => {
    // Create a mock sharing request for demonstration
    const mockSharingRequest: SharingRequest = {
      id: `req_${Date.now()}`,
      requester: {
        did: 'did:persona:example:verifier123',
        name: 'University Admissions',
        description: 'Official university admissions verification',
        domain: 'education.university.edu',
        logoUrl: undefined,
        trustScore: 95,
      },
      requestedProofs: [
        {
          domain: 'academic',
          operation: 'gpa_verification',
          constraints: {
            minimumGpa: 3.5,
            graduationYear: new Date().getFullYear() - 1,
          },
          reason: 'Verify academic eligibility for graduate program admission',
          required: true,
          estimatedTime: '2 minutes',
        },
        {
          domain: 'government',
          operation: 'age_verification',
          constraints: {
            minimumAge: 18,
          },
          reason: 'Confirm legal age for program enrollment',
          required: true,
          estimatedTime: '1 minute',
        },
      ],
      purpose: 'Graduate School Application - Academic and Age Verification',
      urgency: 'medium',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      sessionId: `session_${Date.now()}`,
      sharingMethod: 'direct',
    };

    setMockRequest(mockSharingRequest);
    setActiveRequest(mockSharingRequest);
    setActiveModal('share');
  };

  const handleGenerateQR = () => {
    setActiveModal('generate');
  };

  const handleShareApprove = (selectedCredentials: string[], consent: boolean) => {
    addNotification({
      type: 'success',
      title: 'Proofs Shared Successfully',
      message: `Shared ${selectedCredentials.length} proofs with ${mockRequest?.requester.name}`,
      priority: 'medium',
      actionable: false,
    });
    setActiveModal(null);
    setMockRequest(null);
  };

  const handleShareDeny = () => {
    addNotification({
      type: 'system',
      title: 'Request Denied',
      message: 'You denied the sharing request',
      priority: 'low',
      actionable: false,
    });
    setActiveModal(null);
    setMockRequest(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <motion.div
        className="grid grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalShares}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            Total Shares
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {successRate}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            Success Rate
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {recentShares.filter(s => {
              const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              return new Date(s.sharedAt) > dayAgo;
            }).length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            Last 24h
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Scan QR Code */}
          <motion.button
            onClick={() => setShowScanner(true)}
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 text-left hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Scan size={24} />
              </div>
              <ArrowRight size={18} className="opacity-70" />
            </div>
            <h4 className="font-semibold mb-1">Scan Request</h4>
            <p className="text-sm opacity-80">
              Scan QR code to receive sharing request
            </p>
          </motion.button>

          {/* Generate QR */}
          <motion.button
            onClick={handleGenerateQR}
            className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 text-left hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <QrCode size={24} />
              </div>
              <ArrowRight size={18} className="opacity-70" />
            </div>
            <h4 className="font-semibold mb-1">Share Identity</h4>
            <p className="text-sm opacity-80">
              Generate QR for others to request proofs
            </p>
          </motion.button>
        </div>

        {/* Additional Actions */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <motion.button
            onClick={handleManualRequest}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white">Demo Request</h5>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Try a sample verification
                </p>
              </div>
            </div>
          </motion.button>

          <motion.button
            onClick={() => pushModal('sharing-history')}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <History size={18} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white">View History</h5>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  See all sharing activity
                </p>
              </div>
            </div>
          </motion.button>
        </div>
      </motion.section>

      {/* Recent Activity */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <History size={18} />
            <span>Recent Sharing</span>
          </h3>
          <motion.button
            onClick={() => pushModal('sharing-history')}
            className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 text-sm font-medium"
            whileTap={{ scale: 0.95 }}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </motion.button>
        </div>

        {recentShares.length > 0 ? (
          <RecentActivity activities={recentShares} />
        ) : (
          <motion.div
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Share2 size={48} className="text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              No sharing activity yet
            </h4>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Start by scanning a QR code or generating your identity QR
            </p>
            <motion.button
              onClick={() => setShowScanner(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              Scan QR Code
            </motion.button>
          </motion.div>
        )}
      </motion.section>

      {/* How It Works */}
      <motion.section
        className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <Shield size={18} />
          <span>How Zero-Knowledge Sharing Works</span>
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Scan Request</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Verifiers share QR codes containing their verification requirements
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Review & Consent</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Choose what to share and give explicit consent for each proof
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Generate Proofs</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Create zero-knowledge proofs that verify claims without revealing data
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              4
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Share Securely</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Verifiers receive proof results without accessing your personal information
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />

      {/* Share Proof Modal */}
      <AnimatePresence>
        {activeModal === 'share' && mockRequest && (
          <ShareProofModal
            request={mockRequest}
            onClose={() => setActiveModal(null)}
            onApprove={handleShareApprove}
            onDeny={handleShareDeny}
          />
        )}
      </AnimatePresence>

      {/* Generate QR Modal */}
      <AnimatePresence>
        {activeModal === 'generate' && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Your Identity QR Code
              </h3>
              
              <QRCodeDisplay
                data={JSON.stringify({
                  type: 'invitation',
                  did: 'did:persona:example:user123',
                  name: 'My PersonaPass Identity',
                  capabilities: ['academic', 'financial', 'health'],
                })}
                title="Share this QR code"
                subtitle="Let others request proofs from you"
              />
              
              <motion.button
                onClick={() => setActiveModal(null)}
                className="w-full mt-4 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom spacing */}
      <div className="h-4" />
    </div>
  );
};