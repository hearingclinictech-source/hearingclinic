/**
 * E2E Test Configuration
 *
 * Environment-specific settings for E2E tests
 * Configure via environment variables or .env file
 */

// Load .env file if it exists
import dotenv from 'dotenv';
import path from 'path';

// Try to load .env from project root (apps/hearingclinic/.env)
// From: hearingclinic/tests/e2e/config/test-config.ts
// To:   .env (4 levels up)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export interface TestUser {
  username: string;
  password: string;
  role: string;
}

export interface TestEnvironment {
  name: string;
  baseUrl: string;
  users: {
    admin: TestUser;
    systemManager: TestUser;
    salesUser?: TestUser;
    accountant?: TestUser;
  };
}

/**
 * Test environments configuration
 * All credentials now read from environment variables first, with fallback defaults
 */
export const environments: Record<string, TestEnvironment> = {
  development: {
    name: 'Development',
    baseUrl: process.env.DEV_BASE_URL || 'http://development.localhost:8000',
    users: {
      admin: {
        username: process.env.DEV_ADMIN_USER || process.env.ADMIN_USER || 'Administrator',
        password: process.env.DEV_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin',
        role: 'Administrator'
      },
      systemManager: {
        username: process.env.DEV_MANAGER_USER || 'test.manager@hearingclinic.local',
        password: process.env.DEV_MANAGER_PASSWORD || 'test123',
        role: 'System Manager'
      },
      salesUser: {
        username: process.env.DEV_SALES_USER || 'test.sales@hearingclinic.local',
        password: process.env.DEV_SALES_PASSWORD || 'test123',
        role: 'Sales User'
      },
      accountant: {
        username: process.env.DEV_ACCOUNTANT_USER || 'test.accountant@hearingclinic.local',
        password: process.env.DEV_ACCOUNTANT_PASSWORD || 'test123',
        role: 'Accounts User'
      }
    }
  },

  staging: {
    name: 'Staging',
    baseUrl: 'https://hc-staging.emu-mora.ts.net',
    users: {
      admin: {
        username: process.env.STAGING_ADMIN_USER || 'Administrator',
        password: process.env.STAGING_ADMIN_PASSWORD || '',
        role: 'Administrator'
      },
      systemManager: {
        username: process.env.STAGING_MANAGER_USER || 'test.manager@hearingclinic.com',
        password: process.env.STAGING_MANAGER_PASSWORD || '',
        role: 'System Manager'
      },
      salesUser: {
        username: process.env.STAGING_SALES_USER || 'test.sales@hearingclinic.com',
        password: process.env.STAGING_SALES_PASSWORD || '',
        role: 'Sales User'
      },
      accountant: {
        username: process.env.STAGING_ACCOUNTANT_USER || 'test.accountant@hearingclinic.com',
        password: process.env.STAGING_ACCOUNTANT_PASSWORD || '',
        role: 'Accounts User'
      }
    }
  },

  production: {
    name: 'Production',
    baseUrl: process.env.PROD_BASE_URL || '',
    users: {
      admin: {
        username: process.env.PROD_ADMIN_USER || '',
        password: process.env.PROD_ADMIN_PASSWORD || '',
        role: 'Administrator'
      },
      systemManager: {
        username: process.env.PROD_MANAGER_USER || '',
        password: process.env.PROD_MANAGER_PASSWORD || '',
        role: 'System Manager'
      }
    }
  }
};

/**
 * Get current test environment
 * Defaults to 'development' if not specified
 */
export function getTestEnvironment(): TestEnvironment {
  const envName = process.env.TEST_ENV || 'development';

  const env = environments[envName];

  if (!env) {
    throw new Error(`Unknown test environment: ${envName}. Valid options: ${Object.keys(environments).join(', ')}`);
  }

  // Validate that required credentials are set for non-development environments
  if (envName !== 'development') {
    if (!env.users.admin.password) {
      throw new Error(`Missing admin password for ${envName} environment. Set STAGING_ADMIN_PASSWORD or PROD_ADMIN_PASSWORD`);
    }
  }

  return env;
}

/**
 * Get a specific test user
 */
export function getTestUser(userType: 'admin' | 'systemManager' | 'salesUser' | 'accountant' = 'admin'): TestUser {
  const env = getTestEnvironment();
  const user = env.users[userType];

  if (!user) {
    throw new Error(`User type '${userType}' not configured for ${env.name} environment`);
  }

  return user;
}

/**
 * Get base URL for current environment
 */
export function getBaseUrl(): string {
  return getTestEnvironment().baseUrl;
}
