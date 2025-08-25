import { test, expect } from '@playwright/test';

test.describe('Loading Issue Debug', () => {
  test('should capture console logs and loading errors', async ({ page }) => {
    const consoleMessages = [];
    const networkErrors = [];
    
    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // Capture network errors
    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    // Navigate to page
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait longer to see if app eventually loads
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'loading-debug.png',
      fullPage: true 
    });
    
    // Check if we're still on loading screen
    const loadingVisible = await page.getByText('SSO Hub').first().isVisible();
    const dotsVisible = await page.locator('.loading-dots, [class*="loading"], [class*="spinner"]').count();
    
    console.log('=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => {
      console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
    });
    
    console.log('=== NETWORK ERRORS ===');
    networkErrors.forEach(err => {
      console.log(`Failed to load: ${err.url}`);
      console.log(`Error: ${err.failure?.errorText || 'Unknown'}`);
    });
    
    console.log('=== PAGE STATE ===');
    console.log('Page URL:', page.url());
    console.log('Loading screen visible:', loadingVisible);
    console.log('Loading indicators count:', dotsVisible);
    
    // Check if React has mounted
    const reactMounted = await page.evaluate(() => {
      return window.React !== undefined || document.querySelector('#root').children.length > 0;
    });
    console.log('React appears mounted:', reactMounted);
    
    // Check for specific elements
    const rootContent = await page.evaluate(() => {
      const root = document.querySelector('#root');
      return {
        hasChildren: root.children.length > 0,
        innerHTML: root.innerHTML.substring(0, 500) + '...'
      };
    });
    console.log('Root element content:', rootContent);
  });
});