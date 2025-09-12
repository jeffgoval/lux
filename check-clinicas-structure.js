import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkClinicasStructure() {
  console.log('🔍 Verificando estrutura da tabela clinicas...');
  
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
      console.error('❌ Erro ao inserir teste:', error.message);
    } else {
      console.log('✅ Registro de teste criado. Estrutura disponível:');
      console.log('📋 Colunas encontradas:', Object.keys(data));
      
      // Deletar o registro de teste
      await supabase
        .from('clinicas')
        .delete()
        .eq('id', data.id);
      
      console.log('🗑️ Registro de teste removido');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

checkClinicasStructure();