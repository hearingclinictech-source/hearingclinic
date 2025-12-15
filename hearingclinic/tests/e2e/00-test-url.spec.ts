/**
 * Test what URL Playwright is actually using
 */

import { test, expect } from '@playwright/test';

test('check playwright base URL', async ({ page, baseURL }) => {
  console.log('='.repeat(60));
  console.log('Playwright Base URL Check');
  console.log('='.repeat(60));
  console.log('baseURL from context:', baseURL);
  console.log('process.env.BASE_URL:', process.env.BASE_URL);
  console.log('='.repeat(60));

  // Try to navigate to login
  await page.goto('/login');
  console.log('Current URL after goto(/login):', page.url());

  expect(baseURL).toBeTruthy();
});
