import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loading } from '../components/ui/loading';
import { config } from '../config/environment';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  BarChart3,
  Monitor,
  Webhook,
  Eye,
  Play
} from 'lucide-react';

interface WebhookDelivery {
  id: string;
  tool_slug: string;
  tool_name: string;
  event_type: string;
  event_id: string;
  delivery_status: 'pending' | 'delivered' | 'failed' | 'retrying';
  http_status_code?: number;
  response_time_ms?: number;
  delivery_attempts: number;
  error_message?: string;
  created_at: string;
  delivered_at?: string;
}

interface WebhookStats {
  tool_slug: string;
  tool_name: string;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  avg_delivery_attempts: number;
  last_delivery_at?: string;
}

// interface NotificationRule {
//   id: string;
//   tool_id: string;
//   rule_name: string;
//   event_types: string[];
//   conditions: Record<string, any>;
//   notification_channels: string[];
//   notification_config: Record<string, any>;
//   is_active: boolean;
//   created_at: string;
// }

interface WebhookEventType {
  id: string;
  tool_slug: string;
  event_type: string;
  event_description: string;
  event_schema: Record<string, any>;
  notification_template: Record<string, any>;
  is_enabled: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'pending':
    case 'retrying':
      return <Clock className="h-5 w-5 text-yellow-500" />;
    default:
      return <Activity className="h-5 w-5 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'pending':
    case 'retrying':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Utility function for channel icons (currently unused but may be needed for notification rules)
// const getChannelIcon = (channel: string) => {
//   switch (channel) {
//     case 'email':
//       return <Mail className="h-4 w-4" />;
//     case 'slack':
//       return <MessageSquare className="h-4 w-4" />;
//     case 'teams':
//       return <MessageSquare className="h-4 w-4" />;
//     case 'webhook':
//       return <Webhook className="h-4 w-4" />;
//     default:
//       return <Bell className="h-4 w-4" />;
//   }
// };

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const formatDuration = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const WebhookDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'overview' | 'deliveries' | 'rules' | 'events'>('overview');
  const [webhookStats, setWebhookStats] = useState<WebhookStats[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<WebhookDelivery[]>([]);
  // const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [eventTypes, setEventTypes] = useState<WebhookEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      fetchWebhookData();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchWebhookData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchWebhookData = async () => {
    if (!user) return;

    try {
      setError(null);
      
      // Fetch all webhook data in parallel
      const [statsResponse, deliveriesResponse, eventTypesResponse] = await Promise.all([
        fetch(`${config.services.webhookIngress}/api/webhooks/stats`, {
          credentials: 'include',
          headers: {
            'X-User-Sub': user.sub || 'admin-user',
            'X-User-Email': user.email || 'admin@sso-hub.local',
            'X-User-Roles': (user.roles || []).join(',') || 'admin',
            'X-User-Signature': 'placeholder-signature'
          }
        }),
        fetch(`${config.services.webhookIngress}/api/webhooks/deliveries?limit=50`, {
          credentials: 'include',
          headers: {
            'X-User-Sub': user.sub || 'admin-user',
            'X-User-Email': user.email || 'admin@sso-hub.local',
            'X-User-Roles': (user.roles || []).join(',') || 'admin',
            'X-User-Signature': 'placeholder-signature'
          }
        }),
        fetch(`${config.services.webhookIngress}/api/webhooks/event-types`, {
          credentials: 'include',
          headers: {
            'X-User-Sub': user.sub || 'admin-user',
            'X-User-Email': user.email || 'admin@sso-hub.local',
            'X-User-Roles': (user.roles || []).join(',') || 'admin',
            'X-User-Signature': 'placeholder-signature'
          }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setWebhookStats(statsData.webhook_stats || []);
      }

      if (deliveriesResponse.ok) {
        const deliveriesData = await deliveriesResponse.json();
        setRecentDeliveries(deliveriesData.deliveries || []);
      }

      if (eventTypesResponse.ok) {
        const eventTypesData = await eventTypesResponse.json();
        setEventTypes(eventTypesData.event_types || []);
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch webhook data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch webhook data');
    } finally {
      setLoading(false);
    }
  };

  const retryFailedDeliveries = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${config.services.webhookIngress}/api/webhooks/retry-failed`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Sub': user.sub || 'admin-user',
          'X-User-Email': user.email || 'admin@sso-hub.local',
          'X-User-Roles': (user.roles || []).join(',') || 'admin',
          'X-User-Signature': 'placeholder-signature'
        },
        body: JSON.stringify({ max_retries: 3 })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully retried ${result.retried_count} failed deliveries`);
        fetchWebhookData(); // Refresh data
      } else {
        throw new Error('Failed to retry deliveries');
      }
    } catch (err) {
      console.error('Failed to retry failed deliveries:', err);
      alert('Failed to retry failed deliveries');
    }
  };

  const testWebhook = async (toolSlug: string) => {
    try {
      const testPayload = {
        test: true,
        tool: toolSlug,
        timestamp: new Date().toISOString(),
        event_type: 'test_event',
        message: 'This is a test webhook from SSO Hub'
      };

      const response = await fetch(`${config.services.webhookIngress}/webhooks/${toolSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Event': 'true',
          'User-Agent': 'SSO-Hub-Test/1.0'
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Test webhook successful! Delivery ID: ${result.delivery_id}`);
        fetchWebhookData(); // Refresh data
      } else {
        const error = await response.json();
        throw new Error(error.details || 'Test webhook failed');
      }
    } catch (err) {
      console.error(`Failed to test ${toolSlug} webhook:`, err);
      alert(`Failed to test ${toolSlug} webhook: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const renderOverviewTab = () => {
    const totalDeliveries = webhookStats.reduce((sum, stat) => sum + stat.total_deliveries, 0);
    const successfulDeliveries = webhookStats.reduce((sum, stat) => sum + stat.successful_deliveries, 0);
    const failedDeliveries = webhookStats.reduce((sum, stat) => sum + stat.failed_deliveries, 0);
    const successRate = totalDeliveries > 0 ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(1) : '0';

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                  <p className="text-2xl font-bold text-blue-600">{totalDeliveries}</p>
                </div>
                <Webhook className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">{successRate}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed Deliveries</p>
                  <p className="text-2xl font-bold text-red-600">{failedDeliveries}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Tools</p>
                  <p className="text-2xl font-bold text-purple-600">{webhookStats.length}</p>
                </div>
                <Monitor className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tool-specific stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Webhook Statistics by Tool</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {webhookStats.map((stat) => (
                <div key={stat.tool_slug} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Monitor className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{stat.tool_name}</h3>
                      <p className="text-sm text-gray-500">{stat.tool_slug}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{stat.successful_deliveries}</p>
                      <p className="text-xs text-gray-500">Success</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">{stat.failed_deliveries}</p>
                      <p className="text-xs text-gray-500">Failed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{stat.total_deliveries}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testWebhook(stat.tool_slug)}
                      className="flex items-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>Test</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDeliveriesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Webhook Deliveries</h3>
        <Button onClick={retryFailedDeliveries} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Failed
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Monitor className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{delivery.tool_name || delivery.tool_slug}</div>
                          <div className="text-sm text-gray-500">{delivery.tool_slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.event_type}</div>
                      <div className="text-sm text-gray-500">{delivery.event_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(delivery.delivery_status)}
                        <Badge className={getStatusColor(delivery.delivery_status)}>
                          {delivery.delivery_status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(delivery.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {delivery.delivery_attempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEventTypesTab = () => {
    const eventsByTool = eventTypes.reduce((acc, event) => {
      if (!acc[event.tool_slug]) {
        acc[event.tool_slug] = [];
      }
      acc[event.tool_slug].push(event);
      return acc;
    }, {} as Record<string, WebhookEventType[]>);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Supported Event Types</h3>
          <p className="text-sm text-gray-500">{eventTypes.length} event types across {Object.keys(eventsByTool).length} tools</p>
        </div>

        <div className="space-y-6">
          {Object.entries(eventsByTool).map(([toolSlug, events]) => (
            <Card key={toolSlug}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>{toolSlug.toUpperCase()}</span>
                  <Badge variant="outline">{events.length} events</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{event.event_type}</h4>
                        <Badge className={event.is_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {event.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{event.event_description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Loading />
            <p className="mt-4 text-gray-600">Loading webhook dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Webhook Data</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={fetchWebhookData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Webhook Management</h1>
            <p className="text-gray-600">
              Monitor and configure webhooks for all integrated DevOps tools
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {formatTimestamp(lastRefresh.toISOString())}
            </p>
          </div>
          <Button onClick={fetchWebhookData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'deliveries', label: 'Deliveries', icon: Webhook },
            { id: 'events', label: 'Event Types', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
                currentTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {currentTab === 'overview' && renderOverviewTab()}
        {currentTab === 'deliveries' && renderDeliveriesTab()}
        {currentTab === 'events' && renderEventTypesTab()}

        {webhookStats.length === 0 && currentTab === 'overview' && (
          <div className="text-center py-12">
            <Webhook className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Webhook Data Available</h3>
            <p className="text-gray-600 mb-6">
              Webhook delivery data will appear here once webhooks start being received.
            </p>
            <div className="flex justify-center space-x-4">
              {['github', 'gitlab', 'jenkins'].map((tool) => (
                <Button
                  key={tool}
                  variant="outline"
                  size="sm"
                  onClick={() => testWebhook(tool)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test {tool}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
