import { test, expect } from '@playwright/test';

test.describe('Hero Section Cache Test', () => {
  test('should display new hero section with cache disabled', async ({ context, page }) => {
    // Disable cache for this test
    await context.route('**/*', route => {
      const headers = {
        ...route.request().headers(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      route.continue({ headers });
    });
    
    // Navigate with hard refresh
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Force reload
    await page.reload({ waitUntil: 'networkidle' });
    
    // Take screenshot first for debugging
    await page.screenshot({ 
      path: 'cache-test-debug.png',
      fullPage: true 
    });
    
    // Check for new elements
    console.log('Looking for new headline...');
    const zeroClickText = await page.getByText('Zero-Click').isVisible().catch(() => false);
    console.log('Zero-Click visible:', zeroClickText);
    
    const devopsAccessText = await page.getByText('DevOps Access').isVisible().catch(() => false);
    console.log('DevOps Access visible:', devopsAccessText);
    
    const launchButton = await page.getByRole('button', { name: /Launch SSO Hub/i }).isVisible().catch(() => false);
    console.log('Launch SSO Hub button visible:', launchButton);
    
    // Check for old elements
    const oldHeading = await page.getByText('Secure Single Sign-On for Your Entire Toolchain').isVisible().catch(() => false);
    console.log('Old heading visible:', oldHeading);
    
    const getStartedButton = await page.getByRole('button', { name: /Get Started/i }).isVisible().catch(() => false);
    console.log('Get Started button visible:', getStartedButton);
    
    // Print page title and URL for verification
    const title = await page.title();
    const url = page.url();
    console.log('Page title:', title);
    console.log('Current URL:', url);
    
    // Get page content for analysis
    const content = await page.content();
    const hasZeroClick = content.includes('Zero-Click');
    const hasLaunchSSO = content.includes('Launch SSO Hub');
    const hasOldHeading = content.includes('Secure Single Sign-On for Your Entire Toolchain');
    const hasGetStarted = content.includes('Get Started');
    
    console.log('Content analysis:');
    console.log('- Contains Zero-Click:', hasZeroClick);
    console.log('- Contains Launch SSO Hub:', hasLaunchSSO);
    console.log('- Contains old heading:', hasOldHeading);  
    console.log('- Contains Get Started:', hasGetStarted);
    
    // Assert the new design is present
    expect(zeroClickText).toBe(true);
    expect(launchButton).toBe(true);
    expect(oldHeading).toBe(false);
    expect(getStartedButton).toBe(false);
  });
});