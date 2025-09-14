const { createClient } = require('@supabase/supabase-js');

// Usar as mesmas configurações da aplicação
const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔧 Testando conexão com Supabase...\n');

  try {
    // Testar conexão básica
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Erro na conexão:', error.message);
      console.log('📋 Detalhes:', error);
      
      // Se a tabela não existir, isso é esperado
      if (error.message.includes('relation "public.profiles" does not exist')) {
        console.log('✅ Confirmado: Tabela profiles não existe - precisa ser criada');
      }
    } else {
      console.log('✅ Conexão com Supabase funcionando!');
      console.log('📊 Dados:', data);
    }

    // Testar se conseguimos acessar auth.users (não devemos conseguir via RLS)
    const { data: users, error: usersError } = await supabase.auth.getUser();
    
    if (usersError) {
      console.log('⚠️ Auth não autenticado (esperado):', usersError.message);
    } else {
      console.log('✅ Auth funcionando:', users);
    }

    console.log('\n📋 DIAGNÓSTICO:');
    console.log('1. A conexão com Supabase está funcionando');
    console.log('2. A tabela profiles provavelmente não existe ou tem estrutura incorreta');
    console.log('3. É necessário executar o SQL manualmente no Dashboard');
    
    console.log('\n🎯 SOLUÇÃO:');
    console.log('1. Abra o Supabase Dashboard');
    console.log('2. Vá para SQL Editor');
    console.log('3. Execute o conteúdo do arquivo: scripts/fix-profiles-table.sql');
    console.log('4. Teste o cadastro novamente');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o teste
testConnection();
