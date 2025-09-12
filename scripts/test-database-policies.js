#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Test database policies and structure
 */
async function testDatabasePolicies() {
  console.log('🛡️  Testing database policies and structure...\n');
  
  // Test 1: Check if we can read table structure
  console.log('1️⃣  Testing table access...');
  
  try {
    // Test profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(0); // Just test structure, don't return data
    
    if (profilesError) {
      console.log('❌ Profiles table access error:', profilesError.message);
    } else {
      console.log('✅ Profiles table accessible');
    }
    
    // Test user_roles table
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('id')
      .limit(0);
    
    if (rolesError) {
      console.log('❌ User_roles table access error:', rolesError.message);
    } else {
      console.log('✅ User_roles table accessible');
    }
    
  } catch (error) {
    console.log('❌ Table access test failed:', error.message);
  }
  
  // Test 2: Check enum types
  console.log('\n2️⃣  Testing enum types...');
  
  try {
    // Try to query with enum values to test if they exist
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('role', 'proprietaria')
      .limit(0);
    
    if (error) {
      console.log('❌ Enum type test error:', error.message);
      if (error.message.includes('invalid input value')) {
        console.log('   → user_role_type enum may be missing or incorrect');
      }
    } else {
      console.log('✅ Enum types working correctly');
    }
    
  } catch (error) {
    console.log('❌ Enum test failed:', error.message);
  }
  
  // Test 3: Check RLS policies by trying to insert (should fail without auth)
  console.log('\n3️⃣  Testing RLS policies...');
  
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
        console.log('✅ RLS policies are active (insert blocked as expected)');
      } else if (error.message.includes('violates foreign key constraint')) {
        console.log('✅ RLS allows insert but FK constraint blocks (good)');
      } else {
        console.log('❓ Unexpected RLS behavior:', error.message);
      }
    } else {
      console.log('⚠️  RLS may be disabled - insert succeeded without auth');
    }
    
  } catch (error) {
    console.log('❌ RLS test failed:', error.message);
  }
  
  // Test 4: Check if triggers exist (by looking for functions)
  console.log('\n4️⃣  Checking for database functions/triggers...');
  
  try {
    // Try to call a function that might exist for user creation
    const { data, error } = await supabase.rpc('create_user_profile_and_role', {
      user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('❌ User creation function not found');
        console.log('   → This explains why profiles/roles are not auto-created');
      } else {
        console.log('❓ Function exists but failed:', error.message);
      }
    } else {
      console.log('✅ User creation function exists and works');
    }
    
  } catch (error) {
    console.log('❌ Function test failed:', error.message);
  }
  
  console.log('\n📋 DIAGNOSIS SUMMARY:');
  console.log('='.repeat(60));
  console.log('Based on the tests above:');
  console.log('');
  console.log('✅ If tables are accessible → Database structure is OK');
  console.log('✅ If RLS is active → Security is properly configured');
  console.log('❌ If user creation function missing → Need to create profiles/roles manually');
  console.log('');
  console.log('💡 SOLUTION:');
  console.log('Since auto-creation may not work, use the forceUserSetup utility');
  console.log('in the application to manually create missing profiles and roles.');
}

// Run the test
testDatabasePolicies().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});