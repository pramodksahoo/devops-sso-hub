import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LayoutDashboard, Rocket, Wrench, HeartPulse, Link2, Search, BarChart3, Users, User, ChevronLeft, ChevronRight, Lock, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { footerVersion } from '../../config/version';

type ViewType = 'dashboard' | 'tools' | 'profile' | 'admin' | 'admin-tools' | 'launchpad' | 'health' | 'webhooks' | 'audit' | 'analytics' | 'user-management' | 'ldap' | 'provisioning' | 'privacy-policy' | 'terms-conditions' | 'features' | 'integrations' | 'security';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

// Navigation structure with role-based access control
const getNavigationItems = (isAdmin: boolean) => {
  const baseItems: Array<{ key: ViewType; label: string; icon: React.ReactNode; section: 'user-dashboard' | 'workspace' | 'admin-panel' }> = [
    // User Dashboard Section (All authenticated users)
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, section: 'user-dashboard' },
    { key: 'launchpad', label: 'Tool Launchpad', icon: <Rocket className="h-4 w-4" />, section: 'user-dashboard' },
    { key: 'profile', label: 'Account', icon: <User className="h-4 w-4" />, section: 'user-dashboard' },
    
    // Workspace Section (All authenticated users) - Renamed from "Tools"
    { key: 'tools', label: 'Workspace', icon: <Wrench className="h-4 w-4" />, section: 'workspace' },
    { key: 'health', label: 'System Health', icon: <HeartPulse className="h-4 w-4" />, section: 'workspace' },
  ];

  const adminItems: Array<{ key: ViewType; label: string; icon: React.ReactNode; section: 'user-dashboard' | 'workspace' | 'admin-panel' }> = isAdmin ? [
    // Administrative Panel Section (Admin only)
    { key: 'admin-tools', label: 'Tool Management', icon: <Settings className="h-4 w-4" />, section: 'admin-panel' },
    { key: 'webhooks', label: 'Webhook Management', icon: <Link2 className="h-4 w-4" />, section: 'admin-panel' },
    { key: 'audit', label: 'Audit & Compliance', icon: <Search className="h-4 w-4" />, section: 'admin-panel' },
    { key: 'analytics', label: 'Analytics & Reports', icon: <BarChart3 className="h-4 w-4" />, section: 'admin-panel' },
    { key: 'user-management', label: 'User Management', icon: <Users className="h-4 w-4" />, section: 'admin-panel' },
    { key: 'ldap', label: 'LDAP Management', icon: <Users className="h-4 w-4" />, section: 'admin-panel' },
    { key: 'provisioning', label: 'User Provisioning', icon: <Lock className="h-4 w-4" />, section: 'admin-panel' },
  ] : [];

  return [...baseItems, ...adminItems];
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { isAdmin } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(true);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(true);
  
  const userDashboardRefs = useRef<HTMLButtonElement[]>([]);
  const workspaceRefs = useRef<HTMLButtonElement[]>([]);
  const adminPanelRefs = useRef<HTMLButtonElement[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const navItems = getNavigationItems(isAdmin);

  useEffect(() => {
    // sync activeIndex with currentView among visible items
    const visible = navItems.filter(n => n.section === 'user-dashboard').concat(
      navItems.filter(n => n.section === 'workspace'),
      isAdmin && isAdminPanelOpen ? navItems.filter(n => n.section === 'admin-panel') : []
    );
    const idx = visible.findIndex(n => n.key === currentView);
    if (idx >= 0) setActiveIndex(idx);
  }, [currentView, isAdmin, isAdminPanelOpen, navItems]);

  const itemClass = (active: boolean) => cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
    active
      ? 'bg-primary/10 text-primary-700 dark:text-primary-300'
      : 'text-secondary-600 hover:bg-muted hover:text-foreground dark:text-neutral-300 dark:hover:bg-neutral-800'
  );

  const handleKeyNav = useCallback((e: React.KeyboardEvent) => {
    const all = navItems.filter(n => n.section === 'user-dashboard').concat(
      navItems.filter(n => n.section === 'workspace'),
      isAdmin && isAdminPanelOpen ? navItems.filter(n => n.section === 'admin-panel') : []
    );
    const total = all.length;
    if (total === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + total) % total);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(total - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = all[activeIndex];
      if (target) onNavigate(target.key);
    }
  }, [activeIndex, isAdmin, isAdminPanelOpen, onNavigate, navItems]);

  useEffect(() => {
    // focus roving index among concrete refs
    const userDashboard = navItems.filter(n => n.section === 'user-dashboard');
    const workspace = navItems.filter(n => n.section === 'workspace');
    const adminPanel = navItems.filter(n => n.section === 'admin-panel');
    const allRefs: HTMLButtonElement[] = [
      ...userDashboardRefs.current.slice(0, userDashboard.length),
      ...workspaceRefs.current.slice(0, workspace.length),
      ...(isAdmin && isAdminPanelOpen ? adminPanelRefs.current.slice(0, adminPanel.length) : [])
    ];
    const el = allRefs[activeIndex];
    if (el) el.focus();
  }, [activeIndex, isAdmin, isAdminPanelOpen, navItems]);

  return (
    <aside className={cn('hidden md:flex h-screen sticky top-0 border-r bg-background/80 backdrop-blur-md shadow-soft z-40', isCollapsed ? 'w-20' : 'w-64')}>
      <div className="flex flex-col w-full" onKeyDown={handleKeyNav}>
        {/* Brand */}
        <div className="h-16 border-b px-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold">SSO Hub</h1>
              <p className="text-xs text-muted-foreground">v1.0.0</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4" aria-label="Main Navigation">
          {/* User Dashboard Section - All authenticated users */}
          <div>
            <button
              onClick={() => setIsUserDashboardOpen(!isUserDashboardOpen)}
              className={cn('w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground font-semibold', isCollapsed && 'justify-center')}
              aria-expanded={isUserDashboardOpen}
            >
              {!isCollapsed && <span>User Dashboard</span>}
              {!isCollapsed && (
                <motion.span animate={{ rotate: isUserDashboardOpen ? 0 : -90 }}>
                  <ChevronLeft className="h-3 w-3" />
                </motion.span>
              )}
            </button>
            <AnimatePresence initial={false}>
              {isUserDashboardOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-1 space-y-1"
                >
                  {navItems.filter(n => n.section === 'user-dashboard').map((item, idx) => (
                    <button
                      key={item.key}
                      ref={el => { if (el) userDashboardRefs.current[idx] = el; }}
                      onClick={() => onNavigate(item.key)}
                      className={itemClass(currentView === item.key)}
                      tabIndex={idx === activeIndex ? 0 : -1}
                      aria-current={currentView === item.key ? 'page' : undefined}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Workspace Section - All authenticated users (renamed from "Tools") */}
          <div>
            <button
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              className={cn('w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground font-semibold', isCollapsed && 'justify-center')}
              aria-expanded={isWorkspaceOpen}
            >
              {!isCollapsed && <span>Workspace</span>}
              {!isCollapsed && (
                <motion.span animate={{ rotate: isWorkspaceOpen ? 0 : -90 }}>
                  <ChevronLeft className="h-3 w-3" />
                </motion.span>
              )}
            </button>
            <AnimatePresence initial={false}>
              {isWorkspaceOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-1 space-y-1"
                >
                  {navItems.filter(n => n.section === 'workspace').map((item, idx) => {
                    const globalIdx = navItems.filter(n => n.section === 'user-dashboard').length + idx;
                    return (
                      <button
                        key={item.key}
                        ref={el => { if (el) workspaceRefs.current[idx] = el; }}
                        onClick={() => onNavigate(item.key)}
                        className={itemClass(currentView === item.key)}
                        tabIndex={globalIdx === activeIndex ? 0 : -1}
                        aria-current={currentView === item.key ? 'page' : undefined}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Administrative Panel Section - Only show for admin users */}
          {isAdmin && (
            <div>
              <button
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                className={cn('w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground font-semibold', isCollapsed && 'justify-center')}
                aria-expanded={isAdminPanelOpen}
              >
                {!isCollapsed && <span>Admin Panel</span>}
                {!isCollapsed && (
                  <motion.span animate={{ rotate: isAdminPanelOpen ? 0 : -90 }}>
                    <ChevronLeft className="h-3 w-3" />
                  </motion.span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {isAdminPanelOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-1 space-y-1"
                  >
                    {navItems.filter(n => n.section === 'admin-panel').map((item, idx) => {
                      const globalIdx = navItems.filter(n => n.section === 'user-dashboard').length + 
                                      navItems.filter(n => n.section === 'workspace').length + idx;
                      return (
                        <button
                          key={item.key}
                          ref={el => { if (el) adminPanelRefs.current[idx] = el; }}
                          onClick={() => onNavigate(item.key)}
                          className={itemClass(currentView === item.key)}
                          tabIndex={globalIdx === activeIndex ? 0 : -1}
                          aria-current={currentView === item.key ? 'page' : undefined}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t text-xs text-muted-foreground">
          {!isCollapsed && <div>{footerVersion}</div>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
