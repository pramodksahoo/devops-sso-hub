import React from 'react';
import { motion } from 'framer-motion';

interface LoadingCardProps {
  count?: number;
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ 
  count = 1, 
  className = '' 
}) => {

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 ${className}`}
        >
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded-full w-16"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </motion.div>
      ))}
    </>
  );
};

export const LoadingMetric: React.FC<LoadingCardProps> = ({ 
  count = 4, 
  className = '' 
}) => {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className={`bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 ${className}`}
        >
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
              <div className="h-4 bg-gray-200 rounded w-8"></div>
            </div>
            <div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </motion.div>
      ))}
    </>
  );
};

export const LoadingSkeleton: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  );
};

export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}> = ({ size = 'md', color = 'text-blue-600', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center justify-center ${className}`}
    >
      <svg
        className={`animate-spin ${sizeClasses[size]} ${color}`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </motion.div>
  );
};

export const LoadingDots: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}> = ({ size = 'md', color = 'bg-blue-600', className = '' }) => {
  const sizeClasses = {
    sm: 'h-1 w-1',
    md: 'h-2 w-2',
    lg: 'h-3 w-3'
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${sizeClasses[size]} ${color} rounded-full`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
};

export const LoadingPulse: React.FC<{
  children: React.ReactNode;
  isLoading: boolean;
  className?: string;
}> = ({ children, isLoading, className = '' }) => {
  if (!isLoading) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className={className}
    >
      {children}
    </motion.div>
  );
};