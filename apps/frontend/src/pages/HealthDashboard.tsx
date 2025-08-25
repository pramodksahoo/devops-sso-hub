import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { SkeletonCard } from '../components/ui/loading';
import { AlertCircle, Activity, HeartPulse, Timer, TrendingUp } from 'lucide-react';
import { Sparkline } from '../components/ui/sparkline';

interface ToolHealth {
  id: string;
  name: string;
  slug: string;
  category_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  last_check_at: string;
  last_success_at: string;
  last_failure_at: string;
  consecutive_failures: number;
  response_time_ms: number;
  failure_reason?: string;
}

interface HealthOverview {
  healthy: number;
  degraded: number;
  unhealthy: number;
  unknown: number;
  total: number;
  avg_response_time: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green-100 text-green-800';
    case 'degraded': return 'bg-yellow-100 text-yellow-800';
    case 'unhealthy': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const HealthDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolHealth[]>([]);
  const [overview, setOverview] = useState<HealthOverview | null>(null);

  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const mock: ToolHealth[] = [
        { id: '1', name: 'Jenkins', slug: 'jenkins', category_name: 'ci_cd', status: 'healthy', last_check_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_failure_at: '', consecutive_failures: 0, response_time_ms: 210 },
        { id: '2', name: 'Grafana', slug: 'grafana', category_name: 'monitoring', status: 'degraded', last_check_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_failure_at: '', consecutive_failures: 0, response_time_ms: 350 },
        { id: '3', name: 'SonarQube', slug: 'sonarqube', category_name: 'code_quality', status: 'unhealthy', last_check_at: new Date().toISOString(), last_success_at: '', last_failure_at: new Date().toISOString(), consecutive_failures: 3, response_time_ms: 0 },
      ];
      setTools(mock);
      const healthy = mock.filter(t => t.status === 'healthy').length;
      const degraded = mock.filter(t => t.status === 'degraded').length;
      const unhealthy = mock.filter(t => t.status === 'unhealthy').length;
      const unknown = mock.filter(t => t.status === 'unknown').length;
      const avg = Math.round(mock.filter(t => t.response_time_ms > 0).reduce((a, b) => a + b.response_time_ms, 0) / Math.max(1, mock.length));
      setOverview({ healthy, degraded, unhealthy, unknown, total: mock.length, avg_response_time: avg });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
        <AlertCircle className="h-5 w-5" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card animation="fadeIn"><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4" /> Healthy</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-3xl font-semibold">{overview.healthy}</div></CardContent></Card>
          <Card animation="fadeIn" delay={0.05}><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><HeartPulse className="h-4 w-4" /> Degraded</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-3xl font-semibold">{overview.degraded}</div></CardContent></Card>
          <Card animation="fadeIn" delay={0.1}><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4" /> Unhealthy</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-3xl font-semibold">{overview.unhealthy}</div></CardContent></Card>
          <Card animation="fadeIn" delay={0.15}><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Timer className="h-4 w-4" /> Avg Response</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-3xl font-semibold">{overview.avg_response_time}ms</div></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((t, i) => (
          <Card key={t.id} variant="interactive" hoverEffect="lift" animation="slideUp" delay={i * 0.03}>
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base font-semibold">{t.name}</CardTitle><Badge className={getStatusColor(t.status)}>{t.status}</Badge></div></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground flex items-center justify-between"><span>Last check:</span><span>{new Date(t.last_check_at).toLocaleTimeString()}</span></div>
              <div className="mt-3"><Sparkline data={[100, 120, 80, 140, 90, 130, Math.max(40, t.response_time_ms)]} color={t.status === 'unhealthy' ? '#ef4444' : t.status === 'degraded' ? '#f59e0b' : '#22c55e'} /></div>
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Response: {t.response_time_ms ? `${t.response_time_ms}ms` : 'n/a'}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
