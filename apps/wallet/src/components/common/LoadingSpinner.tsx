/**
 * PersonaPass Loading Spinner Component
 * Optimized, accessible loading indicators with multiple variants
 */

import React, { useState, useEffect } from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  variant?: 'primary' | 'secondary' | 'white' | 'success' | 'error';
  fullScreen?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'glass' | 'gradient';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

interface NotificationContainerProps {
  notifications: NotificationProps[];
  onRemove: (id: string) => void;
}

// LoadingSpinner Component
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  variant = 'primary',
  text,
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const variantClasses = {
    primary: 'text-primary-500',
    secondary: 'text-gray-500',
    white: 'text-white',
    success: 'text-success-500',
    error: 'text-error-500'
  };

  const LoadingComponent = () => (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Animated spinner */}
      <div className="relative">
        {/* Outer ring */}
        <div className={`
          ${sizeClasses[size]} rounded-full border-4 border-gray-200 dark:border-gray-700
          ${variantClasses[variant]} animate-spin
          border-t-current border-r-transparent border-b-transparent border-l-transparent
        `} />
        
        {/* Inner ring */}
        <div className={`
          absolute inset-2 rounded-full border-2 border-gray-300 dark:border-gray-600
          ${variantClasses[variant]} animate-spin
          border-t-transparent border-r-current border-b-transparent border-l-transparent
          animate-reverse
        `} style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        
        {/* Center dot */}
        <div className={`
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          w-1 h-1 rounded-full ${variantClasses[variant]} animate-pulse
        `} />
      </div>
      
      {/* Loading text */}
      {text && (
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-elevated border border-gray-200 dark:border-gray-800">
          <LoadingComponent />
        </div>
      </div>
    );
  }

  return <LoadingComponent />;
};

// Modal Dialog Component
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  closeOnBackdrop = true,
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-none w-full h-full'
  };

  const variantClasses = {
    default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
    glass: 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50',
    gradient: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700'
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black/50 backdrop-blur-sm
        transition-all duration-300 ease-out
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleBackdropClick}
    >
      <div 
        className={`
          relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden
          rounded-2xl shadow-2xl
          ${variantClasses[variant]}
          transform transition-all duration-300 ease-out
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          ${className}
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            {title && (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {children}
        </div>

        {/* Animated border */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-primary-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </div>
  );
};

// Notification Component
export const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800',
          icon: '✅',
          iconBg: 'bg-success-500'
        };
      case 'error':
        return {
          bg: 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800',
          icon: '❌',
          iconBg: 'bg-error-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
          icon: '⚠️',
          iconBg: 'bg-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
          icon: 'ℹ️',
          iconBg: 'bg-blue-500'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`
        relative overflow-hidden rounded-2xl border shadow-lg
        ${styles.bg}
        backdrop-blur-sm
      `}>
        {/* Progress bar */}
        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary-500 to-accent-500 animate-pulse" 
             style={{ 
               width: '100%',
               animation: `shrink ${duration}ms linear forwards`
             }} />
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.iconBg} flex items-center justify-center text-white text-sm`}>
              {styles.icon}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                {title}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {message}
              </p>
            </div>
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Notification Container
export const NotificationContainer: React.FC<NotificationContainerProps> = ({ 
  notifications, 
  onRemove 
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={onRemove}
        />
      ))}
    </div>
  );
};