import React from 'react';
import { motion } from 'framer-motion';
import { cardStyles } from './designSystem';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  animate?: boolean;
  delay?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = true,
  clickable = false,
  onClick,
  animate = false,
  delay = 0
}) => {
  const baseClasses = [
    cardStyles.base,
    cardStyles.padding[padding],
    hover && cardStyles.hover,
    clickable && 'cursor-pointer',
    className
  ].filter(Boolean).join(' ');

  const CardComponent = animate ? motion.div : 'div';

  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4, ease: 'easeOut' }
  } : {};

  return (
    <CardComponent
      className={baseClasses}
      onClick={onClick}
      {...animationProps}
    >
      {children}
    </CardComponent>
  );
};

// Specialized card variants
export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: string;
  bgColor?: string;
  delay?: number;
}> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'text-blue-600',
  bgColor = 'bg-blue-50',
  delay = 0 
}) => {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    stable: 'text-gray-500'
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    stable: '→'
  };

  return (
    <Card animate delay={delay} padding="md" className="group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor} group-hover:scale-105 transition-transform duration-200`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center space-x-1 ${trendColors[trend]}`}>
            <span className="text-sm font-medium">{trendIcons[trend]}</span>
            <span className="text-sm font-medium">{trendValue}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </Card>
  );
};

export const StatusCard: React.FC<{
  title: string;
  description?: string;
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon: React.ElementType;
  badge?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  delay?: number;
}> = ({ 
  title, 
  description, 
  status, 
  icon: Icon, 
  badge,
  action,
  delay = 0 
}) => {
  const statusStyles = {
    success: {
      bg: 'bg-green-50/50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      badgeColor: 'bg-green-100 text-green-800'
    },
    warning: {
      bg: 'bg-yellow-50/50',
      border: 'border-yellow-200',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      badgeColor: 'bg-yellow-100 text-yellow-800'
    },
    error: {
      bg: 'bg-red-50/50',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      badgeColor: 'bg-red-100 text-red-800'
    },
    info: {
      bg: 'bg-blue-50/50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    neutral: {
      bg: 'bg-gray-50/50',
      border: 'border-gray-200',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      badgeColor: 'bg-gray-100 text-gray-800'
    }
  };

  const style = statusStyles[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`bg-white rounded-xl p-6 border ${style.border} ${style.bg} transition-all duration-300 hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${style.iconBg}`}>
          <Icon className={`h-5 w-5 ${style.iconColor}`} />
        </div>
        {badge && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      {action && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={action.onClick}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {action.label} →
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Card;