/**
 * Touch-Optimized Components for Mobile-First Experience
 * Sprint 1.3: Mobile-First Experience
 * Features: Touch gestures, mobile-optimized interactions
 */

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface TouchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export const TouchButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = ""
}: TouchButtonProps) => {
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900",
    outline: "border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg",
    lg: "px-8 sm:px-12 py-4 sm:py-5 text-lg sm:text-xl"
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-xl font-semibold transition-all 
        disabled:opacity-50 disabled:cursor-not-allowed 
        shadow-lg touch-manipulation
        min-h-[44px] min-w-[44px]
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
};

interface TouchCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  hoverable?: boolean;
}

export const TouchCard = ({ children, onClick, className = "", hoverable = true }: TouchCardProps) => {
  return (
    <motion.div
      whileHover={hoverable ? { scale: 1.02, y: -2 } : {}}
      whileTap={onClick && hoverable ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-lg border border-gray-200 
        p-4 sm:p-6 transition-all
        ${onClick ? 'cursor-pointer' : ''}
        ${hoverable ? 'hover:shadow-xl hover:border-orange-300' : ''}
        touch-manipulation
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export const SwipeableCard = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  className = "" 
}: SwipeableCardProps) => {
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100 && onSwipeRight) {
          onSwipeRight();
        } else if (info.offset.x < -100 && onSwipeLeft) {
          onSwipeLeft();
        }
      }}
      className={`
        bg-white rounded-xl shadow-lg border border-gray-200 
        p-4 sm:p-6 cursor-grab active:cursor-grabbing
        touch-manipulation select-none
        ${className}
      `}
    >
      {children}
      
      {(onSwipeLeft || onSwipeRight) && (
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            {onSwipeLeft && (
              <div className="w-2 h-2 bg-red-300 rounded-full"></div>
            )}
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            {onSwipeRight && (
              <div className="w-2 h-2 bg-green-300 rounded-full"></div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export const PullToRefresh = ({ 
  children, 
  onRefresh, 
  threshold = 60, 
  disabled = false 
}: PullToRefreshProps) => {
  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={async (_, info) => {
        if (!disabled && info.offset.y > threshold) {
          await onRefresh();
        }
      }}
      className="touch-manipulation select-none"
    >
      {children}
    </motion.div>
  );
};

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export const MobileModal = ({ isOpen, onClose, children, title }: MobileModalProps) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black bg-opacity-50"
      />
      
      {/* Modal */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <TouchButton size="sm" variant="outline" onClick={onClose}>
              ✕
            </TouchButton>
          </div>
        )}
        
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

interface FloatingActionButtonProps {
  onClick: () => void;
  icon: ReactNode;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export const FloatingActionButton = ({ 
  onClick, 
  icon, 
  className = "",
  position = 'bottom-right'
}: FloatingActionButtonProps) => {
  const positions = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 transform -translate-x-1/2'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`
        fixed ${positions[position]} z-40
        w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600
        rounded-full shadow-lg hover:shadow-xl
        flex items-center justify-center text-white
        touch-manipulation transition-all
        ${className}
      `}
    >
      {icon}
    </motion.button>
  );
};

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: string[];
  initialSnap?: number;
}

export const BottomSheet = ({ 
  isOpen, 
  onClose, 
  children, 
  snapPoints = ['25%', '50%', '75%'],
  initialSnap = 1
}: BottomSheetProps) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black bg-opacity-50"
      />
      
      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: `${100 - parseInt(snapPoints[initialSnap])}%` }}
        exit={{ y: "100%" }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) {
            onClose();
          }
        }}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl touch-manipulation"
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>
        
        {/* Content */}
        <div className="px-4 pb-safe overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};