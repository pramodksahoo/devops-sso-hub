import { test, expect } from '@playwright/test';

test.describe('Hero Section Final Validation', () => {
  test('should confirm hero section redesign is successfully implemented', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // CRITICAL: Check for new hero headline
    console.log('✓ Checking for Zero-Click headline...');
    await expect(page.getByText('Zero-Click')).toBeVisible();
    await expect(page.getByText('DevOps Access')).toBeVisible();
    
    // CRITICAL: Check for new hero buttons (specifically in hero section)
    console.log('✓ Checking for Launch SSO Hub button in hero section...');
    const heroSection = page.locator('section').first();
    await expect(heroSection.getByRole('button', { name: /Launch SSO Hub/i })).toBeVisible();
    await expect(heroSection.getByRole('button', { name: /Watch Demo/i })).toBeVisible();
    
    // VERIFY: Old headline should NOT be present
    console.log('✓ Verifying old headline is gone...');
    const oldHeadlineExists = await page.getByText('Secure Single Sign-On for Your Entire Toolchain').isVisible().catch(() => false);
    expect(oldHeadlineExists).toBe(false);
    
    // CHECK: Design elements
    console.log('✓ Checking design elements...');
    await expect(page.getByText('Transform Your DevOps Workflow')).toBeVisible();
    await expect(page.getByText('Eliminate password fatigue forever')).toBeVisible();
    
    // GitHub integration
    console.log('✓ Checking GitHub integration...');
    const githubLink = page.getByRole('link', { name: /Star on GitHub/i });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/pramodksahoo/agentic-devops-sso');
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'hero-section-final-success.png',
      fullPage: true 
    });
    
    console.log('🎉 HERO SECTION REDESIGN VALIDATION COMPLETE!');
    console.log('✅ Zero-Click DevOps Access headline: WORKING');
    console.log('✅ Launch SSO Hub button: WORKING');  
    console.log('✅ Watch Demo button: WORKING');
    console.log('✅ GitHub integration: WORKING');
    console.log('✅ Old design removed: CONFIRMED');
    console.log('✅ New design implemented: SUCCESS!');
  });
});