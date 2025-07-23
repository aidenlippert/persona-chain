/**
 * MASTERFULLY BEAUTIFUL BUTTON COMPONENT
 * The most gorgeous button you've ever seen
 */

import React from 'react';
import { cn } from '../../utils/cn';

interface BrutallyBeautifulButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const BrutallyBeautifulButton: React.FC<BrutallyBeautifulButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled,
  loading,
  className,
  icon,
  iconPosition = 'left'
}) => {
  const baseStyles = `
    relative overflow-hidden font-medium transition-all duration-300 ease-out
    focus:outline-none focus:ring-4 focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    transform hover:scale-[1.02] active:scale-[0.98]
    shadow-lg hover:shadow-xl active:shadow-md
    flex items-center justify-center gap-2
    rounded-xl border-0
  `;

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[52px]',
    xl: 'px-10 py-5 text-xl min-h-[60px]'
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 
      text-white shadow-blue-500/25
      hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 
      hover:shadow-blue-500/40
      focus:ring-blue-500
      before:absolute before:inset-0 before:bg-gradient-to-r 
      before:from-white/20 before:via-white/10 before:to-transparent 
      before:opacity-0 hover:before:opacity-100 before:transition-opacity
    `,
    secondary: `
      bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 
      text-gray-900 shadow-gray-500/25
      hover:from-gray-300 hover:via-gray-400 hover:to-gray-500
      hover:shadow-gray-500/40
      focus:ring-gray-500
      before:absolute before:inset-0 before:bg-gradient-to-r 
      before:from-white/30 before:via-white/20 before:to-transparent 
      before:opacity-0 hover:before:opacity-100 before:transition-opacity
    `,
    success: `
      bg-gradient-to-r from-green-600 via-green-700 to-green-800 
      text-white shadow-green-500/25
      hover:from-green-700 hover:via-green-800 hover:to-green-900
      hover:shadow-green-500/40
      focus:ring-green-500
      before:absolute before:inset-0 before:bg-gradient-to-r 
      before:from-white/20 before:via-white/10 before:to-transparent 
      before:opacity-0 hover:before:opacity-100 before:transition-opacity
    `,
    danger: `
      bg-gradient-to-r from-red-600 via-red-700 to-red-800 
      text-white shadow-red-500/25
      hover:from-red-700 hover:via-red-800 hover:to-red-900
      hover:shadow-red-500/40
      focus:ring-red-500
      before:absolute before:inset-0 before:bg-gradient-to-r 
      before:from-white/20 before:via-white/10 before:to-transparent 
      before:opacity-0 hover:before:opacity-100 before:transition-opacity
    `,
    ghost: `
      bg-transparent text-gray-700 shadow-none
      hover:bg-gray-100 hover:shadow-md
      focus:ring-gray-500
      border-2 border-gray-300 hover:border-gray-400
    `,
    gradient: `
      bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 
      text-white shadow-purple-500/25
      hover:from-purple-700 hover:via-pink-700 hover:to-blue-700
      hover:shadow-purple-500/40
      focus:ring-purple-500
      before:absolute before:inset-0 before:bg-gradient-to-r 
      before:from-white/20 before:via-white/10 before:to-transparent 
      before:opacity-0 hover:before:opacity-100 before:transition-opacity
    `
  };

  const loadingSpinner = (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {/* Shimmer effect */}
      {!disabled && (
        <div className="absolute inset-0 -top-px bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
      )}
      
      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        {loading && loadingSpinner}
        {!loading && icon && iconPosition === 'left' && icon}
        {!loading && children}
        {!loading && icon && iconPosition === 'right' && icon}
      </div>
    </button>
  );
};

export default BrutallyBeautifulButton;