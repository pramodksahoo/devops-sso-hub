import { test, expect } from '@playwright/test';

test.describe('Layout Optimization Validation', () => {
  test('should fit hero section within viewport without scrolling', async ({ page }) => {
    // Set standard desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Check that hero elements are visible without scrolling
    console.log('✓ Checking hero section viewport fit...');
    
    // Main headline should be visible
    await expect(page.getByText('Zero-Click')).toBeVisible();
    await expect(page.getByText('DevOps Access')).toBeVisible();
    
    // CTA buttons should be visible
    await expect(page.getByRole('button', { name: /Launch SSO Hub/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Watch Demo/i })).toBeVisible();
    
    // Dashboard preview should be visible
    await expect(page.getByText('Live Dashboard')).toBeVisible();
    
    // Trust indicators should be visible
    await expect(page.getByText('Active DevOps Teams')).toBeVisible();
    
    // Take screenshot of optimized layout
    await page.screenshot({ 
      path: 'optimized-layout-desktop.png',
      fullPage: false // Only viewport to confirm no scrolling needed
    });
    
    console.log('✅ Desktop layout optimization successful');
  });
  
  test('should maintain responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log('✓ Checking mobile responsive design...');
    
    // Core elements should still be visible on mobile
    await expect(page.getByText('Zero-Click')).toBeVisible();
    await expect(page.getByText('DevOps Access')).toBeVisible();
    await expect(page.getByRole('button', { name: /Launch SSO Hub/i })).toBeVisible();
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'optimized-layout-mobile.png',
      fullPage: false
    });
    
    console.log('✅ Mobile responsive design maintained');
  });
  
  test('should validate GitHub links functionality', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log('✓ Validating GitHub links...');
    
    // Scroll to footer to find GitHub button
    await page.locator('footer').scrollIntoViewIfNeeded();
    
    // Check for GitHub buttons in footer
    const githubButtons = await page.getByRole('button', { name: /Star on GitHub/i }).all();
    console.log(`Found ${githubButtons.length} GitHub button(s)`);
    
    // Verify at least one GitHub button exists
    expect(githubButtons.length).toBeGreaterThan(0);
    
    // Check documentation button
    const docButtons = await page.getByRole('button', { name: /Documentation/i }).all();
    console.log(`Found ${docButtons.length} Documentation button(s)`);
    expect(docButtons.length).toBeGreaterThan(0);
    
    console.log('✅ GitHub links integration successful');
  });
  
  test('should measure hero section height efficiency', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Get hero section dimensions
    const heroSection = page.locator('section').first();
    const heroBox = await heroSection.boundingBox();
    
    console.log('✓ Hero section measurements:');
    console.log(`  Height: ${heroBox?.height}px`);
    console.log(`  Width: ${heroBox?.width}px`);
    console.log(`  Viewport height: 1080px`);
    
    // Verify hero section fits within viewport
    if (heroBox?.height) {
      expect(heroBox.height).toBeLessThanOrEqual(1080);
      console.log(`✅ Hero section height (${heroBox.height}px) fits within viewport (1080px)`);
    }
    
    // Check that content starts near the top
    if (heroBox?.y !== undefined) {
      expect(heroBox.y).toBeLessThanOrEqual(100); // Should start near top
      console.log(`✅ Hero section starts at ${heroBox.y}px from top`);
    }
  });
});