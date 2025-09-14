const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function inspectSchema() {
  console.log('='.repeat(60));
  console.log('INSPEÇÃO DO ESQUEMA DO BANCO DE DADOS');
  console.log('='.repeat(60));

  try {
    // 1. Verificar tabelas importantes testando queries diretas
    console.log('\n1. VERIFICANDO TABELAS EXISTENTES:');
    console.log('-'.repeat(40));
    
    const tablesToCheck = ['clinicas', 'profiles', 'user_roles', 'profissionais', 'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'];
    const existingTables = [];
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (!error) {
          console.log(`✓ ${table} - existe`);
          existingTables.push(table);
        } else {
          console.log(`✗ ${table} - não existe ou sem acesso: ${error.message}`);
        }
      } catch (e) {
        console.log(`✗ ${table} - erro: ${e.message}`);
      }
    }

    // 2. Inspecionar colunas da tabela clinicas testando campos específicos
    console.log('\n2. ESTRUTURA DA TABELA "clinicas":');
    console.log('-'.repeat(40));
    
    const clinicasFields = [
      'id', 'nome', 'cnpj', 'endereco', 'telefone_principal', 
      'email_contato', 'horario_funcionamento', 'organizacao_id', 
      'ativo', 'criado_em', 'atualizado_em', 'criado_por'
    ];
    
    const existingClinicasFields = [];
    for (const field of clinicasFields) {
      try {
        const { error } = await supabase
          .from('clinicas')
          .select(field)
          .limit(1);
        
        if (!error) {
          console.log(`  ✓ ${field.padEnd(25)} - existe`);
          existingClinicasFields.push(field);
        } else {
          console.log(`  ✗ ${field.padEnd(25)} - não existe: ${error.message}`);
        }
      } catch (e) {
        console.log(`  ✗ ${field.padEnd(25)} - erro: ${e.message}`);
      }
    }

    // 3. Verificar outras tabelas importantes
    for (const table of existingTables.filter(t => t !== 'clinicas')) {
      console.log(`\n3. VERIFICANDO CAMPOS DA TABELA "${table}":`);
      console.log('-'.repeat(40));
      
      let fieldsToCheck = [];
      
      switch(table) {
        case 'profiles':
          fieldsToCheck = ['id', 'user_id', 'nome_completo', 'email', 'telefone', 'ativo', 'primeiro_acesso'];
          break;
        case 'user_roles':
          fieldsToCheck = ['id', 'user_id', 'role', 'clinica_id', 'ativo', 'criado_por'];
          break;
        case 'profissionais':
          fieldsToCheck = ['id', 'user_id', 'registro_profissional', 'especialidades', 'ativo'];
          break;
        case 'clinica_profissionais':
          fieldsToCheck = ['id', 'clinica_id', 'user_id', 'cargo', 'especialidades', 'ativo'];
          break;
        case 'templates_procedimentos':
          fieldsToCheck = ['id', 'clinica_id', 'nome_template', 'tipo_procedimento', 'descricao', 'ativo'];
          break;
        default:
          fieldsToCheck = ['id', 'nome', 'ativo'];
      }
      
      for (const field of fieldsToCheck) {
        try {
          const { error } = await supabase
            .from(table)
            .select(field)
            .limit(1);
          
          if (!error) {
            console.log(`  ✓ ${field.padEnd(25)} - existe`);
          } else {
            console.log(`  ✗ ${field.padEnd(25)} - não existe: ${error.message}`);
          }
        } catch (e) {
          console.log(`  ✗ ${field.padEnd(25)} - erro: ${e.message}`);
        }
      }
    }

    // 4. Resumo dos problemas encontrados
    console.log('\n4. PROBLEMAS IDENTIFICADOS:');
    console.log('-'.repeat(40));
    
    if (!existingTables.includes('clinicas')) {
      console.log('  ❌ CRÍTICO: Tabela clinicas não existe!');
    } else if (!existingClinicasFields.includes('cnpj')) {
      console.log('  ❌ CRÍTICO: Campo cnpj não existe na tabela clinicas!');
    }
    
    const missingTables = tablesToCheck.filter(t => !existingTables.includes(t));
    if (missingTables.length > 0) {
      console.log(`  ⚠️  Tabelas faltantes: ${missingTables.join(', ')}`);
    }
    
    console.log('\n5. RECOMENDAÇÕES:');
    console.log('-'.repeat(40));
    if (!existingClinicasFields.includes('cnpj')) {
      console.log('  1. Adicionar coluna cnpj à tabela clinicas');
      console.log('  2. Atualizar OnboardingWizard para não incluir cnpj até a migração ser aplicada');
      console.log('  3. Verificar se outras colunas necessárias existem');
    }

  } catch (err) {
    console.error('Erro geral:', err.message);
  }
}

inspectSchema();