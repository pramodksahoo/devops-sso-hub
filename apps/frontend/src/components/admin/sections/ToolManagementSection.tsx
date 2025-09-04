import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Plus,
  RefreshCw,
  Wrench,
  Server,
  Globe,
  Shield
} from 'lucide-react';
import { adminConfigService, ToolConfiguration } from '../../../services/api/adminConfigService';

interface ToolManagementProps {
  onNavigate?: (view: string) => void;
}

export const ToolManagementSection: React.FC<ToolManagementProps> = ({ onNavigate }) => {
  const [tools, setTools] = useState<ToolConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchToolConfigurations();
    const interval = setInterval(fetchToolConfigurations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchToolConfigurations = async () => {
    try {
      setError(null);
      const toolConfigs = await adminConfigService.getAllToolConfigurations();
      setTools(toolConfigs);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tools');
      console.error('Tool configuration fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'configuring': return <Clock className="h-5 w-5 text-yellow-600" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'configuring': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCardBorderColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-green-200 bg-green-50/30';
      case 'error': return 'border-red-200 bg-red-50/30';
      case 'configuring': return 'border-yellow-200 bg-yellow-50/30';
      default: return 'border-gray-200';
    }
  };

  const getProtocolBadge = (protocol: string) => {
    return protocol === 'oidc' ? 
      { color: 'bg-blue-100 text-blue-800', icon: Shield } :
      { color: 'bg-purple-100 text-purple-800', icon: Shield };
  };

  const toolStats = {
    total: tools.length,
    active: tools.filter(t => t.status === 'active').length,
    configuring: tools.filter(t => t.status === 'configuring').length,
    errors: tools.filter(t => t.status === 'error').length
  };

  if (isLoading && tools.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tool Management</h2>
          <p className="text-gray-600">Loading DevOps tool configurations...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tool Management</h2>
          <p className="text-gray-600 mt-1">DevOps integration status and configuration management</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchToolConfigurations}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigate?.('admin-tools')}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Tool</span>
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-200 text-center"
        >
          <div className="text-2xl font-bold text-gray-900">{toolStats.total}</div>
          <div className="text-sm text-gray-600">Total Tools</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-green-200 bg-green-50/30 text-center"
        >
          <div className="text-2xl font-bold text-green-600">{toolStats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200 bg-yellow-50/30 text-center"
        >
          <div className="text-2xl font-bold text-yellow-600">{toolStats.configuring}</div>
          <div className="text-sm text-gray-600">Configuring</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-red-200 bg-red-50/30 text-center"
        >
          <div className="text-2xl font-bold text-red-600">{toolStats.errors}</div>
          <div className="text-sm text-gray-600">Errors</div>
        </motion.div>
      </div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 text-center"
        >
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchToolConfigurations}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Try Again
          </button>
        </motion.div>
      )}

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {tools.map((tool, index) => {
          const protocolBadge = getProtocolBadge(tool.protocol);
          const ProtocolIcon = protocolBadge.icon;

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-xl p-4 md:p-6 shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer ${getCardBorderColor(tool.status)}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Server className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{tool.name}</h3>
                    <p className="text-sm text-gray-600">{tool.category}</p>
                  </div>
                </div>
                {getStatusIcon(tool.status)}
              </div>

              {/* Status and Protocol */}
              <div className="flex items-center justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(tool.status)}`}>
                  {tool.status.charAt(0).toUpperCase() + tool.status.slice(1)}
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${protocolBadge.color}`}>
                  <ProtocolIcon className="h-3 w-3" />
                  <span>{tool.protocol.toUpperCase()}</span>
                </div>
              </div>

              {/* Configuration Status */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Configuration:</span>
                  <span className={`font-medium ${tool.configured ? 'text-green-600' : 'text-red-600'}`}>
                    {tool.configured ? '✓ Complete' : '○ Incomplete'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Enabled:</span>
                  <span className={`font-medium ${tool.enabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {tool.enabled ? 'Yes' : 'No'}
                  </span>
                </div>

                {tool.configuration.baseUrl && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">URL:</span>
                    <button 
                      onClick={() => window.open(tool.configuration.baseUrl, '_blank')}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      <span className="max-w-32 truncate">
                        {tool.configuration.baseUrl.replace('http://', '').replace('https://', '')}
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Last Tested */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Last tested:</span>
                  <span>{tool.lastTested || 'Never'}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>Modified:</span>
                  <span>{new Date(tool.lastModified).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => console.log('Configure', tool.id)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <Settings className="h-3 w-3 inline mr-1" />
                  Configure
                </button>
                <button
                  onClick={() => console.log('Test', tool.id)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                >
                  <Wrench className="h-3 w-3 inline mr-1" />
                  Test
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {!isLoading && tools.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl p-8 md:p-12 shadow-sm border border-gray-200 text-center"
        >
          <Server className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tools Configured</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get started by adding your first DevOps tool integration. Connect Jenkins, GitLab, SonarQube, and more.
          </p>
          <button
            onClick={() => onNavigate?.('admin-tools')}
            className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Add Your First Tool
          </button>
        </motion.div>
      )}

      {/* Footer Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              System Integration Health: 
              <span className="font-medium text-green-600 ml-1">
                {toolStats.active > 0 ? 'Operational' : 'Setup Required'}
              </span>
            </span>
            {lastUpdated && (
              <span className="text-gray-500">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="text-gray-500">
            {toolStats.active}/{toolStats.total} tools active
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ToolManagementSection;