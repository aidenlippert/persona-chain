import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Shield, 
  Bell, 
  Moon, 
  Sun,
  Lock,
  Key,
  Trash2,
  Download,
  Upload,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Info
} from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, children }) => (
  <motion.div
    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{description}</p>
      )}
    </div>
    {children}
  </motion.div>
);

interface SettingsToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon?: React.ReactNode;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({ 
  label, 
  description, 
  enabled, 
  onChange, 
  icon 
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-start space-x-3">
      {icon && (
        <div className="mt-0.5 text-gray-400">
          {icon}
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
    <motion.button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-0.5'
        }`}
        animate={{ x: enabled ? 24 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  </div>
);

interface SettingsButtonProps {
  label: string;
  description?: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

const SettingsButton: React.FC<SettingsButtonProps> = ({ 
  label, 
  description, 
  onClick, 
  icon, 
  variant = 'default',
  disabled = false 
}) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
      variant === 'danger' 
        ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400' 
        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    whileTap={!disabled ? { scale: 0.98 } : {}}
  >
    <div className="flex items-center space-x-3">
      {icon && <div className="text-current">{icon}</div>}
      <div className="text-left">
        <div className="font-medium text-gray-900 dark:text-white">{label}</div>
        {description && (
          <div className="text-sm text-gray-600 dark:text-gray-300">{description}</div>
        )}
      </div>
    </div>
    <ChevronRight size={16} className="text-gray-400" />
  </motion.button>
);

export const SettingsPage: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    lockWallet, 
    exportData, 
    importData,
    clearAllData,
    addNotification 
  } = useWalletStore();

  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleThemeChange = (isDark: boolean) => {
    updateSettings({ theme: isDark ? 'dark' : 'light' });
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleNotificationChange = (type: keyof typeof settings.notifications, enabled: boolean) => {
    updateSettings({
      notifications: {
        ...settings.notifications,
        [type]: enabled
      }
    });
  };

  const handleSecurityChange = (type: keyof typeof settings.security, enabled: boolean) => {
    updateSettings({
      security: {
        ...settings.security,
        [type]: enabled
      }
    });
  };

  const handleExportData = async () => {
    try {
      await exportData();
      addNotification({
        type: 'success',
        title: 'Data Exported',
        message: 'Your wallet data has been exported successfully',
        priority: 'medium',
        actionable: false,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export wallet data',
        priority: 'high',
        actionable: false,
      });
    }
  };

  const handleImportData = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          const data = JSON.parse(text);
          await importData(data);
          addNotification({
            type: 'success',
            title: 'Data Imported',
            message: 'Your wallet data has been imported successfully',
            priority: 'medium',
            actionable: false,
          });
        }
      };
      input.click();
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Import Failed',
        message: 'Failed to import wallet data',
        priority: 'high',
        actionable: false,
      });
    }
  };

  const handleClearAllData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    try {
      await clearAllData();
      addNotification({
        type: 'success',
        title: 'Data Cleared',
        message: 'All wallet data has been cleared',
        priority: 'high',
        actionable: false,
      });
      setConfirmClear(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Clear Failed',
        message: 'Failed to clear wallet data',
        priority: 'high',
        actionable: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings size={24} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Customize your PersonaPass experience
        </p>
      </motion.div>

      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Customize how PersonaPass looks and feels"
      >
        <SettingsToggle
          label="Dark Mode"
          description="Use dark theme for better viewing in low light"
          enabled={settings.theme === 'dark'}
          onChange={handleThemeChange}
          icon={settings.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        description="Choose what notifications you want to receive"
      >
        <div className="space-y-1">
          <SettingsToggle
            label="Proof Requests"
            description="Get notified when someone requests identity verification"
            enabled={settings.notifications.proofRequests}
            onChange={(enabled) => handleNotificationChange('proofRequests', enabled)}
            icon={<Bell size={16} />}
          />
          <SettingsToggle
            label="Security Alerts"
            description="Important security notifications and warnings"
            enabled={settings.notifications.security}
            onChange={(enabled) => handleNotificationChange('security', enabled)}
            icon={<Shield size={16} />}
          />
          <SettingsToggle
            label="System Updates"
            description="Updates about new features and improvements"
            enabled={settings.notifications.updates}
            onChange={(enabled) => handleNotificationChange('updates', enabled)}
            icon={<Info size={16} />}
          />
        </div>
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        title="Security & Privacy"
        description="Manage your security settings and privacy preferences"
      >
        <div className="space-y-1">
          <SettingsToggle
            label="Auto-lock Wallet"
            description="Automatically lock wallet after period of inactivity"
            enabled={settings.security.autoLock}
            onChange={(enabled) => handleSecurityChange('autoLock', enabled)}
            icon={<Lock size={16} />}
          />
          <SettingsToggle
            label="Biometric Authentication"
            description="Use fingerprint or face recognition to unlock"
            enabled={settings.security.biometric}
            onChange={(enabled) => handleSecurityChange('biometric', enabled)}
            icon={<Key size={16} />}
          />
          <SettingsToggle
            label="Transaction Confirmations"
            description="Require confirmation for all proof sharing operations"
            enabled={settings.security.requireConfirmation}
            onChange={(enabled) => handleSecurityChange('requireConfirmation', enabled)}
            icon={<Check size={16} />}
          />
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <SettingsButton
            label="Lock Wallet Now"
            description="Immediately lock your wallet"
            onClick={lockWallet}
            icon={<Lock size={16} />}
          />
        </div>
      </SettingsSection>

      {/* Data Management */}
      <SettingsSection
        title="Data Management"
        description="Import, export, or manage your wallet data"
      >
        <div className="space-y-1">
          <SettingsButton
            label="Export Wallet Data"
            description="Download a backup of your credentials and settings"
            onClick={handleExportData}
            icon={<Download size={16} />}
          />
          <SettingsButton
            label="Import Wallet Data"
            description="Restore from a previously exported backup"
            onClick={handleImportData}
            icon={<Upload size={16} />}
          />
        </div>
      </SettingsSection>

      {/* About */}
      <SettingsSection
        title="About PersonaPass"
        description="Learn more about your digital identity platform"
      >
        <div className="space-y-3">
          <div className="flex justify-between py-2">
            <span className="text-gray-600 dark:text-gray-300">Version</span>
            <span className="font-medium text-gray-900 dark:text-white">1.0.0-beta</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600 dark:text-gray-300">Network</span>
            <span className="font-medium text-gray-900 dark:text-white">Testnet</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600 dark:text-gray-300">Build</span>
            <span className="font-medium text-gray-900 dark:text-white">#{Date.now().toString().slice(-6)}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <SettingsButton
            label="Privacy Policy"
            description="Read our privacy policy and terms of service"
            onClick={() => window.open('https://personapass.dev/privacy', '_blank')}
            icon={<ExternalLink size={16} />}
          />
          <SettingsButton
            label="Support"
            description="Get help and support for PersonaPass"
            onClick={() => window.open('https://personapass.dev/support', '_blank')}
            icon={<ExternalLink size={16} />}
          />
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection
        title="Danger Zone"
        description="Irreversible actions that affect your wallet data"
      >
        <motion.div
          className="space-y-3"
          initial={{ opacity: showDangerZone ? 1 : 0.5 }}
          animate={{ opacity: showDangerZone ? 1 : 0.5 }}
        >
          {!showDangerZone ? (
            <SettingsButton
              label="Show Advanced Options"
              description="Reveal dangerous actions like data clearing"
              onClick={() => setShowDangerZone(true)}
              icon={<AlertTriangle size={16} />}
            />
          ) : (
            <>
              <motion.div
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle size={20} className="text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                      Warning: Dangerous Actions
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      These actions cannot be undone. Make sure you have backups before proceeding.
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="space-y-1">
                <SettingsButton
                  label={confirmClear ? "Click Again to Confirm" : "Clear All Data"}
                  description={confirmClear ? "This will permanently delete everything" : "Remove all credentials, proofs, and settings"}
                  onClick={handleClearAllData}
                  icon={confirmClear ? <X size={16} /> : <Trash2 size={16} />}
                  variant="danger"
                />
                
                {confirmClear && (
                  <motion.button
                    onClick={() => setConfirmClear(false)}
                    className="w-full p-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                )}
              </div>

              <SettingsButton
                label="Hide Advanced Options"
                description="Hide these dangerous actions"
                onClick={() => {
                  setShowDangerZone(false);
                  setConfirmClear(false);
                }}
                icon={<X size={16} />}
              />
            </>
          )}
        </motion.div>
      </SettingsSection>

      {/* Bottom spacing */}
      <div className="h-4" />
    </div>
  );
};