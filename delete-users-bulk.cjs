const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ATENÇÃO: Você precisa da SERVICE ROLE KEY para deletar usuários
// Substitua pela sua service role key (encontre em Settings > API)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

async function deleteAllUsers() {
  console.log('🗑️ SCRIPT DE DELEÇÃO EM MASSA DE USUÁRIOS');
  console.log('='.repeat(60));
  
  try {
    // 1. Listar todos os usuários primeiro
    console.log('\n1. LISTANDO USUÁRIOS EXISTENTES:');
    console.log('-'.repeat(40));
    
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError.message);
      console.log('\n💡 DICA: Você precisa da SERVICE ROLE KEY para usar esta função.');
      console.log('📍 Encontre em: Supabase Dashboard > Settings > API > service_role key');
      return;
    }
    
    console.log(`📊 Total de usuários encontrados: ${users.users.length}`);
    
    if (users.users.length === 0) {
      console.log('✅ Nenhum usuário para deletar!');
      return;
    }
    
    // Mostrar alguns usuários
    console.log('\n👥 Primeiros usuários:');
    users.users.slice(0, 5).forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email} (${user.id})`);
    });
    
    if (users.users.length > 5) {
      console.log(`  ... e mais ${users.users.length - 5} usuários`);
    }
    
    // 2. ATENÇÃO: Descomente a seção abaixo para realmente deletar
    console.log('\n⚠️ ATENÇÃO: Para deletar os usuários, descomente o código abaixo!');
    console.log('='.repeat(60));
    
    /*
    // DESCOMENTE ESTE BLOCO PARA DELETAR DE VERDADE:
    
    console.log('\n2. DELETANDO USUÁRIOS:');
    console.log('-'.repeat(40));
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const user of users.users) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.log(`❌ Erro ao deletar ${user.email}: ${deleteError.message}`);
          errorCount++;
        } else {
          console.log(`✅ Deletado: ${user.email}`);
          deletedCount++;
        }
        
        // Pequena pausa entre deletions para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (e) {
        console.log(`❌ Erro ao deletar ${user.email}: ${e.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 RESULTADO:');
    console.log(`✅ Usuários deletados: ${deletedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    */
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

// Função para deletar usuários com filtro
async function deleteUsersByFilter() {
  console.log('\n🔍 DELETAR USUÁRIOS COM FILTRO (exemplo):');
  console.log('-'.repeat(40));
  
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Erro:', error.message);
      return;
    }
    
    // Exemplo: deletar usuários com email que contém "test"
    const testUsers = users.users.filter(user => 
      user.email && user.email.includes('test')
    );
    
    console.log(`📊 Usuários com "test" no email: ${testUsers.length}`);
    
    if (testUsers.length > 0) {
      console.log('👥 Usuários que seriam deletados:');
      testUsers.forEach(user => {
        console.log(`  - ${user.email}`);
      });
    }
    
    // Para deletar, descomente:
    /*
    for (const user of testUsers) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (!deleteError) {
        console.log(`✅ Deletado: ${user.email}`);
      }
    }
    */
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

console.log('🚨 SCRIPT DE DELEÇÃO EM MASSA DE USUÁRIOS AUTH');
console.log('⚠️  CUIDADO: Este script pode deletar TODOS os usuários!');
console.log('📝 Leia o código antes de executar!');
console.log('');

// Executar apenas listagem por segurança
deleteAllUsers();

// Descomente para ver filtro de exemplo:
// deleteUsersByFilter();