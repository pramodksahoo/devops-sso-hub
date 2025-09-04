import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loading } from '../components/ui/loading';
import { 
  Server, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Edit,
  Trash2,
  Shield,
  Users,
  TestTube,
  Lock,
  UserCheck
} from 'lucide-react';

interface LDAPServer {
  id: string;
  name: string;
  host: string;
  port: number;
  baseDN: string;
  bindDN: string;
  protocol: 'ldap' | 'ldaps';
  status: 'active' | 'inactive' | 'error' | 'testing';
  lastSync?: number;
  userCount?: number;
  groupCount?: number;
  isEnabled: boolean;
  created: number;
  description?: string;
}

interface SyncJob {
  id: string;
  serverId: string;
  serverName: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  startTime: number;
  endTime?: number;
  usersProcessed: number;
  groupsProcessed: number;
  errors: number;
  progress: number;
}

interface LDAPServerFormData {
  name: string;
  host: string;
  port: number;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  protocol: 'ldap' | 'ldaps';
  description: string;
  isEnabled: boolean;
}

export const LDAPDashboard: React.FC = () => {
  console.log('🔗 LDAPDashboard component rendering');
  const { user, isAdmin } = useAuth();
  const [servers, setServers] = useState<LDAPServer[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<LDAPServer | null>(null);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [formData, setFormData] = useState<LDAPServerFormData>({
    name: '',
    host: '',
    port: 389,
    baseDN: '',
    bindDN: '',
    bindPassword: '',
    protocol: 'ldap',
    description: '',
    isEnabled: true
  });

  useEffect(() => {
    console.log('🔗 useEffect triggered, user:', !!user, 'isAdmin:', isAdmin);
    if (user && isAdmin) {
      fetchServers();
      fetchSyncJobs();
    } else {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  const fetchServers = async () => {
    if (!user || !isAdmin) {
      console.log('🔗 No user or not admin, skipping fetch');
      return;
    }

    try {
      console.log('🔗 Starting LDAP servers fetch...');
      setIsLoading(true);
      setError(null);
      
      // For now, we'll create realistic mock data since LDAP management
      // requires proper implementation
      const mockServers: LDAPServer[] = [
        {
          id: '1',
          name: 'Corporate AD',
          host: 'ad.company.com',
          port: 389,
          baseDN: 'dc=company,dc=com',
          bindDN: 'cn=sso-service,ou=service-accounts,dc=company,dc=com',
          protocol: 'ldap',
          status: 'active',
          lastSync: Date.now() - 3600000,
          userCount: 1250,
          groupCount: 45,
          isEnabled: true,
          created: Date.now() - 86400000 * 30,
          description: 'Main corporate Active Directory server'
        },
        {
          id: '2',
          name: 'Dev LDAP',
          host: 'ldap.dev.company.com',
          port: 636,
          baseDN: 'dc=dev,dc=company,dc=com',
          bindDN: 'cn=readonly,ou=service,dc=dev,dc=company,dc=com',
          protocol: 'ldaps',
          status: 'active',
          lastSync: Date.now() - 7200000,
          userCount: 85,
          groupCount: 12,
          isEnabled: true,
          created: Date.now() - 86400000 * 15,
          description: 'Development environment LDAP'
        },
        {
          id: '3',
          name: 'Legacy System',
          host: 'legacy.company.local',
          port: 389,
          baseDN: 'ou=users,dc=legacy,dc=local',
          bindDN: 'cn=admin,dc=legacy,dc=local',
          protocol: 'ldap',
          status: 'error',
          lastSync: Date.now() - 86400000 * 2,
          userCount: 0,
          groupCount: 0,
          isEnabled: false,
          created: Date.now() - 86400000 * 60,
          description: 'Legacy LDAP server - connection issues'
        }
      ];
      
      console.log('🔗 Mock LDAP servers loaded:', mockServers.length);
      setServers(mockServers);
    } catch (err) {
      console.error('🔗 Failed to fetch LDAP servers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch LDAP servers');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSyncJobs = async () => {
    try {
      const mockJobs: SyncJob[] = [
        {
          id: '1',
          serverId: '1',
          serverName: 'Corporate AD',
          status: 'completed',
          startTime: Date.now() - 3700000,
          endTime: Date.now() - 3600000,
          usersProcessed: 1250,
          groupsProcessed: 45,
          errors: 0,
          progress: 100
        },
        {
          id: '2',
          serverId: '2',
          serverName: 'Dev LDAP',
          status: 'running',
          startTime: Date.now() - 300000,
          usersProcessed: 62,
          groupsProcessed: 8,
          errors: 0,
          progress: 75
        }
      ];
      setSyncJobs(mockJobs);
    } catch (err) {
      console.error('🔗 Failed to fetch sync jobs:', err);
    }
  };

  const handleAddServer = () => {
    setFormData({
      name: '',
      host: '',
      port: 389,
      baseDN: '',
      bindDN: '',
      bindPassword: '',
      protocol: 'ldap',
      description: '',
      isEnabled: true
    });
    setEditingServer(null);
    setShowAddModal(true);
  };

  const handleEditServer = (server: LDAPServer) => {
    setFormData({
      name: server.name,
      host: server.host,
      port: server.port,
      baseDN: server.baseDN,
      bindDN: server.bindDN,
      bindPassword: '********', // Don't show actual password
      protocol: server.protocol,
      description: server.description || '',
      isEnabled: server.isEnabled
    });
    setEditingServer(server);
    setShowAddModal(true);
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this LDAP server? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🔗 Deleting LDAP server:', serverId);
      setServers(prev => prev.filter(s => s.id !== serverId));
    } catch (err) {
      console.error('🔗 Failed to delete server:', err);
      setError('Failed to delete LDAP server');
    }
  };

  const handleTestConnection = async (serverId: string) => {
    try {
      setTestingServer(serverId);
      console.log('🔗 Testing LDAP connection:', serverId);
      
      // Mock test - in real app would call API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setServers(prev => prev.map(s => 
        s.id === serverId 
          ? { ...s, status: 'active' }
          : s
      ));
    } catch (err) {
      console.error('🔗 Failed to test connection:', err);
      setError('Failed to test LDAP connection');
    } finally {
      setTestingServer(null);
    }
  };

  const handleStartSync = async (serverId: string) => {
    try {
      console.log('🔗 Starting sync for server:', serverId);
      const server = servers.find(s => s.id === serverId);
      if (!server) return;

      const newJob: SyncJob = {
        id: String(Date.now()),
        serverId,
        serverName: server.name,
        status: 'running',
        startTime: Date.now(),
        usersProcessed: 0,
        groupsProcessed: 0,
        errors: 0,
        progress: 0
      };

      setSyncJobs(prev => [newJob, ...prev]);

      // Simulate progress
      const interval = setInterval(() => {
        setSyncJobs(prev => prev.map(job => 
          job.id === newJob.id && job.status === 'running'
            ? { 
                ...job, 
                progress: Math.min(job.progress + 10, 100),
                usersProcessed: job.usersProcessed + 50,
                groupsProcessed: job.groupsProcessed + 2
              }
            : job
        ));
      }, 1000);

      // Complete after 10 seconds
      setTimeout(() => {
        clearInterval(interval);
        setSyncJobs(prev => prev.map(job => 
          job.id === newJob.id 
            ? { 
                ...job, 
                status: 'completed',
                endTime: Date.now(),
                progress: 100
              }
            : job
        ));
      }, 10000);

    } catch (err) {
      console.error('🔗 Failed to start sync:', err);
      setError('Failed to start LDAP sync');
    }
  };

  const handleSubmitServer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('🔗 Submitting LDAP server form:', formData);
      
      if (editingServer) {
        // Update existing server
        setServers(prev => prev.map(s => 
          s.id === editingServer.id 
            ? { 
                ...s, 
                name: formData.name,
                host: formData.host,
                port: formData.port,
                baseDN: formData.baseDN,
                bindDN: formData.bindDN,
                protocol: formData.protocol,
                description: formData.description,
                isEnabled: formData.isEnabled
              } 
            : s
        ));
      } else {
        // Add new server
        const newServer: LDAPServer = {
          id: String(Date.now()),
          name: formData.name,
          host: formData.host,
          port: formData.port,
          baseDN: formData.baseDN,
          bindDN: formData.bindDN,
          protocol: formData.protocol,
          status: 'inactive',
          isEnabled: formData.isEnabled,
          created: Date.now(),
          description: formData.description
        };
        setServers(prev => [...prev, newServer]);
      }
      
      setShowAddModal(false);
      setEditingServer(null);
    } catch (err) {
      console.error('🔗 Failed to save LDAP server:', err);
      setError('Failed to save LDAP server');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'testing': return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
      default: return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You need administrator privileges to access LDAP management.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Loading />
            <p className="mt-4 text-gray-600">Loading LDAP servers...</p>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading LDAP Servers</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={fetchServers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeJobs = syncJobs.filter(job => job.status === 'running');
  const totalUsers = servers.reduce((sum, server) => sum + (server.userCount || 0), 0);
  const totalGroups = servers.reduce((sum, server) => sum + (server.groupCount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">LDAP Management</h1>
              <p className="text-gray-600">
                Manage LDAP server connections and user/group synchronization
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={fetchServers} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleAddServer}>
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Servers</p>
                  <p className="text-2xl font-bold">{servers.length}</p>
                </div>
                <Server className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Servers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {servers.filter(s => s.status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-indigo-600">{totalUsers.toLocaleString()}</p>
                </div>
                <UserCheck className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Groups</p>
                  <p className="text-2xl font-bold text-purple-600">{totalGroups}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Sync Jobs */}
        {activeJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Sync Jobs</h2>
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{job.serverName}</h3>
                        <p className="text-sm text-gray-600">Started {new Date(job.startTime).toLocaleString()}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Running
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{job.usersProcessed} users processed</span>
                        <span>{job.groupsProcessed} groups processed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* LDAP Servers */}
        {servers.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">LDAP Servers</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {servers.map((server) => (
                <Card key={server.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Server className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{server.name}</CardTitle>
                          <p className="text-sm text-gray-600">{server.host}:{server.port}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(server.status)}>
                          {getStatusIcon(server.status)}
                          <span className="ml-1">{server.status}</span>
                        </Badge>
                        {server.protocol === 'ldaps' && (
                          <Lock className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Base DN</p>
                        <p className="text-sm font-mono">{server.baseDN}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Bind DN</p>
                        <p className="text-sm font-mono text-xs">{server.bindDN}</p>
                      </div>

                      {server.description && (
                        <div>
                          <p className="text-sm text-gray-600">Description</p>
                          <p className="text-sm">{server.description}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Users</p>
                          <p className="text-lg font-semibold">{server.userCount?.toLocaleString() || '0'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Groups</p>
                          <p className="text-lg font-semibold">{server.groupCount || '0'}</p>
                        </div>
                      </div>
                      
                      {server.lastSync && (
                        <div>
                          <p className="text-sm text-gray-600">Last Sync</p>
                          <p className="text-xs text-gray-500">
                            {new Date(server.lastSync).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleTestConnection(server.id)}
                        disabled={testingServer === server.id}
                      >
                        {testingServer === server.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Testing
                          </>
                        ) : (
                          <>
                            <TestTube className="h-3 w-3 mr-1" />
                            Test
                          </>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStartSync(server.id)}
                        disabled={server.status !== 'active'}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditServer(server)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteServer(server.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Server className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No LDAP Servers</h3>
            <p className="text-gray-600 mb-6">
              No LDAP servers have been configured yet. Add your first server to get started.
            </p>
            <Button onClick={handleAddServer}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Server
            </Button>
          </div>
        )}

        {/* Add/Edit Server Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">
                    {editingServer ? 'Edit LDAP Server' : 'Add LDAP Server'}
                  </h2>
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    ×
                  </Button>
                </div>

                <form onSubmit={handleSubmitServer} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Server Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Corporate AD"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Host
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.host}
                        onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ad.company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Port
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="65535"
                        value={formData.port}
                        onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Protocol
                    </label>
                    <select
                      value={formData.protocol}
                      onChange={(e) => setFormData(prev => ({ ...prev, protocol: e.target.value as 'ldap' | 'ldaps' }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ldap">LDAP (389)</option>
                      <option value="ldaps">LDAPS (636)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base DN
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.baseDN}
                      onChange={(e) => setFormData(prev => ({ ...prev, baseDN: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="dc=company,dc=com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bind DN
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.bindDN}
                      onChange={(e) => setFormData(prev => ({ ...prev, bindDN: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="cn=service,ou=users,dc=company,dc=com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bind Password
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.bindPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, bindPassword: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={editingServer ? "Leave blank to keep current password" : "Enter password"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Optional description for this LDAP server"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isEnabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
                        className="mr-2"
                      />
                      Enabled
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingServer ? 'Update Server' : 'Add Server'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LDAPDashboard;