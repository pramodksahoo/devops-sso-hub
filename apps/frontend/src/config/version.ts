/**
 * Application Version Configuration
 * 
 * This file centralizes version information for the SSO Hub application.
 * Update this file when releasing new versions.
 */

export const APP_VERSION = {
  // Main version number (semantic versioning)
  version: '1.0.0',
  
  // Build/release type
  releaseType: 'Enterprise',
  
  // Build date (auto-generated or manual)
  buildDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  
  // Git commit hash (can be populated during build)
  commitHash: import.meta.env?.VITE_GIT_COMMIT || 'development',
  
  // Environment
  environment: import.meta.env?.MODE || 'production',
  
  // Full version string for display
  get fullVersion() {
    return `v${this.version}`;
  },
  
  // Full version with build info
  get detailedVersion() {
    return `v${this.version} • ${this.releaseType}`;
  },
  
  // Version for footer display
  get footerVersion() {
    return `${this.fullVersion} • ${this.releaseType}`;
  }
};

// Export individual components for convenience
export const { version, releaseType, fullVersion, detailedVersion, footerVersion } = APP_VERSION;
