import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { getToolConfigSchema, convertFlatToNested, convertNestedToFlat, validateConfigurationField, BaseConfigField, ToolConfigSchema } from './ToolConfigurationSchemas';
import { config } from '../config/environment';

interface DynamicToolConfigurationProps {
  tool: {
    id: string;
    slug: string;
    name: string;
    integration_type?: string;
    auth_config?: Record<string, any>;
  };
  onSave: (configData: Record<string, any>) => void;
  onCancel: () => void;
  readonly?: boolean;
}

const DynamicToolConfiguration: React.FC<DynamicToolConfigurationProps> = ({
  tool,
  onSave,
  onCancel,
  readonly = false
}) => {
  // Default integration type based on tool
  const getDefaultIntegrationType = (toolSlug: string): string => {
    const defaultTypes: Record<string, string> = {
      grafana: 'oauth2',
      jenkins: 'oidc',
      argocd: 'oidc',
      gitlab: 'oidc',
      github: 'oauth2',
      jira: 'saml',
      servicenow: 'saml',
      prometheus: 'oidc',
      kibana: 'oidc',
      snyk: 'oauth2',
      terraform: 'oidc',
      sonarqube: 'oidc'
    };
    return defaultTypes[toolSlug] || 'oidc';
  };

  const [integrationType, setIntegrationType] = useState<string>(
    tool.integration_type || getDefaultIntegrationType(tool.slug)
  );
  const [schema, setSchema] = useState<ToolConfigSchema>();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const toolSchema = getToolConfigSchema(tool.slug, integrationType);
    setSchema(toolSchema);
    
    // Initialize form data with existing auth_config
    // Convert nested auth_config to flat form data for editing
    let initialData: Record<string, any> = {};
    
    if (tool.auth_config) {
      // Convert nested structure to flat field names for form
      initialData = convertNestedToFlat(tool.auth_config);
      console.log('🔄 Converted nested auth_config to flat form data:', initialData);
    }
    
    // Ensure all schema fields have values (flat structure)
    toolSchema.fields.forEach(field => {
      if (!(field.name in initialData)) {
        // For readonly client_id fields, auto-generate the protocol-specific value
        if (field.name === 'client_id' || field.name.endsWith('.client_id')) {
          initialData[field.name] = `${tool.slug}-client-${integrationType}`;
        } else {
          initialData[field.name] = field.type === 'checkbox' ? false : '';
        }
      }
    });
    
    console.log(`Initializing form data for ${tool.slug} with integration type ${integrationType}:`, initialData);
    setFormData(initialData);
    
    // Reset validation state when integration type changes
    setValidationErrors({});
    setValidationStatus('idle');
  }, [tool, integrationType]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const toggleFieldVisibility = (fieldName: string) => {
    setVisibleFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldName)) {
        newSet.delete(fieldName);
      } else {
        newSet.add(fieldName);
      }
      return newSet;
    });
  };

  const validateForm = (): boolean => {
    if (!schema) return false;

    const errors: Record<string, string> = {};
    let isValid = true;

    schema.fields.forEach(field => {
      const value = formData[field.name];
      const validation = validateConfigurationField(field, value);
      if (!validation.valid) {
        errors[field.name] = validation.error || 'Invalid value';
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      console.log('Form validation failed, cannot test connection');
      return;
    }

    console.log(`Testing connection for tool: ${tool.slug} (${tool.id}), type: ${integrationType}`);
    console.log('Form data for test:', formData);

    setIsValidating(true);
    setValidationStatus('idle');

    try {
      // Convert flat form data back to nested structure for backend
      const testConfig = convertFlatToNested(formData);
      console.log('🔄 Converted flat form data to nested config for test:', testConfig);

      const response = await fetch(`${config.urls.api}/tools/${tool.id}/test-connection`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          integration_type: integrationType,
          config: testConfig
        })
      });

      const result = await response.json();
      console.log('Connection test response:', result);
      
      if (response.ok && result.success) {
        setValidationStatus('success');
        console.log('Connection test successful:', result.message || 'Connection successful');
      } else {
        setValidationStatus('error');
        const errorMessage = result.message || result.error || 'Connection test failed';
        console.error('Connection test failed:', errorMessage);
        console.error('Full response:', result);
      }
    } catch (error) {
      setValidationStatus('error');
      console.error('Connection test error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAutoPopulateKeycloak = async () => {
    try {
      console.log(`Auto-populating ${integrationType} config for tool: ${tool.slug}`);
      
      const response = await fetch(`${config.urls.api}/keycloak/config/${integrationType}?tool=${tool.slug}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Auto-populate response:', result);
        
        if (result.success && result.config) {
          console.log('Auto-populating form with config:', result.config);
          
          // Clear any existing validation errors
          setValidationErrors({});
          
          // Reset validation status
          setValidationStatus('idle');
          
          // Convert nested config from backend to flat form data
          const mappedConfig = convertNestedToFlat(result.config);
          console.log('🔄 Converted nested Keycloak config to flat form data:', mappedConfig);
          
          // CRITICAL FIX: Auto-populate should preserve existing user-entered fields
          // Only populate OAuth-related fields, never overwrite user-provided URLs
          setFormData(prev => {
            const preservedFields = {
              grafana_url: prev.grafana_url, // Always preserve Grafana URL
              // Add any other user-critical fields that should never be auto-populated
            };
            
            // Merge with selective field preservation
            const newData = {
              ...prev,
              ...mappedConfig,
              ...preservedFields // Override with preserved fields
            };
            
            console.log('🛡️ Auto-populate with field preservation - Previous:', prev);
            console.log('🔄 Keycloak config to merge:', mappedConfig);
            console.log('🔒 Preserved fields:', preservedFields);
            console.log('✅ Final form data:', newData);
            return newData;
          });
        } else {
          console.warn('Invalid auto-populate response:', result);
        }
      } else {
        console.error('Failed to fetch Keycloak configuration:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching Keycloak configuration:', error);
    }
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Convert flat form data back to nested structure for backend
    const configData = convertFlatToNested(formData);
    console.log('🔄 Converted flat form data to nested config for save:', configData);

    onSave({
      integration_type: integrationType,
      auth_config: configData
    });
  };

  const renderField = (field: BaseConfigField) => {
    const value = formData[field.name];
    const hasError = validationErrors[field.name];
    const isVisible = visibleFields.has(field.name);
    const showValue = !field.sensitive || isVisible;

    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
            {field.sensitive && <Lock className="w-3 h-3 text-gray-400" />}
            {field.description && (
              <div className="relative group">
                <Info className="w-3 h-3 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  {field.description}
                </div>
              </div>
            )}
          </label>
          {field.sensitive && (
            <button
              type="button"
              onClick={() => toggleFieldVisibility(field.name)}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={readonly}
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>

        {field.type === 'select' ? (
          <select
            name={field.name}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            } ${(readonly || field.readonly) ? 'bg-gray-100' : ''}`}
            disabled={readonly || field.readonly}
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.type === 'checkbox' ? (
          <label className="flex items-center space-x-2">
            <input
              name={field.name}
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${(readonly || field.readonly) ? 'opacity-50' : ''}`}
              disabled={readonly || field.readonly}
            />
            <span className="text-sm text-gray-600">{field.description}</span>
          </label>
        ) : field.type === 'textarea' ? (
          <textarea
            name={field.name}
            value={showValue ? (value || '') : '••••••••••••••••'}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={(readonly || field.readonly) ? '' : field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
              hasError ? 'border-red-500' : 'border-gray-300'
            } ${(readonly || field.readonly) ? 'bg-gray-100' : ''}`}
            rows={4}
            disabled={readonly || field.readonly}
            required={field.required}
          />
        ) : (
          <input
            name={field.name}
            type={field.type === 'password' && showValue ? 'text' : field.type}
            value={showValue ? (value || '') : '••••••••••••••••'}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={(readonly || field.readonly) ? '' : field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            } ${field.type === 'password' ? 'font-mono' : ''} ${(readonly || field.readonly) ? 'bg-gray-100' : ''}`}
            disabled={readonly || field.readonly}
            required={field.required}
          />
        )}

        {hasError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {hasError}
          </p>
        )}
      </div>
    );
  };

  if (!schema) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Configure {tool.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {schema.description}
            </p>
          </div>
          {readonly && validationStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          )}
        </div>
        
        {!readonly && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Integration Type
              </label>
              {(integrationType === 'oidc' || integrationType === 'oauth2' || integrationType === 'saml') && (
                <button
                  type="button"
                  onClick={handleAutoPopulateKeycloak}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Auto-populate from Keycloak
                </button>
              )}
            </div>
            <select
              value={integrationType}
              onChange={(e) => setIntegrationType(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="oidc">OpenID Connect (OIDC)</option>
              <option value="oauth2">OAuth 2.0</option>
              <option value="saml">SAML 2.0</option>
              <option value="custom">Custom Integration</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schema.fields.map(renderField)}
      </div>

      {schema.setup_instructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            {schema.setup_instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>
      )}

      {!readonly && (
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isValidating}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 flex items-center gap-2"
            >
              {isValidating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />
              ) : validationStatus === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : validationStatus === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600" />
              ) : null}
              Test Connection
            </button>
            
            {validationStatus === 'success' && (
              <span className="text-sm text-green-600">Connection successful!</span>
            )}
            {validationStatus === 'error' && (
              <span className="text-sm text-red-600">Connection failed. Please check your configuration.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicToolConfiguration;