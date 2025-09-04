import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loading } from '../components/ui/loading';
import { Button } from '../components/ui/button';
import { Filter, Clock, AlertCircle, CheckCircle, XCircle, Activity, RefreshCw, Search } from 'lucide-react';
import { auditService } from '../services/api/auditService';

interface AuditEvent {
  id: string;
  event_type: string;
  event_category: 'authentication' | 'configuration' | 'integration' | 'security' | 'monitoring';
  event_severity: 'critical' | 'error' | 'warning' | 'info' | 'debug';
  tool_slug?: string;
  tool_name?: string;
  user_id?: string;
  user_email?: string;
  action: string;
  action_result: 'success' | 'failure' | 'partial' | 'pending';
  timestamp: string;
}

// Helper function to map action to event category
const getEventCategory = (action: string): AuditEvent['event_category'] => {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('login') || actionLower.includes('auth')) return 'authentication';
  if (actionLower.includes('config') || actionLower.includes('setting')) return 'configuration';
  if (actionLower.includes('integration') || actionLower.includes('tool')) return 'integration';
  if (actionLower.includes('security') || actionLower.includes('permission')) return 'security';
  return 'monitoring';
};

export const AuditDashboard: React.FC = () => {
  console.log('🔍 AuditDashboard component rendering');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [severity, setSeverity] = useState('');
  const [result, setResult] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true); 
      setError(null);
      
      // Use auditService to search audit logs with proper filters
      const data = await auditService.searchAuditLogs({
        limit: 50,
        offset: (page - 1) * 50,
        ...(searchText && { userId: searchText }), // Map search to userId for now
        ...(severity && { severity }),
        ...(result && { outcome: result })
      });
      
      // Map AuditLog to AuditEvent format for compatibility
      const mappedEvents: AuditEvent[] = data.logs.map(log => ({
        id: log.id,
        event_type: log.action.toLowerCase(),
        event_category: getEventCategory(log.action),
        event_severity: log.severity as 'critical' | 'error' | 'warning' | 'info' | 'debug',
        tool_slug: log.resource?.toLowerCase(),
        tool_name: log.resource,
        user_id: log.userId,
        user_email: log.userEmail,
        action: log.action,
        action_result: log.outcome as 'success' | 'failure' | 'partial' | 'pending',
        timestamp: log.timestamp
      }));
      
      setEvents(mappedEvents);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit events');
      console.error('Audit API Error:', e);
      
      // Fallback to mock data if API fails
      const mock: AuditEvent[] = Array.from({ length: 10 }).map((_, i) => ({
        id: String(i), 
        event_type: 'login', 
        event_category: 'authentication', 
        event_severity: (['info','warning','error'] as const)[i % 3], 
        tool_slug: 'auth-bff', 
        tool_name: 'Auth BFF', 
        user_email: `user${i%5}@example.com`, 
        action: i % 2 === 0 ? 'User Login' : 'Token Refresh', 
        action_result: (['success','failure'] as const)[i % 2], 
        timestamp: new Date(Date.now() - i * 3600_000).toISOString()
      }));
      setEvents(mock);
    } finally {
      setLoading(false);
    }
  }, [page, searchText, severity, result]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const baseFilter = (e: AuditEvent) => {
    if (severity && e.event_severity !== severity as any) return false;
    if (result && e.action_result !== result as any) return false;
    return true;
  };

  const filteredSource = useMemo(() => events.filter(baseFilter), [events, severity, result]);

  const searchFilteredEvents = useMemo(() => {
    if (!searchText) return filteredSource;
    const q = searchText.toLowerCase();
    return filteredSource.filter(e => 
      Object.values(e).some(v => 
        typeof v === 'string' && v.toLowerCase().includes(q)
      )
    );
  }, [filteredSource, searchText]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'critical': return 'bg-red-600 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failure': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Loading />
            <p className="mt-4 text-gray-600">Loading audit events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Dashboard</h1>
          <p className="text-gray-600">
            Monitor and review system audit events and security logs
          </p>
        </div>
        <Button onClick={fetchEvents}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Total Events
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-3xl font-semibold">
            {filteredSource.length}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Success
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-3xl font-semibold text-green-600">
            {filteredSource.filter(e => e.action_result === 'success').length}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Failure
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-3xl font-semibold text-red-600">
            {filteredSource.filter(e => e.action_result === 'failure').length}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" /> Matching
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-3xl font-semibold">
            {searchFilteredEvents.length}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" /> Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input 
            value={searchText} 
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }} 
            placeholder="Search action, user, tool…" 
            className="border rounded-md px-3 py-2" 
          />
          <select 
            value={severity} 
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }} 
            className="border rounded-md px-3 py-2"
          >
            <option value="">All Severity</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
          <select 
            value={result} 
            onChange={(e) => { setResult(e.target.value); setPage(1); }} 
            className="border rounded-md px-3 py-2"
          >
            <option value="">All Result</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
          <button 
            onClick={() => { setSearchText(''); setSeverity(''); setResult(''); setPage(1); }} 
            className="border rounded-md px-3 py-2 inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </button>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" /> 
          {error}
        </div>
      )}

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Events</CardTitle>
        </CardHeader>
        <CardContent>
          {searchFilteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h3>
              <p className="text-gray-600">
                {searchText || severity || result 
                  ? 'No events match your current filters.'
                  : 'No audit events are available.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tool
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchFilteredEvents.slice(0, 20).map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.tool_name || event.tool_slug || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.user_email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getSeverityColor(event.event_severity)}>
                          {event.event_severity}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {getResultIcon(event.action_result)}
                          {event.action_result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {searchFilteredEvents.length > 20 && (
        <div className="flex items-center justify-center">
          <p className="text-sm text-gray-600">
            Showing first 20 of {searchFilteredEvents.length} events
          </p>
        </div>
      )}
    </div>
  );
};