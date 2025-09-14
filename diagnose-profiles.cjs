const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnoseProfilesIssue() {
  console.log('🔍 DIAGNOSTICANDO PROBLEMA NA TABELA PROFILES...');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar estrutura atual da tabela profiles
    console.log('\n1. VERIFICANDO DADOS NA TABELA PROFILES:');
    console.log('-'.repeat(40));
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, nome_completo, email')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError.message);
    } else {
      console.log('✅ Profiles encontrados:', profiles.length);
      
      if (profiles.length > 0) {
        profiles.forEach((profile, i) => {
          console.log(`\nProfile ${i + 1}:`);
          console.log('  id:', profile.id);
          console.log('  user_id:', profile.user_id);
          console.log('  nome:', profile.nome_completo);
          console.log('  email:', profile.email);
          console.log('  ID = USER_ID?', profile.id === profile.user_id ? '✅ SIM' : '❌ NÃO');
        });
      } else {
        console.log('⚠️ Nenhum profile encontrado');
      }
    }

    // 2. Tentar buscar todos os IDs únicos
    console.log('\n2. VERIFICANDO TODOS OS IDs DA TABELA:');
    console.log('-'.repeat(40));
    
    try {
      const { data: allIds, error: idsError } = await supabase
        .from('profiles')
        .select('id, user_id')
        .order('criado_em', { ascending: false });
      
      if (idsError) {
        console.error('❌ Erro ao buscar IDs:', idsError.message);
      } else {
        console.log(`✅ Total de registros: ${allIds.length}`);
        
        // Verificar quantos têm ID diferente de USER_ID
        const mismatchedIds = allIds.filter(p => p.id !== p.user_id);
        
        if (mismatchedIds.length > 0) {
          console.log(`❌ PROBLEMA ENCONTRADO: ${mismatchedIds.length} registros com ID != USER_ID`);
          console.log('\nRegistros problemáticos:');
          mismatchedIds.slice(0, 5).forEach((p, i) => {
            console.log(`  ${i + 1}. ID: ${p.id} | USER_ID: ${p.user_id}`);
          });
        } else {
          console.log('✅ Todos os registros têm ID = USER_ID');
        }
      }
    } catch (e) {
      console.error('Erro ao verificar IDs:', e.message);
    }

    // 3. Sugerir correção
    console.log('\n3. DIAGNÓSTICO E SOLUÇÃO:');
    console.log('-'.repeat(40));
    
    console.log('🔍 PROBLEMA IDENTIFICADO:');
    console.log('O comando "ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();"');
    console.log('fez com que novos registros gerem IDs aleatórios em vez de usar o user_id.');
    console.log('');
    console.log('🛠️ SOLUÇÃO:');
    console.log('1. Remover o DEFAULT da coluna id');
    console.log('2. Garantir que id = user_id sempre');
    console.log('3. Corrigir registros existentes se necessário');
    console.log('');
    console.log('📝 COMANDOS SQL PARA EXECUTAR NO SUPABASE:');
    console.log('');
    console.log('-- Remover o default problemático');
    console.log('ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;');
    console.log('');
    console.log('-- Atualizar registros existentes onde id != user_id');
    console.log('UPDATE public.profiles SET id = user_id WHERE id != user_id;');
    console.log('');
    console.log('-- Garantir que id seja sempre igual a user_id (constraint)');
    console.log('ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_matches_user_id CHECK (id = user_id);');

  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

diagnoseProfilesIssue();