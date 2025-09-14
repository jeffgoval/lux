#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Test user data creation manually
 */
async function testUserCreation() {

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {

    return;
  }

  // Check existing profile

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (profileError) {

  } else if (profile) {

  } else {

    // Try to create profile

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

    } else {

    }
  }
  
  // Check existing roles

  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id);
  
  if (rolesError) {

  } else if (roles && roles.length > 0) {

  } else {

    // Try to create role

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

    } else {

    }
  }
  
  // Test RLS policies

  // Test profile access
  const { data: profileTest, error: profileTestError } = await supabase
    .from('profiles')
    .select('id, nome_completo')
    .eq('user_id', user.id);
  
  if (profileTestError) {

  } else {

  }
  
  // Test roles access
  const { data: rolesTest, error: rolesTestError } = await supabase
    .from('user_roles')
    .select('id, role')
    .eq('user_id', user.id);
  
  if (rolesTestError) {

  } else {

  }

}

// Run the test
testUserCreation().catch(error => {

  process.exit(1);
});
