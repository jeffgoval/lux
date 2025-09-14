const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Carregar variáveis de ambiente
const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, value] = trimmed.split('=');
    if (key && value) {
      env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function executeSqlScript() {
  try {
    console.log('🚀 Executando script de recriação da tabela profiles...\n');
    
    // Ler o script SQL
    const sqlScript = fs.readFileSync('fix_profiles_table.sql', 'utf8');
    
    // Dividir o script em comandos individuais (separados por ';')
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Executando ${commands.length} comandos SQL...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Pular blocos DO que não são comandos únicos
      if (command.includes('DO $') || command.length < 10) {
        continue;
      }
      
      console.log(`[${i + 1}/${commands.length}] Executando comando...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: command + ';' 
        });
        
        if (error) {
          console.error(`❌ Erro no comando ${i + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
          successCount++;
        }
        
        // Pequena pausa entre comandos
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`❌ Erro inesperado no comando ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Resumo da execução:`);
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    
    // Verificar se a tabela foi criada corretamente
    console.log('\n🔍 Verificando tabela profiles...');
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);
    
    if (profileError) {
      console.log('❌ Tabela profiles ainda não está acessível:', profileError.message);
    } else {
      console.log('✅ Tabela profiles criada e acessível!');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

executeSqlScript();