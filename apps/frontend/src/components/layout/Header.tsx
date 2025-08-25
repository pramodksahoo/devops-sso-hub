import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Bell, 
  Settings, 
  LogOut, 
  User,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ThemeToggle } from '../ui';

interface HeaderProps {
  onNavigate: (view: 'dashboard' | 'tools' | 'profile' | 'admin' | 'admin-tools' | 'launchpad' | 'health' | 'webhooks' | 'audit' | 'analytics' | 'user-management' | 'ldap' | 'provisioning' | 'privacy-policy' | 'terms-conditions' | 'features' | 'integrations' | 'security') => void;
  currentView: 'dashboard' | 'tools' | 'profile' | 'admin' | 'admin-tools' | 'launchpad' | 'health' | 'webhooks' | 'audit' | 'analytics' | 'user-management' | 'ldap' | 'provisioning' | 'privacy-policy' | 'terms-conditions' | 'features' | 'integrations' | 'security';
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentView }) => {
  const { user, logout, isAdmin } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleNavigation = (view: typeof currentView) => {
    onNavigate(view);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-neutral-900/70">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Clean minimal header - no Dashboard text */}
          <div className="flex items-center space-x-4">
            {/* Left side empty for sidebar extension */}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Button */}
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Search className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle variant="minimal" />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <Badge 
                variant="error" 
                size="sm" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs"
              >
                3
              </Badge>
            </Button>

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={user?.name || user?.email} />
                  <AvatarFallback className="bg-primary-100 text-primary-700 text-sm font-medium">
                    {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left max-w-32">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                    {user?.name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isAdmin ? 'Administrator' : user?.roles?.[0] || 'User'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-neutral-800 ring-1 ring-black ring-opacity-5 z-50"
                  >
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-neutral-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {user?.roles?.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleNavigation('profile')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 w-full text-left"
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profile Settings
                      </button>
                      
                      <button
                        onClick={() => handleNavigation('dashboard')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 w-full text-left"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Dashboard
                      </button>
                      
                      <div className="border-t border-gray-200 dark:border-neutral-700">
                        <button
                          onClick={handleLogout}
                          className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
