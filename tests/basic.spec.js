const { test, expect } = require('@playwright/test');

test('basic functionality test', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('http://localhost:3000');
  
  // Check that the page loads
  await expect(page.getByText('SSO Hub')).toBeVisible();
  
  // Check that Sign in button exists
  await expect(page.getByRole('button', { name: 'Sign in with SSO' })).toBeVisible();
  
  console.log('✅ Basic functionality test passed');
});