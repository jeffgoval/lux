import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkClinicasStructure() {

  try {
    // Tentar inserir um registro mínimo para ver quais colunas existem
    const { data, error } = await supabase
      .from('clinicas')
      .insert({
        nome: 'Teste Estrutura'
      })
      .select('*')
      .single();
    
    if (error) {

    } else {

      // Deletar o registro de teste
      await supabase
        .from('clinicas')
        .delete()
        .eq('id', data.id);

    }
    
  } catch (error) {

  }
}

checkClinicasStructure();
