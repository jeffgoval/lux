import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfessionalTables() {

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

      // Tentar outras possíveis tabelas

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

          } else {

          }
        } catch (e) {

        }
      }
    } else {

      // Deletar o registro de teste
      await supabase
        .from('profissionais')
        .delete()
        .eq('id', data.id);

    }
    
  } catch (error) {

  }
}

checkProfessionalTables();
