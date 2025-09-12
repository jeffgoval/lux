import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTemplatesTable() {
  console.log('🔍 Verificando tabela templates_procedimentos...');
  
  try {
    const { data, error } = await supabase
      .from('templates_procedimentos')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Tabela templates_procedimentos não existe:', error.message);
      
      // Verificar outras possíveis tabelas relacionadas a serviços
      const possibleTables = [
        'servicos',
        'procedimentos', 
        'tratamentos',
        'servicos_clinica'
      ];
      
      console.log('');
      console.log('🔍 Verificando outras tabelas de serviços...');
      
      for (const table of possibleTables) {
        try {
          const { error: testError } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (!testError) {
            console.log(`✅ Tabela encontrada: ${table}`);
          } else {
            console.log(`❌ Tabela não existe: ${table}`);
          }
        } catch (e) {
          console.log(`❌ Tabela não existe: ${table}`);
        }
      }
    } else {
      console.log('✅ Tabela templates_procedimentos existe!');
      if (data.length > 0) {
        console.log('📋 Estrutura:', Object.keys(data[0]));
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

checkTemplatesTable();