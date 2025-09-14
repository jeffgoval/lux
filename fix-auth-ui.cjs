const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnoseAuthUI() {
  console.log('🔍 DIAGNOSTICANDO PROBLEMA DA UI DO AUTH');
  console.log('='.repeat(60));
  
  try {
    // Verificar se conseguimos acessar dados básicos da auth
    console.log('\n1. TESTANDO ACESSO À AUTH:');
    console.log('-'.repeat(40));
    
    try {
      const { data: session } = await supabase.auth.getSession();
      console.log('✅ Conseguimos acessar sessão auth');
    } catch (e) {
      console.log('❌ Erro ao acessar sessão:', e.message);
    }
    
    // Tentar verificar se há usuários usando uma abordagem indireta
    console.log('\n2. VERIFICANDO RELAÇÃO COM PROFILES:');
    console.log('-'.repeat(40));
    
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(5);
        
      if (error) {
        console.log('❌ Erro ao buscar profiles:', error.message);
      } else {
        console.log('✅ Profiles encontrados:', profiles.length);
        if (profiles.length > 0) {
          console.log('📋 User IDs nos profiles:');
          profiles.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.user_id}`);
          });
        }
      }
    } catch (e) {
      console.log('❌ Erro geral ao buscar profiles:', e.message);
    }
    
    console.log('\n3. COMANDOS SQL PARA EXECUTAR NO DASHBOARD:');
    console.log('-'.repeat(60));
    console.log('Copy/paste estes comandos no SQL Editor do Supabase:');
    console.log('');
    
    console.log('-- Verificar estrutura da tabela auth.users');
    console.log('SELECT column_name, data_type, is_nullable');
    console.log('FROM information_schema.columns');
    console.log("WHERE table_schema = 'auth' AND table_name = 'users'");
    console.log('ORDER BY ordinal_position;');
    console.log('');
    
    console.log('-- Contar usuários existentes');
    console.log('SELECT COUNT(*) as total_usuarios FROM auth.users;');
    console.log('');
    
    console.log('-- Ver alguns usuários (se existirem)');
    console.log('SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;');
    console.log('');
    
    console.log('-- Verificar se há problemas de constraint');
    console.log('SELECT conname, contype FROM pg_constraint');
    console.log("WHERE conrelid = 'auth.users'::regclass;");
    console.log('');
    
    console.log('4. POSSÍVEIS SOLUÇÕES:');
    console.log('-'.repeat(40));
    console.log('');
    
    console.log('🔧 SOLUÇÃO A - Refresh da interface:');
    console.log('1. Feche todas as abas do Supabase');
    console.log('2. Limpe o cache do browser (Ctrl+Shift+Delete)');
    console.log('3. Acesse o dashboard em modo incógnito');
    console.log('4. Vá para Auth > Users');
    console.log('');
    
    console.log('🔧 SOLUÇÃO B - Se o problema persistir:');
    console.log('Execute no SQL Editor:');
    console.log('-- VACUUM ANALYZE auth.users;');
    console.log('-- REINDEX TABLE auth.users;');
    console.log('');
    
    console.log('🔧 SOLUÇÃO C - Reset da view (último recurso):');
    console.log('-- SELECT pg_reload_conf();');
    console.log('');
    
    console.log('🔧 SOLUÇÃO D - Deletar via SQL se necessário:');
    console.log('-- DELETE FROM auth.users; (CUIDADO!)');
    console.log('');
    
    console.log('5. WORKAROUND TEMPORÁRIO:');
    console.log('-'.repeat(40));
    console.log('Se precisar deletar usuários urgentemente:');
    console.log('1. Use o SQL Editor: DELETE FROM auth.users WHERE email LIKE \'%pattern%\';');
    console.log('2. Ou delete um por vez na interface manualmente');
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

diagnoseAuthUI();