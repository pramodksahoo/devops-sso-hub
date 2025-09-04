import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Table, { Column } from '../components/ui/table';
import { Sparkline } from '../components/ui/sparkline';
import { config } from '../config/environment';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Clock,
  CheckCircle,
  Download,
  RefreshCw,
  Filter,
  Target,
  Zap
} from 'lucide-react';

// Analytics Types
interface ToolUsageAnalytics {
  tool_slug: string;
  total_usage: string;
  unique_users: string;
  avg_response_time: string;
  success_rate: string;
  period: string;
}

// Future interfaces for enhanced analytics tabs
// interface PerformanceMetric { ... }
// interface WorkflowAnalytics { ... }

interface ToolSummary {
  tool_slug: string;
  tool_name: string;
  category_slug: string;
  total_usage: string;
  unique_users: string;
  avg_response_time: string;
  success_rate: string;
  last_activity: string;
}

interface AnalyticsFilters {
  tool_slug?: string;
  since?: string;
  until?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  category?: string;
  metric_type?: string;
  workflow_type?: string;
}

const TOOL_CATEGORIES = {
  'source_control': ['github', 'gitlab'],
  'ci_cd': ['jenkins', 'argocd'],
  'infrastructure': ['terraform'],
  'code_quality': ['sonarqube'],
  'monitoring': ['grafana', 'prometheus'],
  'logging': ['kibana'],
  'security': ['snyk'],
  'project_management': ['jira', 'servicenow']
};

const ALL_TOOLS = Object.values(TOOL_CATEGORIES).flat();

export const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'overview' | 'usage' | 'performance' | 'workflows' | 'reports'>('overview');
  const [toolUsage, setToolUsage] = useState<ToolUsageAnalytics[]>([]);
  // Note: Performance metrics and workflow analytics are fetched but not currently displayed in UI
  // Future enhancement: Add detailed performance and workflow visualization tabs
  const [toolSummary, setToolSummary] = useState<ToolSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    groupBy: 'day'
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [searchText, setSearchText] = useState('');

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;
    
    try {
      setError(null);
      const headers = {
        'Accept': 'application/json',
        'X-User-Sub': user.sub || 'unknown-user',
        'X-User-Email': user.email || 'unknown@sso-hub.local',
        'X-User-Roles': (user.roles || []).join(',') || 'user',
        'X-User-Signature': 'placeholder-signature'
      };

      // Fetch tool usage analytics
      const usageParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          usageParams.append(key, value.toString());
        }
      });

      const usageResponse = await fetch(`${config.services.analytics}/api/analytics/usage?${usageParams}`, {
        credentials: 'include',
        headers
      });

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        if (usageData.success) {
          setToolUsage(usageData.analytics || []);
        }
      }

      // Fetch tool summary
      const toolsResponse = await fetch(`${config.services.analytics}/api/analytics/tools?${usageParams}`, {
        credentials: 'include',
        headers
      });

      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        if (toolsData.success) {
          setToolSummary(toolsData.tools || []);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Failed to fetch analytics data:', err);
    }
  }, [user, filters]);

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        await fetchAnalyticsData();
      } finally {
        setLoading(false);
        setLastRefresh(new Date());
      }
    };
    
    loadData();
  }, [user, fetchAnalyticsData]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AnalyticsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({ groupBy: 'day' });
  };

  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    try {
      await fetchAnalyticsData();
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  // Export data as CSV
  const exportToCSV = async (dataType: string) => {
    try {
      const params = new URLSearchParams();
      params.append('data_type', dataType);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${config.services.analytics}/api/analytics/export/csv?${params}`, {
        credentials: 'include',
        headers: {
          'X-User-Sub': user?.sub || 'unknown-user',
          'X-User-Email': user?.email || 'unknown@sso-hub.local',
          'X-User-Roles': (user?.roles || []).join(',') || 'user',
          'X-User-Signature': 'placeholder-signature'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `analytics-${dataType}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  // Utility functions
  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return Math.round(num).toString();
  };

  const formatPercentage = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0%';
    return `${Math.round(num)}%`;
  };

  const getPerformanceIcon = (value: number, threshold: { good: number; fair: number }) => {
    if (value >= threshold.good) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value >= threshold.fair) return <Activity className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const kpiTotals = useMemo(() => {
    const totalUsage = toolUsage.reduce((sum, t) => sum + Number(t.total_usage), 0);
    const uniqueUsers = toolUsage.reduce((sum, t) => sum + Number(t.unique_users), 0);
    const avgResp = Math.round(toolUsage.reduce((sum, t, _, arr) => sum + Number(t.avg_response_time) / arr.length, 0));
    const avgSuccess = Math.round(toolUsage.reduce((sum, t, _, arr) => sum + Number(t.success_rate) / arr.length, 0));
    return { totalUsage, uniqueUsers, avgResp, avgSuccess };
  }, [toolUsage]);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const summaryColumns: Column<ToolSummary>[] = [
    { key: 'tool_name', header: 'Tool', sortable: true },
    { key: 'category_slug', header: 'Category', sortable: true, render: r => <Badge variant="outline">{r.category_slug?.replace('_', ' ') || 'other'}</Badge> },
    { key: 'total_usage', header: 'Usage', sortable: true, render: r => formatNumber(r.total_usage) },
    { key: 'unique_users', header: 'Users', sortable: true, render: r => formatNumber(r.unique_users) },
    { key: 'success_rate', header: 'Success', sortable: true, render: r => formatPercentage(r.success_rate) },
    { key: 'avg_response_time', header: 'Resp', sortable: true, render: r => r.avg_response_time ? `${Math.round(parseFloat(r.avg_response_time))}ms` : 'N/A' },
  ];

  const filteredSummary = useMemo(() => {
    const base = toolSummary;
    const q = searchText.trim().toLowerCase();
    if (!q) return base;
    return base.filter(t => [t.tool_name, t.tool_slug, t.category_slug].some(v => v && v.toLowerCase().includes(q)));
  }, [toolSummary, searchText]);

  if (loading && toolSummary.length === 0) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive tool-specific analytics and performance insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Badge>
          <Button onClick={refreshData} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'usage', label: 'Tool Usage', icon: Activity },
            { id: 'performance', label: 'Performance', icon: Zap },
            { id: 'workflows', label: 'Workflows', icon: Target },
            { id: 'reports', label: 'Reports', icon: Download }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card animation="fadeIn"><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4" /> Total Usage</CardTitle></CardHeader><CardContent className="pt-0 text-3xl font-semibold">{kpiTotals.totalUsage}</CardContent></Card>
        <Card animation="fadeIn" delay={0.05}><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Unique Users</CardTitle></CardHeader><CardContent className="pt-0 text-3xl font-semibold">{kpiTotals.uniqueUsers}</CardContent></Card>
        <Card animation="fadeIn" delay={0.1}><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Avg Response</CardTitle></CardHeader><CardContent className="pt-0 text-3xl font-semibold">{kpiTotals.avgResp}ms</CardContent></Card>
        <Card animation="fadeIn" delay={0.15}><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Success Rate</CardTitle></CardHeader><CardContent className="pt-0 text-3xl font-semibold">{kpiTotals.avgSuccess}%</CardContent></Card>
      </div>

      {/* Top tools (with sparkline) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {toolSummary.map((t, i) => {
          // temporary client-side trend mock based on usage number
          const seed = Math.max(1, parseInt(t.total_usage || '1', 10));
          const data: number[] = Array.from({ length: 12 }).map(() => Math.max(0, Math.round(seed * (0.6 + Math.random() * 0.8))));
          return (
            <Card key={t.tool_slug} variant="interactive" hoverEffect="lift" animation="slideUp" delay={i * 0.03}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{t.tool_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-sm text-muted-foreground">
                  <div><div className="text-xs">Usage</div><div className="text-foreground font-medium">{t.total_usage}</div></div>
                  <div><div className="text-xs">Users</div><div className="text-foreground font-medium">{t.unique_users}</div></div>
                  <div><div className="text-xs">Resp</div><div className="text-foreground font-medium">{t.avg_response_time}ms</div></div>
                </div>
                <div className="mt-3 h-12">
                  <Sparkline data={data} color="#6366f1" height={48} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filters & Time Range</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input value={searchText} onChange={(e) => { setSearchText(e.target.value); setPage(1); }} placeholder="Search tools or categories…" className="border rounded-md px-3 py-2 md:col-span-2" />
          <select value={filters.tool_slug || ''} onChange={(e) => handleFilterChange('tool_slug', e.target.value)} className="border rounded-md px-3 py-2">
            <option value="">All Tools</option>
            {ALL_TOOLS.map(tool => <option key={tool} value={tool}>{tool}</option>)}
          </select>
          <select value={filters.groupBy || 'day'} onChange={(e) => handleFilterChange('groupBy', e.target.value)} className="border rounded-md px-3 py-2">
            <option value="hour">Hour</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
          <Button onClick={clearFilters} variant="outline" size="sm">Clear</Button>
          <Button onClick={refreshData} size="sm" className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Apply</Button>
        </CardContent>
      </Card>

      {/* Summary Table with client-side search */}
      <Table
        columns={summaryColumns}
        data={filteredSummary}
        page={page}
        pageSize={pageSize}
        total={filteredSummary.length}
        onPageChange={setPage}
        filterText={searchText}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4 text-sm text-red-700">{error}</div>
      )}

      {/* Tab Content */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Usage</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(toolUsage.reduce((sum, item) => sum + parseInt(item.total_usage || '0'), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Unique Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(toolUsage.reduce((sum, item) => sum + parseInt(item.unique_users || '0'), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(toolUsage.reduce((sum, item, _, arr) => 
                        sum + (parseInt(item.avg_response_time || '0') / arr.length), 0))}ms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Success Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatPercentage(toolUsage.reduce((sum, item, _, arr) => 
                        sum + (parseFloat(item.success_rate || '0') / arr.length), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tool Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Tool Usage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tool
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Success Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {toolSummary.slice(0, 10).map((tool, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">
                              {tool.tool_name || tool.tool_slug}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">
                            {tool.category_slug?.replace('_', ' ') || 'other'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(tool.total_usage)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(tool.unique_users)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getPerformanceIcon(parseFloat(tool.success_rate || '0'), { good: 95, fair: 80 })}
                            <span className="ml-2 text-sm text-gray-900">
                              {formatPercentage(tool.success_rate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tool.avg_response_time ? `${Math.round(parseFloat(tool.avg_response_time))}ms` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentTab === 'reports' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Analytics Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Usage Analytics</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Export tool usage patterns and user activity data
                  </p>
                  <Button onClick={() => exportToCSV('usage')} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Usage CSV
                  </Button>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Metrics</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Export integration performance and response time data
                  </p>
                  <Button onClick={() => exportToCSV('performance')} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Performance CSV
                  </Button>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow Analytics</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Export cross-tool workflow and efficiency data
                  </p>
                  <Button onClick={() => exportToCSV('workflows')} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Workflows CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Placeholder for other tabs */}
      {(currentTab === 'usage' || currentTab === 'performance' || currentTab === 'workflows') && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {currentTab === 'usage' && 'Tool Usage Analytics'}
              {currentTab === 'performance' && 'Performance Metrics'}
              {currentTab === 'workflows' && 'Workflow Analytics'}
            </h3>
            <p className="text-gray-500">
              Detailed {currentTab} analytics and visualizations coming soon.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Advanced charts and drill-down capabilities in development.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
