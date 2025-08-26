import { test, expect } from '@playwright/test';

test('Unsuccessful Login Invalid Credentials', async ({ page }) => {
  // Navigate to the page
  await page.goto('https://www.amazon.com');

  // Click on element
  await page.locator('#nav-link-accountList').click();

  // Click on element
  await page.locator('#ap_email').click();

  // Fill input field
  await page.locator('#ap_email').fill('123');

  // Fill input field
  await page.locator('#ap_password').fill('123');

  // Click on element
  await page.locator('#signInSubmit').click();

  // Verify element
  await expect(page.locator('div[data-csa-c-type='test-content']')).toBeVisible();
});
