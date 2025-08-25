import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';

// Mock the useAuth hook
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Test Admin',
      email: 'admin@example.com',
      roles: ['admin'],
      groups: ['admins'],
      sub: 'admin-user-123'
    }
  })
}));

describe('Sidebar Component', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display SSO Hub branding with v1.0.0', () => {
    render(<Sidebar currentView="dashboard" onNavigate={mockOnNavigate} />);
    
    expect(screen.getByText('SSO Hub')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  test('should show Shield logo', () => {
    render(<Sidebar currentView="dashboard" onNavigate={mockOnNavigate} />);
    
    // The Shield icon should be present (we can check for the icon container)
    const shieldContainer = screen.getByTestId('shield-logo') || 
                          document.querySelector('[data-testid="shield-logo"]');
    expect(shieldContainer).toBeInTheDocument();
  });

  test('should organize navigation into Tools, Admin, Account sections', () => {
    render(<Sidebar currentView="dashboard" onNavigate={mockOnNavigate} />);
    
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  test('should show admin section for admin users', () => {
    render(<Sidebar currentView="dashboard" onNavigate={mockOnNavigate} />);
    
    // Admin section should be visible
    expect(screen.getByText('System Configuration')).toBeInTheDocument();
    expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
    expect(screen.getByText('Audit & Compliance')).toBeInTheDocument();
    expect(screen.getByText('Webhook Management')).toBeInTheDocument();
    expect(screen.getByText('LDAP Management')).toBeInTheDocument();
    expect(screen.getByText('User Provisioning')).toBeInTheDocument();
  });

  test('should handle sidebar collapse/expand', () => {
    render(<Sidebar currentView="dashboard" onNavigate={mockOnNavigate} />);
    
    const collapseButton = screen.getByLabelText('Collapse sidebar');
    expect(collapseButton).toBeInTheDocument();
    
    fireEvent.click(collapseButton);
    
    // After collapse, the button should show expand label
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  test('should navigate when clicking on navigation items', () => {
    render(<Sidebar currentView="dashboard" onNavigate={mockOnNavigate} />);
    
    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);
    
    expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
  });

  test('should show current view as active', () => {
    render(<Sidebar currentView="launchpad" onNavigate={mockOnNavigate} />);
    
    const launchpadButton = screen.getByText('Tool Launchpad');
    expect(launchpadButton).toHaveAttribute('aria-current', 'page');
  });

  test('should display all tool navigation items', () => {
    render(<Sidebar currentView="dashboard" onNavigate={mockOnNavigate} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tool Launchpad')).toBeInTheDocument();
    expect(screen.getByText('Tool Management')).toBeInTheDocument();
    expect(screen.getByText('System Health')).toBeInTheDocument();
  });

  test('should handle keyboard navigation', () => {
    render(<Sidebar currentView="dashboard" onNavigate={mockOnNavigate} />);
    
    const sidebar = screen.getByRole('navigation');
    
    // Test arrow key navigation
    fireEvent.keyDown(sidebar, { key: 'ArrowDown' });
    fireEvent.keyDown(sidebar, { key: 'Enter' });
    
    // Should navigate to the next item
    expect(mockOnNavigate).toHaveBeenCalled();
  });
});
