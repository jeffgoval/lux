const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Usar a chave de service role se disponível para operações administrativas
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function addColumnsDirectly() {
  console.log('Tentativa de adicionar colunas diretamente...');
  
  // Como não podemos alterar a estrutura via cliente JS,
  // vamos documentar exatamente o que precisa ser executado
  
  const sqlCommands = [
    "ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS cnpj TEXT;",
    "ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS endereco JSONB DEFAULT '{}'::jsonb;",
    "ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS telefone_principal TEXT;",
    "ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS email_contato TEXT;",
    "ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS horario_funcionamento JSONB DEFAULT '{}'::jsonb;",
    "ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE SET NULL;",
    "ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS especialidades TEXT[];"
  ];

  console.log('\\n' + '='.repeat(80));
  console.log('COMANDOS SQL PARA EXECUTAR NO CONSOLE DO SUPABASE:');
  console.log('='.repeat(80));
  console.log('\\nVá para o Dashboard do Supabase → SQL Editor e execute:');
  console.log('\\n');
  
  sqlCommands.forEach((cmd, i) => {
    console.log(`-- Comando ${i + 1}:`);
    console.log(cmd);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('APÓS EXECUTAR OS COMANDOS ACIMA, RODE O SCRIPT DE VERIFICAÇÃO:');
  console.log('node inspect-database-schema.cjs');
  console.log('='.repeat(80));

  // Também vamos tentar uma abordagem de verificação
  console.log('\\nVerificando estado atual das colunas...');
  
  const fieldsToCheck = ['id', 'nome', 'ativo', 'criado_em'];
  
  try {
    // Primeiro verificamos se podemos acessar colunas existentes
    const { data, error } = await supabase
      .from('clinicas')
      .select(fieldsToCheck.join(', '))
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao verificar tabela clinicas:', error.message);
    } else {
      console.log('✅ Tabela clinicas é acessível');
      console.log('Dados de exemplo:', data);
    }
  } catch (e) {
    console.error('❌ Erro na verificação:', e.message);
  }
}

addColumnsDirectly();