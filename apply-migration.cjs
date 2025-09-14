const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function applyMigration() {
  console.log('Aplicando migração para adicionar colunas faltantes...');

  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250913200000_add_missing_clinicas_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executando SQL:');
    console.log('-'.repeat(50));
    console.log(migrationSQL);
    console.log('-'.repeat(50));

    // Dividir o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('COMMENT'));

    console.log(`\nExecutando ${commands.length} comandos...`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.length > 0) {
        console.log(`\n[${i + 1}/${commands.length}] Executando comando...`);
        console.log(command.substring(0, 100) + (command.length > 100 ? '...' : ''));
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql: command + ';' 
          });
          
          if (error) {
            console.error(`❌ Erro no comando ${i + 1}:`, error.message);
            if (error.message.includes('already exists') || error.message.includes('does not exist')) {
              console.log('⚠️ Comando ignorado (recurso já existe ou não existe)');
              continue;
            }
            // Se não for um erro de "já existe", podemos tentar continuar
          } else {
            console.log('✅ Comando executado com sucesso');
          }
        } catch (cmdError) {
          console.error(`❌ Erro ao executar comando ${i + 1}:`, cmdError.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('MIGRAÇÃO CONCLUÍDA');
    console.log('='.repeat(60));

    // Verificar se as colunas foram adicionadas
    console.log('\nVerificando se as colunas foram adicionadas...');
    
    const fieldsToCheck = ['cnpj', 'endereco', 'telefone_principal', 'email_contato', 'horario_funcionamento', 'organizacao_id'];
    
    for (const field of fieldsToCheck) {
      try {
        const { error } = await supabase
          .from('clinicas')
          .select(field)
          .limit(1);
        
        if (!error) {
          console.log(`✅ ${field} - adicionado com sucesso`);
        } else {
          console.log(`❌ ${field} - ainda não existe: ${error.message}`);
        }
      } catch (e) {
        console.log(`❌ ${field} - erro na verificação: ${e.message}`);
      }
    }

  } catch (err) {
    console.error('Erro geral:', err.message);
  }
}

applyMigration();