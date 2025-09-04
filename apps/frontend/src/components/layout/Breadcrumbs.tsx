import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BreadcrumbsProps {
  currentView: 'dashboard' | 'tools' | 'profile' | 'admin' | 'admin-tools' | 'launchpad' | 'health' | 'webhooks' | 'audit' | 'analytics' | 'user-management' | 'ldap' | 'provisioning' | 'privacy-policy' | 'terms-conditions' | 'features' | 'integrations' | 'security';
  className?: string;
}

const labels: Record<BreadcrumbsProps['currentView'], string[]> = {
  dashboard: ['Home', 'Dashboard'],
  tools: ['Home', 'Tools'],
  profile: ['Home', 'Profile'],
  admin: ['Home', 'Administration'],
  'admin-tools': ['Home', 'Administration', 'Tools'],
  launchpad: ['Home', 'Launchpad'],
  health: ['Home', 'Health'],
  webhooks: ['Home', 'Webhooks'],
  audit: ['Home', 'Audit'],
  analytics: ['Home', 'Analytics'],
  'user-management': ['Home', 'Administration', 'User Management'],
  ldap: ['Home', 'Administration', 'LDAP'],
  provisioning: ['Home', 'Administration', 'Provisioning'],
  'privacy-policy': ['Privacy Policy'],
  'terms-conditions': ['Terms & Conditions'],
  features: ['Features'],
  integrations: ['Integrations'],
  security: ['Security'],
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentView, className }) => {
  const segments = labels[currentView] || ['Home'];
  return (
    <nav className={cn('text-sm text-muted-foreground', className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {segments.map((seg, idx) => (
          <li key={`${seg}-${idx}`} className="flex items-center">
            <span className={cn('px-1', idx === segments.length - 1 && 'text-foreground font-medium')}>{seg}</span>
            {idx < segments.length - 1 && <ChevronRight className="h-4 w-4 opacity-50" />}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
