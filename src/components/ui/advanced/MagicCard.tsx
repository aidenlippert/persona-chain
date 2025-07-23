/**
 * Advanced Magic Card Component
 * Enhanced card with 3D effects, sophisticated animations, and interactions
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';

export interface MagicCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'neon' | 'holographic' | 'floating' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  tiltEffect?: boolean;
  glowEffect?: boolean;
  particleEffect?: boolean;
  magneticEffect?: boolean;
  flipEffect?: boolean;
  morphingBorder?: boolean;
  backgroundPattern?: 'dots' | 'grid' | 'waves' | 'noise' | 'circuit';
  gradientDirection?: 'to-r' | 'to-br' | 'to-b' | 'to-bl' | 'to-l' | 'to-tl' | 'to-t' | 'to-tr';
  customGradient?: string;
  glowColor?: string;
  borderAnimation?: boolean;
  contentAnimation?: 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce';
  hoverScale?: number;
  rotationIntensity?: number;
  shadowIntensity?: 'low' | 'medium' | 'high' | 'extreme';
}

interface TiltState {
  x: number;
  y: number;
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
}

export const MagicCard: React.FC<MagicCardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
  hoverable = true,
  tiltEffect = false,
  glowEffect = false,
  particleEffect = false,
  magneticEffect = false,
  flipEffect = false,
  morphingBorder = false,
  backgroundPattern,
  gradientDirection = 'to-br',
  customGradient,
  glowColor = 'blue',
  borderAnimation = false,
  contentAnimation = 'fade',
  hoverScale = 1.02,
  rotationIntensity = 15,
  shadowIntensity = 'medium'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [tilt, setTilt] = useState<TiltState>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();

  // Motion values for advanced effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [rotationIntensity, -rotationIntensity]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-rotationIntensity, rotationIntensity]), { stiffness: 300, damping: 30 });
  const magnetX = useSpring(useTransform(mouseX, [-200, 200], [-10, 10]), { stiffness: 200, damping: 20 });
  const magnetY = useSpring(useTransform(mouseY, [-200, 200], [-10, 10]), { stiffness: 200, damping: 20 });

  // Size configurations
  const sizeClasses = {
    sm: 'p-4 max-w-sm',
    md: 'p-6 max-w-md',
    lg: 'p-8 max-w-lg',
    xl: 'p-10 max-w-xl',
    full: 'p-6 w-full'
  };

  // Variant styles
  const variantClasses = {
    default: `
      bg-white dark:bg-gray-800 
      border border-gray-200 dark:border-gray-700
      shadow-lg hover:shadow-xl
    `,
    elevated: `
      bg-white dark:bg-gray-800 
      border border-gray-200/50 dark:border-gray-700/50
      shadow-2xl hover:shadow-3xl
      backdrop-blur-sm
    `,
    glass: `
      bg-white/10 dark:bg-gray-900/10 
      border border-white/20 dark:border-gray-700/20
      backdrop-blur-xl shadow-2xl
      hover:bg-white/20 dark:hover:bg-gray-900/20
    `,
    neon: `
      bg-gray-900 
      border-2 border-${glowColor}-500/50
      shadow-2xl shadow-${glowColor}-500/20
      hover:border-${glowColor}-400/70 hover:shadow-${glowColor}-500/40
    `,
    holographic: `
      bg-gradient-${gradientDirection} from-purple-600/20 via-pink-600/20 to-blue-600/20
      border border-white/30
      backdrop-blur-md shadow-2xl
      hover:from-purple-600/30 hover:via-pink-600/30 hover:to-blue-600/30
    `,
    floating: `
      bg-white dark:bg-gray-800
      border-none shadow-2xl
      transform hover:translate-y-[-8px]
      transition-transform duration-300
    `,
    gradient: `
      ${customGradient || `bg-gradient-${gradientDirection} from-blue-600 via-purple-600 to-pink-600`}
      text-white shadow-2xl
      border border-white/20
    `
  };

  // Shadow intensity classes
  const shadowClasses = {
    low: 'shadow-md hover:shadow-lg',
    medium: 'shadow-lg hover:shadow-xl',
    high: 'shadow-xl hover:shadow-2xl',
    extreme: 'shadow-2xl hover:shadow-3xl'
  };

  // Background patterns
  const getBackgroundPattern = () => {
    switch (backgroundPattern) {
      case 'dots':
        return 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)';
      case 'grid':
        return `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `;
      case 'waves':
        return `
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.1) 2px,
            rgba(255,255,255,0.1) 4px
          )
        `;
      case 'noise':
        return 'url("data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%" height="100%" filter="url(%23noiseFilter)" opacity="0.1"/%3E%3C/svg%3E")';
      case 'circuit':
        return `
          linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.05) 75%, rgba(255,255,255,0.05) 76%, transparent 77%, transparent),
          linear-gradient(transparent 24%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.05) 75%, rgba(255,255,255,0.05) 76%, transparent 77%, transparent)
        `;
      default:
        return undefined;
    }
  };

  // Particle system
  useEffect(() => {
    if (!particleEffect || !isHovered) return;

    const createParticle = (): Particle => ({
      id: Math.random(),
      x: Math.random() * 100,
      y: 100 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 1,
      vy: -Math.random() * 2 - 1,
      life: 0,
      maxLife: 120 + Math.random() * 60,
      size: Math.random() * 3 + 1
    });

    const animateParticles = () => {
      setParticles(prevParticles => {
        const updated = prevParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life + 1,
            vy: particle.vy * 0.99 // Gradually slow down
          }))
          .filter(particle => particle.life < particle.maxLife && particle.y > -10);

        // Add new particles
        if (updated.length < 30 && Math.random() < 0.2) {
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

  // Mouse move handler for tilt and magnetic effects
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;

    if (tiltEffect) {
      mouseX.set(deltaX);
      mouseY.set(deltaY);
    }

    if (magneticEffect) {
      mouseX.set(deltaX);
      mouseY.set(deltaY);
    }

    setTilt({
      x: (deltaY / rect.height) * rotationIntensity,
      y: (deltaX / rect.width) * rotationIntensity
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (tiltEffect || magneticEffect) {
      mouseX.set(0);
      mouseY.set(0);
    }
    setTilt({ x: 0, y: 0 });
    setParticles([]);
  };

  const handleClick = () => {
    if (flipEffect) {
      setIsFlipped(!isFlipped);
    }
    onClick?.();
  };

  // Content animation variants
  const contentAnimations = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slide: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    },
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 }
    },
    rotate: {
      initial: { opacity: 0, rotate: -10 },
      animate: { opacity: 1, rotate: 0 },
      exit: { opacity: 0, rotate: 10 }
    },
    bounce: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.5 } },
      exit: { opacity: 0, y: 20 }
    }
  };

  const baseClasses = `
    relative overflow-hidden transition-all duration-300 ease-out
    rounded-2xl
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${shadowClasses[shadowIntensity]}
    ${onClick || flipEffect ? 'cursor-pointer' : ''}
    ${hoverable ? 'hover:scale-105' : ''}
    ${className}
  `;

  const motionProps = {
    ref: cardRef,
    className: baseClasses,
    style: {
      transformStyle: 'preserve-3d' as const,
      backgroundImage: getBackgroundPattern(),
      backgroundSize: backgroundPattern === 'dots' ? '20px 20px' : 
                     backgroundPattern === 'grid' ? '20px 20px' : 
                     backgroundPattern === 'circuit' ? '50px 50px' : undefined,
      x: magneticEffect ? magnetX : undefined,
      y: magneticEffect ? magnetY : undefined,
      rotateX: tiltEffect ? rotateX : undefined,
      rotateY: tiltEffect ? rotateY : undefined
    },
    whileHover: { 
      scale: hoverable ? hoverScale : 1,
      transition: { duration: 0.3 }
    },
    onMouseEnter: () => setIsHovered(true),
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    layout: true
  };

  return (
    <motion.div {...motionProps}>
      {/* Glow effect */}
      {glowEffect && isHovered && (
        <motion.div
          className={`absolute -inset-4 bg-${glowColor}-500/20 rounded-3xl blur-2xl`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Morphing border */}
      {morphingBorder && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, 
              #ff0080 0deg, #00ff80 120deg, #8000ff 240deg, #ff0080 360deg)`
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Animated border */}
      {borderAnimation && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
          style={{ padding: '2px' }}
          animate={{
            background: [
              'linear-gradient(0deg, #3b82f6, #8b5cf6, #ec4899)',
              'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
              'linear-gradient(180deg, #3b82f6, #8b5cf6, #ec4899)',
              'linear-gradient(270deg, #3b82f6, #8b5cf6, #ec4899)',
              'linear-gradient(360deg, #3b82f6, #8b5cf6, #ec4899)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-800" />
        </motion.div>
      )}

      {/* Particle effects */}
      {particleEffect && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {particles.map(particle => (
            <motion.div
              key={particle.id}
              className={`absolute bg-${glowColor}-400 rounded-full`}
              style={{
                left: `${particle.x}%`,
                bottom: `${100 - particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                opacity: Math.max(0, 1 - (particle.life / particle.maxLife))
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            />
          ))}
        </div>
      )}

      {/* Shimmer effect for holographic variant */}
      {variant === 'holographic' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Card content with flip effect */}
      <div 
        className="relative h-full w-full"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: flipEffect && isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.6s'
        }}
      >
        {/* Front content */}
        <motion.div
          className="h-full w-full"
          style={{ backfaceVisibility: 'hidden' }}
          {...contentAnimations[contentAnimation]}
        >
          {typeof children === 'object' && 'front' in (children as any) 
            ? (children as any).front 
            : children}
        </motion.div>

        {/* Back content (for flip effect) */}
        {flipEffect && typeof children === 'object' && 'back' in (children as any) && (
          <motion.div
            className="absolute inset-0 h-full w-full"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
            {...contentAnimations[contentAnimation]}
          >
            {(children as any).back}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};