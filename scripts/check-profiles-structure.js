#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesStructure() {
  console.log('🔍 Checking profiles table structure...\n');
  
  // Try to get one profile to see the structure
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ Error accessing profiles:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Profiles table structure:');
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
      console.log(`   - ${col}: ${typeof data[0][col]}`);
    });
  } else {
    console.log('📋 Profiles table exists but is empty');
    
    // Try to insert a test record to see what columns are expected
    console.log('\n🧪 Testing insert to see required columns...');
    
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        nome_completo: 'Test',
        email: 'test@test.com'
      });
    
    if (insertError) {
      console.log('❌ Insert test error:', insertError.message);
      
      if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
        console.log('\n💡 Missing columns detected in error message');
      }
    }
  }
  
  console.log('\n📝 SQL to add missing columns:');
  console.log(`
-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

checkProfilesStructure().catch(console.error);