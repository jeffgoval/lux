#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

// Service role key for admin operations (you'll need to provide this)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSQL() {
  console.log('🔧 Executing SQL to fix profiles table...\n');

  if (!serviceRoleKey) {
    console.log('❌ Service role key not found');
    console.log('💡 You need to set SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.log('   Get it from: Supabase Dashboard > Settings > API > service_role key');
    console.log('\n📋 Alternative: Copy and paste this SQL in Supabase SQL Editor:');
    
    try {
      const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');
      console.log('\n' + '='.repeat(60));
      console.log(sql);
      console.log('='.repeat(60));
    } catch (error) {
      console.log('❌ Could not read FIX_PROFILES_TABLE.sql');
    }
    return;
  }

  // Create admin client with service role
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('📋 Reading SQL file...');
    const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`${i + 1}/${statements.length}: Executing statement...`);
      
      try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          console.log(`❌ Error in statement ${i + 1}:`, error.message);
          
          // Try alternative method for DDL statements
          if (error.message.includes('exec_sql') || error.message.includes('function')) {
            console.log('   Trying direct execution...');
            
            // For simple statements, try using the REST API directly
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
              },
              body: JSON.stringify({ sql: statement + ';' })
            });

            if (!response.ok) {
              console.log(`   ❌ Direct execution also failed: ${response.status}`);
            } else {
              console.log(`   ✅ Direct execution succeeded`);
            }
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
          if (data) console.log(`   📊 Result:`, data);
        }
      } catch (execError) {
        console.log(`❌ Exception in statement ${i + 1}:`, execError.message);
      }
    }

    console.log('\n🎉 SQL execution completed!');
    
    // Verify the table structure
    console.log('\n🔍 Verifying profiles table structure...');
    const { data: tableInfo, error: infoError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'profiles')
      .order('ordinal_position');

    if (infoError) {
      console.log('❌ Could not verify table structure:', infoError.message);
    } else if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Profiles table structure:');
      tableInfo.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('⚠️  Could not retrieve table structure');
    }

  } catch (error) {
    console.log('❌ Failed to execute SQL:', error.message);
    console.log('\n📋 Please execute this SQL manually in Supabase SQL Editor:');
    
    try {
      const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');
      console.log('\n' + '='.repeat(60));
      console.log(sql);
      console.log('='.repeat(60));
    } catch (readError) {
      console.log('❌ Could not read SQL file');
    }
  }
}

executeSQL().catch(console.error);