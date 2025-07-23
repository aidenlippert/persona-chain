/**
 * Elite Web3 Button Component
 * Implements design patterns from top Web3 platforms like Uniswap, 1inch, Aave
 */

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface EliteWeb3ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'connect' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const EliteWeb3Button = forwardRef<HTMLButtonElement, EliteWeb3ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      icon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      relative
      inline-flex
      items-center
      justify-center
      font-semibold
      rounded-xl
      transition-all
      duration-300
      ease-out
      focus:outline-none
      focus:ring-2
      focus:ring-cyan-400
      focus:ring-offset-2
      focus:ring-offset-slate-900
      disabled:opacity-50
      disabled:cursor-not-allowed
      overflow-hidden
      select-none
    `;

    const sizeClasses = {
      sm: 'px-4 py-2 text-sm min-h-[36px]',
      md: 'px-6 py-3 text-base min-h-[44px]',
      lg: 'px-8 py-4 text-lg min-h-[52px]',
      xl: 'px-10 py-5 text-xl min-h-[60px]',
    };

    const variantClasses = {
      primary: `
        text-white
        bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600
        shadow-lg shadow-blue-500/25
        hover:shadow-blue-500/40
        hover:shadow-xl
        hover:scale-[1.02]
        hover:-translate-y-0.5
        active:scale-[1.01]
        active:translate-y-0
        before:absolute
        before:inset-0
        before:bg-gradient-to-r
        before:from-blue-400
        before:via-cyan-400
        before:to-blue-500
        before:opacity-0
        before:transition-opacity
        before:duration-300
        hover:before:opacity-20
      `,
      secondary: `
        text-slate-300
        bg-slate-800/50
        border border-slate-600/50
        backdrop-blur-sm
        shadow-lg shadow-slate-900/25
        hover:bg-slate-700/50
        hover:border-slate-500/50
        hover:text-white
        hover:shadow-slate-700/40
        hover:scale-[1.02]
        hover:-translate-y-0.5
        active:scale-[1.01]
        active:translate-y-0
      `,
      connect: `
        text-white
        bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600
        shadow-lg shadow-emerald-500/25
        hover:shadow-emerald-500/40
        hover:shadow-xl
        hover:scale-[1.02]
        hover:-translate-y-0.5
        active:scale-[1.01]
        active:translate-y-0
        before:absolute
        before:inset-0
        before:bg-gradient-to-r
        before:from-emerald-400
        before:via-green-400
        before:to-emerald-500
        before:opacity-0
        before:transition-opacity
        before:duration-300
        hover:before:opacity-20
      `,
      danger: `
        text-white
        bg-gradient-to-r from-red-500 via-pink-500 to-red-600
        shadow-lg shadow-red-500/25
        hover:shadow-red-500/40
        hover:shadow-xl
        hover:scale-[1.02]
        hover:-translate-y-0.5
        active:scale-[1.01]
        active:translate-y-0
        before:absolute
        before:inset-0
        before:bg-gradient-to-r
        before:from-red-400
        before:via-pink-400
        before:to-red-500
        before:opacity-0
        before:transition-opacity
        before:duration-300
        hover:before:opacity-20
      `,
    };

    const fullWidthClass = fullWidth ? 'w-full' : '';

    const combinedClassName = `
      ${baseClasses}
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${fullWidthClass}
      ${className}
    `.trim();

    return (
      <motion.button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || isLoading}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {/* Background shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
        
        {/* Content wrapper */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              {icon && <span className="flex-shrink-0">{icon}</span>}
              <span>{children}</span>
            </>
          )}
        </span>

        {/* Glow effect on hover */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-xl" />
      </motion.button>
    );
  }
);

EliteWeb3Button.displayName = 'EliteWeb3Button';