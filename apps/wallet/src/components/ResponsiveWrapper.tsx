/**
 * Responsive Wrapper Component
 * Automatically switches between desktop and mobile interfaces
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileMainDashboard from './mobile/MobileMainDashboard';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  forceMobile?: boolean;
  forceDesktop?: boolean;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface DeviceInfo {
  type: DeviceType;
  isTouchDevice: boolean;
  isStandalone: boolean;
  userAgent: string;
  screenSize: {
    width: number;
    height: number;
  };
}

const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  forceMobile = false,
  forceDesktop = false
}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: 'desktop',
    isTouchDevice: false,
    isStandalone: false,
    userAgent: '',
    screenSize: { width: 0, height: 0 }
  });
  const [showMobileInterface, setShowMobileInterface] = useState(false);
  const [userPreference, setUserPreference] = useState<'auto' | 'mobile' | 'desktop'>('auto');

  useEffect(() => {
    detectDevice();
    
    // Listen for orientation changes and resize events
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Load user preference
    const savedPreference = localStorage.getItem('interface-preference') as typeof userPreference;
    if (savedPreference) {
      setUserPreference(savedPreference);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    determineInterface();
  }, [deviceInfo, userPreference, forceMobile, forceDesktop]);

  const detectDevice = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const userAgent = navigator.userAgent;
    
    // Check if it's a touch device
    const isTouchDevice = 'ontouchstart' in window || 
                         navigator.maxTouchPoints > 0 || 
                         (navigator as any).msMaxTouchPoints > 0;

    // Check if running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    // Determine device type based on screen size and user agent
    let type: DeviceType = 'desktop';
    
    if (width <= 768) {
      type = 'mobile';
    } else if (width <= 1024) {
      type = 'tablet';
    }

    // Override based on user agent for more accurate detection
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (width <= 768) {
        type = 'mobile';
      } else {
        type = 'tablet';
      }
    }

    setDeviceInfo({
      type,
      isTouchDevice,
      isStandalone,
      userAgent,
      screenSize: { width, height }
    });
  };

  const determineInterface = () => {
    // Apply force overrides first
    if (forceDesktop) {
      setShowMobileInterface(false);
      return;
    }
    
    if (forceMobile) {
      setShowMobileInterface(true);
      return;
    }

    // Apply user preference
    if (userPreference === 'mobile') {
      setShowMobileInterface(true);
      return;
    }
    
    if (userPreference === 'desktop') {
      setShowMobileInterface(false);
      return;
    }

    // Auto-detection logic
    const shouldUseMobile = 
      deviceInfo.type === 'mobile' ||
      (deviceInfo.type === 'tablet' && deviceInfo.isStandalone) ||
      (deviceInfo.isTouchDevice && deviceInfo.screenSize.width <= 768);

    setShowMobileInterface(shouldUseMobile);
  };

  const handlePreferenceChange = (preference: typeof userPreference) => {
    setUserPreference(preference);
    localStorage.setItem('interface-preference', preference);
  };

  const getDeviceIcon = () => {
    switch (deviceInfo.type) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const DeviceIcon = getDeviceIcon();

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      {/* Interface Toggle (only show on non-mobile devices or when forced) */}
      {(deviceInfo.type !== 'mobile' || forceMobile || forceDesktop) && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center space-x-2">
            <DeviceIcon className="w-4 h-4 text-gray-500" />
            
            <select
              value={userPreference}
              onChange={(e) => handlePreferenceChange(e.target.value as typeof userPreference)}
              className="text-sm border-0 bg-transparent focus:outline-none text-gray-700"
            >
              <option value="auto">Auto</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
            </select>
          </div>
        </div>
      )}

      {/* Device Info Debug Panel (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-50 bg-black bg-opacity-80 text-white text-xs p-2 rounded max-w-xs">
          <div>Type: {deviceInfo.type}</div>
          <div>Touch: {deviceInfo.isTouchDevice ? 'Yes' : 'No'}</div>
          <div>PWA: {deviceInfo.isStandalone ? 'Yes' : 'No'}</div>
          <div>Size: {deviceInfo.screenSize.width}×{deviceInfo.screenSize.height}</div>
          <div>Interface: {showMobileInterface ? 'Mobile' : 'Desktop'}</div>
          <div>Preference: {userPreference}</div>
        </div>
      )}

      {/* Main Interface */}
      <AnimatePresence mode="wait">
        {showMobileInterface ? (
          <motion.div
            key="mobile"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <MobileMainDashboard />
          </motion.div>
        ) : (
          <motion.div
            key="desktop"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Installation Prompt for Mobile */}
      {showMobileInterface && !deviceInfo.isStandalone && (
        <InstallPrompt />
      )}
    </div>
  );
};

// PWA Installation Prompt Component
const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Auto-show prompt after 30 seconds if not dismissed
    const timer = setTimeout(() => {
      if (!localStorage.getItem('install-prompt-dismissed')) {
        setShowPrompt(true);
      }
    }, 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installed');
      }
      
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-40"
      >
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm">
                Install PersonaPass
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Add to your home screen for faster access and offline features
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleInstall}
              className="flex-1 py-2 px-3 bg-blue-500 text-white rounded-lg text-sm font-medium"
            >
              Install
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDismiss}
              className="flex-1 py-2 px-3 bg-gray-100 text-gray-600 rounded-lg text-sm"
            >
              Maybe Later
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ResponsiveWrapper;