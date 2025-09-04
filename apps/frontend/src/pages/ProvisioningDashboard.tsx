import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loading } from '../components/ui/loading';
import { 
  Package, 
  Workflow, 
  FileCode, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play,
  Pause,
  RotateCcw,
  Eye,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  Layers,
  FileText,
  Activity,
  Shield,
  Database,
  BarChart3,
  History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatRelativeTime } from '../lib/utils';
import { config } from '../config/environment';

interface ProvisioningTemplate {
  id: string;
  name: string;
  description: string;
  tool_type: string;
  category: string;
  resource_type: string;
  template_data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

interface ProvisioningWorkflow {
  id: string;
  name: string;
  description: string;
  tool_slug: string;
  template_id: string;
  template_name: string;
  status: string;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  rollback_enabled: boolean;
  workflow_data: any;
  error_message: string | null;
}

interface ProvisionedResource {
  id: string;
  workflow_id: string;
  tool_slug: string;
  resource_type: string;
  resource_name: string;
  resource_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata: any;
  health_status: string;
  last_health_check: string | null;
}

interface ProvisioningPolicy {
  id: string;
  name: string;
  description: string;
  tool_type: string;
  policy_type: string;
  conditions: any;
  actions: any;
  is_active: boolean;
  priority: number;
  created_at: string;
  enforcement_count: number;
}

interface BulkOperation {
  id: string;
  operation_type: string;
  status: string;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  operation_data: any;
  error_summary: string | null;
}

export const ProvisioningDashboard: React.FC = () => {
  const { } = useAuth();
  const [templates, setTemplates] = useState<ProvisioningTemplate[]>([]);
  const [workflows, setWorkflows] = useState<ProvisioningWorkflow[]>([]);
  const [resources, setResources] = useState<ProvisionedResource[]>([]);
  const [policies, setPolicies] = useState<ProvisioningPolicy[]>([]);
  const [bulkOps, setBulkOps] = useState<BulkOperation[]>([]);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'templates' | 'resources' | 'policies' | 'bulk' | 'audit'>('overview');

  const PROVISIONING_API_BASE = `${config.urls.api}/provisioning`;

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        capabilitiesData,
        templatesData,
        workflowsData,
        resourcesData,
        policiesData,
        bulkOpsData
      ] = await Promise.all([
        makeAuthenticatedRequest(`${PROVISIONING_API_BASE}/capabilities`),
        makeAuthenticatedRequest(`${PROVISIONING_API_BASE}/templates`),
        makeAuthenticatedRequest(`${PROVISIONING_API_BASE}/workflows`).catch(() => ({ workflows: [] })),
        makeAuthenticatedRequest(`${PROVISIONING_API_BASE}/resources`).catch(() => ({ resources: [] })),
        makeAuthenticatedRequest(`${PROVISIONING_API_BASE}/policies`).catch(() => ({ policies: [] })),
        makeAuthenticatedRequest(`${PROVISIONING_API_BASE}/bulk-operations`).catch(() => ({ operations: [] }))
      ]);

      setCapabilities(capabilitiesData);
      setTemplates(templatesData.templates || []);
      setWorkflows(workflowsData.workflows || []);
      setResources(resourcesData.resources || []);
      setPolicies(policiesData.policies || []);
      setBulkOps(bulkOpsData.operations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provisioning data');
    } finally {
      setLoading(false);
    }
  };



  const rollbackWorkflow = async (workflowId: string) => {
    try {
      await makeAuthenticatedRequest(
        `${PROVISIONING_API_BASE}/workflows/${workflowId}/rollback`,
        { method: 'POST' }
      );
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback workflow');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
      case 'error':
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'pending':
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, enabled?: boolean) => {
    if (enabled === false) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    
    switch (status) {
      case 'completed':
      case 'success':
      case 'healthy':
        return <Badge className="bg-green-500 text-white">Success</Badge>;
      case 'failed':
      case 'error':
      case 'unhealthy':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
      case 'in_progress':
        return <Badge className="bg-blue-500 text-white">Running</Badge>;
      case 'pending':
      case 'queued':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'rollback':
        return <Badge className="bg-orange-500 text-white">Rollback</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getToolIcon = (toolSlug: string) => {
    switch (toolSlug) {
      case 'github': return '🐙';
      case 'gitlab': return '🦊';
      case 'jenkins': return '👨‍💼';
      case 'argocd': return '🚀';
      case 'terraform': return '🏗️';
      case 'sonarqube': return '🔍';
      case 'grafana': return '📊';
      case 'prometheus': return '📈';
      case 'kibana': return '🔎';
      case 'snyk': return '🛡️';
      case 'jira': return '🎫';
      default: return '⚙️';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Provisioning Management</h1>
          <p className="text-gray-600">
            Manage provisioning workflows, templates, and resource lifecycle across all tools
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileCode className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-gray-500">
              {templates.filter(t => t.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.filter(w => ['running', 'pending'].includes(w.status)).length}
            </div>
            <p className="text-xs text-gray-500">
              {workflows.length} total workflows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resources.length}</div>
            <p className="text-xs text-gray-500">
              {resources.filter(r => r.health_status === 'healthy').length} healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.length > 0 
                ? Math.round((workflows.filter(w => w.status === 'completed').length / workflows.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-gray-500">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { key: 'workflows' as const, label: 'Workflows', icon: Workflow },
            { key: 'templates' as const, label: 'Templates', icon: FileCode },
            { key: 'resources' as const, label: 'Resources', icon: Package },
            { key: 'policies' as const, label: 'Policies', icon: Shield },
            { key: 'bulk' as const, label: 'Bulk Ops', icon: Layers },
            { key: 'audit' as const, label: 'Audit', icon: History }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Tool Capabilities */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Tool Provisioning Capabilities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {capabilities?.tools && Object.entries(capabilities.tools).map(([toolSlug, toolCaps]: [string, any]) => (
                  <Card key={toolSlug}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{getToolIcon(toolSlug)}</span>
                        {toolSlug.toUpperCase()}
                        {toolCaps.available ? (
                          <Badge className="bg-green-500 text-white">Available</Badge>
                        ) : (
                          <Badge variant="secondary">Unavailable</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Resource Types:</span>
                          <Badge variant="outline">{toolCaps.resource_types?.length || 0}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Templates:</span>
                          <Badge variant="outline">
                            {templates.filter(t => t.tool_type === toolSlug).length}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Active Resources:</span>
                          <Badge variant="outline">
                            {resources.filter(r => r.tool_slug === toolSlug).length}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {workflows.slice(0, 5).map((workflow) => (
                      <div key={workflow.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(workflow.status)}
                          <div>
                            <p className="font-medium">{workflow.name}</p>
                            <p className="text-sm text-gray-500">
                              {getToolIcon(workflow.tool_slug)} {workflow.tool_slug} • Template: {workflow.template_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(workflow.status)}
                          <p className="text-xs text-gray-500 mt-1">
                            {workflow.started_at ? formatRelativeTime(workflow.started_at) : 'Not started'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {workflows.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No workflows found. Create a workflow from a template to get started.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Provisioning Workflows</h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            </div>

            <div className="grid gap-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-xl">{getToolIcon(workflow.tool_slug)}</span>
                          {workflow.name}
                          {getStatusBadge(workflow.status)}
                        </CardTitle>
                        <CardDescription>
                          {workflow.description} • Template: {workflow.template_name}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        {workflow.status === 'completed' && workflow.rollback_enabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rollbackWorkflow(workflow.id)}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Rollback
                          </Button>
                        )}
                        {workflow.status === 'failed' && (
                          <Button variant="outline" size="sm">
                            <Play className="w-4 h-4" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Progress</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${workflow.total_steps > 0 ? (workflow.completed_steps / workflow.total_steps) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-xs">
                            {workflow.completed_steps}/{workflow.total_steps}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">Created By</p>
                        <p className="text-gray-600">{workflow.created_by}</p>
                      </div>
                      <div>
                        <p className="font-medium">Started</p>
                        <p className="text-gray-600">
                          {workflow.started_at ? formatRelativeTime(workflow.started_at) : 'Not started'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Duration</p>
                        <p className="text-gray-600">
                          {workflow.started_at && workflow.completed_at 
                            ? `${Math.round((new Date(workflow.completed_at).getTime() - new Date(workflow.started_at).getTime()) / 1000)}s`
                            : workflow.status === 'running' ? 'In progress' : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    {workflow.error_message && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{workflow.error_message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {workflows.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Workflow className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Workflows</h3>
                    <p className="text-gray-500 mb-4">
                      Create your first provisioning workflow from a template.
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Workflow
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Provisioning Templates</h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>

            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-xl">{getToolIcon(template.tool_type)}</span>
                          {template.name}
                          {getStatusBadge('active', template.is_active)}
                          <Badge variant="outline">{template.category}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {template.description} • Resource: {template.resource_type}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Play className="w-4 h-4" />
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Tool Type</p>
                        <p className="text-gray-600">{template.tool_type}</p>
                      </div>
                      <div>
                        <p className="font-medium">Usage Count</p>
                        <p className="text-gray-600">{template.usage_count} times</p>
                      </div>
                      <div>
                        <p className="font-medium">Created</p>
                        <p className="text-gray-600">{formatRelativeTime(template.created_at)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Last Updated</p>
                        <p className="text-gray-600">{formatRelativeTime(template.updated_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {templates.length === 0 && (
                                  <Card>
                    <CardContent className="text-center py-8">
                      <FileCode className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Templates</h3>
                    <p className="text-gray-500 mb-4">
                      Create reusable templates for common provisioning scenarios.
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Provisioned Resources</h2>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Activity className="w-4 h-4 mr-2" />
                  Health Check
                </Button>
                <Button variant="outline">
                  <Database className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {resources.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-xl">{getToolIcon(resource.tool_slug)}</span>
                          {resource.resource_name}
                          {getStatusBadge(resource.status)}
                          <Badge 
                            className={
                              resource.health_status === 'healthy' 
                                ? 'bg-green-500 text-white' 
                                : 'bg-red-500 text-white'
                            }
                          >
                            {resource.health_status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {resource.resource_type} • ID: {resource.resource_id}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                          Manage
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Tool</p>
                        <p className="text-gray-600">{resource.tool_slug}</p>
                      </div>
                      <div>
                        <p className="font-medium">Created</p>
                        <p className="text-gray-600">{formatRelativeTime(resource.created_at)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Last Updated</p>
                        <p className="text-gray-600">{formatRelativeTime(resource.updated_at)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Health Check</p>
                        <p className="text-gray-600">
                          {resource.last_health_check 
                            ? formatRelativeTime(resource.last_health_check)
                            : 'Never checked'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {resources.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Resources</h3>
                    <p className="text-gray-500 mb-4">
                      No resources have been provisioned yet. Start a workflow to create resources.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Provisioning Policies</h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Policy
              </Button>
            </div>

            <div className="grid gap-4">
              {policies.map((policy) => (
                <Card key={policy.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          {policy.name}
                          {getStatusBadge('active', policy.is_active)}
                          <Badge variant="outline">Priority: {policy.priority}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {policy.description} • Type: {policy.policy_type}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Tool Type</p>
                        <p className="text-gray-600">{policy.tool_type}</p>
                      </div>
                      <div>
                        <p className="font-medium">Enforcement Count</p>
                        <p className="text-gray-600">{policy.enforcement_count} times</p>
                      </div>
                      <div>
                        <p className="font-medium">Created</p>
                        <p className="text-gray-600">{formatRelativeTime(policy.created_at)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Priority</p>
                        <p className="text-gray-600">{policy.priority}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {policies.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Policies</h3>
                    <p className="text-gray-500 mb-4">
                      Create policies to automatically enforce provisioning rules and governance.
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Policy
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Bulk Operations Tab */}
        {activeTab === 'bulk' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Bulk Operations</h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Bulk Operation
              </Button>
            </div>

            <div className="grid gap-4">
              {bulkOps.map((operation) => (
                <Card key={operation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="w-5 h-5" />
                          {operation.operation_type.toUpperCase()}
                          {getStatusBadge(operation.status)}
                        </CardTitle>
                        <CardDescription>
                          Created by {operation.created_by}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="font-medium">Progress</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${operation.total_items > 0 ? (operation.processed_items / operation.total_items) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-xs">
                            {operation.processed_items}/{operation.total_items}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">Success Rate</p>
                        <p className="text-gray-600">
                          {operation.processed_items > 0 
                            ? Math.round((operation.successful_items / operation.processed_items) * 100)
                            : 0}%
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Started</p>
                        <p className="text-gray-600">
                          {operation.started_at ? formatRelativeTime(operation.started_at) : 'Not started'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Duration</p>
                        <p className="text-gray-600">
                          {operation.started_at && operation.completed_at 
                            ? `${Math.round((new Date(operation.completed_at).getTime() - new Date(operation.started_at).getTime()) / 60000)}m`
                            : operation.status === 'running' ? 'In progress' : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="flex gap-4">
                        <span className="text-green-600">✓ {operation.successful_items} succeeded</span>
                        <span className="text-red-600">✗ {operation.failed_items} failed</span>
                      </div>
                    </div>
                    {operation.error_summary && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{operation.error_summary}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {bulkOps.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Layers className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Bulk Operations</h3>
                    <p className="text-gray-500 mb-4">
                      Perform bulk provisioning operations across multiple resources or tools.
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Start Bulk Operation
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Provisioning Audit Trail</h2>
              <div className="flex gap-2">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Export Audit Log
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Audit Trail</h3>
                  <p>Detailed audit logs for all provisioning activities will be displayed here.</p>
                  <p className="text-sm mt-2">This includes workflow executions, resource changes, policy enforcements, and user actions.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
