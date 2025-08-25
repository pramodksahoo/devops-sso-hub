const { test, expect } = require('@playwright/test');

test.describe('Tools Page Verification', () => {
  test('should load Tools page correctly', async ({ page }) => {
    console.log('🔍 Starting Tools page verification...\n');
    
    // Navigate to tools page
    console.log('📍 Navigating to http://localhost:3000/tools...');
    await page.goto('http://localhost:3000/tools', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for React hydration
    await page.waitForTimeout(3000);
    
    // Check basic page structure
    await expect(page.locator('#root')).toBeVisible();
    
    // Check for DevOps Tools heading
    const heading = page.getByText('DevOps Tools');
    await expect(heading).toBeVisible();
    console.log('✅ DevOps Tools heading found');
    
    // Check for search functionality
    const searchInput = page.getByPlaceholder('Search tools...');
    await expect(searchInput).toBeVisible();
    console.log('✅ Search input found');
    
    // Check for tool cards (should have multiple tools)
    const toolCards = page.locator('.card, [data-testid*="tool"], [class*="Card"]');
    const cardCount = await toolCards.count();
    console.log(`✅ Found ${cardCount} tool cards`);
    expect(cardCount).toBeGreaterThan(0);
    
    // Check for category filters
    const categoryButtons = page.locator('button:has-text("All"), button:has-text("CI-CD"), button:has-text("Security")');
    const buttonCount = await categoryButtons.count();
    console.log(`✅ Found ${buttonCount} category filter buttons`);
    expect(buttonCount).toBeGreaterThan(0);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'tools-page-verification.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: tools-page-verification.png');
    
    // Check page content is substantial
    const content = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        contentLength: root?.innerHTML?.length || 0,
        title: document.title,
        url: window.location.href
      };
    });
    
    console.log(`📝 Page content length: ${content.contentLength} characters`);
    console.log(`📄 Page title: ${content.title}`);
    console.log(`🌐 Current URL: ${content.url}`);
    
    expect(content.contentLength).toBeGreaterThan(1000);
    expect(content.url).toContain('/tools');
    
    console.log('✅ Tools page verification PASSED - Page is working correctly!');
  });
});