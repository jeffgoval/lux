const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearAndTest() {
  console.log('🧹 LIMPANDO SESSÕES E TESTANDO CADASTRO...\n');

  try {
    // 1. Limpar qualquer sessão existente
    console.log('1. 🧹 Limpando sessões...');
    await supabase.auth.signOut();
    console.log('✅ Sessões limpas');

    // 2. Testar cadastro com email único
    const timestamp = Date.now();
    const testEmail = `teste-clean-${timestamp}@exemplo.com`;
    const testPassword = '123456';
    
    console.log('\n2. 📝 Testando cadastro limpo...');
    console.log(`   Email: ${testEmail}`);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome_completo: 'Usuário Teste Limpo'
        }
      }
    });

    if (authError) {
      console.log('❌ Erro no cadastro:', authError.message);
      console.log('📋 Código:', authError.code);
      console.log('📋 Detalhes:', authError);
      return;
    }

    if (!authData.user) {
      console.log('❌ Usuário não foi criado');
      return;
    }

    console.log('✅ Cadastro realizado com sucesso!');
    console.log(`   ID: ${authData.user.id}`);
    
    // 3. Aguardar trigger
    console.log('\n3. ⏳ Aguardando trigger (3 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Verificar profile
    console.log('\n4. 🔍 Verificando profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.log('❌ ERRO NO PROFILE:', profileError.message);
      console.log('📋 Código:', profileError.code);
      console.log('📋 Detalhes:', profileError.details);
      
      // Se der erro, vamos tentar entender o problema
      console.log('\n🔍 INVESTIGANDO PROBLEMA...');
      
      // Verificar se a tabela existe
      const { data: tableCheck, error: tableError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
        
      if (tableError) {
        console.log('❌ Problema com a tabela profiles:', tableError.message);
      } else {
        console.log('✅ Tabela profiles existe e é acessível');
      }
      
    } else {
      console.log('✅ Profile encontrado!');
      console.log(`   Nome: ${profile.nome_completo}`);
      console.log(`   Email: ${profile.email}`);
    }

    // 5. Verificar roles
    console.log('\n5. 👑 Verificando roles...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', authData.user.id);

    if (rolesError) {
      console.log('❌ Erro ao buscar roles:', rolesError.message);
    } else {
      console.log(`✅ ${roles.length} role(s) encontrada(s)`);
      if (roles.length > 0) {
        console.log(`   Role: ${roles[0].role}`);
      }
    }

    console.log('\n🎯 RESULTADO FINAL:');
    if (!profileError && !rolesError) {
      console.log('🎉 SISTEMA FUNCIONANDO PERFEITAMENTE!');
      console.log('✅ Cadastro → Profile → Role → Tudo OK');
      console.log('\n📋 PRÓXIMO PASSO:');
      console.log('Teste o cadastro na aplicação web agora!');
    } else {
      console.log('⚠️  Ainda há problemas a resolver');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

clearAndTest();
