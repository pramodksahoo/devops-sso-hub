import { test, expect } from '@playwright/test';

test('detailed button analysis', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for any loading to complete
  await page.waitForTimeout(3000);
  
  // Get all buttons on the page
  const allButtons = await page.locator('button').all();
  
  console.log('Total buttons found:', allButtons.length);
  
  // Check each button's text content
  for (let i = 0; i < allButtons.length; i++) {
    const button = allButtons[i];
    const text = await button.textContent();
    const isVisible = await button.isVisible();
    console.log(`Button ${i}: "${text}" (visible: ${isVisible})`);
  }
  
  // Specifically look for hero section buttons
  console.log('\n=== HERO SECTION ANALYSIS ===');
  
  // Find the main hero section
  const heroSection = page.locator('section').first();
  const heroButtons = await heroSection.locator('button').all();
  
  console.log('Hero section buttons:', heroButtons.length);
  for (let i = 0; i < heroButtons.length; i++) {
    const button = heroButtons[i];
    const text = await button.textContent();
    const isVisible = await button.isVisible();
    console.log(`Hero Button ${i}: "${text}" (visible: ${isVisible})`);
  }
  
  // Check for specific text patterns
  console.log('\n=== TEXT PATTERN CHECK ===');
  const launchButtons = await page.getByText('Launch SSO Hub').all();
  const getStartedButtons = await page.getByText('Get Started').all();
  const signInButtons = await page.getByText('Sign in Now').all();
  
  console.log('Launch SSO Hub instances:', launchButtons.length);
  console.log('Get Started instances:', getStartedButtons.length);
  console.log('Sign in Now instances:', signInButtons.length);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'detailed-button-analysis.png',
    fullPage: true 
  });
});