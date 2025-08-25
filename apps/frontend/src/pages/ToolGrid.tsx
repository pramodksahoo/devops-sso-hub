import React, { useState } from 'react';
import { useTool } from '../contexts/ToolContext';
import { Tool } from '../contexts/ToolContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Search, ExternalLink, Settings, Database, Activity, Shield, Users, Cloud } from 'lucide-react';

const ToolGrid: React.FC = () => {
  const { tools, launchTool } = useTool();
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Simulate loading state for better UX
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (tools.length === 0) {
        setLoadError('Failed to load tools. Please refresh the page or contact support.');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [tools]);

  const categories = ['all', 'ci-cd', 'monitoring', 'security', 'collaboration', 'infrastructure'];

  const filteredTools = tools.filter(tool => {
    const matchesFilter = filter === 'all' || tool?.category === filter;
    const matchesSearch = tool?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool?.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleLaunchTool = async (toolId: string) => {
    try {
      await launchTool(toolId);
    } catch (error) {
      console.error('Tool launch failed:', error);
      // More user-friendly error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('Authentication') || errorMessage.includes('403')) {
        alert('Access denied. Please check your permissions or contact an administrator.');
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        alert('Network error. Please check your connection and try again.');
      } else {
        alert(`Failed to launch tool: ${errorMessage}`);
      }
    }
  };

  const getCategoryColor = (category: string) => {
    if (!category) return '#757575';
    const colors: Record<string, string> = {
      'ci-cd': '#4CAF50',
      'monitoring': '#2196F3',
      'security': '#FF5722',
      'collaboration': '#9C27B0',
      'infrastructure': '#795548'
    };
    return colors[category] || '#757575';
  };

  const getCategoryIcon = (category: string) => {
    if (!category) return <Settings className="h-4 w-4" />;
    const icons: Record<string, React.ReactNode> = {
      'ci-cd': <Activity className="h-4 w-4" />,
      'monitoring': <Database className="h-4 w-4" />,
      'security': <Shield className="h-4 w-4" />,
      'collaboration': <Users className="h-4 w-4" />,
      'infrastructure': <Cloud className="h-4 w-4" />
    };
    return icons[category] || <Settings className="h-4 w-4" />;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">DevOps Tools</h1>
            <p className="text-muted-foreground">Access your integrated development and operations tools</p>
          </div>
          
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your tools...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">DevOps Tools</h1>
            <p className="text-muted-foreground">Access your integrated development and operations tools</p>
          </div>
          
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Settings className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Unable to Load Tools</h3>
              <p className="text-muted-foreground mb-4">{loadError}</p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">DevOps Tools</h1>
          <p className="text-muted-foreground">Access your integrated development and operations tools</p>
          {tools.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {tools.length} tool{tools.length === 1 ? '' : 's'} available • {filteredTools.length} displayed
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={filter === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(category)}
                className="flex items-center gap-2"
              >
                {getCategoryIcon(category)}
                {category?.charAt(0).toUpperCase() + category?.slice(1).replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onLaunch={() => handleLaunchTool(tool.id)}
              getCategoryColor={getCategoryColor}
            />
          ))}
        </div>

        {filteredTools.length === 0 && tools.length > 0 && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Tools Found</h3>
            <p className="text-muted-foreground mb-4">
              No tools found matching your search criteria.
            </p>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setFilter('all'); }}>
              Clear Filters
            </Button>
          </div>
        )}

        {tools.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Tools Available</h3>
            <p className="text-muted-foreground mb-4">
              No DevOps tools are currently configured. Contact your administrator to set up integrations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface ToolCardProps {
  tool: Tool;
  onLaunch: () => void;
  getCategoryColor: (category: string) => string;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onLaunch, getCategoryColor }) => {
  return (
    <Card className={`${!tool.hasAccess ? 'opacity-50' : 'hover:shadow-lg'} transition-all duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              {tool.icon ? (
                <div className="flex items-center justify-center w-6 h-6">{tool.icon}</div>
              ) : (
                <Settings className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{tool.name}</CardTitle>
              <CardDescription className="text-sm">{tool.description}</CardDescription>
            </div>
          </div>
          <Badge variant={tool.status === 'available' ? 'default' : 'secondary'}>
            {tool.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <Badge 
            variant="secondary" 
            className="text-xs"
            style={{ backgroundColor: getCategoryColor(tool.category) + '20', color: getCategoryColor(tool.category) }}
          >
            {tool.category?.replace('-', ' ') || 'Unknown'}
          </Badge>
          <Badge variant={tool.hasAccess ? 'default' : 'secondary'}>
            {tool.hasAccess ? 'Available' : 'No Access'}
          </Badge>
        </div>
        
        {tool.roles && tool.roles.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Your roles:</p>
            <div className="flex flex-wrap gap-1">
              {tool.roles.map(role => (
                <Badge key={role} variant="outline" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {tool.launchCount > 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            Launched {tool.launchCount} times
          </p>
        )}
        
        <Button
          onClick={onLaunch}
          disabled={!tool.hasAccess || tool.status !== 'available'}
          className="w-full"
          variant={tool.hasAccess && tool.status === 'available' ? 'default' : 'outline'}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {!tool.hasAccess ? 'No Access' : 
           tool.status !== 'available' ? 'Unavailable' : 
           'Launch'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ToolGrid;
