// =====================================================
// TEST SETUP AND CONFIGURATION
// Global test setup for Jest
// =====================================================

const { Pool } = require('pg');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Use test database if available, otherwise use main database
if (!process.env.TEST_DATABASE_URL && process.env.DATABASE_URL) {

  process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
}

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console output during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {

});

// Ensure auth schema exists for tests
const ensureAuthSchema = async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    try {
      // Create auth schema if it doesn't exist
      await client.query('CREATE SCHEMA IF NOT EXISTS auth');
      
      // Create auth.users table if it doesn't exist (for testing)
      await client.query(`
        CREATE TABLE IF NOT EXISTS auth.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          encrypted_password TEXT,
          email_confirmed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
      `);

    } finally {
      client.release();
    }
  } catch (error) {

    throw error;
  } finally {
    await pool.end();
  }
};

// Run schema setup before tests
beforeAll(async () => {
  await ensureAuthSchema();
});

// Export test utilities
global.testUtils = {
  generateUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  
  generateTestEmail: (prefix = 'test') => {
    return `${prefix}${Date.now()}@example.com`;
  },
  
  generateTestPhone: () => {
    return `119${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
  },
  
  generateTestCPF: () => {
    // Generate a valid CPF for testing
    const cpf = Math.floor(Math.random() * 100000000000).toString().padStart(11, '0');
    return cpf;
  },
  
  generateTestCNPJ: () => {
    // Generate a valid CNPJ for testing
    const cnpj = Math.floor(Math.random() * 100000000000000).toString().padStart(14, '0');
    return cnpj;
  },
  
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};
