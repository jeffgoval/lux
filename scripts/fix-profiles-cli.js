#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

async function executeWithCLI() {

  try {
    // Read the SQL file

    const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');
    
    // Create a temporary SQL file for CLI execution
    const tempSqlFile = 'temp_fix_profiles.sql';
    writeFileSync(tempSqlFile, sql);

    // Execute using supabase db reset or sql command
    try {
      // Try using supabase db sql command
      const result = execSync(`supabase db sql --file ${tempSqlFile}`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

    } catch (cliError) {

      // Try alternative approach with direct SQL execution

      // Split SQL into individual statements and execute one by one
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        try {
          // Create temp file for single statement
          const singleStmtFile = `temp_stmt_${i}.sql`;
          writeFileSync(singleStmtFile, statement + ';');
          
          const stmtResult = execSync(`supabase db sql --file ${singleStmtFile}`, {
            encoding: 'utf8',
            stdio: 'pipe'
          });

          // Clean up temp file
          try {
            execSync(`del ${singleStmtFile}`, { stdio: 'ignore' });
          } catch {}
          
        } catch (stmtError) {

        }
      }
    }
    
    // Clean up temp file
    try {
      execSync(`del ${tempSqlFile}`, { stdio: 'ignore' });
    } catch {}
    
    // Verify the result

    try {
      const verifyResult = execSync('supabase db sql --query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'profiles\' ORDER BY ordinal_position;"', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

    } catch (verifyError) {

    }

  } catch (error) {

    // Show the SQL for manual execution
    try {
      const sql = readFileSync('FIX_PROFILES_TABLE.sql', 'utf8');

    } catch (readError) {

    }
  }
}

executeWithCLI().catch(console.error);
