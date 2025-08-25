import { test, expect } from '@playwright/test';

test('take screenshot with backend running', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for any loading to complete
  await page.waitForTimeout(3000);
  
  await page.screenshot({ 
    path: 'backend-running-screenshot.png',
    fullPage: true 
  });
  
  // Check for specific text
  const hasZeroClick = await page.getByText('Zero-Click').isVisible().catch(() => false);
  const hasLaunchSSO = await page.getByRole('button', { name: /Launch SSO Hub/i }).isVisible().catch(() => false);
  const hasGetStarted = await page.getByRole('button', { name: /Get Started/i }).isVisible().catch(() => false);
  
  console.log('Zero-Click visible:', hasZeroClick);
  console.log('Launch SSO Hub visible:', hasLaunchSSO);
  console.log('Get Started visible:', hasGetStarted);
});