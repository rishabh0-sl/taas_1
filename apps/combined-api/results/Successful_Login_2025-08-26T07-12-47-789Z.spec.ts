import { test, expect } from '@playwright/test';

test('Successful Login', async ({ page }) => {
  // Navigate to the page
  await page.goto('https://www.amazon.com/');

  // Click on element
  await page.locator('#nav-link-accountList').click();

  // Click on element
  await page.locator('#ap_email').click();

  // Fill input field
  await page.locator('#ap_email').fill('f20221142');

  // Click on element
  await page.locator('#continue').click();

  // Fill input field
  await page.locator('#ap_password').fill('23');

  // Click on element
  await page.locator('#signInSubmit').click();

  // Verify element
  await expect(page.locator('#nav-link-accountList span')).toBeVisible();
});
