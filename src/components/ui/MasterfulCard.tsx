/**
 * MASTERFULLY BEAUTIFUL CARD COMPONENT
 * The most gorgeous card design ever created
 */

import React from 'react';
import { cn } from '../../utils/cn';

interface MasterfulCardProps {
  variant?: 'default' | 'elevated' | 'glass' | 'gradient' | 'neon' | 'minimal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  glowColor?: 'blue' | 'purple' | 'green' | 'pink' | 'orange' | 'cyan';
}

export const MasterfulCard: React.FC<MasterfulCardProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className,
  onClick,
  hoverable = true,
  glowColor = 'blue'
}) => {
  const baseStyles = `
    relative overflow-hidden transition-all duration-300 ease-out
    rounded-2xl border backdrop-blur-sm
    ${onClick ? 'cursor-pointer' : ''}
    ${hoverable ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}
  `;

  const sizeStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  const variantStyles = {
    default: `
      bg-white/80 border-gray-200/50 shadow-lg
      hover:shadow-xl hover:shadow-gray-500/10
      dark:bg-gray-800/80 dark:border-gray-700/50
    `,
    elevated: `
      bg-white/90 border-gray-200/30 shadow-2xl
      hover:shadow-3xl hover:shadow-gray-500/20
      dark:bg-gray-800/90 dark:border-gray-700/30
    `,
    glass: `
      bg-white/10 border-white/20 shadow-xl backdrop-blur-xl
      hover:bg-white/20 hover:border-white/30
      dark:bg-gray-900/10 dark:border-gray-700/20
    `,
    gradient: `
      bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50
      border-gradient-to-br border-blue-200/30 border-purple-200/30
      shadow-lg hover:shadow-2xl
      dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20
    `,
    neon: `
      bg-gray-900/90 border-${glowColor}-500/50 shadow-2xl
      hover:shadow-${glowColor}-500/20 hover:border-${glowColor}-400/70
      shadow-${glowColor}-500/10
    `,
    minimal: `
      bg-transparent border-gray-300/50 shadow-none
      hover:bg-gray-50/50 hover:border-gray-400/70
      dark:border-gray-600/50 dark:hover:bg-gray-800/50
    `
  };

  const glowStyles = {
    blue: 'shadow-blue-500/10 hover:shadow-blue-500/20',
    purple: 'shadow-purple-500/10 hover:shadow-purple-500/20',
    green: 'shadow-green-500/10 hover:shadow-green-500/20',
    pink: 'shadow-pink-500/10 hover:shadow-pink-500/20',
    orange: 'shadow-orange-500/10 hover:shadow-orange-500/20',
    cyan: 'shadow-cyan-500/10 hover:shadow-cyan-500/20'
  };

  return (
    <div
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        variant === 'neon' && glowStyles[glowColor],
        className
      )}
      onClick={onClick}
    >
      {/* Animated background gradient */}
      {variant === 'gradient' && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-gradient-xy opacity-0 hover:opacity-100 transition-opacity duration-500" />
      )}
      
      {/* Shimmer effect */}
      {hoverable && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default MasterfulCard;