import { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SimplePermissionProvider } from './contexts/SimplePermissionContext';
import { ToolProvider } from './contexts/ToolContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserContextProvider } from './contexts/UserContextProvider';
import { Header, Sidebar, Breadcrumbs } from './components/layout';
import { FullScreenLoading } from './components/ui';

// Lazy-loaded pages for performance
const ModernDashboard = lazy(() => import('./pages/ModernDashboard').then(m => ({ default: m.ModernDashboard })));
const ToolGrid = lazy(() => import('./pages/ToolGrid').then(m => ({ default: m.default })));
const UserProfile = lazy(() => import('./pages/UserProfile').then(m => ({ default: m.default })));
const AdminToolManagement = lazy(() => import('./pages/AdminToolManagement').then(m => ({ default: m.default })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.default })));
const ToolLaunchpad = lazy(() => import('./pages/ToolLaunchpad').then(m => ({ default: m.ToolLaunchpad })));
const HealthDashboard = lazy(() => import('./pages/HealthDashboard').then(m => ({ default: m.HealthDashboard })));
const WebhookDashboard = lazy(() => import('./pages/WebhookDashboard').then(m => ({ default: m.WebhookDashboard })));
const AuditDashboard = lazy(() => import('./pages/AuditDashboard').then(m => ({ default: m.AuditDashboard })));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const UserManagement = lazy(() => import('./pages/UserManagement').then(m => ({ default: m.default })));
const LDAPDashboard = lazy(() => import('./pages/LDAPDashboard').then(m => ({ default: m.LDAPDashboard })));
const ProvisioningDashboard = lazy(() => import('./pages/ProvisioningDashboard').then(m => ({ default: m.ProvisioningDashboard })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.default })));
const TermsConditions = lazy(() => import('./pages/TermsConditions').then(m => ({ default: m.default })));
const Features = lazy(() => import('./pages/Features').then(m => ({ default: m.default })));
const Integrations = lazy(() => import('./pages/Integrations').then(m => ({ default: m.default })));
const Security = lazy(() => import('./pages/Security').then(m => ({ default: m.default })));

type ViewType = 'dashboard' | 'tools' | 'profile' | 'admin' | 'admin-tools' | 'launchpad' | 'health' | 'webhooks' | 'audit' | 'analytics' | 'user-management' | 'ldap' | 'provisioning' | 'privacy-policy' | 'terms-conditions' | 'features' | 'integrations' | 'security';

// Helper function to get view from URL
const getViewFromUrl = (path: string): ViewType => {
  const pathToView: Record<string, ViewType> = {
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/tools': 'tools',
    '/profile': 'profile',
    '/admin': 'admin',
    '/admin-tools': 'admin-tools',
    '/launchpad': 'launchpad',
    '/health': 'health',
    '/webhooks': 'webhooks',
    '/audit': 'audit',
    '/analytics': 'analytics',
    '/user-management': 'user-management',
    '/ldap': 'ldap',
    '/provisioning': 'provisioning',
    '/privacy-policy': 'privacy-policy',
    '/terms-conditions': 'terms-conditions',
    '/features': 'features',
    '/integrations': 'integrations',
    '/security': 'security'
  };
  
  return pathToView[path] || 'dashboard';
};

function App() {
  // Initialize view from URL immediately
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const initialView = getViewFromUrl(window.location.pathname);
    console.log('🔍 APP INIT - Initial view from URL:', window.location.pathname, '->', initialView);
    return initialView;
  });

  // Initialize view from URL on app load
  useEffect(() => {
    const path = window.location.pathname;
    const viewFromUrl = getViewFromUrl(path);
    
    console.log('🔍 APP USEEFFECT - Setting view from URL:', path, '->', viewFromUrl);
    setCurrentView(viewFromUrl);
    
    if (!Object.keys({
      '/': 'dashboard',
      '/dashboard': 'dashboard',
      '/tools': 'tools',
      '/profile': 'profile',
      '/admin': 'admin',
      '/admin-tools': 'admin-tools',
      '/launchpad': 'launchpad',
      '/health': 'health',
      '/webhooks': 'webhooks',
      '/audit': 'audit',
      '/analytics': 'analytics',
      '/user-management': 'user-management',
      '/ldap': 'ldap',
      '/provisioning': 'provisioning',
      '/privacy-policy': 'privacy-policy',
      '/terms-conditions': 'terms-conditions',
      '/features': 'features',
      '/integrations': 'integrations',
      '/security': 'security'
    }).includes(path)) {
      // Only redirect unknown paths
      console.log('🔍 APP USEEFFECT - Unknown path, redirecting to dashboard');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  // Handle navigation with URL updates
  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
    const viewToPath: Record<ViewType, string> = {
      'dashboard': '/dashboard',
      'tools': '/tools',
      'profile': '/profile',
      'admin': '/admin',
      'admin-tools': '/admin-tools',
      'launchpad': '/launchpad',
      'health': '/health',
      'webhooks': '/webhooks',
      'audit': '/audit',
      'analytics': '/analytics',
      'user-management': '/user-management',
      'ldap': '/ldap',
      'provisioning': '/provisioning',
      'privacy-policy': '/privacy-policy',
      'terms-conditions': '/terms-conditions',
      'features': '/features',
      'integrations': '/integrations',
      'security': '/security'
    };
    
    const newPath = viewToPath[view];
    window.history.pushState({}, '', newPath);
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const pathToView: Record<string, ViewType> = {
        '/': 'dashboard',
        '/dashboard': 'dashboard',
        '/tools': 'tools',
        '/profile': 'profile',
        '/admin': 'admin',
        '/admin-tools': 'admin-tools',
        '/launchpad': 'launchpad',
        '/health': 'health',
        '/webhooks': 'webhooks',
        '/audit': 'audit',
        '/analytics': 'analytics',
        '/ldap': 'ldap',
        '/provisioning': 'provisioning',
        '/privacy-policy': 'privacy-policy',
        '/terms-conditions': 'terms-conditions',
        '/features': 'features',
        '/integrations': 'integrations',
        '/security': 'security'
      };
      
      const viewFromUrl = pathToView[path] || 'dashboard';
      setCurrentView(viewFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SimplePermissionProvider>
          <UserContextProvider>
            <ToolProvider>
              <AuthWrapper currentView={currentView} onNavigate={handleNavigate} />
            </ToolProvider>
          </UserContextProvider>
        </SimplePermissionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

interface AuthWrapperProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

function AuthWrapper({ currentView, onNavigate }: AuthWrapperProps) {
  const { user, isLoading } = useAuth();

  console.log('🔍 AUTHWRAPPER DEBUG - Auth state:', {
    hasUser: !!user,
    userEmail: user?.email,
    isLoading,
    currentView,
    currentURL: window.location.href
  });

  if (isLoading) {
    console.log('🔍 AUTHWRAPPER DEBUG - Still loading, showing loading screen');
    return <FullScreenLoading text="Loading SSO Hub..." />;
  }

  if (!user) {
    console.log('🔍 AUTHWRAPPER DEBUG - No user, showing appropriate page for view:', currentView);
    
    // Public pages that don't require authentication
    const publicPages: ViewType[] = ['privacy-policy', 'terms-conditions', 'features', 'integrations', 'security'];
    if (publicPages.includes(currentView)) {
      return (
        <Suspense fallback={<FullScreenLoading text="Loading..." />}> 
          {currentView === 'privacy-policy' && <PrivacyPolicy />}
          {currentView === 'terms-conditions' && <TermsConditions />}
          {currentView === 'features' && <Features />}
          {currentView === 'integrations' && <Integrations />}
          {currentView === 'security' && <Security />}
        </Suspense>
      );
    }
    
    // Demo pages that can be viewed without authentication (with limited functionality)
    const demoPages: ViewType[] = ['tools'];
    if (demoPages.includes(currentView)) {
      console.log('🔍 AUTHWRAPPER DEBUG - Showing demo page with layout for:', currentView);
      return (
        <div className="app min-h-screen bg-background text-foreground">
          <div className="flex">
            <Sidebar currentView={currentView} onNavigate={onNavigate} />
            <div className="flex-1 flex flex-col">
              <Header onNavigate={onNavigate} currentView={currentView} />
              <main className="main-content flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Breadcrumbs currentView={currentView} className="mb-4" />
                <Suspense fallback={<FullScreenLoading text="Loading page..." />}> 
                  {currentView === 'tools' && <ToolGrid />}
                </Suspense>
              </main>
            </div>
          </div>
        </div>
      );
    }
    
    // Show HomePage when not authenticated and not a demo page
    console.log('🔍 AUTHWRAPPER DEBUG - No user, showing HomePage');
    return (
      <Suspense fallback={<FullScreenLoading text="Loading..." />}> 
        <HomePage />
      </Suspense>
    );
  }

  console.log('🔍 AUTHWRAPPER DEBUG - User authenticated, showing dashboard layout for view:', currentView);
  // Show authenticated app with Header when user is logged in
  return (
    <div className="app min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar currentView={currentView} onNavigate={onNavigate} />
        <div className="flex-1 flex flex-col">
          <Header onNavigate={onNavigate} currentView={currentView} />
          <main className="main-content flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Breadcrumbs currentView={currentView} className="mb-4" />
            <Suspense fallback={<FullScreenLoading text="Loading page..." />}> 
              {currentView === 'dashboard' && <ModernDashboard onNavigate={(view) => onNavigate(view as ViewType)} />}
              {currentView === 'tools' && <ToolGrid />}
              {currentView === 'profile' && <UserProfile />}
              {currentView === 'admin' && <ModernDashboard onNavigate={(view) => onNavigate(view as ViewType)} />}
              {currentView === 'admin-tools' && <AdminToolManagement onNavigate={onNavigate} />}
              {currentView === 'launchpad' && <ToolLaunchpad />}
              {currentView === 'health' && <HealthDashboard />}
              {currentView === 'webhooks' && <WebhookDashboard />}
              {currentView === 'audit' && <AuditDashboard />}
              {currentView === 'analytics' && <AnalyticsDashboard />}
              {currentView === 'user-management' && <UserManagement />}
              {currentView === 'ldap' && <LDAPDashboard />}
              {currentView === 'provisioning' && <ProvisioningDashboard />}
              {currentView === 'privacy-policy' && <PrivacyPolicy />}
              {currentView === 'terms-conditions' && <TermsConditions />}
              {currentView === 'features' && <Features />}
              {currentView === 'integrations' && <Integrations />}
              {currentView === 'security' && <Security />}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
