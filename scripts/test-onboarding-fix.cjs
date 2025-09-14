const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOnboardingFix() {
  console.log('🧪 TESTANDO CORREÇÃO DO ONBOARDING...\n');

  try {
    // 1. Simular exatamente o que o OnboardingWizard faz
    console.log('1. Simulando insert do OnboardingWizard...');
    
    const mockData = {
      nomeServico: 'Consulta Teste',
      descricaoServico: 'Consulta de teste para onboarding',
      duracaoServico: 60,
      precoServico: 'R$ 150,00'
    };

    const precoNumerico = parseFloat(mockData.precoServico.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    
    console.log('📋 Dados simulados:');
    console.log(`   Nome: ${mockData.nomeServico}`);
    console.log(`   Duração: ${mockData.duracaoServico} min`);
    console.log(`   Preço: R$ ${precoNumerico}`);

    const { data: insertData, error: templateError } = await supabase
      .from('templates_procedimentos')
      .insert({
        tipo_procedimento: 'consulta',
        nome_template: mockData.nomeServico,
        descricao: mockData.descricaoServico || null,
        duracao_padrao_minutos: mockData.duracaoServico,
        valor_base: precoNumerico,
        campos_obrigatorios: {
          duracao_minutos: { type: "number", required: true, default: mockData.duracaoServico },
          valor_procedimento: { type: "number", required: true, default: precoNumerico }
        },
        campos_opcionais: {
          observacoes: { type: "text" },
          retorno_recomendado: { type: "date" }
        }
      })
      .select();

    if (templateError) {
      console.log('❌ ERRO NO TEMPLATE:', templateError.message);
      console.log('📋 Código:', templateError.code);
      console.log('📋 Detalhes:', templateError.details);
      
      if (templateError.code === 'PGRST204') {
        console.log('\n🎯 AINDA HÁ COLUNAS INVÁLIDAS');
      } else if (templateError.code === '23502') {
        console.log('\n🎯 CAMPO OBRIGATÓRIO FALTANDO');
      } else if (templateError.code === '42501') {
        console.log('\n🎯 POLÍTICA RLS BLOQUEANDO');
      }
    } else {
      console.log('✅ TEMPLATE INSERIDO COM SUCESSO!');
      console.log(`📋 ID: ${insertData[0]?.id}`);
      console.log(`📋 Nome: ${insertData[0]?.nome_template}`);
      
      // Limpar registro de teste
      if (insertData[0]?.id) {
        await supabase
          .from('templates_procedimentos')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Registro de teste removido');
      }
    }

    console.log('\n🎯 RESULTADO:');
    if (!templateError) {
      console.log('🎉 PROBLEMA DO ONBOARDING RESOLVIDO!');
      console.log('✅ O OnboardingWizard agora pode inserir templates sem erro');
      console.log('✅ Não haverá mais erro 400 na tabela templates_procedimentos');
      console.log('\n📋 PRÓXIMO PASSO:');
      console.log('Teste o cadastro completo na aplicação agora!');
    } else {
      console.log('⚠️  Ainda há problemas a resolver');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testOnboardingFix();
