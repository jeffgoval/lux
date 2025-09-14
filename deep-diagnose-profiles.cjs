const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function deepDiagnoseProfiles() {
  console.log('🔍 DIAGNÓSTICO PROFUNDO DA TABELA PROFILES');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar se a tabela profiles existe e sua estrutura básica
    console.log('\n1. VERIFICANDO EXISTÊNCIA E ESTRUTURA BÁSICA:');
    console.log('-'.repeat(50));
    
    const testFields = ['id', 'user_id', 'nome_completo', 'email', 'ativo', 'primeiro_acesso', 'criado_em'];
    
    for (const field of testFields) {
      try {
        const { error } = await supabase
          .from('profiles')
          .select(field)
          .limit(1);
        
        if (!error) {
          console.log(`✅ ${field.padEnd(20)} - existe`);
        } else {
          console.log(`❌ ${field.padEnd(20)} - erro: ${error.message}`);
        }
      } catch (e) {
        console.log(`❌ ${field.padEnd(20)} - erro: ${e.message}`);
      }
    }

    // 2. Tentar inserir um registro de teste para ver o comportamento
    console.log('\n2. TESTANDO INSERÇÃO (SIMULADA):');
    console.log('-'.repeat(50));
    
    try {
      // Primeiro vamos ver se conseguimos selecionar dados sem filtros
      const { data: allData, error: allError } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);
        
      console.log('Total de registros encontrados:', allData?.length || 0);
      
      if (allError) {
        console.log('❌ Erro ao buscar dados:', allError.message);
      } else if (allData && allData.length > 0) {
        console.log('✅ Primeiros registros encontrados:');
        allData.slice(0, 3).forEach((record, i) => {
          console.log(`  Registro ${i + 1}:`);
          console.log(`    id: ${record.id}`);
          console.log(`    user_id: ${record.user_id || 'NULL'}`);
          console.log(`    nome: ${record.nome_completo || 'NULL'}`);
          console.log(`    email: ${record.email || 'NULL'}`);
        });
      }
    } catch (e) {
      console.log('❌ Erro ao buscar dados:', e.message);
    }

    // 3. Verificar a estrutura real da tabela usando uma query diferente
    console.log('\n3. TENTANDO QUERIES ESPECÍFICAS PARA IDENTIFICAR O PROBLEMA:');
    console.log('-'.repeat(50));
    
    // Tentar fazer um INSERT de teste (sem executar)
    console.log('📝 TESTE: Tentando verificar como seria uma inserção...');
    
    const testUUID = '00000000-0000-0000-0000-000000000001'; // UUID de teste
    
    try {
      // Tentar um insert seco (dry run simulado)
      const { data: insertTest, error: insertError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', testUUID)
        .limit(1);
        
      console.log('✅ Conseguimos fazer query por ID específico');
    } catch (e) {
      console.log('❌ Erro ao fazer query por ID:', e.message);
    }

    // 4. Verificar se o problema é de constraint ou estrutura
    console.log('\n4. VERIFICANDO POSSÍVEIS PROBLEMAS DE CONSTRAINT:');
    console.log('-'.repeat(50));
    
    try {
      // Tentar fazer uma query mais simples
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
      if (!countError) {
        console.log('✅ Total de registros na tabela:', count);
      } else {
        console.log('❌ Erro ao contar registros:', countError.message);
      }
    } catch (e) {
      console.log('❌ Erro ao contar:', e.message);
    }

    // 5. Gerar comandos SQL para investigar mais profundamente
    console.log('\n5. COMANDOS SQL PARA EXECUTAR NO SUPABASE DASHBOARD:');
    console.log('-'.repeat(50));
    
    console.log('-- Verificar a estrutura atual da tabela');
    console.log("SELECT column_name, data_type, is_nullable, column_default, is_identity");
    console.log("FROM information_schema.columns");
    console.log("WHERE table_schema = 'public' AND table_name = 'profiles'");
    console.log("ORDER BY ordinal_position;");
    console.log('');
    
    console.log('-- Verificar constraints');
    console.log("SELECT conname, contype, confupdtype, confdeltype");
    console.log("FROM pg_constraint");
    console.log("WHERE conrelid = 'public.profiles'::regclass;");
    console.log('');
    
    console.log('-- Verificar chaves primárias e estrangeiras');
    console.log("SELECT * FROM information_schema.table_constraints");
    console.log("WHERE table_name = 'profiles' AND table_schema = 'public';");
    console.log('');
    
    console.log('-- Verificar se há dados órfãos');
    console.log("SELECT COUNT(*) as total_profiles, ");
    console.log("COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_ids");
    console.log("FROM public.profiles;");

    // 6. Sugestões de correção baseadas no diagnóstico
    console.log('\n6. POSSÍVEIS CORREÇÕES:');
    console.log('-'.repeat(50));
    
    console.log('🔧 OPÇÃO 1 - Recriar a tabela profiles do zero:');
    console.log('-- CUIDADO: Isso vai apagar todos os dados!');
    console.log('DROP TABLE IF EXISTS public.profiles CASCADE;');
    console.log('');
    
    console.log('🔧 OPÇÃO 2 - Verificar e corrigir a chave primária:');
    console.log('-- Remover constraint problemática se existir');
    console.log('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_matches_user_id;');
    console.log('-- Verificar se ID é realmente a chave primária');
    console.log('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;');
    console.log('ALTER TABLE public.profiles ADD PRIMARY KEY (id);');
    console.log('');
    
    console.log('🔧 OPÇÃO 3 - Verificar se o problema é de RLS (Row Level Security):');
    console.log('-- Temporariamente desabilitar RLS para teste');
    console.log('ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;');
    console.log('-- (Lembre-se de reabilitar depois!)');

  } catch (err) {
    console.error('❌ Erro geral no diagnóstico:', err.message);
  }
}

deepDiagnoseProfiles();