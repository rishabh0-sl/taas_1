import { test, expect } from '@playwright/test';

test('Failed Login Incorrect Password', async ({ page }) => {
  // Navigate to the page
  await page.goto('https://www.amazon.com/');

  // Click on element
  await page.locator('#nav-link-accountList').click();

  // Fill input field
  await page.locator('#ap_email').fill('12');

  // Fill input field
  await page.locator('#ap_password').fill('123');

  // Click on element
  await page.locator('#signInSubmit').click();

  // Verify element
  await expect(page.locator('.a-alert-content')).toBeVisible();
});
