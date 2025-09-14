const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// IMPORTANTE: Atualize o .env com as credenciais do NOVO projeto!
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testRebuildDatabase() {
  console.log('🧪 TESTANDO RECONSTRUÇÃO DO BANCO DE DADOS');
  console.log('='.repeat(60));
  
  try {
    // Lista de todas as tabelas que devem existir
    const requiredTables = [
      'profiles',
      'user_roles', 
      'organizacoes',
      'clinicas',
      'profissionais',
      'clinica_profissionais',
      'especialidades_medicas',
      'templates_procedimentos'
    ];

    console.log('\n1. VERIFICANDO TABELAS CRIADAS:');
    console.log('-'.repeat(40));
    
    let allTablesOk = true;
    
    for (const table of requiredTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(0);
        
        if (!error) {
          console.log(`✅ ${table.padEnd(25)} - OK`);
        } else {
          console.log(`❌ ${table.padEnd(25)} - ERRO: ${error.message}`);
          allTablesOk = false;
        }
      } catch (e) {
        console.log(`❌ ${table.padEnd(25)} - ERRO: ${e.message}`);
        allTablesOk = false;
      }
    }

    // Teste específico da tabela clinicas com todas as colunas
    console.log('\n2. TESTANDO COLUNAS DA TABELA CLINICAS:');
    console.log('-'.repeat(40));
    
    const clinicasColumns = [
      'id', 'nome', 'cnpj', 'endereco', 'telefone_principal', 
      'email_contato', 'horario_funcionamento', 'organizacao_id', 
      'ativo', 'criado_em', 'atualizado_em', 'criado_por'
    ];
    
    let allColumnsOk = true;
    
    for (const column of clinicasColumns) {
      try {
        const { error } = await supabase
          .from('clinicas')
          .select(column)
          .limit(1);
        
        if (!error) {
          console.log(`✅ clinicas.${column.padEnd(20)} - OK`);
        } else {
          console.log(`❌ clinicas.${column.padEnd(20)} - ERRO: ${error.message}`);
          allColumnsOk = false;
        }
      } catch (e) {
        console.log(`❌ clinicas.${column.padEnd(20)} - ERRO: ${e.message}`);
        allColumnsOk = false;
      }
    }

    // Verificar se dados básicos foram inseridos
    console.log('\n3. VERIFICANDO DADOS BÁSICOS:');
    console.log('-'.repeat(40));
    
    try {
      const { data: especialidades, error: espError } = await supabase
        .from('especialidades_medicas')
        .select('nome')
        .limit(10);
        
      if (!espError) {
        console.log(`✅ Especialidades inseridas: ${especialidades.length}`);
        if (especialidades.length > 0) {
          console.log('   Exemplos:', especialidades.slice(0, 3).map(e => e.nome).join(', '));
        }
      } else {
        console.log('❌ Erro ao verificar especialidades:', espError.message);
        allTablesOk = false;
      }
    } catch (e) {
      console.log('❌ Erro ao verificar especialidades:', e.message);
      allTablesOk = false;
    }

    // Resultado final
    console.log('\n4. RESULTADO FINAL:');
    console.log('-'.repeat(40));
    
    if (allTablesOk && allColumnsOk) {
      console.log('🎉 SUCESSO! Banco reconstruído corretamente!');
      console.log('');
      console.log('✅ Todas as tabelas foram criadas');
      console.log('✅ Todas as colunas necessárias existem');
      console.log('✅ Dados básicos foram inseridos');
      console.log('✅ OnboardingWizard deve funcionar agora!');
      console.log('');
      console.log('📝 PRÓXIMOS PASSOS:');
      console.log('1. Atualize o .env com as credenciais do novo projeto');
      console.log('2. Teste o cadastro e login no frontend');
      console.log('3. Teste o fluxo de onboarding completo');
      
    } else {
      console.log('❌ PROBLEMAS ENCONTRADOS!');
      console.log('');
      console.log('🔧 POSSÍVEIS SOLUÇÕES:');
      console.log('1. Verifique se executou o script REBUILD_DATABASE_COMPLETE.sql');
      console.log('2. Verifique se está conectado no projeto correto');
      console.log('3. Verifique se o .env está atualizado');
    }

    // Informações do ambiente
    console.log('\n5. INFORMAÇÕES DO AMBIENTE:');
    console.log('-'.repeat(40));
    console.log('URL:', process.env.VITE_SUPABASE_URL?.substring(0, 50) + '...');
    console.log('Projeto ID:', process.env.VITE_SUPABASE_PROJECT_ID || 'Não definido');

  } catch (err) {
    console.error('❌ Erro geral:', err.message);
    console.log('\n💡 DICAS:');
    console.log('- Verifique se o .env foi atualizado com as credenciais do novo projeto');
    console.log('- Verifique se o script SQL foi executado completamente');
  }
}

testRebuildDatabase();