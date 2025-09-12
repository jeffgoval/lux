import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLSPolicy() {
  console.log('🔧 Fixing RLS policy for user_roles table...');
  console.log('');
  console.log('⚠️  Since we cannot execute DDL statements directly via the client,');
  console.log('   you need to run the following SQL commands in your Supabase SQL Editor:');
  console.log('');
  console.log('   1. Go to https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql');
  console.log('   2. Copy and paste the following SQL:');
  console.log('');
  console.log('-- Fix RLS policy for user_roles table');
  console.log('DROP POLICY IF EXISTS "Users can create initial visitor role" ON public.user_roles;');
  console.log('DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;');
  console.log('DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;');
  console.log('');
  console.log('CREATE POLICY "Users can create their initial role"');
  console.log('ON public.user_roles');
  console.log('FOR INSERT');
  console.log('WITH CHECK (');
  console.log('  auth.uid() = user_id');
  console.log('  AND role IN (\'visitante\', \'proprietaria\')');
  console.log('  AND NOT EXISTS (');
  console.log('    SELECT 1 FROM public.user_roles');
  console.log('    WHERE user_id = auth.uid()');
  console.log('  )');
  console.log(');');
  console.log('');
  console.log('CREATE POLICY "Users can update their own roles"');
  console.log('ON public.user_roles');
  console.log('FOR UPDATE');
  console.log('USING (auth.uid() = user_id)');
  console.log('WITH CHECK (auth.uid() = user_id);');
  console.log('');
  console.log('   3. Click "Run" to execute the SQL');
  console.log('');
  console.log('This will fix the RLS policy that\'s preventing users from creating proprietaria roles.');
}

fixRLSPolicy();