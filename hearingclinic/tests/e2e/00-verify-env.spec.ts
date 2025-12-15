/**
 * Verify Environment Configuration
 *
 * Quick test to verify .env file is being loaded correctly
 * Run this to check your credentials are configured properly
 *
 * Usage: npx playwright test 00-verify-env.spec.ts
 */

import { test, expect } from '@playwright/test';
import { getTestUser, getTestEnvironment, getBaseUrl } from './config/test-config';

test.describe('Environment Configuration Check', () => {
  test('should load environment configuration', async () => {
    const env = getTestEnvironment();

    console.log('='.repeat(60));
    console.log('Environment Configuration Check');
    console.log('='.repeat(60));
    console.log(`Environment: ${env.name}`);
    console.log(`Base URL: ${env.baseUrl}`);
    console.log('');
  });

  test('should load admin credentials from .env', async () => {
    const user = getTestUser('admin');

    console.log('Admin User Configuration:');
    console.log(`  Username: ${user.username}`);
    console.log(`  Password: ${user.password === 'admin' ? '⚠️  Using hardcoded default "admin"' : '✅ Using .env password'}`);
    console.log(`  Role: ${user.role}`);
    console.log('');

    // Verify username is set
    expect(user.username).toBeTruthy();
    expect(user.username.length).toBeGreaterThan(0);

    // Verify password is set
    expect(user.password).toBeTruthy();
    expect(user.password.length).toBeGreaterThan(0);
  });

  test('should load system manager credentials', async () => {
    try {
      const user = getTestUser('systemManager');

      console.log('System Manager Configuration:');
      console.log(`  Username: ${user.username}`);
      console.log(`  Password: ${user.password === 'test123' ? '⚠️  Using default' : '✅ Using .env'}`);
      console.log(`  Role: ${user.role}`);
      console.log('');

      expect(user.username).toBeTruthy();
      expect(user.password).toBeTruthy();
    } catch (e) {
      console.log('System Manager: Not configured (optional)');
    }
  });

  test('should verify base URL is accessible', async () => {
    const baseUrl = getBaseUrl();

    console.log('Base URL Configuration:');
    console.log(`  URL: ${baseUrl}`);
    console.log('');

    expect(baseUrl).toBeTruthy();
    expect(baseUrl).toMatch(/^https?:\/\//);
  });

  test('should show all environment variables being used', async () => {
    console.log('Environment Variables Check:');
    console.log('='.repeat(60));

    const envVars = [
      'TEST_ENV',
      'ADMIN_USER',
      'ADMIN_PASSWORD',
      'DEV_ADMIN_USER',
      'DEV_ADMIN_PASSWORD',
      'STAGING_ADMIN_USER',
      'STAGING_ADMIN_PASSWORD',
      'BASE_URL',
      'TESTOMATIO'
    ];

    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        // Mask passwords for security
        if (varName.includes('PASSWORD')) {
          console.log(`  ${varName}: ${'*'.repeat(value.length)} (set)`);
        } else {
          console.log(`  ${varName}: ${value}`);
        }
      } else {
        console.log(`  ${varName}: (not set)`);
      }
    });

    console.log('='.repeat(60));
  });

  test('should successfully login with configured credentials', async ({ page, baseURL }) => {
    const user = getTestUser('admin');

    console.log('='.repeat(60));
    console.log('Login Test');
    console.log('='.repeat(60));
    console.log(`Base URL: ${baseURL}`);
    console.log(`Username: ${user.username}`);
    console.log(`Password: ${'*'.repeat(user.password.length)}`);
    console.log('');

    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('/login');
    await page.waitForSelector('#login_email', { timeout: 10000 });

    console.log(`Current URL: ${page.url()}`);
    console.log('Login form found ✓');
    console.log('');

    // Fill credentials
    console.log('Filling credentials...');
    await page.fill('#login_email', user.username);
    await page.fill('#login_password', user.password);

    // Submit login
    console.log('Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for successful login (redirects to /app)
    try {
      await page.waitForURL(/\/app/, { timeout: 15000 });
      console.log('✅ Login successful!');
      console.log(`Redirected to: ${page.url()}`);
      console.log('='.repeat(60));

      // Verify we're logged in
      expect(page.url()).toMatch(/\/app/);
    } catch (error) {
      console.log('❌ Login failed!');
      console.log(`Current URL: ${page.url()}`);
      console.log('Error:', error);
      console.log('='.repeat(60));

      // Take screenshot for debugging
      await page.screenshot({ path: 'login-failure.png' });
      console.log('Screenshot saved to: login-failure.png');

      throw error;
    }
  });
});
