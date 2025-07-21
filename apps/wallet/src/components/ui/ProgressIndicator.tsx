/**
 * Reusable Progress Indicator Component
 * Sprint 1.2: Instant Credential Creation
 * Features: Smooth animations, real-time progress, customizable themes
 */

import { motion } from "framer-motion";

interface ProgressIndicatorProps {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current step label */
  label?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Color theme */
  theme?: 'orange' | 'blue' | 'green' | 'purple';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional status indicator */
  status?: 'loading' | 'success' | 'error' | 'warning';
  /** Sub-progress for current step */
  subProgress?: number;
  /** Auto-save indicator */
  autoSaved?: boolean;
}

const themeConfig = {
  orange: {
    bg: 'bg-orange-200',
    fill: 'from-orange-500 to-orange-600',
    text: 'text-orange-700',
    subBg: 'bg-orange-100',
    subFill: 'bg-orange-400'
  },
  blue: {
    bg: 'bg-blue-200',
    fill: 'from-blue-500 to-blue-600',
    text: 'text-blue-700',
    subBg: 'bg-blue-100',
    subFill: 'bg-blue-400'
  },
  green: {
    bg: 'bg-green-200',
    fill: 'from-green-500 to-green-600',
    text: 'text-green-700',
    subBg: 'bg-green-100',
    subFill: 'bg-green-400'
  },
  purple: {
    bg: 'bg-purple-200',
    fill: 'from-purple-500 to-purple-600',
    text: 'text-purple-700',
    subBg: 'bg-purple-100',
    subFill: 'bg-purple-400'
  }
};

const sizeConfig = {
  sm: { 
    height: 'h-2', 
    text: 'text-xs sm:text-sm', 
    container: 'mb-3 sm:mb-4',
    padding: 'px-2 sm:px-4'
  },
  md: { 
    height: 'h-3', 
    text: 'text-sm sm:text-base', 
    container: 'mb-4 sm:mb-6',
    padding: 'px-3 sm:px-6'
  },
  lg: { 
    height: 'h-4', 
    text: 'text-base sm:text-lg', 
    container: 'mb-6 sm:mb-8',
    padding: 'px-4 sm:px-8'
  }
};

const statusIcons = {
  loading: '🔄',
  success: '✅',
  error: '❌',
  warning: '⚠️'
};

export const ProgressIndicator = ({
  progress,
  label,
  showPercentage = true,
  theme = 'orange',
  size = 'md',
  status,
  subProgress,
  autoSaved = false
}: ProgressIndicatorProps) => {
  const themeStyles = themeConfig[theme];
  const sizeStyles = sizeConfig[size];
  
  // Clamp progress to 0-100 range
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const clampedSubProgress = subProgress ? Math.max(0, Math.min(100, subProgress)) : 0;

  return (
    <div className={sizeStyles.container}>
      {/* Header with label and status */}
      {(label || showPercentage || status || autoSaved) && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
            {status && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`${sizeStyles.text} flex-shrink-0`}
              >
                {statusIcons[status]}
              </motion.span>
            )}
            {label && (
              <span className={`font-medium text-gray-700 ${sizeStyles.text} truncate`}>
                {label}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {autoSaved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-xs text-green-600 font-medium hidden sm:inline"
              >
                ✓ Saved
              </motion.span>
            )}
            {autoSaved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-xs text-green-600 font-medium sm:hidden"
              >
                ✓
              </motion.span>
            )}
            {showPercentage && (
              <span className={`font-bold text-gray-900 ${sizeStyles.text}`}>
                {Math.round(clampedProgress)}%
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Main progress bar */}
      <div className={`w-full ${themeStyles.bg} rounded-full ${sizeStyles.height} overflow-hidden`}>
        <motion.div
          className={`${sizeStyles.height} bg-gradient-to-r ${themeStyles.fill} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ 
            duration: 0.5, 
            ease: "easeOut",
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
        />
      </div>
      
      {/* Sub-progress bar for current step */}
      {subProgress !== undefined && subProgress > 0 && (
        <div className={`mt-2 w-full ${themeStyles.subBg} rounded-full h-1`}>
          <motion.div
            className={`h-full ${themeStyles.subFill} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${clampedSubProgress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      )}
      
      {/* Progress milestones (for longer processes) */}
      {clampedProgress >= 25 && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span className={clampedProgress >= 25 ? themeStyles.text : 'text-gray-400'}>
            Started
          </span>
          <span className={clampedProgress >= 50 ? themeStyles.text : 'text-gray-400'}>
            Progress
          </span>
          <span className={clampedProgress >= 75 ? themeStyles.text : 'text-gray-400'}>
            Almost Done
          </span>
          <span className={clampedProgress >= 100 ? themeStyles.text : 'text-gray-400'}>
            Complete
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Circular Progress Indicator for compact spaces
 */
interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  theme?: 'orange' | 'blue' | 'green' | 'purple';
  showPercentage?: boolean;
}

export const CircularProgress = ({
  progress,
  size = 60,
  strokeWidth = 6,
  theme = 'orange',
  showPercentage = true
}: CircularProgressProps) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedProgress / 100) * circumference;
  
  const themeColors = {
    orange: '#f97316',
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6'
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={themeColors[theme]}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Step Progress Indicator for multi-step flows
 */
interface StepProgressProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
  theme?: 'orange' | 'blue' | 'green' | 'purple';
}

export const StepProgress = ({
  steps,
  currentStep,
  completedSteps = [],
  theme = 'orange'
}: StepProgressProps) => {
  const themeStyles = themeConfig[theme];
  
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index) || index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;
        
        return (
          <div key={step} className="flex items-center">
            {/* Step circle */}
            <motion.div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                ${isCompleted ? `bg-gradient-to-r ${themeStyles.fill} text-white` : 
                  isCurrent ? `border-2 border-${theme}-500 bg-white text-${theme}-600` :
                  'bg-gray-200 text-gray-500'}
              `}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {isCompleted ? '✓' : index + 1}
            </motion.div>
            
            {/* Step label */}
            <div className="ml-3 min-w-0">
              <p className={`text-sm font-medium ${
                isCurrent ? themeStyles.text : 
                isCompleted ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {step}
              </p>
            </div>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={`
                ml-6 w-16 h-0.5 
                ${isCompleted ? `bg-gradient-to-r ${themeStyles.fill}` : 'bg-gray-200'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
};