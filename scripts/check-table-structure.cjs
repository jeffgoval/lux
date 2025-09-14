const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura real das tabelas...\n');

  try {
    // 1. Tentar buscar um registro da tabela profiles para ver as colunas
    console.log('1. Verificando colunas da tabela profiles...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profileError) {
      console.log('❌ Erro ao buscar profiles:', profileError.message);
    } else {
      console.log('✅ Estrutura da tabela profiles:');
      if (profileData && profileData.length > 0) {
        const columns = Object.keys(profileData[0]);
        columns.forEach(col => {
          console.log(`  - ${col}: ${typeof profileData[0][col]}`);
        });
        
        // Verificar se tem user_id
        if (columns.includes('user_id')) {
          console.log('✅ Tabela profiles TEM coluna user_id');
        } else {
          console.log('❌ Tabela profiles NÃO TEM coluna user_id');
        }
      } else {
        console.log('⚠️ Tabela profiles está vazia, não conseguimos ver a estrutura');
      }
    }

    // 2. Verificar tabela user_roles
    console.log('\n2. Verificando colunas da tabela user_roles...');
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);

    if (rolesError) {
      console.log('❌ Erro ao buscar user_roles:', rolesError.message);
    } else {
      console.log('✅ Estrutura da tabela user_roles:');
      if (rolesData && rolesData.length > 0) {
        const columns = Object.keys(rolesData[0]);
        columns.forEach(col => {
          console.log(`  - ${col}: ${typeof rolesData[0][col]}`);
        });
      } else {
        console.log('⚠️ Tabela user_roles está vazia, não conseguimos ver a estrutura');
      }
    }

    // 3. Testar queries específicas que estão falhando
    console.log('\n3. Testando queries que estão falhando...');
    
    // Simular o erro que está acontecendo
    const testUserId = 'e479db56-5cda-45db-a046-bb58cec861b0';
    
    console.log('Testando query: profiles?select=id&user_id=eq.' + testUserId);
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', testUserId);

    if (testError) {
      console.log('❌ ERRO CONFIRMADO:', testError.message);
      console.log('📋 Detalhes:', testError);
      
      // Tentar a query correta
      console.log('\nTestando query correta: profiles?select=id&id=eq.' + testUserId);
      const { data: correctData, error: correctError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', testUserId);

      if (correctError) {
        console.log('❌ Erro na query correta também:', correctError.message);
      } else {
        console.log('✅ Query correta funcionou!', correctData);
      }
    } else {
      console.log('✅ Query com user_id funcionou:', testData);
    }

    console.log('\n📊 DIAGNÓSTICO FINAL:');
    console.log('Baseado nos resultados acima, sabemos:');
    console.log('1. Se a tabela profiles tem coluna user_id ou não');
    console.log('2. Qual query está causando o erro 400');
    console.log('3. Como corrigir o problema');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkTableStructure();
