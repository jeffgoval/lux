const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugOnboardingCompletion() {
  console.log('🔍 DEBUGANDO FINALIZAÇÃO DO ONBOARDING...\n');

  try {
    // 1. Buscar usuários recentes que finalizaram onboarding
    console.log('1. Buscando usuários recentes...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(5);

    if (profilesError) {
      console.log('❌ Erro ao buscar profiles:', profilesError.message);
      return;
    }

    console.log(`✅ ${profiles.length} profiles encontrados:`);
    profiles.forEach((profile, i) => {
      console.log(`${i + 1}. ${profile.nome_completo || 'Sem nome'}`);
      console.log(`   Email: ${profile.email || 'N/A'}`);
      console.log(`   primeiro_acesso: ${profile.primeiro_acesso}`);
      console.log(`   Criado: ${new Date(profile.criado_em).toLocaleString()}`);
      console.log('---');
    });

    // 2. Verificar o usuário mais recente
    if (profiles.length > 0) {
      const recentUser = profiles[0];
      console.log(`\n2. Analisando usuário mais recente: ${recentUser.nome_completo || recentUser.id}`);
      
      // Verificar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', recentUser.id)
        .eq('ativo', true);

      if (rolesError) {
        console.log('❌ Erro ao buscar roles:', rolesError.message);
      } else {
        console.log(`✅ ${roles.length} role(s) ativa(s):`);
        roles.forEach(role => {
          console.log(`   - ${role.role} (clínica: ${role.clinica_id})`);
        });
      }

      // Verificar clínicas
      const { data: clinicas, error: clinicasError } = await supabase
        .from('clinicas')
        .select('*')
        .eq('proprietario_id', recentUser.id);

      if (clinicasError) {
        console.log('❌ Erro ao buscar clínicas:', clinicasError.message);
      } else {
        console.log(`✅ ${clinicas.length} clínica(s) encontrada(s):`);
        clinicas.forEach(clinica => {
          console.log(`   - ${clinica.nome} (ID: ${clinica.id})`);
        });
      }

      // 3. Simular o que o guard faria
      console.log('\n3. Simulando verificação do guard...');
      
      const needsOnboarding = recentUser.primeiro_acesso === true;
      console.log(`primeiro_acesso: ${recentUser.primeiro_acesso}`);
      console.log(`needsOnboarding: ${needsOnboarding}`);
      
      if (needsOnboarding) {
        console.log('❌ PROBLEMA: Guard ainda considera que precisa de onboarding');
        console.log('💡 CAUSA: primeiro_acesso ainda é true');
        
        // Verificar se há algum problema na atualização
        console.log('\n4. Testando atualização manual...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ primeiro_acesso: false })
          .eq('id', recentUser.id);

        if (updateError) {
          console.log('❌ ERRO na atualização:', updateError.message);
          console.log('📋 Código:', updateError.code);
          console.log('📋 Detalhes:', updateError.details);
          
          if (updateError.code === '42501') {
            console.log('\n🎯 PROBLEMA: Política RLS bloqueando update');
            console.log('💡 SOLUÇÃO: Verificar política de update na tabela profiles');
          }
        } else {
          console.log('✅ Atualização manual funcionou');
          
          // Verificar se realmente atualizou
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('primeiro_acesso')
            .eq('id', recentUser.id)
            .single();
            
          console.log(`✅ Novo valor: primeiro_acesso = ${updatedProfile?.primeiro_acesso}`);
        }
      } else {
        console.log('✅ Guard deveria permitir acesso ao dashboard');
        console.log('🤔 Se ainda está redirecionando, pode ser problema no contexto React');
      }
    }

    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('Se primeiro_acesso ainda é true:');
    console.log('1. Problema na atualização do banco (RLS ou trigger)');
    console.log('2. OnboardingWizard não está executando a atualização');
    console.log('\nSe primeiro_acesso é false mas ainda redireciona:');
    console.log('1. Contexto React não está sendo atualizado');
    console.log('2. Guard está usando dados em cache');
    console.log('3. Navegação está sendo interceptada');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugOnboardingCompletion();
