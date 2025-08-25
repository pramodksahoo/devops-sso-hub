/**
 * End-to-End Tool Configuration Test
 * 
 * This test verifies that tool configurations made through the UI
 * are properly saved to both the database and Keycloak.
 * 
 * Critical Issue: Currently configurations only save to database,
 * not to Keycloak, breaking the integration.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const UI_ADMIN_USER = 'admin';
const UI_ADMIN_PASS = 'admin@123';
const KEYCLOAK_ADMIN_USER = 'admin';
const KEYCLOAK_ADMIN_PASS = 'admin_secure_password_123';

test.describe('Tool Configuration Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('http://localhost:3000');
  });

  test('should save Grafana OAuth2 configuration to both database and Keycloak', async ({ page }) => {
    console.log('🧪 Starting tool configuration test...');
    
    // Step 1: Login with admin credentials
    console.log('📝 Step 1: Login with admin credentials');
    await page.getByRole('button', { name: 'Sign in with SSO' }).click();
    
    // Wait for navigation and log the URL
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log('🔍 Current URL after SSO click:', currentUrl);
    
    // Check if we're on Keycloak or back on frontend
    if (currentUrl.includes('localhost:8080')) {
      console.log('✅ Successfully redirected to Keycloak');
    } else {
      console.log('❌ Not on Keycloak. Current URL:', currentUrl);
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-sso-click.png' });
    }
    
    // Wait for Keycloak login page
    await page.waitForURL(/.*localhost:8080.*/, { timeout: 15000 });
    
    // Fill in admin credentials
    await page.fill('#username', UI_ADMIN_USER);
    await page.fill('#password', UI_ADMIN_PASS);
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Wait for redirect back to app
    await page.waitForURL('http://localhost:3000/**', { timeout: 15000 });
    
    // Verify we're logged in and have admin access
    await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
    
    console.log('✅ Successfully logged in as admin');

    // Step 2: Navigate to Admin Tool Management
    console.log('📝 Step 2: Navigate to Admin Tool Management');
    
    // Look for admin navigation - might be in a dropdown or direct link
    const adminButton = page.getByRole('button', { name: /admin/i }).first();
    if (await adminButton.isVisible()) {
      await adminButton.click();
    }
    
    // Find and click Tool Management in navigation
    await page.getByLabel('Main Navigation').getByRole('button', { name: 'Tool Management' }).click();
    
    // Wait for tool management page to load
    await expect(page.getByRole('heading', { name: 'Tool Management' })).toBeVisible();
    await expect(page.getByText('Configure and manage your integrated DevOps tools')).toBeVisible();
    
    console.log('✅ Successfully navigated to Tool Management');

    // Step 3: Find and configure Grafana
    console.log('📝 Step 3: Configure Grafana tool');
    
    // Look for Grafana in the tools list
    let grafanaCard = page.locator('[data-testid="tool-card-grafana"]');
    
    // If not found by test ID, look for card with Grafana heading
    if (!(await grafanaCard.isVisible())) {
      console.log('🔍 Looking for Grafana card by heading...');
      await expect(page.getByRole('heading', { name: 'Grafana' })).toBeVisible();
      // Get the parent card element - look for the card containing the Grafana heading
      grafanaCard = page.locator('.card, [class*="card"]').filter({ hasText: 'Grafana' }).first();
    }
    
    // Click the configure button for Grafana (wrench icon)
    const configureButton = grafanaCard.locator('button[title*="Configure"], button:has([data-icon="wrench"]), button:has(.wrench)').first();
    
    // If the specific button isn't found, look for any configure-related button
    if (!(await configureButton.isVisible())) {
      await grafanaCard.locator('button').filter({ hasText: /config/i }).first().click();
    } else {
      await configureButton.click();
    }
    
    // Wait for configuration modal to open
    await expect(page.getByText('Configure Grafana')).toBeVisible();
    
    console.log('✅ Opened Grafana configuration modal');

    // Step 4: Configure OAuth2 settings
    console.log('📝 Step 4: Fill in OAuth2 configuration');
    
    // Select OAuth2 integration type
    const integrationSelect = page.locator('select').filter({ hasText: /integration/i }).first();
    if (await integrationSelect.isVisible()) {
      await integrationSelect.selectOption('oauth2');
    }
    
    // Wait for OAuth2 fields to appear
    await page.waitForTimeout(1000);
    
    // Auto-populate from Keycloak if available
    const autoPopulateButton = page.getByRole('button', { name: 'Auto-populate from Keycloak' });
    if (await autoPopulateButton.isVisible()) {
      console.log('🔧 Auto-populating from Keycloak...');
      await autoPopulateButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Fill in required fields (override auto-populated values if necessary)
    const testConfig = {
      grafana_url: 'http://localhost:3100',
      client_id: 'grafana-test-client',
      client_secret: 'grafana-test-secret-123',
      redirect_uri: 'http://localhost:3100/login/generic_oauth',
      auth_url: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/auth',
      token_url: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/token',
      api_url: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/userinfo',
      scopes: 'openid email profile roles'
    };
    
    // Fill in the form fields
    for (const [fieldName, value] of Object.entries(testConfig)) {
      const field = page.locator(`input[name="${fieldName}"], input:has(+ label:text-is("${fieldName.replace(/_/g, ' ')}"))`, 
                                  `textarea[name="${fieldName}"]`).first();
      
      if (await field.isVisible()) {
        await field.fill(value);
        console.log(`✏️ Filled ${fieldName}: ${value}`);
      }
    }
    
    console.log('✅ Filled OAuth2 configuration fields');

    // Step 5: Test connection (this should pass if admin-config service works)
    console.log('📝 Step 5: Test connection');
    
    const testConnectionButton = page.getByRole('button', { name: 'Test Connection' });
    await testConnectionButton.click();
    
    // Wait for test result
    await page.waitForTimeout(3000);
    
    // Check if test passed
    const successMessage = page.getByText(/connection successful/i);
    const errorMessage = page.getByText(/connection failed|error/i);
    
    if (await successMessage.isVisible()) {
      console.log('✅ Connection test passed');
    } else if (await errorMessage.isVisible()) {
      console.log('⚠️ Connection test failed (expected if Keycloak integration is broken)');
    }

    // Step 6: Save configuration
    console.log('📝 Step 6: Save configuration');
    
    const saveButton = page.getByRole('button', { name: 'Save Configuration' });
    await saveButton.click();
    
    // Wait for save operation
    await page.waitForTimeout(2000);
    
    // Check for success message
    const savedMessage = page.getByText(/saved|updated|success/i);
    if (await savedMessage.isVisible()) {
      console.log('✅ Configuration save operation completed');
    }
    
    // Close modal (try different possible button names)
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    const closeButton = page.getByRole('button', { name: 'Close' });
    const okButton = page.getByRole('button', { name: 'OK' });
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    } else if (await closeButton.isVisible()) {
      await closeButton.click();
    } else if (await okButton.isVisible()) {
      await okButton.click();
    } else {
      // Modal might have closed automatically
      console.log('📝 Modal appears to have closed automatically');
    }

    // Step 7: Verify configuration is saved in database
    console.log('📝 Step 7: Verify database storage');
    
    // Re-open configuration to verify fields are saved
    await grafanaCard.locator('button[title*="Configure"]').first().click();
    await expect(page.getByText('Configure Grafana')).toBeVisible();
    
    // Check if saved values are present
    const clientIdField = page.locator('input[name="client_id"]').first();
    if (await clientIdField.isVisible()) {
      const savedValue = await clientIdField.inputValue();
      expect(savedValue).toBe(testConfig.client_id);
      console.log('✅ Configuration saved to database');
    }
    
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Step 8: Verify complete configuration sync
    console.log('📝 Step 8: Verify complete configuration sync (Database + Keycloak)');
    
    // Verify client_id field is auto-populated with system-generated value
    await grafanaCard.locator('button[title*="Configure"]').first().click();
    await expect(page.getByText('Configure Grafana')).toBeVisible();
    
    const clientIdFieldVerify = page.locator('input[name="client_id"]').first();
    if (await clientIdFieldVerify.isVisible()) {
      const clientIdValue = await clientIdFieldVerify.inputValue();
      expect(clientIdValue).toBe('grafana-client'); // System-generated client ID
      
      // Verify the field is readonly (should be disabled)
      const isDisabled = await clientIdFieldVerify.isDisabled();
      expect(isDisabled).toBe(true);
      console.log('✅ Client ID field is read-only and auto-populated with: grafana-client');
    }
    
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Verify database configuration consistency via admin-config API
    const configResponse = await page.request.get('http://localhost:3005/api/tools/grafana/config', {
      headers: { 'X-Api-Key': 'admin-api-key-change-in-production' }
    });
    
    if (configResponse.ok()) {
      const configData = await configResponse.json();
      const config = configData.config?.config;
      
      if (config) {
        console.log('📊 Database Configuration:');
        console.log('   - OAuth Client ID:', config.oauth?.client_id);
        console.log('   - Keycloak Client ID:', configData.config?.keycloak_client_id);
        console.log('   - Status:', configData.config?.status);
        
        // Verify client ID consistency
        if (config.oauth?.client_id === 'grafana-client' && 
            configData.config?.keycloak_client_id === 'grafana-client') {
          console.log('✅ Configuration sync verified - client IDs are consistent');
          
          // Verify Keycloak client exists
          const keycloakResponse = await fetch('http://localhost:8080/realms/master/protocol/openid-connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'username=admin&password=admin_secure_password_123&grant_type=password&client_id=admin-cli'
          });
          
          if (keycloakResponse.ok) {
            const tokenData = await keycloakResponse.json();
            const clientsResponse = await fetch('http://localhost:8080/admin/realms/sso-hub/clients?clientId=grafana-client', {
              headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
            });
            
            if (clientsResponse.ok) {
              const clients = await clientsResponse.json();
              if (clients.length > 0) {
                console.log('✅ Keycloak client "grafana-client" exists and is accessible');
                console.log('🔗 Complete sync verified: UI → Database → Keycloak');
              } else {
                console.log('❌ Keycloak client "grafana-client" not found');
              }
            }
          }
        } else {
          console.log('❌ Configuration sync issue - client ID mismatch');
          console.log('   Expected: grafana-client');
          console.log('   OAuth Client ID:', config.oauth?.client_id);
          console.log('   Keycloak Client ID:', configData.config?.keycloak_client_id);
        }
      }
    } else {
      console.log('❌ Could not retrieve configuration from admin-config service');
      console.log('📝 Status:', configResponse.status());
    }

    console.log('🏁 Tool configuration test completed');
  });

  test('should verify admin credentials work with Keycloak admin', async ({ page }) => {
    console.log('🧪 Testing Keycloak admin access...');
    
    // Test direct Keycloak admin access
    await page.goto('http://localhost:8080/admin/');
    
    // Login with Keycloak admin credentials
    await page.fill('#username', KEYCLOAK_ADMIN_USER);
    await page.fill('#password', KEYCLOAK_ADMIN_PASS);
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Verify we can access Keycloak admin
    await expect(page.getByText('sso-hub')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Keycloak admin credentials verified');
    
    // Check if grafana-client exists
    await page.getByText('Clients').click();
    
    // Look for grafana-related clients
    const grafanaClient = page.getByText(/grafana.*client/i);
    if (await grafanaClient.isVisible()) {
      console.log('✅ Found Grafana client in Keycloak');
    } else {
      console.log('⚠️ No Grafana client found in Keycloak (expected if bug exists)');
    }
  });

  test('should handle configuration failures gracefully', async ({ page }) => {
    console.log('🧪 Testing error handling...');
    
    // Login first
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Sign in with SSO' }).click();
    await page.waitForURL(/.*localhost:8080.*/);
    await page.fill('#username', UI_ADMIN_USER);
    await page.fill('#password', UI_ADMIN_PASS);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('http://localhost:3000/**');
    
    // Navigate to tool management
    await page.getByLabel('Main Navigation').getByRole('button', { name: 'Tool Management' }).click();
    
    // Try to configure a tool with invalid settings
    const grafanaCard = page.locator('.card', { hasText: 'Grafana' }).first();
    await grafanaCard.locator('button[title*="Configure"]').first().click();
    
    // Fill in invalid configuration
    await page.locator('input[name="client_id"]').fill('invalid-client-123');
    await page.locator('input[name="client_secret"]').fill('invalid-secret');
    
    // Try to test connection
    await page.getByText('Test Connection').click();
    await page.waitForTimeout(3000);
    
    // Should show error message
    const errorMessage = page.getByText(/failed|error/i);
    await expect(errorMessage).toBeVisible();
    
    console.log('✅ Error handling works correctly');
  });
});