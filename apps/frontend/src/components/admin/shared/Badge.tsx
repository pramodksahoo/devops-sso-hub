import React from 'react';
import { statusColors } from './designSystem';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  icon?: React.ElementType;
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  rounded = true,
  icon: Icon,
  pulse = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const roundedClass = rounded ? 'rounded-full' : 'rounded-md';
  const pulseClass = pulse ? 'animate-pulse' : '';
  const colors = statusColors[variant];

  return (
    <span
      className={`
        inline-flex items-center font-medium border
        ${sizeClasses[size]}
        ${roundedClass}
        ${pulseClass}
        ${colors.badge}
        ${className}
      `}
    >
      {Icon && (
        <Icon className={`
          ${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}
          ${children ? 'mr-1' : ''}
          ${colors.icon}
        `} />
      )}
      {children}
    </span>
  );
};

// Specialized badge variants
export const StatusBadge: React.FC<{
  status: 'active' | 'inactive' | 'warning' | 'error' | 'pending';
  text?: string;
  size?: 'sm' | 'md';
}> = ({ status, text, size = 'sm' }) => {
  const statusConfig = {
    active: { variant: 'success' as const, text: text || 'Active', icon: '●' },
    inactive: { variant: 'neutral' as const, text: text || 'Inactive', icon: '●' },
    warning: { variant: 'warning' as const, text: text || 'Warning', icon: '⚠' },
    error: { variant: 'error' as const, text: text || 'Error', icon: '✕' },
    pending: { variant: 'info' as const, text: text || 'Pending', icon: '◐' }
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </Badge>
  );
};

export const TrendBadge: React.FC<{
  trend: 'up' | 'down' | 'stable';
  value?: string | number;
  showIcon?: boolean;
}> = ({ trend, value, showIcon = true }) => {
  const trendConfig = {
    up: { variant: 'success' as const, icon: '↗', color: 'text-green-600' },
    down: { variant: 'error' as const, icon: '↘', color: 'text-red-600' },
    stable: { variant: 'neutral' as const, icon: '→', color: 'text-gray-600' }
  };

  const config = trendConfig[trend];

  return (
    <Badge variant={config.variant} size="sm">
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {value && value}
    </Badge>
  );
};

export const CountBadge: React.FC<{
  count: number;
  max?: number;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}> = ({ count, max, variant }) => {
  let badgeVariant = variant;
  
  if (!variant && max) {
    if (count === 0) badgeVariant = 'success';
    else if (count < max * 0.5) badgeVariant = 'warning';
    else badgeVariant = 'error';
  }

  return (
    <Badge variant={badgeVariant || 'neutral'} size="sm" rounded>
      {count}
      {max && ` / ${max}`}
    </Badge>
  );
};

export default Badge;