const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTableStructure() {
  console.log('🔍 VERIFICANDO ESTRUTURA REAL DA TABELA templates_procedimentos...\n');

  try {
    // 1. Tentar fazer um select para ver quais colunas existem
    console.log('1. Testando select com todas as colunas possíveis...');
    
    const possibleColumns = [
      'id',
      'clinica_id', 
      'tipo_procedimento',
      'nome_template',
      'descricao',
      'campos_obrigatorios',
      'campos_opcionais',
      'duracao_padrao_minutos',
      'valor_base',
      'instrucoes_pre',
      'instrucoes_pos',
      'contraindicacoes',
      'ativo',
      'criado_em',
      'atualizado_em',
      'criado_por'
    ];

    const workingColumns = [];
    const failingColumns = [];

    for (const column of possibleColumns) {
      try {
        const { error } = await supabase
          .from('templates_procedimentos')
          .select(column)
          .limit(1);
          
        if (error) {
          failingColumns.push(column);
        } else {
          workingColumns.push(column);
        }
      } catch (e) {
        failingColumns.push(column);
      }
    }

    console.log('✅ COLUNAS QUE EXISTEM:');
    workingColumns.forEach(col => console.log(`   - ${col}`));
    
    console.log('\n❌ COLUNAS QUE NÃO EXISTEM:');
    failingColumns.forEach(col => console.log(`   - ${col}`));

    // 2. Testar insert apenas com colunas que existem
    console.log('\n2. Testando insert com colunas válidas...');
    
    const validInsertData = {};
    
    // Campos obrigatórios que provavelmente existem
    if (workingColumns.includes('tipo_procedimento')) {
      validInsertData.tipo_procedimento = 'consulta';
    }
    if (workingColumns.includes('nome_template')) {
      validInsertData.nome_template = 'Teste Template';
    }
    if (workingColumns.includes('descricao')) {
      validInsertData.descricao = 'Template de teste';
    }
    if (workingColumns.includes('duracao_padrao_minutos')) {
      validInsertData.duracao_padrao_minutos = 60;
    }
    if (workingColumns.includes('valor_base')) {
      validInsertData.valor_base = 100.00;
    }
    if (workingColumns.includes('campos_obrigatorios')) {
      validInsertData.campos_obrigatorios = { duracao: 60 };
    }
    if (workingColumns.includes('campos_opcionais')) {
      validInsertData.campos_opcionais = { observacoes: "text" };
    }

    console.log('📋 Dados para insert:', JSON.stringify(validInsertData, null, 2));

    const { data: insertData, error: insertError } = await supabase
      .from('templates_procedimentos')
      .insert(validInsertData)
      .select();

    if (insertError) {
      console.log('❌ ERRO NO INSERT:', insertError.message);
      console.log('📋 Código:', insertError.code);
      console.log('📋 Detalhes:', insertError.details);
      
      if (insertError.code === 'PGRST204') {
        console.log('\n🎯 PROBLEMA: Coluna não existe na tabela');
      } else if (insertError.code === '23502') {
        console.log('\n🎯 PROBLEMA: Campo obrigatório faltando');
      } else if (insertError.code === '42501') {
        console.log('\n🎯 PROBLEMA: Política RLS bloqueando');
      }
    } else {
      console.log('✅ INSERT FUNCIONOU!');
      console.log('📋 Template criado:', insertData[0]?.id);
      
      // Limpar o registro de teste
      if (insertData[0]?.id) {
        await supabase
          .from('templates_procedimentos')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Registro de teste removido');
      }
    }

    console.log('\n🎯 CONCLUSÃO:');
    console.log('Agora sabemos exatamente quais colunas existem na tabela.');
    console.log('Vou corrigir o OnboardingWizard para usar apenas as colunas válidas.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkTableStructure();
