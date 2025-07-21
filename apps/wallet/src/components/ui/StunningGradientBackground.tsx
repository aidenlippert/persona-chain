/**
 * STUNNING GRADIENT BACKGROUND COMPONENT
 * Creates the most beautiful animated background
 */

import React from 'react';

interface StunningGradientBackgroundProps {
  variant?: 'default' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'cosmic';
  animated?: boolean;
  className?: string;
}

export const StunningGradientBackground: React.FC<StunningGradientBackgroundProps> = ({
  variant = 'default',
  animated = true,
  className = ''
}) => {
  const variants = {
    default: 'from-blue-50 via-white to-purple-50',
    aurora: 'from-green-400 via-blue-500 to-purple-600',
    sunset: 'from-orange-400 via-pink-500 to-purple-600',
    ocean: 'from-blue-400 via-teal-500 to-green-400',
    forest: 'from-green-400 via-teal-500 to-blue-500',
    cosmic: 'from-purple-900 via-blue-900 to-indigo-900'
  };

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Base gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${variants[variant]}`} />
      
      {/* Animated overlay gradients */}
      {animated && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-gradient-x" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-gradient-y" />
        </>
      )}
      
      {/* Floating orbs */}
      {animated && (
        <>
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-40 right-20 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-300/20 rounded-full blur-3xl animate-float-slow" />
        </>
      )}
      
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }} />
    </div>
  );
};

export default StunningGradientBackground;