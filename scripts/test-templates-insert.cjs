const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTemplatesInsert() {
  console.log('🧪 TESTANDO INSERT NA TABELA templates_procedimentos...\n');

  try {
    // 1. Criar usuário de teste
    const timestamp = Date.now();
    const testEmail = `teste-template-${timestamp}@exemplo.com`;
    const testPassword = '123456';
    
    console.log('1. Criando usuário de teste...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome_completo: 'Usuário Teste Template'
        }
      }
    });

    if (authError || !authData.user) {
      console.log('❌ Erro ao criar usuário:', authError?.message);
      return;
    }

    console.log('✅ Usuário criado:', authData.user.id);
    
    // 2. Aguardar trigger
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Buscar clinica_id do usuário
    console.log('\n2. Buscando clinica_id do usuário...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('clinica_id')
      .eq('user_id', authData.user.id)
      .eq('ativo', true)
      .limit(1);

    if (rolesError || !roles || roles.length === 0) {
      console.log('❌ Erro ao buscar roles:', rolesError?.message);
      console.log('📋 Usuário não tem clinica_id definida');
      
      // Vamos tentar inserir sem clinica_id para ver o erro específico
      console.log('\n3. Testando insert sem clinica_id...');
      const { error: insertError } = await supabase
        .from('templates_procedimentos')
        .insert({
          tipo_procedimento: 'consulta',
          nome_template: 'Teste Template',
          descricao: 'Template de teste',
          duracao_padrao_minutos: 60,
          valor_base: 100.00,
          campos_obrigatorios: JSON.stringify({
            duracao_minutos: { type: "number", required: true, default: 60 }
          }),
          campos_opcionais: JSON.stringify({
            observacoes: { type: "text" }
          }),
          criado_por: authData.user.id
        });

      if (insertError) {
        console.log('❌ ERRO ESPECÍFICO NO INSERT:', insertError.message);
        console.log('📋 Código:', insertError.code);
        console.log('📋 Detalhes:', insertError.details);
        console.log('📋 Hint:', insertError.hint);
        
        if (insertError.message.includes('clinica_id')) {
          console.log('\n🎯 PROBLEMA IDENTIFICADO:');
          console.log('O campo clinica_id é obrigatório mas o usuário não tem clínica associada.');
          console.log('\n💡 SOLUÇÕES:');
          console.log('1. Tornar clinica_id opcional na tabela');
          console.log('2. Garantir que usuários tenham clínica antes do onboarding');
          console.log('3. Criar clínica automaticamente no trigger');
        }
      } else {
        console.log('✅ Insert funcionou sem clinica_id!');
      }
      
      return;
    }

    const clinicaId = roles[0].clinica_id;
    console.log('✅ Clinica ID encontrada:', clinicaId);

    // 4. Testar insert com clinica_id
    console.log('\n3. Testando insert com clinica_id...');
    const { data: insertData, error: insertError } = await supabase
      .from('templates_procedimentos')
      .insert({
        clinica_id: clinicaId,
        tipo_procedimento: 'consulta',
        nome_template: 'Teste Template',
        descricao: 'Template de teste',
        duracao_padrao_minutos: 60,
        valor_base: 100.00,
        campos_obrigatorios: JSON.stringify({
          duracao_minutos: { type: "number", required: true, default: 60 }
        }),
        campos_opcionais: JSON.stringify({
          observacoes: { type: "text" }
        }),
        criado_por: authData.user.id
      })
      .select();

    if (insertError) {
      console.log('❌ ERRO NO INSERT:', insertError.message);
      console.log('📋 Código:', insertError.code);
      console.log('📋 Detalhes:', insertError.details);
    } else {
      console.log('✅ Template inserido com sucesso!');
      console.log('📋 ID:', insertData[0]?.id);
    }

    // 5. Limpar
    console.log('\n4. Limpando dados de teste...');
    await supabase.auth.signOut();

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testTemplatesInsert();
