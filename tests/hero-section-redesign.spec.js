import { test, expect } from '@playwright/test';

test.describe('Hero Section Redesign', () => {
  test('should display the new hero section design with Zero-Click DevOps Access', async ({ page }) => {
    // Navigate to the home page
    await page.goto('http://localhost:3000');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check for the new hero heading "Zero-Click DevOps Access"
    const heroHeading = page.locator('h1#hero-heading');
    await expect(heroHeading).toBeVisible();
    
    // Check for "Zero-Click" text specifically
    await expect(page.getByText('Zero-Click')).toBeVisible();
    await expect(page.getByText('DevOps Access')).toBeVisible();
    
    // Check for the enhanced subtitle
    await expect(page.getByText('Transform Your DevOps Workflow')).toBeVisible();
    
    // Check for the new enhanced description
    await expect(page.getByText('Eliminate password fatigue forever')).toBeVisible();
    await expect(page.getByText('One secure login')).toBeVisible();
    
    // Check for the new CTA button text
    await expect(page.getByRole('button', { name: /Launch SSO Hub/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Watch Demo/i })).toBeVisible();
    
    // Check for trust indicators
    await expect(page.getByText('Active DevOps Teams')).toBeVisible();
    await expect(page.getByText('Star on GitHub')).toBeVisible();
    await expect(page.getByText('SOC 2 Compliant')).toBeVisible();
    
    // Check for animated background elements
    await expect(page.locator('.bg-gradient-to-br.from-purple-900')).toBeVisible();
    
    // Check for the enhanced dashboard preview
    await expect(page.getByText('Live Dashboard')).toBeVisible();
    await expect(page.getByText('DevOps Ecosystem')).toBeVisible();
    
    // Verify ROI Calculator is present
    await expect(page.getByText('ROI Calculator')).toBeVisible();
    
    // Verify System Health Widget is present
    await expect(page.getByText('System Health')).toBeVisible();
    
    // Take a screenshot for visual comparison
    await page.screenshot({ 
      path: 'hero-section-new-design.png',
      fullPage: true 
    });
  });

  test('should have interactive elements working correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Test hover effects on CTA buttons
    const launchButton = page.getByRole('button', { name: /Launch SSO Hub/i });
    await expect(launchButton).toBeVisible();
    
    // Hover over the button to test animations
    await launchButton.hover();
    
    // Test GitHub link
    const githubLink = page.getByRole('link', { name: /Star on GitHub/i });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/pramodksahoo/agentic-devops-sso');
    
    // Test tool status indicators
    const toolLogos = page.locator('img[alt*="GitHub"], img[alt*="GitLab"], img[alt*="Jenkins"]');
    await expect(toolLogos.first()).toBeVisible();
    
    // Verify animated counters are present
    const activeUsersCounter = page.getByText(/\d+\+/).first();
    await expect(activeUsersCounter).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check that hero elements are still visible on mobile
    await expect(page.getByText('Zero-Click')).toBeVisible();
    await expect(page.getByText('DevOps Access')).toBeVisible();
    
    // Check mobile layout
    const heroSection = page.locator('section[role="main"]');
    await expect(heroSection).toBeVisible();
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'hero-section-mobile.png',
      fullPage: true 
    });
  });

  test('should verify old design elements are replaced', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Verify OLD text is NOT present
    const oldHeadingExists = await page.getByText('Secure Single Sign-On for Your Entire Toolchain').isVisible().catch(() => false);
    expect(oldHeadingExists).toBe(false);
    
    // Verify OLD button text is NOT present
    const oldButtonExists = await page.getByRole('button', { name: /Get Started/i }).isVisible().catch(() => false);
    expect(oldButtonExists).toBe(false);
    
    // Verify NEW design elements ARE present
    await expect(page.getByText('Zero-Click DevOps Access')).toBeVisible();
    await expect(page.getByRole('button', { name: /Launch SSO Hub/i })).toBeVisible();
  });
});