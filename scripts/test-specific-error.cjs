const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSpecificError() {
  console.log('🔍 Testando o erro específico que está acontecendo...\n');

  try {
    // Simular exatamente o erro que está aparecendo no console
    const testUserId = 'ab45bb7f-b3b3-4da9-9f34-8619d82c8ea8';
    
    console.log('1. Testando query que está falhando:');
    console.log(`GET /rest/v1/profiles?select=id&user_id=eq.${testUserId}`);
    
    const { data: errorData, error: errorResult } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', testUserId);

    if (errorResult) {
      console.log('❌ ERRO CONFIRMADO:', errorResult.message);
      console.log('📋 Código:', errorResult.code);
      console.log('📋 Detalhes:', errorResult.details);
    } else {
      console.log('✅ Query funcionou (inesperado):', errorData);
    }

    console.log('\n2. Testando query correta:');
    console.log(`GET /rest/v1/profiles?select=id&id=eq.${testUserId}`);
    
    const { data: correctData, error: correctError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', testUserId);

    if (correctError) {
      console.log('❌ Erro na query correta:', correctError.message);
    } else {
      console.log('✅ Query correta funcionou:', correctData);
    }

    console.log('\n3. Testando POST que está falhando:');
    console.log('POST /rest/v1/profiles');
    
    // Tentar um insert que pode estar falhando
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        email: 'teste@exemplo.com',
        nome_completo: 'Teste',
        primeiro_acesso: true
      })
      .select();

    if (insertError) {
      console.log('❌ ERRO NO INSERT:', insertError.message);
      console.log('📋 Código:', insertError.code);
      console.log('📋 Detalhes:', insertError.details);
      
      if (insertError.message.includes('duplicate key')) {
        console.log('✅ Erro esperado - usuário já existe');
      }
    } else {
      console.log('✅ Insert funcionou:', insertData);
    }

    console.log('\n4. Verificando estrutura da tabela:');
    
    // Buscar qualquer registro para ver a estrutura
    const { data: sampleData, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Erro ao buscar amostra:', sampleError.message);
    } else if (sampleData && sampleData.length > 0) {
      console.log('✅ Estrutura da tabela:');
      const columns = Object.keys(sampleData[0]);
      columns.forEach(col => {
        console.log(`  - ${col}`);
      });
      
      if (columns.includes('user_id')) {
        console.log('⚠️ ATENÇÃO: Tabela TEM coluna user_id');
      } else {
        console.log('✅ Tabela NÃO TEM coluna user_id (correto)');
      }
    } else {
      console.log('⚠️ Tabela está vazia');
    }

    console.log('\n📊 CONCLUSÃO:');
    console.log('Se o erro 400 ainda está acontecendo, significa que:');
    console.log('1. Algum código ainda está fazendo queries com user_id');
    console.log('2. Ou a tabela ainda tem estrutura incorreta');
    console.log('3. Ou há cache no browser que precisa ser limpo');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testSpecificError();
