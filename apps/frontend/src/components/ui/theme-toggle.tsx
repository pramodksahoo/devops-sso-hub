import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  variant?: 'default' | 'minimal' | 'pill' | 'floating';
  size?: 'sm' | 'default' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'default',
  size = 'default',
  showLabels = false,
  className,
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const variants = {
    default: "bg-background border border-border shadow-soft hover:shadow-medium",
    minimal: "bg-transparent border-none shadow-none hover:bg-muted/50",
    pill: "bg-muted border-none rounded-full shadow-soft hover:shadow-medium",
    floating: "bg-background/80 backdrop-blur-md border border-border/50 shadow-large rounded-full",
  };

  const sizes = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className={iconSizes[size]} />;
      case 'dark':
        return <Moon className={iconSizes[size]} />;
      case 'system':
        return <Monitor className={iconSizes[size]} />;
      default:
        return <Sun className={iconSizes[size]} />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  const handleThemeChange = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  if (variant === 'minimal') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleThemeChange}
        className={cn("relative", className)}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {getThemeIcon()}
        </motion.div>
        {showLabels && (
          <span className="sr-only">{getThemeLabel()}</span>
        )}
      </Button>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={cn("flex items-center rounded-full p-1", variants[variant], className)}>
        {(['light', 'dark', 'system'] as const).map((themeOption) => (
          <Button
            key={themeOption}
            variant={theme === themeOption ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTheme(themeOption)}
            className={cn(
              "rounded-full transition-all duration-200",
              theme === themeOption && "shadow-soft"
            )}
          >
            {themeOption === 'light' && <Sun className="h-4 w-4" />}
            {themeOption === 'dark' && <Moon className="h-4 w-4" />}
            {themeOption === 'system' && <Monitor className="h-4 w-4" />}
            {showLabels && (
              <span className="ml-2 text-xs capitalize">{themeOption}</span>
            )}
          </Button>
        ))}
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <motion.div
        className={cn(
          "fixed bottom-6 right-6 z-50",
          variants[variant],
          sizes[size],
          className
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleThemeChange}
          className="h-full w-full rounded-full"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {getThemeIcon()}
          </motion.div>
        </Button>
      </motion.div>
    );
  }

  // Default variant
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleThemeChange}
      className={cn(
        "relative overflow-hidden",
        variants[variant],
        sizes[size],
        className
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {getThemeIcon()}
      </motion.div>
      
      {/* Theme indicator dot */}
      <motion.div
        className={cn(
          "absolute bottom-1 right-1 h-2 w-2 rounded-full",
          resolvedTheme === 'dark' ? 'bg-primary' : 'bg-primary/60'
        )}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      />
      
      {showLabels && (
        <span className="sr-only">{getThemeLabel()}</span>
      )}
    </Button>
  );
};

export default ThemeToggle;
