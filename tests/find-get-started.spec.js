import { test, expect } from '@playwright/test';

test('find get started text', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Find the exact element containing "Get Started"
  const getStartedElements = await page.getByText('Get Started').all();
  
  console.log('Get Started elements found:', getStartedElements.length);
  
  for (let i = 0; i < getStartedElements.length; i++) {
    const element = getStartedElements[i];
    const tagName = await element.evaluate(el => el.tagName);
    const text = await element.textContent();
    const isVisible = await element.isVisible();
    const className = await element.evaluate(el => el.className);
    
    console.log(`\nElement ${i}:`);
    console.log(`  Tag: ${tagName}`);
    console.log(`  Text: "${text}"`);
    console.log(`  Visible: ${isVisible}`);
    console.log(`  Class: "${className}"`);
    
    // Get parent element info
    const parent = await element.evaluate(el => ({
      tagName: el.parentElement?.tagName,
      className: el.parentElement?.className
    }));
    console.log(`  Parent: ${parent.tagName} (${parent.className})`);
  }
  
  // Also check if there's partial text matches
  const getStartedPartial = await page.getByText(/get started/i).all();
  console.log('\nPartial matches (get started):', getStartedPartial.length);
  
  // Check the page source for the text
  const pageSource = await page.content();
  const getStartedMatches = (pageSource.match(/Get Started/gi) || []).length;
  console.log('Total "Get Started" in HTML source:', getStartedMatches);
});