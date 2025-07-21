import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animate = true
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circle':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-lg';
      case 'rectangular':
      default:
        return 'rounded';
    }
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <motion.div
      className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 ${getVariantClasses()} ${className}`}
      style={style}
      animate={animate ? {
        backgroundPosition: ['200% 0', '-200% 0'],
      } : undefined}
      transition={animate ? {
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear'
      } : undefined}
      style={{
        ...style,
        backgroundSize: '200% 100%',
      }}
    />
  );
};

// Card Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-6 border rounded-lg bg-white ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton variant="rounded" width={100} height={24} />
      <Skeleton variant="circle" width={32} height={32} />
    </div>
    <Skeleton variant="text" className="mb-2" width="80%" />
    <Skeleton variant="text" className="mb-4" width="60%" />
    <div className="flex justify-between items-center">
      <Skeleton variant="rounded" width={80} height={32} />
      <Skeleton variant="text" width="30%" />
    </div>
  </div>
);

// API Tile Skeleton
export const APITileSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div
    className={`border rounded-xl p-6 bg-white ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <Skeleton variant="rounded" width={48} height={48} />
        <div>
          <Skeleton variant="text" width={120} height={20} className="mb-2" />
          <Skeleton variant="text" width={80} height={16} />
        </div>
      </div>
      <Skeleton variant="circle" width={24} height={24} />
    </div>
    
    <Skeleton variant="text" className="mb-3" width="90%" />
    <Skeleton variant="text" className="mb-4" width="70%" />
    
    <div className="flex items-center justify-between">
      <div className="flex space-x-2">
        <Skeleton variant="rounded" width={60} height={20} />
        <Skeleton variant="rounded" width={70} height={20} />
      </div>
      <Skeleton variant="rounded" width={80} height={32} />
    </div>
  </motion.div>
);

// Credential List Skeleton
export const CredentialListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <motion.div
        key={index}
        className="border rounded-lg p-4 bg-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Skeleton variant="circle" width={40} height={40} />
            <div>
              <Skeleton variant="text" width={150} height={18} className="mb-1" />
              <Skeleton variant="text" width={100} height={14} />
            </div>
          </div>
          <Skeleton variant="rounded" width={80} height={24} />
        </div>
        <Skeleton variant="text" width="100%" className="mb-2" />
        <div className="flex justify-between items-center">
          <Skeleton variant="text" width={120} />
          <div className="flex space-x-2">
            <Skeleton variant="rounded" width={70} height={28} />
            <Skeleton variant="rounded" width={70} height={28} />
          </div>
        </div>
      </motion.div>
    ))}
  </div>
);

// Dashboard Stats Skeleton
export const DashboardStatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {Array.from({ length: 4 }).map((_, index) => (
      <motion.div
        key={index}
        className="bg-white rounded-xl p-6 border"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="circle" width={48} height={48} />
          <Skeleton variant="rounded" width={60} height={20} />
        </div>
        <Skeleton variant="text" width={80} height={32} className="mb-2" />
        <Skeleton variant="text" width="100%" height={14} />
      </motion.div>
    ))}
  </div>
);