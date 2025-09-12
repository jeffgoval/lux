import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixClinicEmail() {
  console.log('🔧 Verificando se a coluna email existe na tabela clinicas...');
  
  try {
    // Tentar fazer uma consulta simples para verificar se a coluna email existe
    const { data, error } = await supabase
      .from('clinicas')
      .select('id, email')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao verificar coluna email:', error.message);
      console.log('');
      console.log('📋 Para resolver este problema, execute o seguinte SQL no Supabase:');
      console.log('');
      console.log('-- Adicionar coluna email se não existir');
      console.log('ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS email TEXT;');
      console.log('');
      console.log('Acesse: https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql');
    } else {
      console.log('✅ Coluna email existe na tabela clinicas!');
      console.log('✅ O problema pode ser cache do schema. Tente recarregar a página.');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

fixClinicEmail();