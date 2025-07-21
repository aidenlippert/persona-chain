import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { 
  X, 
  Camera, 
  Upload, 
  Flashlight,
  FlashlightOff,
  RotateCcw 
} from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import { QRShareData } from '../../types/sharing';

interface QRScannerProps {
  onScan: (data: QRShareData) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onClose,
  isOpen,
}) => {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useWalletStore();

  useEffect(() => {
    if (isOpen && scannerRef.current) {
      initializeScanner();
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const scannerInstance = new Html5QrcodeScanner(
        'qr-scanner-container',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
        },
        false
      );

      scannerInstance.render(
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Handle scan errors silently unless it's a critical error
          if (errorMessage.includes('NotFoundException')) {
            return; // Normal when no QR code is in view
          }
          console.warn('QR Scan error:', errorMessage);
        }
      );

      setScanner(scannerInstance);
      setIsScanning(false);
    } catch (err) {
      console.error('Failed to initialize scanner:', err);
      setError('Failed to access camera. Please check permissions.');
      setHasCamera(false);
      setIsScanning(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      // Parse the QR code data
      const qrData = JSON.parse(decodedText) as QRShareData;
      
      // Validate the data structure
      if (!qrData.version || !qrData.type || !qrData.data) {
        throw new Error('Invalid QR code format');
      }

      // Stop scanning
      if (scanner) {
        await scanner.clear();
      }

      // Process the scanned data
      onScan(qrData);
      onClose();

      addNotification({
        type: 'success',
        title: 'QR Code Scanned',
        message: `Successfully scanned ${qrData.type} request`,
        priority: 'medium',
        actionable: false,
      });

    } catch (error) {
      console.error('QR parsing error:', error);
      setError('Invalid QR code. Please try again.');
      
      addNotification({
        type: 'error',
        title: 'Invalid QR Code',
        message: 'The scanned QR code is not a valid PersonaPass sharing request',
        priority: 'high',
        actionable: false,
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const formData = new FormData();
      formData.append('image', file);

      // In a real implementation, you'd send this to a server or use a library
      // to decode QR codes from images. For now, we'll show an error.
      throw new Error('File upload QR scanning not yet implemented');

    } catch (error) {
      setError('Failed to scan QR code from file');
      addNotification({
        type: 'error',
        title: 'Scan Failed',
        message: 'Could not read QR code from the selected file',
        priority: 'medium',
        actionable: false,
      });
    }
  };

  const toggleFlash = async () => {
    // This would require access to the camera's flash API
    // Implementation depends on the specific QR scanner library capabilities
    setFlashOn(!flashOn);
  };

  const restartScanner = () => {
    if (scanner) {
      scanner.clear().then(() => {
        initializeScanner();
      });
    } else {
      initializeScanner();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/90"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Header */}
        <motion.div
          className="relative z-10 flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-white">
            Scan QR Code
          </h2>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <X size={20} />
          </motion.button>
        </motion.div>

        {/* Scanner container */}
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            className="relative w-full max-w-sm mx-auto"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Scanner viewport */}
            <div className="relative bg-white rounded-2xl overflow-hidden">
              {hasCamera ? (
                <div id="qr-scanner-container" ref={scannerRef} />
              ) : (
                <div className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="text-center">
                    <Camera size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Camera not available
                    </p>
                    <motion.button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
                      whileTap={{ scale: 0.95 }}
                    >
                      Upload Image
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Loading overlay */}
              {isScanning && (
                <motion.div
                  className="absolute inset-0 bg-black/50 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="text-white text-center">
                    <motion.div
                      className="w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <p className="text-sm">Initializing camera...</p>
                  </div>
                </motion.div>
              )}

              {/* Scanning overlay */}
              {!isScanning && hasCamera && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner markers */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-white" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-white" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-white" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-white" />
                  
                  {/* Scanning line */}
                  <motion.div
                    className="absolute left-4 right-4 h-0.5 bg-white shadow-lg"
                    initial={{ top: '20%' }}
                    animate={{ top: '80%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </div>

            {/* Instructions */}
            <motion.div
              className="mt-6 text-center text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-lg font-medium mb-2">
                Position QR code in the frame
              </p>
              <p className="text-sm text-white/70">
                The camera will automatically detect and scan the code
              </p>
            </motion.div>

            {/* Error message */}
            {error && (
              <motion.div
                className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Bottom controls */}
        <motion.div
          className="relative z-10 p-4 bg-black/50 backdrop-blur-sm"
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-center space-x-6">
            {/* Upload file button */}
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center space-y-1 text-white/70 hover:text-white transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <div className="p-3 rounded-full bg-white/20">
                <Upload size={20} />
              </div>
              <span className="text-xs">Upload</span>
            </motion.button>

            {/* Flash toggle */}
            {hasCamera && (
              <motion.button
                onClick={toggleFlash}
                className="flex flex-col items-center space-y-1 text-white/70 hover:text-white transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <div className="p-3 rounded-full bg-white/20">
                  {flashOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
                </div>
                <span className="text-xs">Flash</span>
              </motion.button>
            )}

            {/* Restart scanner */}
            <motion.button
              onClick={restartScanner}
              className="flex flex-col items-center space-y-1 text-white/70 hover:text-white transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <div className="p-3 rounded-full bg-white/20">
                <RotateCcw size={20} />
              </div>
              <span className="text-xs">Restart</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </motion.div>
    </AnimatePresence>
  );
};