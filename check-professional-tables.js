import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfessionalTables() {
  console.log('🔍 Verificando tabelas relacionadas a profissionais...');
  
  try {
    // Tentar inserir um registro mínimo na tabela profissionais para ver a estrutura
    const { data, error } = await supabase
      .from('profissionais')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // UUID fake para teste
        registro_profissional: 'TESTE-ESTRUTURA'
      })
      .select('*')
      .single();
    
    if (error) {
      console.log('❌ Erro ao inserir na tabela profissionais:', error.message);
      
      // Tentar outras possíveis tabelas
      console.log('');
      console.log('🔍 Tentando outras tabelas...');
      
      const possibleTables = [
        'clinica_profissionais',
        'profissionais_clinicas', 
        'user_clinicas',
        'clinicas_users'
      ];
      
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
      console.log('✅ Estrutura da tabela profissionais:');
      console.log('📋 Colunas encontradas:', Object.keys(data));
      
      // Deletar o registro de teste
      await supabase
        .from('profissionais')
        .delete()
        .eq('id', data.id);
      
      console.log('🗑️ Registro de teste removido');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

checkProfessionalTables();