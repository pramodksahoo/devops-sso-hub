import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, ArrowRight } from 'lucide-react';
import { Button } from '../ui';
import { ThemeToggle } from '../ui/theme-toggle';
import { useAuth } from '../../contexts/AuthContext';

const PublicHeader = memo(() => {
  const { login } = useAuth();

  const handleLogin = useCallback(() => {
    login();
  }, [login]);

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
      aria-label="Site header"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center space-x-3"
          >
            <a href="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg" role="img" aria-label="SSO Hub logo">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">SSO Hub</h1>
            </a>
          </motion.div>

          {/* Right side - Theme Toggle and Sign In Button */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center space-x-4"
          >
            <ThemeToggle variant="minimal" />
            
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0 min-w-[180px]"
              aria-label="Sign in with Single Sign-On authentication"
            >
              <Lock className="w-5 h-5 mr-3" aria-hidden="true" />
              Sign in with SSO
              <ArrowRight className="w-5 h-5 ml-3" aria-hidden="true" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
});

PublicHeader.displayName = 'PublicHeader';

export default PublicHeader;