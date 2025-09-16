/**
 * 🗄️ SUPABASE CLIENT
 * 
 * Mock client for testing
 */

export const supabase = {
  auth: {
    getUser: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn()
  },
  from: jest.fn(),
  rpc: jest.fn()
};