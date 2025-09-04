import axios from 'axios';
import { config } from '../../config/environment';

// Types for analytics service data
export interface UserActivityData {
  totalUsers: number;
  activeUsers: number;
  newSignups: number;
  averageSessionDuration: number;
  topTools: ToolUsageStats[];
  userGrowth: GrowthMetric[];
  sessionData: SessionMetric[];
}

export interface ToolUsageStats {
  toolName: string;
  toolType: string;
  launches: number;
  uniqueUsers: number;
  averageDuration: number;
  trend: 'up' | 'down' | 'stable';
}

export interface GrowthMetric {
  date: string;
  users: number;
  sessions: number;
  tools: number;
}

export interface SessionMetric {
  date: string;
  sessions: number;
  duration: number;
  bounceRate: number;
}

export interface UserBehaviorAnalytics {
  loginPatterns: LoginPattern[];
  toolPreferences: ToolPreference[];
  userSegments: UserSegment[];
}

export interface LoginPattern {
  hour: number;
  count: number;
  day: string;
}

export interface ToolPreference {
  userId: string;
  toolType: string;
  frequency: number;
  lastUsed: string;
}

export interface UserSegment {
  segment: string;
  count: number;
  percentage: number;
  characteristics: string[];
}

class AnalyticsService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = config.urls.authBff;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get comprehensive user activity data for the dashboard
   */
  async getUserActivityData(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<UserActivityData> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics/users`, {
        headers: this.getHeaders(),
        params: { timeRange },
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch user activity data:', error);
      return this.getFallbackUserActivityData();
    }
  }

  /**
   * Get tool usage statistics and trends
   */
  async getToolUsageStats(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<ToolUsageStats[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics/tools`, {
        headers: this.getHeaders(),
        params: { timeRange },
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch tool usage stats:', error);
      return this.getFallbackToolUsageStats();
    }
  }

  /**
   * Get user behavior analytics for detailed insights
   */
  async getUserBehaviorAnalytics(): Promise<UserBehaviorAnalytics> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics/behavior`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch user behavior analytics:', error);
      return this.getFallbackBehaviorAnalytics();
    }
  }

  /**
   * Get real-time metrics for the UserAnalyticsWidget
   */
  async getRealTimeMetrics() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics/realtime`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 3000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error);
      return {
        activeUsers: 127,
        newSignups: 8,
        averageSession: '24m',
        toolAdoption: 89,
        weeklyTrend: [40, 45, 38, 50, 55, 48, 60]
      };
    }
  }

  /**
   * Get dashboard summary for admin overview
   */
  async getDashboardSummary() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics/dashboard`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
      return {
        totalUsers: 347,
        activeToday: 127,
        toolsConfigured: 8,
        averageSessionTime: '24m',
        topTool: 'Jenkins',
        growthRate: 12.5
      };
    }
  }

  /**
   * Export analytics data as CSV
   */
  async exportAnalyticsData(format: 'csv' | 'json' = 'csv', timeRange: string = '30d') {
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics/export`, {
        headers: this.getHeaders(),
        params: { format, timeRange },
        responseType: format === 'csv' ? 'blob' : 'json',
        withCredentials: true,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      throw error;
    }
  }

  /**
   * Fallback data for development/offline scenarios
   */
  private getFallbackUserActivityData(): UserActivityData {
    return {
      totalUsers: 347,
      activeUsers: 127,
      newSignups: 8,
      averageSessionDuration: 1440, // 24 minutes in seconds
      topTools: this.getFallbackToolUsageStats(),
      userGrowth: [
        { date: '2024-01-15', users: 320, sessions: 450, tools: 8 },
        { date: '2024-01-16', users: 325, sessions: 465, tools: 8 },
        { date: '2024-01-17', users: 330, sessions: 480, tools: 8 },
        { date: '2024-01-18', users: 340, sessions: 495, tools: 8 },
        { date: '2024-01-19', users: 347, sessions: 520, tools: 8 }
      ],
      sessionData: [
        { date: '2024-01-15', sessions: 450, duration: 1380, bounceRate: 25 },
        { date: '2024-01-16', sessions: 465, duration: 1420, bounceRate: 23 },
        { date: '2024-01-17', sessions: 480, duration: 1350, bounceRate: 28 },
        { date: '2024-01-18', sessions: 495, duration: 1480, bounceRate: 21 },
        { date: '2024-01-19', sessions: 520, duration: 1440, bounceRate: 24 }
      ]
    };
  }

  private getFallbackToolUsageStats(): ToolUsageStats[] {
    return [
      {
        toolName: 'Jenkins',
        toolType: 'CI/CD',
        launches: 245,
        uniqueUsers: 87,
        averageDuration: 1800,
        trend: 'up'
      },
      {
        toolName: 'GitLab',
        toolType: 'SCM',
        launches: 198,
        uniqueUsers: 76,
        averageDuration: 2400,
        trend: 'stable'
      },
      {
        toolName: 'SonarQube',
        toolType: 'Quality',
        launches: 156,
        uniqueUsers: 45,
        averageDuration: 900,
        trend: 'up'
      },
      {
        toolName: 'Grafana',
        toolType: 'Monitoring',
        launches: 134,
        uniqueUsers: 38,
        averageDuration: 1200,
        trend: 'down'
      }
    ];
  }

  private getFallbackBehaviorAnalytics(): UserBehaviorAnalytics {
    return {
      loginPatterns: [
        { hour: 8, count: 45, day: 'Monday' },
        { hour: 9, count: 67, day: 'Monday' },
        { hour: 10, count: 89, day: 'Monday' },
        { hour: 14, count: 56, day: 'Monday' },
        { hour: 15, count: 43, day: 'Monday' }
      ],
      toolPreferences: [
        { userId: 'user1', toolType: 'jenkins', frequency: 15, lastUsed: '2024-01-19T10:30:00Z' },
        { userId: 'user2', toolType: 'gitlab', frequency: 12, lastUsed: '2024-01-19T11:15:00Z' }
      ],
      userSegments: [
        { segment: 'Power Users', count: 45, percentage: 35, characteristics: ['High tool usage', 'Long sessions'] },
        { segment: 'Regular Users', count: 82, percentage: 55, characteristics: ['Moderate usage', 'Focused workflow'] },
        { segment: 'New Users', count: 20, percentage: 10, characteristics: ['Learning', 'Low engagement'] }
      ]
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;