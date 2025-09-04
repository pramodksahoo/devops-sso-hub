import axios from 'axios';

// Types for health service data
export interface SystemHealth {
  uptime: number;
  responseTime: number;
  activeUsers: number;
  toolsOnline: number;
  lastUpdated: string;
}

export interface ServiceMetrics {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'error';
  uptime: number;
  responseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHealthCheck: string;
}

export interface ToolHealthStatus {
  toolType: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'configuring';
  lastTested: string;
  responseTime?: number;
  uptime?: number;
  errorCount: number;
}

export interface DashboardHealthData {
  system: SystemHealth;
  services: ServiceMetrics[];
  tools: ToolHealthStatus[];
}

class HealthService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_AUTH_BFF_URL || 'http://localhost:3002';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get comprehensive dashboard health data
   */
  async getDashboardHealth(): Promise<DashboardHealthData> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health/dashboard`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard health:', error);
      // Return fallback data for development
      return this.getFallbackHealthData();
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health/system`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      return {
        uptime: 99.8,
        responseTime: 245,
        activeUsers: 127,
        toolsOnline: 8,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get service-level metrics for all microservices
   */
  async getServiceMetrics(): Promise<ServiceMetrics[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health/services`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch service metrics:', error);
      return this.getFallbackServiceMetrics();
    }
  }

  /**
   * Get tool integration health status
   */
  async getToolHealthStatus(): Promise<ToolHealthStatus[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health/integrations`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch tool health status:', error);
      return this.getFallbackToolHealthData();
    }
  }

  /**
   * Get real-time system metrics for the SystemMetricsWidget
   */
  async getSystemMetrics() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health/metrics`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 3000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      return {
        cpu: { usage: 45, trend: 'stable' },
        memory: { usage: 2.1, unit: 'GB', trend: 'up' },
        disk: { io: 120, unit: 'MB/s', trend: 'down' },
        network: { throughput: 45, unit: 'Mbps', trend: 'stable' }
      };
    }
  }

  /**
   * Fallback data for development/offline scenarios
   */
  private getFallbackHealthData(): DashboardHealthData {
    return {
      system: {
        uptime: 99.8,
        responseTime: 245,
        activeUsers: 127,
        toolsOnline: 8,
        lastUpdated: new Date().toISOString()
      },
      services: this.getFallbackServiceMetrics(),
      tools: this.getFallbackToolHealthData()
    };
  }

  private getFallbackServiceMetrics(): ServiceMetrics[] {
    return [
      {
        serviceName: 'auth-bff',
        status: 'healthy',
        uptime: 99.9,
        responseTime: 120,
        errorRate: 0.1,
        memoryUsage: 245,
        cpuUsage: 15,
        lastHealthCheck: new Date().toISOString()
      },
      {
        serviceName: 'catalog',
        status: 'healthy',
        uptime: 99.7,
        responseTime: 180,
        errorRate: 0.2,
        memoryUsage: 180,
        cpuUsage: 22,
        lastHealthCheck: new Date().toISOString()
      },
      {
        serviceName: 'analytics',
        status: 'degraded',
        uptime: 98.5,
        responseTime: 350,
        errorRate: 1.2,
        memoryUsage: 420,
        cpuUsage: 65,
        lastHealthCheck: new Date().toISOString()
      }
    ];
  }

  private getFallbackToolHealthData(): ToolHealthStatus[] {
    return [
      {
        toolType: 'jenkins',
        name: 'Jenkins CI/CD',
        status: 'active',
        lastTested: '2 minutes ago',
        responseTime: 150,
        uptime: 99.8,
        errorCount: 0
      },
      {
        toolType: 'gitlab',
        name: 'GitLab SCM',
        status: 'active',
        lastTested: '5 minutes ago',
        responseTime: 120,
        uptime: 99.9,
        errorCount: 1
      },
      {
        toolType: 'sonarqube',
        name: 'SonarQube',
        status: 'error',
        lastTested: '1 hour ago',
        errorCount: 5
      },
      {
        toolType: 'grafana',
        name: 'Grafana Monitoring',
        status: 'configuring',
        lastTested: 'Never',
        errorCount: 0
      }
    ];
  }
}

export const healthService = new HealthService();
export default healthService;