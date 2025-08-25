import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { getToolConfigurationSchema, getDefaultIntegrationType, validateConfigurationField, BaseConfigField, ToolConfigSchema } from './ToolConfigurationSchemas';
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
    const toolSchema = getToolConfigurationSchema(tool.slug, integrationType);
    setSchema(toolSchema);
    
    // Initialize form data with existing auth_config or defaults
    const initialData = { ...tool.auth_config };
    
    // Ensure all schema fields have values
    toolSchema.fields.forEach(field => {
      if (!(field.name in initialData)) {
        // For readonly client_id fields, auto-generate the protocol-specific value
        if (field.name === 'client_id' && field.readonly) {
          const protocol = integrationType === 'oauth2' ? 'oauth2' : integrationType === 'oidc' ? 'oidc' : integrationType === 'saml' ? 'saml' : 'oauth2';
          initialData[field.name] = `${tool.slug}-client-${protocol}`;
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
      // Transform form data for test connection (same as save)
      let testConfig = formData;
      
      if (tool.slug === 'grafana' && integrationType === 'oauth2') {
        testConfig = {
          // Core settings
          enabled: formData.enabled !== undefined ? formData.enabled : true,
          
          // Core OAuth2 settings for Grafana generic_oauth
          grafana_url: formData.grafana_url,
          client_id: formData.client_id,
          client_secret: formData.client_secret,
          
          // Client configuration
          client_protocol: formData.client_protocol || 'openid-connect',
          access_type: formData.access_type || 'confidential',
          
          // Flow settings
          standard_flow_enabled: formData.standard_flow_enabled !== undefined ? formData.standard_flow_enabled : true,
          implicit_flow_enabled: formData.implicit_flow_enabled !== undefined ? formData.implicit_flow_enabled : false,
          direct_access_grants_enabled: formData.direct_access_grants_enabled !== undefined ? formData.direct_access_grants_enabled : false,
          
          // URLs
          auth_url: formData.auth_url,
          token_url: formData.token_url,
          api_url: formData.api_url,
          
          // Redirect and origin settings
          redirect_uri: formData.redirect_uri,
          web_origins: formData.web_origins || config.external.grafana,
          admin_url: formData.admin_url || config.external.grafana,
          base_url: formData.base_url || config.external.grafana,
          
          // OAuth scopes and token settings
          scopes: formData.scopes || 'openid email profile offline_access roles',
          use_refresh_token: formData.use_refresh_token !== undefined ? formData.use_refresh_token : true,
          allow_sign_up: formData.allow_sign_up !== undefined ? formData.allow_sign_up : true,
          signout_redirect_url: formData.signout_redirect_url || '',
          
          // Ensure PKCE is disabled for Grafana compatibility
          use_pkce: false,
          
          // Additional metadata for backend processing
          keycloak: {
            realm: 'sso-hub',
            client_id: formData.client_id
          }
        };
      }

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
          
          // For Grafana, map the OAuth2 config to the specific form fields
          let mappedConfig = result.config;
          if (tool.slug === 'grafana' && integrationType === 'oauth2') {
            // Map OAuth2 fields to Grafana-specific fields with comprehensive configuration
            mappedConfig = {
              // Core settings
              enabled: result.config.enabled !== undefined ? result.config.enabled : true,
              
              // Keep existing Grafana URL or use default
              grafana_url: formData.grafana_url || result.config.grafana_url || config.external.grafana,
              
              // Auto-populate from Keycloak
              client_id: result.config.client_id,
              client_secret: result.config.client_secret,
              
              // Client configuration
              client_protocol: result.config.client_protocol || 'openid-connect',
              access_type: result.config.access_type || 'confidential',
              
              // Flow settings
              standard_flow_enabled: result.config.standard_flow_enabled !== undefined ? result.config.standard_flow_enabled : true,
              implicit_flow_enabled: result.config.implicit_flow_enabled !== undefined ? result.config.implicit_flow_enabled : false,
              direct_access_grants_enabled: result.config.direct_access_grants_enabled !== undefined ? result.config.direct_access_grants_enabled : false,
              
              // URLs (auto-generated from system settings)
              auth_url: result.config.auth_url,
              token_url: result.config.token_url,
              api_url: result.config.api_url || result.config.userinfo_url,
              
              // Redirect and origin settings
              redirect_uri: formData.redirect_uri || result.config.redirect_uri || `${config.external.grafana}/login/generic_oauth`,
              web_origins: result.config.web_origins || config.external.grafana,
              admin_url: result.config.admin_url || config.external.grafana,
              base_url: result.config.base_url || config.external.grafana,
              
              // OAuth scopes
              scopes: result.config.scopes || 'openid email profile offline_access roles',
              
              // OAuth behaviors
              use_refresh_token: result.config.use_refresh_token !== undefined ? result.config.use_refresh_token : true,
              allow_sign_up: result.config.allow_sign_up !== undefined ? result.config.allow_sign_up : true,
              signout_redirect_url: result.config.signout_redirect_url || `${config.external.keycloak}/realms/sso-hub/protocol/openid-connect/logout`
            };
          }
          
          // Auto-populate the form with fresh Keycloak configuration
          setFormData(prev => {
            const newData = {
              ...prev,
              ...mappedConfig
            };
            console.log('Form data updated:', newData);
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

    // Transform form data to match backend schema structure
    let configData = formData;
    
    if (tool.slug === 'grafana' && integrationType === 'oauth2') {
      // Transform flat form data to comprehensive Grafana OAuth2 configuration structure
      configData = {
        // Core settings
        enabled: formData.enabled !== undefined ? formData.enabled : true,
        
        // Core OAuth2 settings for Grafana generic_oauth
        grafana_url: formData.grafana_url,
        client_id: formData.client_id,
        client_secret: formData.client_secret,
        
        // Client configuration
        client_protocol: formData.client_protocol || 'openid-connect',
        access_type: formData.access_type || 'confidential',
        
        // Flow settings
        standard_flow_enabled: formData.standard_flow_enabled !== undefined ? formData.standard_flow_enabled : true,
        implicit_flow_enabled: formData.implicit_flow_enabled !== undefined ? formData.implicit_flow_enabled : false,
        direct_access_grants_enabled: formData.direct_access_grants_enabled !== undefined ? formData.direct_access_grants_enabled : false,
        
        // URLs (auto-generated)
        auth_url: formData.auth_url,
        token_url: formData.token_url,
        api_url: formData.api_url,
        
        // Redirect and origin settings
        redirect_uri: formData.redirect_uri,
        web_origins: formData.web_origins || config.external.grafana,
        admin_url: formData.admin_url || config.external.grafana,
        base_url: formData.base_url || config.external.grafana,
        
        // OAuth scopes and token settings
        scopes: formData.scopes || 'openid email profile offline_access roles',
        use_refresh_token: formData.use_refresh_token !== undefined ? formData.use_refresh_token : true,
        allow_sign_up: formData.allow_sign_up !== undefined ? formData.allow_sign_up : true,
        signout_redirect_url: formData.signout_redirect_url || '',
        
        // Ensure PKCE is disabled for Grafana compatibility
        use_pkce: false,
        
        // Additional metadata for backend processing
        keycloak: {
          realm: 'sso-hub',
          client_id: formData.client_id
        }
      };
    }

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