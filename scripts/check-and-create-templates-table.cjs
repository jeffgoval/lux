const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndCreateTemplatesTable() {
  console.log('🔍 VERIFICANDO TABELA templates_procedimentos...\n');

  try {
    // 1. Verificar se a tabela existe
    console.log('1. Testando acesso à tabela...');
    const { data, error } = await supabase
      .from('templates_procedimentos')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Tabela não existe ou não é acessível:', error.message);
      console.log('📋 Código:', error.code);
      
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log('\n🔧 CRIANDO TABELA templates_procedimentos...');
        
        // Criar a tabela via SQL
        const createTableSQL = `
          -- Verificar se o tipo existe
          DO $$ 
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_procedimento') THEN
              CREATE TYPE tipo_procedimento AS ENUM (
                'consulta',
                'procedimento_estetico',
                'tratamento_facial',
                'tratamento_corporal',
                'depilacao',
                'massagem',
                'limpeza_pele',
                'peeling',
                'microagulhamento',
                'radiofrequencia',
                'criolipólise',
                'drenagem_linfatica',
                'outros'
              );
            END IF;
          END $$;

          -- Criar tabela templates_procedimentos
          CREATE TABLE IF NOT EXISTS public.templates_procedimentos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
            tipo_procedimento tipo_procedimento NOT NULL,
            nome_template TEXT NOT NULL,
            descricao TEXT,
            campos_obrigatorios JSONB DEFAULT '{}'::jsonb,
            campos_opcionais JSONB DEFAULT '{}'::jsonb,
            duracao_padrao_minutos INTEGER DEFAULT 60,
            valor_base DECIMAL(10,2),
            instrucoes_pre TEXT,
            instrucoes_pos TEXT,
            contraindicacoes TEXT,
            ativo BOOLEAN NOT NULL DEFAULT true,
            criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            criado_por UUID REFERENCES auth.users(id)
          );

          -- Habilitar RLS
          ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;

          -- Criar políticas RLS
          CREATE POLICY IF NOT EXISTS "Users can view templates from their clinic" 
          ON public.templates_procedimentos FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
                AND ur.clinica_id = public.templates_procedimentos.clinica_id
                AND ur.ativo = true
            )
          );

          CREATE POLICY IF NOT EXISTS "Users can insert templates for their clinic" 
          ON public.templates_procedimentos FOR INSERT 
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
                AND ur.clinica_id = public.templates_procedimentos.clinica_id
                AND ur.ativo = true
                AND ur.role IN ('proprietaria', 'gerente')
            )
          );

          -- Criar índices
          CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_clinica_id 
          ON public.templates_procedimentos(clinica_id);
          
          CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_tipo 
          ON public.templates_procedimentos(tipo_procedimento);
          
          CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_ativo 
          ON public.templates_procedimentos(ativo);
        `;

        const { error: createError } = await supabase.rpc('exec_sql', { 
          sql: createTableSQL 
        });

        if (createError) {
          console.log('❌ Erro ao criar tabela:', createError.message);
          console.log('📋 Vou tentar uma abordagem alternativa...');
          
          // Tentar criar via query simples
          console.log('\n🔄 Tentativa alternativa...');
          console.log('A tabela precisa ser criada manualmente no Supabase Dashboard.');
          console.log('\n📋 EXECUTE ESTE SQL NO SUPABASE DASHBOARD:');
          console.log('='.repeat(60));
          console.log(createTableSQL);
          console.log('='.repeat(60));
          
        } else {
          console.log('✅ Tabela criada com sucesso!');
        }
      }
    } else {
      console.log('✅ Tabela existe e é acessível!');
      console.log(`📊 Dados encontrados: ${data ? 'Sim' : 'Não'}`);
    }

    // 2. Testar novamente após criação
    console.log('\n2. Testando acesso novamente...');
    const { data: testData, error: testError } = await supabase
      .from('templates_procedimentos')
      .select('count')
      .limit(1);

    if (testError) {
      console.log('❌ Ainda há problemas:', testError.message);
      console.log('\n🎯 SOLUÇÃO:');
      console.log('1. Acesse o Supabase Dashboard');
      console.log('2. Vá para SQL Editor');
      console.log('3. Execute o SQL mostrado acima');
      console.log('4. Teste o cadastro novamente');
    } else {
      console.log('✅ Tabela funcionando perfeitamente!');
      console.log('\n🎉 PROBLEMA RESOLVIDO!');
      console.log('Agora o OnboardingWizard pode inserir templates sem erro.');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkAndCreateTemplatesTable();
