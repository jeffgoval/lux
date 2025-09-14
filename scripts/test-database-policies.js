#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Test database policies and structure
 */
async function testDatabasePolicies() {

  // Test 1: Check if we can read table structure

  try {
    // Test profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(0); // Just test structure, don't return data
    
    if (profilesError) {

    } else {

    }
    
    // Test user_roles table
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('id')
      .limit(0);
    
    if (rolesError) {

    } else {

    }
    
  } catch (error) {

  }
  
  // Test 2: Check enum types

  try {
    // Try to query with enum values to test if they exist
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('role', 'proprietaria')
      .limit(0);
    
    if (error) {

      if (error.message.includes('invalid input value')) {

      }
    } else {

    }
    
  } catch (error) {

  }
  
  // Test 3: Check RLS policies by trying to insert (should fail without auth)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
        nome_completo: 'Test User',
        email: 'test@test.com'
      });
    
    if (error) {
      if (error.message.includes('new row violates row-level security policy')) {

      } else if (error.message.includes('violates foreign key constraint')) {

      } else {

      }
    } else {

    }
    
  } catch (error) {

  }
  
  // Test 4: Check if triggers exist (by looking for functions)

  try {
    // Try to call a function that might exist for user creation
    const { data, error } = await supabase.rpc('create_user_profile_and_role', {
      user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {

      } else {

      }
    } else {

    }
    
  } catch (error) {

  }

}

// Run the test
testDatabasePolicies().catch(error => {

  process.exit(1);
});
