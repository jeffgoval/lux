import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugUserRole() {
  console.log('🔍 Verificando roles do usuário atual...');
  
  try {
    // Verificar sessão atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ Nenhum usuário logado ou erro:', userError?.message);
      return;
    }
    
    console.log('👤 Usuário logado:', user.email);
    console.log('🆔 User ID:', user.id);
    
    // Verificar roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);
    
    if (rolesError) {
      console.log('❌ Erro ao buscar roles:', rolesError.message);
    } else {
      console.log('🎭 Roles encontradas:', roles.length);
      roles.forEach((role, index) => {
        console.log(`   ${index + 1}. Role: ${role.role}, Ativo: ${role.ativo}, Clinica ID: ${role.clinica_id || 'null'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

debugUserRole();