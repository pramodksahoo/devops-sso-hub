import axios from 'axios';
import { config } from '../../config/environment';

// Types for audit service data
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure' | 'error';
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: 'login_failure' | 'suspicious_activity' | 'privilege_escalation' | 'data_access' | 'configuration_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  description: string;
  riskScore: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  metadata: Record<string, any>;
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  timeRange: {
    start: string;
    end: string;
  };
  auditSummary: {
    totalEvents: number;
    successfulLogins: number;
    failedLogins: number;
    configurationChanges: number;
    securityEvents: number;
  };
  complianceStatus: {
    overall: 'compliant' | 'non_compliant' | 'needs_review';
    policies: PolicyCompliance[];
  };
  recommendations: string[];
}

export interface PolicyCompliance {
  policyName: string;
  status: 'compliant' | 'non_compliant' | 'warning';
  violations: number;
  description: string;
}

export interface AuditDashboardData {
  recentEvents: AuditLog[];
  securityAlerts: SecurityEvent[];
  complianceOverview: {
    status: 'good' | 'warning' | 'critical';
    score: number;
    lastAudit: string;
  };
  statistics: {
    totalEvents: number;
    todayEvents: number;
    failureRate: number;
    riskEvents: number;
  };
}

class AuditService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = config.services.audit;
    this.apiKey = 'admin-api-key-change-in-production';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'X-User-Role': 'admin'
    };
  }

  /**
   * Get audit dashboard data
   */
  async getAuditDashboardData(): Promise<AuditDashboardData> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/audit/dashboard`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch audit dashboard data:', error);
      return this.getFallbackAuditDashboardData();
    }
  }

  /**
   * Get recent audit logs
   */
  async getRecentAuditLogs(limit: number = 10): Promise<AuditLog[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/audit/logs`, {
        headers: this.getHeaders(),
        params: { limit, sort: 'desc' },
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch recent audit logs:', error);
      return this.getFallbackAuditLogs();
    }
  }

  /**
   * Get security events and alerts
   */
  async getSecurityEvents(resolved: boolean = false): Promise<SecurityEvent[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/audit/security-events`, {
        headers: this.getHeaders(),
        params: { resolved },
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch security events:', error);
      return this.getFallbackSecurityEvents();
    }
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(timeRange: '24h' | '7d' | '30d' = '30d'): Promise<ComplianceReport> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/audit/compliance`, {
        headers: this.getHeaders(),
        params: { timeRange },
        withCredentials: true,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch compliance report:', error);
      return this.getFallbackComplianceReport();
    }
  }

  /**
   * Search audit logs with filters
   */
  async searchAuditLogs(filters: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    action?: string;
    outcome?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/audit/search`, {
        headers: this.getHeaders(),
        params: filters,
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to search audit logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Resolve security event
   */
  async resolveSecurityEvent(eventId: string, resolution: string): Promise<boolean> {
    try {
      await axios.patch(`${this.baseUrl}/api/audit/security-events/${eventId}/resolve`, 
        { resolution },
        {
          headers: this.getHeaders(),
          withCredentials: true,
          timeout: 5000
        }
      );

      return true;
    } catch (error) {
      console.error(`Failed to resolve security event ${eventId}:`, error);
      return false;
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(format: 'csv' | 'json', filters?: Record<string, any>) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/audit/export`, {
        headers: this.getHeaders(),
        params: { format, ...filters },
        responseType: format === 'csv' ? 'blob' : 'json',
        withCredentials: true,
        timeout: 15000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics for dashboard widgets
   */
  async getAuditStatistics() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/audit/statistics`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch audit statistics:', error);
      return {
        totalEvents: 1247,
        todayEvents: 89,
        failureRate: 2.3,
        riskEvents: 5,
        complianceScore: 92,
        lastAudit: new Date().toISOString()
      };
    }
  }

  /**
   * Fallback data for development/offline scenarios
   */
  private getFallbackAuditDashboardData(): AuditDashboardData {
    return {
      recentEvents: this.getFallbackAuditLogs(),
      securityAlerts: this.getFallbackSecurityEvents(),
      complianceOverview: {
        status: 'good',
        score: 92,
        lastAudit: new Date().toISOString()
      },
      statistics: {
        totalEvents: 1247,
        todayEvents: 89,
        failureRate: 2.3,
        riskEvents: 5
      }
    };
  }

  private getFallbackAuditLogs(): AuditLog[] {
    const now = new Date();
    
    return [
      {
        id: '1',
        timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
        userId: 'user123',
        userName: 'John Doe',
        userEmail: 'john.doe@company.com',
        action: 'LOGIN',
        resource: 'Jenkins',
        outcome: 'success',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: 'sess_abc123',
        details: { tool: 'jenkins', method: 'oidc' },
        severity: 'low'
      },
      {
        id: '2',
        timestamp: new Date(now.getTime() - 10 * 60000).toISOString(),
        userId: 'user456',
        userName: 'Jane Smith',
        userEmail: 'jane.smith@company.com',
        action: 'CONFIGURATION_CHANGE',
        resource: 'Tool Settings',
        resourceId: 'gitlab-config',
        outcome: 'success',
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        details: { tool: 'gitlab', changes: ['scopes', 'redirectUri'] },
        severity: 'medium'
      },
      {
        id: '3',
        timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
        userId: 'user789',
        userName: 'Bob Wilson',
        userEmail: 'bob.wilson@company.com',
        action: 'LOGIN_FAILURE',
        resource: 'SonarQube',
        outcome: 'failure',
        ipAddress: '192.168.1.110',
        userAgent: 'Mozilla/5.0 (Linux; Ubuntu 20.04)',
        details: { reason: 'invalid_credentials', attempts: 3 },
        severity: 'high'
      }
    ];
  }

  private getFallbackSecurityEvents(): SecurityEvent[] {
    const now = new Date();
    
    return [
      {
        id: 'sec1',
        timestamp: new Date(now.getTime() - 30 * 60000).toISOString(),
        eventType: 'suspicious_activity',
        severity: 'medium',
        userId: 'user789',
        ipAddress: '192.168.1.110',
        description: 'Multiple failed login attempts detected',
        riskScore: 65,
        resolved: false,
        metadata: { tool: 'sonarqube', attempts: 5, timeframe: '15min' }
      },
      {
        id: 'sec2',
        timestamp: new Date(now.getTime() - 120 * 60000).toISOString(),
        eventType: 'configuration_change',
        severity: 'low',
        userId: 'admin',
        ipAddress: '192.168.1.1',
        description: 'Tool configuration modified outside business hours',
        riskScore: 25,
        resolved: true,
        resolvedBy: 'admin@sso-hub.local',
        resolvedAt: new Date(now.getTime() - 60 * 60000).toISOString(),
        metadata: { tool: 'jenkins', changes: 'health_check_settings' }
      }
    ];
  }

  private getFallbackComplianceReport(): ComplianceReport {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      reportId: 'comp_' + Date.now(),
      generatedAt: now.toISOString(),
      timeRange: {
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString()
      },
      auditSummary: {
        totalEvents: 1247,
        successfulLogins: 1189,
        failedLogins: 35,
        configurationChanges: 12,
        securityEvents: 11
      },
      complianceStatus: {
        overall: 'compliant',
        policies: [
          {
            policyName: 'Access Control Policy',
            status: 'compliant',
            violations: 0,
            description: 'All access attempts are properly logged and authorized'
          },
          {
            policyName: 'Configuration Management',
            status: 'compliant',
            violations: 0,
            description: 'Configuration changes are tracked and approved'
          },
          {
            policyName: 'Incident Response',
            status: 'warning',
            violations: 2,
            description: 'Some security events pending resolution'
          }
        ]
      },
      recommendations: [
        'Review and resolve pending security events',
        'Consider implementing automated response for low-risk events',
        'Schedule regular compliance reviews'
      ]
    };
  }
}

export const auditService = new AuditService();
export default auditService;