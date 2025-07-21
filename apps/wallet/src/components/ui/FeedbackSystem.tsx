/**
 * 💬 User Feedback Collection System
 * Sprint 1.4: Comprehensive feedback collection with analytics
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsService } from '../../services/analyticsService';
import { errorService } from "@/services/errorService";

interface FeedbackData {
  id: string;
  type: 'bug' | 'feature' | 'improvement' | 'compliment' | 'issue';
  rating: number; // 1-5 stars
  category: string;
  message: string;
  email?: string;
  timestamp: number;
  page: string;
  userAgent: string;
  metadata: {
    performanceScore?: number;
    errorLogs?: string[];
    sessionDuration?: number;
    featuresUsed?: string[];
  };
}

interface FeedbackSystemProps {
  trigger?: 'manual' | 'automatic' | 'error' | 'exit-intent';
  delay?: number; // ms
  showAfterActions?: number;
  position?: 'bottom-right' | 'bottom-left' | 'center' | 'slide-up';
  onFeedbackSubmit?: (feedback: FeedbackData) => void;
}

const FEEDBACK_CATEGORIES = {
  bug: {
    label: 'Bug Report',
    icon: '🐛',
    color: 'red',
    description: 'Something isn\'t working correctly'
  },
  feature: {
    label: 'Feature Request', 
    icon: '💡',
    color: 'blue',
    description: 'Suggest a new feature or enhancement'
  },
  improvement: {
    label: 'Improvement',
    icon: '⚡',
    color: 'yellow',
    description: 'How can we make this better?'
  },
  compliment: {
    label: 'Compliment',
    icon: '❤️',
    color: 'green',
    description: 'Share what you love about Persona'
  },
  issue: {
    label: 'General Issue',
    icon: '❓',
    color: 'gray',
    description: 'Other questions or concerns'
  }
};

const RATING_LABELS = {
  1: 'Very Poor',
  2: 'Poor', 
  3: 'Average',
  4: 'Good',
  5: 'Excellent'
};

export const FeedbackSystem: React.FC<FeedbackSystemProps> = ({
  trigger = 'manual',
  delay = 30000, // 30 seconds
  showAfterActions = 5,
  position = 'bottom-right',
  onFeedbackSubmit
}) => {
  const [isVisible, setIsVisible] = useState(trigger === 'manual');
  const [currentStep, setCurrentStep] = useState<'trigger' | 'form' | 'thanks'>('trigger');
  const [selectedType, setSelectedType] = useState<keyof typeof FEEDBACK_CATEGORIES | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionCount, setActionCount] = useState(0);

  useEffect(() => {
    if (trigger === 'automatic') {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }

    if (trigger === 'exit-intent') {
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 10) {
          setIsVisible(true);
        }
      };
      document.addEventListener('mouseleave', handleMouseLeave);
      return () => document.removeEventListener('mouseleave', handleMouseLeave);
    }

    // Track user actions for automatic triggering
    const handleUserAction = () => {
      setActionCount(prev => {
        const newCount = prev + 1;
        if (newCount >= showAfterActions && trigger === 'automatic') {
          setIsVisible(true);
        }
        return newCount;
      });
    };

    if (showAfterActions > 0) {
      document.addEventListener('click', handleUserAction);
      document.addEventListener('keydown', handleUserAction);
      return () => {
        document.removeEventListener('click', handleUserAction);
        document.removeEventListener('keydown', handleUserAction);
      };
    }
  }, [trigger, delay, showAfterActions]);

  const generateFeedbackId = (): string => {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  };

  const collectMetadata = () => {
    return {
      performanceScore: calculatePerformanceScore(),
      errorLogs: getRecentErrorLogs(),
      sessionDuration: getSessionDuration(),
      featuresUsed: getUsedFeatures(),
    };
  };

  const calculatePerformanceScore = (): number => {
    // Get performance metrics if available
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;
      
      // Calculate score: 100 for <1s, 0 for >5s
      return Math.max(0, Math.min(100, 100 - (loadTime - 1000) / 40));
    } catch {
      return 85; // Default good score
    }
  };

  const getRecentErrorLogs = (): string[] => {
    // Get recent console errors (in production, this would come from error service)
    return []; // Placeholder
  };

  const getSessionDuration = (): number => {
    const sessionStart = localStorage.getItem('persona_session_start');
    if (sessionStart) {
      return Date.now() - parseInt(sessionStart);
    }
    return 0;
  };

  const getUsedFeatures = (): string[] => {
    // Track which features user has interacted with
    const features = localStorage.getItem('persona_used_features');
    return features ? JSON.parse(features) : [];
  };

  const handleSubmitFeedback = async () => {
    if (!selectedType || !message.trim() || rating === 0) return;

    setIsSubmitting(true);

    const feedback: FeedbackData = {
      id: generateFeedbackId(),
      type: selectedType,
      rating,
      category: category || FEEDBACK_CATEGORIES[selectedType].label,
      message: message.trim(),
      email: email.trim() || undefined,
      timestamp: Date.now(),
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      metadata: collectMetadata(),
    };

    try {
      // Store feedback locally (in production, send to backend)
      const existingFeedback = localStorage.getItem('persona_feedback');
      const feedbackList = existingFeedback ? JSON.parse(existingFeedback) : [];
      feedbackList.push(feedback);
      localStorage.setItem('persona_feedback', JSON.stringify(feedbackList));

      // Track analytics event
      await analyticsService.trackEvent(
        'user_action',
        'feedback',
        'submit',
        undefined,
        {
          feedbackType: selectedType,
          rating,
          category,
          hasEmail: !!email,
          messageLength: message.length,
        }
      );

      // Call callback if provided
      onFeedbackSubmit?.(feedback);

      setCurrentStep('thanks');
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setIsVisible(false);
        resetForm();
      }, 3000);

    } catch (error) {
      errorService.logError('Failed to submit feedback:', error);
      // Show error state
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('trigger');
    setSelectedType(null);
    setRating(0);
    setMessage('');
    setEmail('');
    setCategory('');
  };

  const handleClose = () => {
    setIsVisible(false);
    resetForm();
    
    // Track dismissal
    analyticsService.trackEvent(
      'user_action',
      'feedback',
      'dismiss',
      undefined,
      { step: currentStep }
    );
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'fixed bottom-6 right-6';
      case 'bottom-left':
        return 'fixed bottom-6 left-6';
      case 'center':
        return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      case 'slide-up':
        return 'fixed bottom-0 left-0 right-0';
      default:
        return 'fixed bottom-6 right-6';
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <span 
              className={`text-xl ${
                star <= (hoveredRating || rating) 
                  ? 'text-yellow-400' 
                  : 'text-gray-300'
              }`}
            >
              ⭐
            </span>
          </button>
        ))}
        {(hoveredRating || rating) > 0 && (
          <span className="ml-2 text-sm text-gray-600">
            {RATING_LABELS[hoveredRating || rating]}
          </span>
        )}
      </div>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className={`${getPositionClasses()} z-50 max-w-md`}
      >
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center space-x-2">
              <span className="text-lg">💬</span>
              <span className="font-semibold">
                {currentStep === 'trigger' && 'We\'d love your feedback!'}
                {currentStep === 'form' && 'Tell us more'}
                {currentStep === 'thanks' && 'Thank you!'}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {currentStep === 'trigger' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <p className="text-gray-600 text-sm">
                  How is your experience with Persona so far?
                </p>
                
                {renderStars()}

                <div className="grid grid-cols-2 gap-2 mt-4">
                  {Object.entries(FEEDBACK_CATEGORIES).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type as keyof typeof FEEDBACK_CATEGORIES);
                        setCurrentStep('form');
                      }}
                      className="p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{config.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{config.label}</div>
                          <div className="text-xs text-gray-500">{config.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === 'form' && selectedType && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="text-lg">{FEEDBACK_CATEGORIES[selectedType].icon}</span>
                  <span>{FEEDBACK_CATEGORIES[selectedType].label}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you rate your overall experience?
                  </label>
                  {renderStars()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tell us more:
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Describe your ${selectedType}...`}
                    className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll only use this to follow up if needed
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentStep('trigger')}
                    className="flex-1 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!message.trim() || rating === 0 || isSubmitting}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 'thanks' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="text-4xl mb-2">🙏</div>
                <h3 className="font-semibold text-gray-800 mb-2">Thank you!</h3>
                <p className="text-sm text-gray-600">
                  Your feedback helps us improve Persona for everyone.
                </p>
                {rating >= 4 && (
                  <p className="text-xs text-orange-600 mt-2">
                    Love Persona? Consider sharing it with friends! 
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Quick feedback trigger button
export const FeedbackTrigger: React.FC<{
  variant?: 'float' | 'button' | 'link';
  label?: string;
}> = ({ variant = 'float', label = 'Feedback' }) => {
  const [showFeedback, setShowFeedback] = useState(false);

  const handleTrigger = () => {
    setShowFeedback(true);
    analyticsService.trackEvent(
      'user_action',
      'feedback',
      'trigger_manual',
      undefined,
      { variant }
    );
  };

  const handleFeedbackClose = () => {
    setShowFeedback(false);
  };

  if (variant === 'float') {
    return (
      <>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleTrigger}
          className="fixed bottom-4 left-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg z-40 flex items-center space-x-2 transition-colors"
        >
          <span>💬</span>
          <span className="text-sm font-medium">{label}</span>
        </motion.button>

        {showFeedback && (
          <div className="fixed inset-0 z-50">
            <FeedbackSystem
              trigger="manual"
              onFeedbackSubmit={handleFeedbackClose}
            />
          </div>
        )}
      </>
    );
  }

  if (variant === 'link') {
    return (
      <>
        <button
          onClick={handleTrigger}
          className="text-orange-600 hover:text-orange-700 text-sm underline"
        >
          {label}
        </button>

        {showFeedback && (
          <FeedbackSystem
            trigger="manual"
            onFeedbackSubmit={() => setShowFeedback(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleTrigger}
        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
      >
        {label}
      </button>

      {showFeedback && (
        <FeedbackSystem
          trigger="manual"
          onFeedbackSubmit={() => setShowFeedback(false)}
        />
      )}
    </>
  );
};