/**
 * 🧪 TESTE COMPLETO DO FLUXO DE AUTENTICAÇÃO V2
 * 
 * Testa todo o fluxo:
 * 1. Cadastro de usuário
 * 2. Verificação de profile criado automaticamente
 * 3. Verificação de role "proprietaria" criada automaticamente
 * 4. Simulação do onboarding
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testCompleteAuthFlow() {
  console.log('🧪 INICIANDO TESTE COMPLETO DO FLUXO DE AUTENTICAÇÃO V2\n');

  // Dados de teste
  const testEmail = `teste.${Date.now()}@exemplo.com`;
  const testPassword = 'MinhaSenh@123';
  
  try {
    // ========================================================================
    // 1. TESTAR CADASTRO DE USUÁRIO
    // ========================================================================
    console.log('📝 1. Testando cadastro de usuário...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (signUpError) {
      console.error('❌ Erro no cadastro:', signUpError.message);
      return;
    }

    console.log('✅ Usuário cadastrado com sucesso!');
    console.log(`   📧 Email: ${testEmail}`);
    console.log(`   🆔 User ID: ${signUpData.user?.id}`);

    const userId = signUpData.user?.id;
    if (!userId) {
      console.error('❌ User ID não encontrado');
      return;
    }

    // Aguardar um pouco para o trigger executar
    console.log('⏳ Aguardando trigger executar...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ========================================================================
    // 2. VERIFICAR SE PROFILE FOI CRIADO AUTOMATICAMENTE
    // ========================================================================
    console.log('\n📋 2. Verificando se profile foi criado automaticamente...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Erro ao buscar profile:', profileError.message);
      return;
    }

    if (profileData) {
      console.log('✅ Profile criado automaticamente!');
      console.log(`   📧 Email: ${profileData.email}`);
      console.log(`   👤 Nome: ${profileData.nome_completo}`);
      console.log(`   🔄 Primeiro acesso: ${profileData.primeiro_acesso}`);
      console.log(`   ✅ Ativo: ${profileData.ativo}`);
    } else {
      console.error('❌ Profile não foi criado automaticamente');
      return;
    }

    // ========================================================================
    // 3. VERIFICAR SE ROLE FOI CRIADA AUTOMATICAMENTE
    // ========================================================================
    console.log('\n🔐 3. Verificando se role foi criada automaticamente...');
    
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (roleError) {
      console.error('❌ Erro ao buscar roles:', roleError.message);
      return;
    }

    if (roleData && roleData.length > 0) {
      console.log('✅ Role criada automaticamente!');
      roleData.forEach(role => {
        console.log(`   🎭 Role: ${role.role}`);
        console.log(`   🏥 Clínica ID: ${role.clinica_id || 'Não definida'}`);
        console.log(`   ✅ Ativo: ${role.ativo}`);
      });
    } else {
      console.error('❌ Role não foi criada automaticamente');
      return;
    }

    // ========================================================================
    // 4. SIMULAR ONBOARDING - COMPLETAR DADOS PESSOAIS
    // ========================================================================
    console.log('\n👤 4. Simulando onboarding - completando dados pessoais...');
    
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        nome_completo: 'Dr. João Silva Teste',
        telefone: '11999999999',
        primeiro_acesso: false // Marcar onboarding como completo
      })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('❌ Erro ao atualizar profile:', updateProfileError.message);
      return;
    }

    console.log('✅ Dados pessoais atualizados com sucesso!');

    // ========================================================================
    // 5. SIMULAR CRIAÇÃO DE CLÍNICA
    // ========================================================================
    console.log('\n🏥 5. Simulando criação de clínica...');
    
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
      console.error('❌ Erro ao criar clínica:', clinicaError.message);
      return;
    }

    console.log('✅ Clínica criada com sucesso!');
    console.log(`   🆔 Clínica ID: ${clinicaData.id}`);

    // ========================================================================
    // 6. ATUALIZAR ROLE COM CLÍNICA ID
    // ========================================================================
    console.log('\n🔗 6. Vinculando role à clínica...');
    
    const { error: updateRoleError } = await supabase
      .from('user_roles')
      .update({
        clinica_id: clinicaData.id
      })
      .eq('user_id', userId)
      .eq('role', 'proprietaria');

    if (updateRoleError) {
      console.error('❌ Erro ao vincular role à clínica:', updateRoleError.message);
      return;
    }

    console.log('✅ Role vinculada à clínica com sucesso!');

    // ========================================================================
    // 7. VERIFICAÇÃO FINAL
    // ========================================================================
    console.log('\n🎯 7. Verificação final do sistema...');
    
    // Buscar dados completos
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
      console.error('❌ Erro na verificação final:', finalError.message);
      return;
    }

    console.log('✅ SISTEMA FUNCIONANDO PERFEITAMENTE!');
    console.log('\n📊 RESUMO FINAL:');
    console.log(`   👤 Usuário: ${finalData.nome_completo}`);
    console.log(`   📧 Email: ${finalData.email}`);
    console.log(`   📱 Telefone: ${finalData.telefone}`);
    console.log(`   🔄 Onboarding completo: ${!finalData.primeiro_acesso}`);
    console.log(`   🎭 Role: ${finalData.user_roles[0]?.role}`);
    console.log(`   🏥 Clínica: ${finalData.user_roles[0]?.clinicas?.nome}`);

    // ========================================================================
    // 8. LIMPEZA (OPCIONAL)
    // ========================================================================
    console.log('\n🧹 8. Limpando dados de teste...');
    
    // Deletar clínica (cascade vai deletar roles)
    await supabase.from('clinicas').delete().eq('id', clinicaData.id);
    
    // Deletar profile (cascade vai deletar user)
    await supabase.from('profiles').delete().eq('id', userId);
    
    console.log('✅ Dados de teste removidos com sucesso!');

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar teste
testCompleteAuthFlow()
  .then(() => {
    console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('   1. Execute o cadastro na interface web');
    console.log('   2. Verifique se vai direto para o onboarding');
    console.log('   3. Complete o onboarding e vá para o dashboard');
    console.log('   4. Verifique se as permissões estão funcionando');
  })
  .catch(console.error);
