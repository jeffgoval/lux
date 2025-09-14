const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMDc3MjYsImV4cCI6MjA1MDg4MzcyNn0.JOJPdA5-UzVqjkFFW86i9SN9sTrFrpjrYYKP3F7pRZg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixAuthIssues() {
  console.log('🔧 DIAGNÓSTICO E CORREÇÃO DE PROBLEMAS DE AUTENTICAÇÃO');
  console.log('='.repeat(60));

  try {
    // 1. Verificar configuração atual do Supabase
    console.log('\n1. 🔍 VERIFICANDO CONFIGURAÇÃO');
    console.log('-'.repeat(40));
    
    console.log('✅ URL Supabase:', supabaseUrl);
    console.log('✅ Chave Anon configurada:', !!supabaseAnonKey);

    // 2. Testar conexão básica
    console.log('\n2. 🌐 TESTANDO CONEXÃO');
    console.log('-'.repeat(40));
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
        
      if (error) {
        if (error.message.includes('relation "public.profiles" does not exist')) {
          console.log('⚠️ Tabela profiles não existe - isso é esperado se for primeira configuração');
        } else {
          console.log('❌ Erro na conexão:', error.message);
        }
      } else {
        console.log('✅ Conexão com banco funcionando');
      }
    } catch (e) {
      console.log('❌ Erro de rede:', e.message);
    }

    // 3. Verificar estado da autenticação
    console.log('\n3. 🔐 VERIFICANDO ESTADO DE AUTENTICAÇÃO');
    console.log('-'.repeat(40));
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log('❌ Erro ao obter sessão:', sessionError.message);
        
        if (sessionError.message.includes('refresh_token')) {
          console.log('🎯 PROBLEMA IDENTIFICADO: Token de refresh inválido');
          console.log('💡 SOLUÇÃO: Limpar localStorage e fazer logout completo');
        }
      } else if (session) {
        console.log('✅ Sessão ativa encontrada');
        console.log('   User ID:', session.user?.id);
        console.log('   Email:', session.user?.email);
      } else {
        console.log('ℹ️ Nenhuma sessão ativa (normal se não logado)');
      }
    } catch (e) {
      console.log('❌ Erro ao verificar sessão:', e.message);
    }

    // 4. Verificar políticas RLS
    console.log('\n4. 🛡️ VERIFICANDO POLÍTICAS RLS');
    console.log('-'.repeat(40));
    
    // Teste básico de RLS - tentar inserir sem autenticação
    try {
      const { error: testError } = await supabase
        .from('user_roles')
        .select('id')
        .limit(1);
        
      if (testError) {
        if (testError.message.includes('row-level security')) {
          console.log('❌ PROBLEMA: Políticas RLS muito restritivas');
          console.log('🎯 Bloqueando criação de user_roles durante onboarding');
        } else if (testError.message.includes('does not exist')) {
          console.log('⚠️ Tabela user_roles não existe');
        } else {
          console.log('❌ Erro RLS:', testError.message);
        }
      } else {
        console.log('✅ Acesso básico às tabelas funcionando');
      }
    } catch (e) {
      console.log('❌ Erro ao testar RLS:', e.message);
    }

    // 5. Soluções propostas
    console.log('\n5. 🔧 SOLUÇÕES RECOMENDADAS');
    console.log('-'.repeat(40));
    console.log('');

    console.log('Para resolver o erro de Refresh Token:');
    console.log('1. Limpar localStorage no browser:');
    console.log('   - Abrir DevTools (F12)');
    console.log('   - Ir para Application > Local Storage');
    console.log('   - Deletar todas as entradas do Supabase');
    console.log('   - Ou executar: localStorage.clear()');
    console.log('');

    console.log('Para resolver o erro de RLS:');
    console.log('1. Executar no SQL Editor do Supabase:');
    console.log('   -- Permitir que usuários autenticados criem seus próprios roles');
    console.log('   CREATE POLICY "Users can create own roles" ON user_roles');
    console.log('   FOR INSERT TO authenticated');
    console.log('   WITH CHECK (auth.uid() = user_id);');
    console.log('');

    console.log('2. Verificar se a função handle_new_user() está funcionando:');
    console.log('   SELECT * FROM information_schema.triggers');
    console.log('   WHERE trigger_name = \'on_auth_user_created\';');
    console.log('');

    console.log('Para resolver warnings de autocomplete:');
    console.log('1. Adicionar atributo autocomplete nos inputs de senha');
    console.log('2. Usar "new-password" para cadastro e "current-password" para login');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Função para limpar estado de autenticação local
async function clearAuthState() {
  console.log('\n🧹 LIMPANDO ESTADO DE AUTENTICAÇÃO LOCAL');
  console.log('-'.repeat(40));
  
  try {
    // Fazer logout completo
    await supabase.auth.signOut({ scope: 'local' });
    console.log('✅ Logout local realizado');
    
    // Note: localStorage.clear() não funcionará em Node.js
    console.log('ℹ️ Para limpar completamente:');
    console.log('   1. Abra o browser');
    console.log('   2. Pressione F12');
    console.log('   3. Execute: localStorage.clear()');
    console.log('   4. Recarregue a página');
    
  } catch (error) {
    console.log('❌ Erro ao limpar:', error.message);
  }
}

// Executar diagnóstico
fixAuthIssues().then(() => {
  // Oferecer limpeza se houver problemas
  const args = process.argv.slice(2);
  if (args.includes('--clear')) {
    return clearAuthState();
  }
});