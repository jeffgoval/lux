const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// INSTRUÇÕES:
// 1. Vá para Supabase Dashboard > Settings > API
// 2. Copie a "service_role" key (não a anon key!)
// 3. Substitua abaixo ou adicione ao .env como SUPABASE_SERVICE_ROLE_KEY

const SERVICE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI'; // Substitua pela service role key

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  SERVICE_KEY // Usando service role key para operações admin
);

async function nuclearDeleteAllUsers() {
  console.log('💥 DELEÇÃO NUCLEAR DE USUÁRIOS - ÚLTIMA TENTATIVA');
  console.log('='.repeat(60));
  console.log('⚠️  ISSO VAI DELETAR TODOS OS USUÁRIOS DE AUTH!');
  console.log('🔥 Use apenas se não conseguir usar a interface');
  console.log('');

  try {
    // 1. Via Admin API (precisa de service role key)
    console.log('🔑 Tentativa 1: Via Admin API...');
    
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (!listError && users && users.users.length > 0) {
      console.log(`📊 ${users.users.length} usuários encontrados`);
      
      // Descomente as linhas abaixo para REALMENTE deletar:
      /*
      console.log('🗑️ Deletando usuários...');
      for (const user of users.users) {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
          console.log(`❌ Erro ao deletar ${user.email}: ${error.message}`);
        } else {
          console.log(`✅ Deletado: ${user.email}`);
        }
      }
      */
      
      console.log('⚠️ Para executar a deleção, descomente o bloco acima');
      return;
    }

    // 2. Via SQL direto (fallback)
    console.log('🔑 Tentativa 2: Via SQL direto...');
    console.log('Execute este comando no SQL Editor do Supabase:');
    console.log('');
    console.log('DELETE FROM auth.users;');
    console.log('');

  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.log('');
    console.log('💡 SOLUÇÕES:');
    console.log('1. Substitua SERVICE_KEY pela sua service_role key');
    console.log('2. Ou use SQL direto: DELETE FROM auth.users;');
  }
}

// ALTERNATIVA: Via SQL puro (não precisa de service role key)
function showSQLAlternative() {
  console.log('');
  console.log('🛠️ ALTERNATIVA: COMANDOS SQL PUROS');
  console.log('='.repeat(50));
  console.log('Execute estes comandos no Supabase SQL Editor:');
  console.log('');
  console.log('-- Ver usuários existentes');
  console.log('SELECT COUNT(*) FROM auth.users;');
  console.log('');
  console.log('-- DELETAR TODOS OS USUÁRIOS (CUIDADO!)');
  console.log('DELETE FROM auth.users;');
  console.log('');
  console.log('-- Verificar se funcionou');
  console.log('SELECT COUNT(*) FROM auth.users;');
  console.log('');
  console.log('-- Reset de sequences (opcional)');
  console.log('SELECT setval(pg_get_serial_sequence(\'auth.users\', \'id\'), 1, false);');
  console.log('');
  console.log('🔄 Depois disso, faça F5 na página Auth > Users');
}

console.log('🚀 Escolha uma opção:');
console.log('1. Configurar service role key e usar API');
console.log('2. Usar comandos SQL diretos');
console.log('');

if (SERVICE_KEY && SERVICE_KEY !== 'SUA_SERVICE_ROLE_KEY_AQUI') {
  nuclearDeleteAllUsers();
} else {
  console.log('⚠️ Configure a SERVICE_KEY primeiro ou use a alternativa SQL:');
  showSQLAlternative();
}