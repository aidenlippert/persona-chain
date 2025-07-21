/**
 * Advanced Magic Modal Component
 * Enhanced modal with sophisticated animations, blur effects, and interactions
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { createPortal } from 'react-dom';

export interface MagicModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  variant?: 'default' | 'glass' | 'neon' | 'holographic' | 'minimal' | 'dramatic';
  animation?: 'fade' | 'scale' | 'slide' | 'flip' | 'zoom' | 'spiral' | 'bounce';
  backdropBlur?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  zIndex?: number;
  customBackdrop?: string;
  glowEffect?: boolean;
  particleEffect?: boolean;
  soundEffect?: boolean;
  hapticFeedback?: boolean;
  magneticClose?: boolean;
  autoFocus?: boolean;
  trapFocus?: boolean;
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onAnimationComplete?: () => void;
  footer?: React.ReactNode;
  header?: React.ReactNode;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const MagicModal: React.FC<MagicModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  variant = 'default',
  animation = 'scale',
  backdropBlur = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventScroll = true,
  zIndex = 1000,
  customBackdrop,
  glowEffect = false,
  particleEffect = false,
  soundEffect = false,
  hapticFeedback = false,
  magneticClose = false,
  autoFocus = true,
  trapFocus = true,
  role = 'dialog',
  ariaLabel,
  ariaDescribedBy,
  onAnimationComplete,
  footer,
  header
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([]);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  const animationFrameRef = useRef<number>();

  // Magnetic close button effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const magnetX = useSpring(mouseX, { stiffness: 200, damping: 20 });
  const magnetY = useSpring(mouseY, { stiffness: 200, damping: 20 });

  // Size configurations
  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4'
  };

  // Variant styles
  const variantClasses = {
    default: `
      bg-white dark:bg-gray-800 
      border border-gray-200 dark:border-gray-700
      shadow-2xl
    `,
    glass: `
      bg-white/10 dark:bg-gray-900/10
      backdrop-blur-xl border border-white/20
      shadow-2xl
    `,
    neon: `
      bg-gray-900 border-2 border-cyan-500/50
      shadow-2xl shadow-cyan-500/20
      text-cyan-100
    `,
    holographic: `
      bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20
      backdrop-blur-md border border-white/30
      shadow-2xl text-white
    `,
    minimal: `
      bg-white dark:bg-gray-800
      border-none shadow-xl
    `,
    dramatic: `
      bg-black/90 border border-red-500/30
      shadow-2xl shadow-red-500/20
      text-red-100
    `
  };

  // Backdrop blur classes
  const backdropBlurClasses = {
    none: '',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  // Animation variants
  const animationVariants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    scale: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 }
    },
    slide: {
      initial: { opacity: 0, y: -50 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -50 }
    },
    flip: {
      initial: { opacity: 0, rotateX: -90 },
      animate: { opacity: 1, rotateX: 0 },
      exit: { opacity: 0, rotateX: 90 }
    },
    zoom: {
      initial: { opacity: 0, scale: 0 },
      animate: { opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.3 } },
      exit: { opacity: 0, scale: 0 }
    },
    spiral: {
      initial: { opacity: 0, scale: 0, rotate: -180 },
      animate: { opacity: 1, scale: 1, rotate: 0 },
      exit: { opacity: 0, scale: 0, rotate: 180 }
    },
    bounce: {
      initial: { opacity: 0, y: -100 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: { type: "spring", bounce: 0.6, duration: 0.8 }
      },
      exit: { opacity: 0, y: 100 }
    }
  };

  // Backdrop variants
  const backdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Particle system for particle effect
  useEffect(() => {
    if (!particleEffect || !isOpen) return;

    const createParticle = (): Particle => {
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
      return {
        id: Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0,
        maxLife: 200 + Math.random() * 100,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    };

    const animateParticles = () => {
      setParticles(prevParticles => {
        const updated = prevParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life + 1,
            vx: particle.vx * 0.999,
            vy: particle.vy * 0.999
          }))
          .filter(particle => 
            particle.life < particle.maxLife &&
            particle.x > -10 && particle.x < 110 &&
            particle.y > -10 && particle.y < 110
          );

        // Add new particles
        if (updated.length < 50 && Math.random() < 0.1) {
          updated.push(createParticle());
        }

        return updated;
      });

      animationFrameRef.current = requestAnimationFrame(animateParticles);
    };

    animationFrameRef.current = requestAnimationFrame(animateParticles);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particleEffect, isOpen]);

  // Focus management
  useEffect(() => {
    if (!isOpen || !trapFocus) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Get all focusable elements
    const focusableSelectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const elements = Array.from(modal.querySelectorAll(focusableSelectors)) as HTMLElement[];
    setFocusableElements(elements);

    // Auto focus first element
    if (autoFocus && elements.length > 0) {
      elements[0].focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || elements.length === 0) return;

      const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
      let nextIndex;

      if (e.shiftKey) {
        nextIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
      } else {
        nextIndex = currentIndex >= elements.length - 1 ? 0 : currentIndex + 1;
      }

      e.preventDefault();
      elements[nextIndex].focus();
      setCurrentFocusIndex(nextIndex);
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen, autoFocus, trapFocus]);

  // Escape key handler
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape]);

  // Prevent scroll
  useEffect(() => {
    if (!preventScroll) return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, preventScroll]);

  // Close handler with effects
  const handleClose = async () => {
    // Haptic feedback
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }

    // Sound effect
    if (soundEffect) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        // Audio not supported or blocked
      }
    }

    onClose();
  };

  // Backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      handleClose();
    }
  };

  // Magnetic close button
  const handleCloseButtonMouseMove = (e: React.MouseEvent) => {
    if (!magneticClose || !closeButtonRef.current) return;

    const rect = closeButtonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set((e.clientX - centerX) * 0.1);
    mouseY.set((e.clientY - centerY) * 0.1);
  };

  const handleCloseButtonMouseLeave = () => {
    if (magneticClose) {
      mouseX.set(0);
      mouseY.set(0);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence onExitComplete={onAnimationComplete}>
      <motion.div
        className={`fixed inset-0 z-${zIndex} flex items-center justify-center p-4`}
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={handleBackdropClick}
      >
        {/* Custom backdrop or default */}
        <div 
          className={`absolute inset-0 ${
            customBackdrop || `bg-black/50 ${backdropBlurClasses[backdropBlur]}`
          }`}
        />

        {/* Particle effects */}
        {particleEffect && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map(particle => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  backgroundColor: particle.color,
                  opacity: Math.max(0, 1 - (particle.life / particle.maxLife))
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              />
            ))}
          </div>
        )}

        {/* Modal container */}
        <motion.div
          ref={modalRef}
          className={`
            relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden
            rounded-2xl ${variantClasses[variant]}
          `}
          variants={animationVariants[animation]}
          initial="initial"
          animate="animate"
          exit="exit"
          role={role}
          aria-label={ariaLabel || title}
          aria-describedby={ariaDescribedBy}
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow effect */}
          {glowEffect && (
            <motion.div
              className="absolute -inset-4 bg-blue-500/20 rounded-3xl blur-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}

          {/* Header */}
          {(title || header || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                {header || (
                  title && (
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {title}
                    </h2>
                  )
                )}
              </div>
              
              {showCloseButton && (
                <motion.button
                  ref={closeButtonRef}
                  onClick={handleClose}
                  onMouseMove={handleCloseButtonMouseMove}
                  onMouseLeave={handleCloseButtonMouseLeave}
                  style={magneticClose ? { x: magnetX, y: magnetY } : undefined}
                  className="ml-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)] p-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {children}
            </motion.div>
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {footer}
              </motion.div>
            </div>
          )}

          {/* Holographic shimmer effect */}
          {variant === 'holographic' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 pointer-events-none"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Use portal to render modal
  return createPortal(modalContent, document.body);
};