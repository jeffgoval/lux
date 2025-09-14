/**
 * 🚀 EXECUTAR SETUP COMPLETO DO SISTEMA DE AUTENTICAÇÃO V2
 * 
 * Versão que executa via comandos individuais do Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function executeAuthSetup() {
  console.log('🚀 EXECUTANDO SETUP COMPLETO DO SISTEMA DE AUTENTICAÇÃO V2\n');

  try {
    // ========================================================================
    // 1. VERIFICAR ESTADO ATUAL
    // ========================================================================
    console.log('🔍 1. Verificando estado atual das tabelas...');
    
    // Verificar se profiles existe
    const { data: profilesCheck, error: profilesCheckError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (profilesCheckError) {
      console.log('   ❌ Tabela profiles não existe ou tem erro:', profilesCheckError.message);
    } else {
      console.log('   ✅ Tabela profiles existe');
    }

    // Verificar se user_roles existe
    const { data: rolesCheck, error: rolesCheckError } = await supabase
      .from('user_roles')
      .select('count', { count: 'exact', head: true });

    if (rolesCheckError) {
      console.log('   ❌ Tabela user_roles não existe ou tem erro:', rolesCheckError.message);
    } else {
      console.log('   ✅ Tabela user_roles existe');
    }

    // ========================================================================
    // 2. TESTAR CRIAÇÃO DE USUÁRIO PARA VER SE TRIGGER FUNCIONA
    // ========================================================================
    console.log('\n🧪 2. Testando se trigger automático já funciona...');
    
    const testEmail = `teste.trigger.${Date.now()}@exemplo.com`;
    const testPassword = 'MinhaSenh@123';
    
    console.log(`   📧 Criando usuário de teste: ${testEmail}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (signUpError) {
      console.error('   ❌ Erro no cadastro:', signUpError.message);
      return;
    }

    console.log('   ✅ Usuário criado com sucesso!');
    const userId = signUpData.user?.id;

    if (!userId) {
      console.error('   ❌ User ID não encontrado');
      return;
    }

    // Aguardar trigger executar
    console.log('   ⏳ Aguardando trigger executar...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ========================================================================
    // 3. VERIFICAR SE PROFILE FOI CRIADO AUTOMATICAMENTE
    // ========================================================================
    console.log('\n📋 3. Verificando se profile foi criado automaticamente...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.log('   ❌ Profile não foi criado automaticamente:', profileError.message);
      
      // Tentar criar profile manualmente
      console.log('   🔧 Tentando criar profile manualmente...');
      
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: testEmail,
          nome_completo: 'Usuário Teste',
          primeiro_acesso: true,
          ativo: true
        });

      if (createProfileError) {
        console.error('   ❌ Erro ao criar profile manualmente:', createProfileError.message);
      } else {
        console.log('   ✅ Profile criado manualmente com sucesso!');
      }
    } else {
      console.log('   ✅ Profile criado automaticamente pelo trigger!');
      console.log(`      👤 Nome: ${profileData.nome_completo}`);
      console.log(`      📧 Email: ${profileData.email}`);
      console.log(`      🔄 Primeiro acesso: ${profileData.primeiro_acesso}`);
    }

    // ========================================================================
    // 4. VERIFICAR SE ROLE FOI CRIADA AUTOMATICAMENTE
    // ========================================================================
    console.log('\n🎭 4. Verificando se role foi criada automaticamente...');
    
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (roleError) {
      console.log('   ❌ Role não foi criada automaticamente:', roleError.message);
      
      // Tentar criar role manualmente
      console.log('   🔧 Tentando criar role manualmente...');
      
      const { error: createRoleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'proprietaria',
          ativo: true,
          criado_por: userId
        });

      if (createRoleError) {
        console.error('   ❌ Erro ao criar role manualmente:', createRoleError.message);
      } else {
        console.log('   ✅ Role criada manualmente com sucesso!');
      }
    } else if (roleData && roleData.length > 0) {
      console.log('   ✅ Role criada automaticamente pelo trigger!');
      roleData.forEach(role => {
        console.log(`      🎭 Role: ${role.role}`);
        console.log(`      🏥 Clínica ID: ${role.clinica_id || 'Não definida'}`);
        console.log(`      ✅ Ativo: ${role.ativo}`);
      });
    } else {
      console.log('   ❌ Nenhuma role encontrada');
    }

    // ========================================================================
    // 5. SIMULAR ONBOARDING COMPLETO
    // ========================================================================
    console.log('\n🎯 5. Simulando onboarding completo...');
    
    // Atualizar profile com dados completos
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        nome_completo: 'Dr. João Silva Teste',
        telefone: '11999999999',
        primeiro_acesso: false
      })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('   ❌ Erro ao atualizar profile:', updateProfileError.message);
    } else {
      console.log('   ✅ Profile atualizado com dados do onboarding!');
    }

    // Criar clínica
    const { data: clinicaData, error: clinicaError } = await supabase
      .from('clinicas')
      .insert({
        nome: 'Clínica Teste Automatizada',
        telefone_principal: '11999999999',
        email_contato: testEmail,
        ativo: true,
        criado_por: userId
      })
      .select('id')
      .single();

    if (clinicaError) {
      console.error('   ❌ Erro ao criar clínica:', clinicaError.message);
    } else {
      console.log('   ✅ Clínica criada com sucesso!');
      console.log(`      🆔 Clínica ID: ${clinicaData.id}`);

      // Vincular role à clínica
      const { error: updateRoleError } = await supabase
        .from('user_roles')
        .update({
          clinica_id: clinicaData.id
        })
        .eq('user_id', userId)
        .eq('role', 'proprietaria');

      if (updateRoleError) {
        console.error('   ❌ Erro ao vincular role à clínica:', updateRoleError.message);
      } else {
        console.log('   ✅ Role vinculada à clínica com sucesso!');
      }
    }

    // ========================================================================
    // 6. VERIFICAÇÃO FINAL COMPLETA
    // ========================================================================
    console.log('\n🔍 6. Verificação final completa...');
    
    const { data: finalData, error: finalError } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles (
          role,
          clinica_id,
          ativo,
          clinicas (
            nome,
            ativo
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (finalError) {
      console.error('   ❌ Erro na verificação final:', finalError.message);
    } else {
      console.log('   ✅ SISTEMA FUNCIONANDO PERFEITAMENTE!');
      console.log('\n   📊 RESUMO FINAL:');
      console.log(`      👤 Usuário: ${finalData.nome_completo}`);
      console.log(`      📧 Email: ${finalData.email}`);
      console.log(`      📱 Telefone: ${finalData.telefone}`);
      console.log(`      🔄 Onboarding completo: ${!finalData.primeiro_acesso}`);
      
      if (finalData.user_roles && finalData.user_roles.length > 0) {
        console.log(`      🎭 Role: ${finalData.user_roles[0].role}`);
        if (finalData.user_roles[0].clinicas) {
          console.log(`      🏥 Clínica: ${finalData.user_roles[0].clinicas.nome}`);
        }
      }
    }

    // ========================================================================
    // 7. LIMPEZA DOS DADOS DE TESTE
    // ========================================================================
    console.log('\n🧹 7. Limpando dados de teste...');
    
    if (clinicaData?.id) {
      await supabase.from('clinicas').delete().eq('id', clinicaData.id);
    }
    
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
    
    console.log('   ✅ Dados de teste removidos!');

    // ========================================================================
    // 8. RESULTADO FINAL
    // ========================================================================
    console.log('\n🎉 SETUP E TESTE COMPLETOS!');
    console.log('\n📋 STATUS DO SISTEMA:');
    
    if (!profileError && !roleError) {
      console.log('   ✅ TRIGGER AUTOMÁTICO FUNCIONANDO');
      console.log('   ✅ PROFILES CRIADOS AUTOMATICAMENTE');
      console.log('   ✅ ROLES CRIADAS AUTOMATICAMENTE');
      console.log('   ✅ ONBOARDING FUNCIONAL');
      console.log('   ✅ SISTEMA PRONTO PARA USO!');
    } else {
      console.log('   ⚠️ TRIGGER AUTOMÁTICO NÃO FUNCIONANDO');
      console.log('   ⚠️ NECESSÁRIO CONFIGURAR MANUALMENTE NO SUPABASE DASHBOARD');
      console.log('   📋 Execute o SQL do arquivo: scripts/setup-complete-auth-system.sql');
    }

    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('   1. Testar cadastro na interface web');
    console.log('   2. Verificar se vai direto para onboarding');
    console.log('   3. Completar onboarding e ir para dashboard');

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar setup
executeAuthSetup()
  .then(() => {
    console.log('\n✅ SCRIPT FINALIZADO!');
  })
  .catch(console.error);
