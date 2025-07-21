/**
 * Advanced Magic Button Component
 * Enhanced button with sophisticated animations and interactions
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface MagicButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'neon' | 'holographic';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  fullWidth?: boolean;
  glowEffect?: boolean;
  particleEffect?: boolean;
  magneticEffect?: boolean;
  morphingEffect?: boolean;
  soundEffect?: boolean;
  hapticFeedback?: boolean;
  gradient?: string;
  customAnimation?: 'pulse' | 'bounce' | 'shake' | 'rotate' | 'slide' | 'morph';
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export const MagicButton: React.FC<MagicButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  fullWidth = false,
  glowEffect = false,
  particleEffect = false,
  magneticEffect = false,
  morphingEffect = false,
  soundEffect = false,
  hapticFeedback = false,
  gradient,
  customAnimation,
  'aria-label': ariaLabel,
  type = 'button'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [clickRipples, setClickRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const animationFrameRef = useRef<number>();
  
  // Magnetic effect motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const magnetX = useSpring(useTransform(mouseX, [-100, 100], [-20, 20]), { stiffness: 200, damping: 20 });
  const magnetY = useSpring(useTransform(mouseY, [-100, 100], [-20, 20]), { stiffness: 200, damping: 20 });

  // Size configurations
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-h-[28px]',
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[52px]',
    xl: 'px-10 py-5 text-xl min-h-[60px]',
    '2xl': 'px-12 py-6 text-2xl min-h-[72px]'
  };

  // Variant styles
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 
      text-white shadow-lg hover:from-blue-700 hover:via-blue-800 hover:to-blue-900
      border border-blue-500/20 hover:border-blue-400/40
    `,
    secondary: `
      bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 
      text-white shadow-lg hover:from-gray-700 hover:via-gray-800 hover:to-gray-900
      border border-gray-500/20 hover:border-gray-400/40
    `,
    success: `
      bg-gradient-to-r from-green-600 via-green-700 to-green-800 
      text-white shadow-lg hover:from-green-700 hover:via-green-800 hover:to-green-900
      border border-green-500/20 hover:border-green-400/40
    `,
    danger: `
      bg-gradient-to-r from-red-600 via-red-700 to-red-800 
      text-white shadow-lg hover:from-red-700 hover:via-red-800 hover:to-red-900
      border border-red-500/20 hover:border-red-400/40
    `,
    warning: `
      bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 
      text-white shadow-lg hover:from-yellow-600 hover:via-orange-600 hover:to-red-600
      border border-yellow-500/20 hover:border-orange-400/40
    `,
    ghost: `
      bg-transparent text-gray-700 dark:text-gray-300 shadow-none
      hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-md
      border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500
    `,
    neon: `
      bg-gray-900 text-cyan-400 shadow-2xl
      border-2 border-cyan-500/50 hover:border-cyan-400/70
      shadow-cyan-500/20 hover:shadow-cyan-400/40
    `,
    holographic: `
      bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600
      text-white shadow-2xl
      border border-white/20
      background-size: 200% 200%
      animate-gradient-xy
    `
  };

  // Custom animations
  const customAnimations = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.6, repeat: Infinity }
    },
    bounce: {
      y: [0, -10, 0],
      transition: { duration: 0.6, repeat: Infinity }
    },
    shake: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.5 }
    },
    rotate: {
      rotate: [0, 360],
      transition: { duration: 2, repeat: Infinity, ease: "linear" }
    },
    slide: {
      x: [0, 10, 0],
      transition: { duration: 0.8, repeat: Infinity }
    },
    morph: {
      borderRadius: ["12px", "50%", "12px"],
      transition: { duration: 2, repeat: Infinity }
    }
  };

  // Particle system for particle effect
  useEffect(() => {
    if (!particleEffect || !isHovered) return;

    const createParticle = (): Particle => ({
      id: Math.random(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 0,
      maxLife: 60 + Math.random() * 60
    });

    const animateParticles = () => {
      setParticles(prevParticles => {
        const updated = prevParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life + 1
          }))
          .filter(particle => particle.life < particle.maxLife);

        // Add new particles
        if (updated.length < 20 && Math.random() < 0.3) {
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
  }, [particleEffect, isHovered]);

  // Magnetic effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!magneticEffect || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    if (magneticEffect) {
      mouseX.set(0);
      mouseY.set(0);
    }
  };

  // Click handler with effects
  const handleClick = async (e: React.MouseEvent) => {
    if (disabled || loading) return;

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    // Haptic feedback
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Sound effect
    if (soundEffect) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        // Audio not supported or blocked
      }
    }

    // Click ripple effect
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = { id: Date.now(), x, y };
      setClickRipples(prev => [...prev, ripple]);
      
      setTimeout(() => {
        setClickRipples(prev => prev.filter(r => r.id !== ripple.id));
      }, 600);
    }

    onClick?.(e);
  };

  const baseClasses = `
    relative overflow-hidden font-medium transition-all duration-300 ease-out
    focus:outline-none focus:ring-4 focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    transform active:scale-[0.98]
    flex items-center justify-center gap-2
    rounded-xl
    ${fullWidth ? 'w-full' : ''}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${glowEffect ? 'hover:shadow-2xl transition-shadow' : ''}
    ${className}
  `;

  const motionProps = {
    ref: buttonRef,
    className: baseClasses,
    style: magneticEffect ? { x: magnetX, y: magnetY } : undefined,
    whileHover: { scale: morphingEffect ? 1.05 : isHovered ? 1.02 : 1 },
    whileTap: { scale: 0.98 },
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: handleMouseLeave,
    onMouseMove: handleMouseMove,
    onClick: handleClick,
    disabled: disabled || loading,
    type,
    'aria-label': ariaLabel,
    animate: customAnimation ? customAnimations[customAnimation] : undefined
  };

  return (
    <motion.button {...motionProps}>
      {/* Background gradient overlay */}
      {gradient && (
        <div 
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{ background: gradient }}
        />
      )}

      {/* Glow effect */}
      {glowEffect && isHovered && (
        <motion.div
          className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Particle effects */}
      {particleEffect && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map(particle => (
            <motion.div
              key={particle.id}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                opacity: 1 - (particle.life / particle.maxLife)
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            />
          ))}
        </div>
      )}

      {/* Click ripples */}
      <AnimatePresence>
        {clickRipples.map(ripple => (
          <motion.div
            key={ripple.id}
            className="absolute bg-white/30 rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ width: 0, height: 0 }}
            animate={{ width: 100, height: 100 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        ))}
      </AnimatePresence>

      {/* Shimmer effect */}
      {variant === 'holographic' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
      )}

      {/* Content container */}
      <div className="relative flex items-center justify-center gap-2 z-10">
        {loading && (
          <motion.div
            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        
        {!loading && icon && iconPosition === 'left' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {icon}
          </motion.div>
        )}
        
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {children}
        </motion.span>
        
        {!loading && icon && iconPosition === 'right' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {icon}
          </motion.div>
        )}
      </div>
    </motion.button>
  );
};