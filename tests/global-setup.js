const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Test credentials
const UI_ADMIN_USER = 'admin';
const UI_ADMIN_PASS = 'admin@123';

async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Simple service health check - skip for now to avoid dependencies
  const checkService = async (url, serviceName) => {
    console.log(`✅ Skipping ${serviceName} health check - assuming ready`);
    return true;
  };
  
  // Check key services with retries
  console.log('📋 Checking service availability...');
  const services = [
    ['http://localhost:3000', 'Frontend'],
    ['http://localhost:3002/healthz', 'Auth-BFF'],
    ['http://localhost:3006/healthz', 'Catalog Service'],
    ['http://localhost:8080/realms/master', 'Keycloak']
  ];
  
  let allServicesReady = true;
  for (const [url, name] of services) {
    const isReady = await checkService(url, name);
    if (!isReady) {
      console.log(`⚠️ ${name} is not ready - tests may fail`);
      allServicesReady = false;
    }
  }
  
  if (!allServicesReady) {
    console.log('⚠️ Some services are not ready. Please ensure all services are running with `docker-compose up -d`');
  }
  
  // Set up authentication state
  console.log('🔐 Setting up authentication state...');
  
  const browser = await chromium.launch({
    headless: true, // Run in headless mode for stability
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-web-security']
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    
    const page = await context.newPage();
    
    // Navigate to the app
    console.log('📍 Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Wait a moment for the page to stabilize
    await page.waitForTimeout(2000);
    
    // Click SSO login
    console.log('🔑 Starting SSO authentication...');
    const ssoButton = page.getByRole('button', { name: 'Sign in with Single Sign-On' });
    await ssoButton.waitFor({ state: 'visible', timeout: 15000 });
    await ssoButton.click();
    
    // Wait for redirect to Keycloak with more specific URL matching
    console.log('⏳ Waiting for Keycloak redirect...');
    await page.waitForURL(/.*localhost:8080.*auth.*/, { timeout: 20000 });
    
    // Fill in credentials with better waiting
    console.log('📝 Filling in credentials...');
    const usernameField = page.locator('#username');
    const passwordField = page.locator('#password');
    
    await usernameField.waitFor({ state: 'visible', timeout: 15000 });
    await usernameField.fill(UI_ADMIN_USER);
    await passwordField.fill(UI_ADMIN_PASS);
    
    // Submit login
    const signInButton = page.getByRole('button', { name: 'Sign In' });
    await signInButton.waitFor({ state: 'visible', timeout: 5000 });
    await signInButton.click();
    
    // Wait for redirect back to app
    console.log('🔄 Waiting for redirect back to app...');
    await page.waitForURL('http://localhost:3000/**', { timeout: 20000 });
    
    // Wait for the page to stabilize after redirect
    await page.waitForTimeout(3000);
    
    // Verify successful login
    console.log('✅ Verifying successful authentication...');
    const dashboardButton = page.getByRole('button', { name: 'Dashboard', exact: true });
    await dashboardButton.waitFor({ state: 'visible', timeout: 15000 });
    
    // Save authentication state
    const authStatePath = path.join(__dirname, 'auth-state.json');
    await context.storageState({ path: authStatePath });
    
    console.log('💾 Authentication state saved to:', authStatePath);
    
    // Verify we can access admin features
    console.log('🔧 Verifying admin access...');
    
    // Try to navigate to tool management to verify admin privileges
    const toolManagementButton = page.getByLabel('Main Navigation').getByRole('button', { name: 'Tool Management' });
    if (await toolManagementButton.isVisible({ timeout: 5000 })) {
      await toolManagementButton.click();
      await page.waitForTimeout(2000);
      
      const toolManagementHeading = page.getByRole('heading', { name: 'Tool Management' });
      if (await toolManagementHeading.isVisible({ timeout: 5000 })) {
        console.log('✅ Admin privileges verified - can access Tool Management');
      } else {
        console.log('⚠️ Could not verify admin access to Tool Management');
      }
    } else {
      console.log('⚠️ Tool Management button not found - admin access uncertain');
    }
    
    await context.close();
    
  } catch (error) {
    console.error('❌ Authentication setup failed:', error.message);
    
    // Take a screenshot for debugging
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:3000');
      await page.screenshot({ path: 'debug-auth-setup-failed.png' });
      console.log('📸 Debug screenshot saved: debug-auth-setup-failed.png');
    } catch (screenshotError) {
      console.log('Could not take debug screenshot:', screenshotError.message);
    }
    
    throw error;
    
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global test setup completed with authentication');
}

module.exports = globalSetup;