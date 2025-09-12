#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

async function executeWithCLI() {
  console.log('🔧 Executing SQL via Supabase CLI...\n');

  try {
    // Read the SQL file
    console.log('📋 Reading SQL file...');
    const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');
    
    // Create a temporary SQL file for CLI execution
    const tempSqlFile = 'temp_fix_profiles.sql';
    writeFileSync(tempSqlFile, sql);
    
    console.log('🚀 Executing SQL via Supabase CLI...');
    
    // Execute using supabase db reset or sql command
    try {
      // Try using supabase db sql command
      const result = execSync(`supabase db sql --file ${tempSqlFile}`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ SQL executed successfully via CLI!');
      console.log('📊 Result:', result);
      
    } catch (cliError) {
      console.log('❌ CLI execution failed:', cliError.message);
      
      // Try alternative approach with direct SQL execution
      console.log('🔄 Trying alternative approach...');
      
      // Split SQL into individual statements and execute one by one
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`${i + 1}/${statements.length}: Executing statement...`);
        
        try {
          // Create temp file for single statement
          const singleStmtFile = `temp_stmt_${i}.sql`;
          writeFileSync(singleStmtFile, statement + ';');
          
          const stmtResult = execSync(`supabase db sql --file ${singleStmtFile}`, {
            encoding: 'utf8',
            stdio: 'pipe'
          });
          
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
          
          // Clean up temp file
          try {
            execSync(`del ${singleStmtFile}`, { stdio: 'ignore' });
          } catch {}
          
        } catch (stmtError) {
          console.log(`   ❌ Statement ${i + 1} failed:`, stmtError.message);
        }
      }
    }
    
    // Clean up temp file
    try {
      execSync(`del ${tempSqlFile}`, { stdio: 'ignore' });
    } catch {}
    
    // Verify the result
    console.log('\n🔍 Verifying profiles table...');
    try {
      const verifyResult = execSync('supabase db sql --query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'profiles\' ORDER BY ordinal_position;"', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ Profiles table structure:');
      console.log(verifyResult);
      
    } catch (verifyError) {
      console.log('⚠️  Could not verify table structure:', verifyError.message);
    }
    
    console.log('\n🎉 Profiles table fix completed!');
    
  } catch (error) {
    console.log('❌ Failed to execute SQL via CLI:', error.message);
    console.log('\n💡 Alternative options:');
    console.log('1. Make sure you are logged in: supabase login');
    console.log('2. Make sure you are linked to project: supabase link');
    console.log('3. Or execute manually in Supabase Dashboard SQL Editor');
    
    // Show the SQL for manual execution
    try {
      const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');
      console.log('\n📋 SQL to execute manually:');
      console.log('='.repeat(60));
      console.log(sql);
      console.log('='.repeat(60));
    } catch (readError) {
      console.log('❌ Could not read SQL file');
    }
  }
}

executeWithCLI().catch(console.error);