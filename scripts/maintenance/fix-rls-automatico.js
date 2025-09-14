const { createClient } = require('@supabase/supabase-js');

// Suas credenciais do Supabase
const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseServiceKey = 'SUA_SERVICE_ROLE_KEY_AQUI'; // Você precisa colocar sua service role key

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLSAutomatically() {
  console.log('🚨 INICIANDO CORREÇÃO AUTOMÁTICA DO RLS...\n');

  try {
    // 1. Desabilitar RLS nas tabelas principais
    console.log('1. Desabilitando RLS...');
    
    const tables = ['user_roles', 'profiles', 'clinicas', 'profissionais', 'clinica_profissionais'];
    
    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin.rpc('disable_rls_table', { table_name: table });
        if (error) {
          console.log(`   ⚠️  Tabela ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ RLS desabilitado em: ${table}`);
        }
      } catch (err) {
        console.log(`   ⚠️  Erro em ${table}: ${err.message}`);
      }
    }

    // 2. Tentar criar tabela user_roles se não existir
    console.log('\n2. Verificando tabela user_roles...');
    
    const { data: userRoles, error: selectError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .limit(1);

    if (selectError && selectError.code === '42P01') {
      console.log('   ❌ Tabela user_roles não existe - tentando criar...');
      
      // Criar tabela via SQL direto
      const createTableSQL = `
        CREATE TABLE public.user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'proprietaria',
          clinica_id UUID,
          organizacao_id UUID,
          ativo BOOLEAN NOT NULL DEFAULT true,
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
          criado_por UUID NOT NULL
        );
        ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
      `;
      
      const { error: createError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.log('   ❌ Erro ao criar tabela:', createError.message);
      } else {
        console.log('   ✅ Tabela user_roles criada com sucesso!');
      }
    } else {
      console.log('   ✅ Tabela user_roles já existe');
    }

    // 3. Testar inserção
    console.log('\n3. Testando inserção...');
    
    // Pegar primeiro usuário
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    
    if (users && users.users.length > 0) {
      const testUserId = users.users[0].id;
      
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: testUserId,
          role: 'proprietaria',
          ativo: true,
          criado_por: testUserId
        });

      if (insertError) {
        console.log('   ❌ Erro no teste de inserção:', insertError.message);
      } else {
        console.log('   ✅ Teste de inserção: SUCESSO!');
      }
    }

    console.log('\n🎯 CORREÇÃO CONCLUÍDA!');
    console.log('🧪 Teste agora o onboarding na sua aplicação');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.log('\n💡 SOLUÇÃO ALTERNATIVA:');
    console.log('Execute manualmente no Supabase SQL Editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'proprietaria',
  clinica_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID NOT NULL
);

ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    `);
  }
}

// Para executar: node fix-rls-automatico.js
if (require.main === module) {
  fixRLSAutomatically();
}

module.exports = { fixRLSAutomatically };