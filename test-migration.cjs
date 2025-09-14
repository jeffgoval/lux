const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testMigration() {
  console.log('🧪 TESTANDO MIGRAÇÃO...');
  console.log('='.repeat(50));

  const requiredColumns = [
    { table: 'clinicas', columns: ['cnpj', 'endereco', 'telefone_principal', 'email_contato', 'horario_funcionamento', 'organizacao_id'] },
    { table: 'profissionais', columns: ['especialidades'] }
  ];

  let allPassed = true;

  for (const { table, columns } of requiredColumns) {
    console.log(`\n📋 Testando tabela: ${table}`);
    console.log('-'.repeat(30));

    for (const column of columns) {
      try {
        const { error } = await supabase
          .from(table)
          .select(column)
          .limit(1);

        if (!error) {
          console.log(`  ✅ ${column.padEnd(25)} - OK`);
        } else {
          console.log(`  ❌ ${column.padEnd(25)} - FALHOU: ${error.message}`);
          allPassed = false;
        }
      } catch (e) {
        console.log(`  ❌ ${column.padEnd(25)} - ERRO: ${e.message}`);
        allPassed = false;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 MIGRAÇÃO BEM-SUCEDIDA! Todas as colunas estão disponíveis.');
    console.log('');
    console.log('📝 PRÓXIMOS PASSOS:');
    console.log('1. Descomente as linhas no OnboardingWizard.tsx');
    console.log('2. Remova os comentários temporários do payload da clínica');
    console.log('3. Teste o fluxo de onboarding completo');
    console.log('');
    console.log('📄 Arquivo a editar: src/components/OnboardingWizard.tsx (linha ~306)');
  } else {
    console.log('❌ MIGRAÇÃO INCOMPLETA! Algumas colunas ainda estão faltantes.');
    console.log('');
    console.log('🔧 SOLUÇÕES:');
    console.log('1. Execute novamente o SQL: migration-simple.sql');
    console.log('2. Verifique se o SQL foi executado no projeto correto');
    console.log('3. Aguarde alguns segundos para o cache ser atualizado');
  }
}

testMigration();