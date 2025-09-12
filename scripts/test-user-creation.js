#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Test user data creation manually
 */
async function testUserCreation() {
  console.log('🧪 Testing user data creation...\n');
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.log('❌ No authenticated user found');
    console.log('   Please login first and run this script again');
    return;
  }
  
  console.log('👤 Current user:', user.email);
  console.log('🆔 User ID:', user.id);
  
  // Check existing profile
  console.log('\n🔍 Checking existing profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (profileError) {
    console.log('❌ Error checking profile:', profileError.message);
  } else if (profile) {
    console.log('✅ Profile exists:', profile);
  } else {
    console.log('❌ No profile found');
    
    // Try to create profile
    console.log('\n📝 Attempting to create profile...');
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        nome_completo: user.user_metadata?.nome_completo || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
        primeiro_acesso: true,
        ativo: true
      })
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Error creating profile:', createError.message);
      console.log('   Code:', createError.code);
      console.log('   Details:', createError.details);
    } else {
      console.log('✅ Profile created successfully:', newProfile);
    }
  }
  
  // Check existing roles
  console.log('\n🔍 Checking existing roles...');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id);
  
  if (rolesError) {
    console.log('❌ Error checking roles:', rolesError.message);
  } else if (roles && roles.length > 0) {
    console.log('✅ Roles exist:', roles);
  } else {
    console.log('❌ No roles found');
    
    // Try to create role
    console.log('\n👑 Attempting to create role...');
    const { data: newRole, error: roleCreateError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'proprietaria',
        ativo: true,
        criado_por: user.id
      })
      .select()
      .single();
    
    if (roleCreateError) {
      console.log('❌ Error creating role:', roleCreateError.message);
      console.log('   Code:', roleCreateError.code);
      console.log('   Details:', roleCreateError.details);
    } else {
      console.log('✅ Role created successfully:', newRole);
    }
  }
  
  // Test RLS policies
  console.log('\n🛡️  Testing RLS policies...');
  
  // Test profile access
  const { data: profileTest, error: profileTestError } = await supabase
    .from('profiles')
    .select('id, nome_completo')
    .eq('user_id', user.id);
  
  if (profileTestError) {
    console.log('❌ Profile RLS test failed:', profileTestError.message);
  } else {
    console.log('✅ Profile RLS test passed:', profileTest);
  }
  
  // Test roles access
  const { data: rolesTest, error: rolesTestError } = await supabase
    .from('user_roles')
    .select('id, role')
    .eq('user_id', user.id);
  
  if (rolesTestError) {
    console.log('❌ Roles RLS test failed:', rolesTestError.message);
  } else {
    console.log('✅ Roles RLS test passed:', rolesTest);
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('='.repeat(50));
  console.log('If you see errors above, the issue might be:');
  console.log('1. RLS policies are too restrictive');
  console.log('2. Missing database triggers for auto-creation');
  console.log('3. User permissions issues');
  console.log('4. Database constraints not met');
}

// Run the test
testUserCreation().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});