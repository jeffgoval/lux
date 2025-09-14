#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

// Service role key for admin operations (you'll need to provide this)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSQL() {

  if (!serviceRoleKey) {

    try {
      const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');

    } catch (error) {

    }
    return;
  }

  // Create admin client with service role
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {

    const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {

          // Try alternative method for DDL statements
          if (error.message.includes('exec_sql') || error.message.includes('function')) {

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

            } else {

            }
          }
        } else {

          if (data) 
        }
      } catch (execError) {

      }
    }

    // Verify the table structure

    const { data: tableInfo, error: infoError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'profiles')
      .order('ordinal_position');

    if (infoError) {

    } else if (tableInfo && tableInfo.length > 0) {

      tableInfo.forEach(col => {

      });
    } else {

    }

  } catch (error) {

    try {
      const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');

    } catch (readError) {

    }
  }
}

executeSQL().catch(console.error);
