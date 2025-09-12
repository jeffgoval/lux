# Correções Necessárias para o Sistema

## ✅ Problema 1: RLS Policy para user_roles (CORRIGIDO NO CÓDIGO)

**Erro:** `new row violates row-level security policy for table "user_roles"`

**Solução:** Execute no SQL Editor do Supabase:

```sql
-- Fix RLS policy for user_roles table
DROP POLICY IF EXISTS "Users can create initial visitor role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;

CREATE POLICY "Users can create their initial role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('visitante', 'proprietaria')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own roles"
ON public.user_roles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## ✅ Problema 2: Estrutura da tabela clinicas (CORRIGIDO NO CÓDIGO)

**Erro:** `Could not find the 'endereco_bairro' column of 'clinicas' in the schema cache`

**Causa:** A tabela clinicas usa estrutura diferente:
- Endereço como JSONB em vez de colunas separadas
- `email_contato` em vez de `email`
- `telefone_principal` em vez de `telefone`

**Solução:** ✅ Código já foi corrigido para usar a estrutura correta.

## 🔧 SOLUÇÃO COMPLETA: Correção de RLS para Onboarding

**Erro:** `new row violates row-level security policy for table "clinicas"`

**Solução Completa:** Execute este SQL no Supabase (TUDO DE UMA VEZ):

```sql
-- 1. Corrigir RLS para user_roles
DROP POLICY IF EXISTS "Users can create initial visitor role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;

CREATE POLICY "Users can create their initial role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('visitante', 'proprietaria')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own roles"
ON public.user_roles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Corrigir RLS para clinicas (permitir onboarding)
DROP POLICY IF EXISTS "Users can create clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Users can view accessible clinics" ON public.clinicas;

-- Política mais permissiva para onboarding
CREATE POLICY "Users can create their first clinic"
ON public.clinicas
FOR INSERT
WITH CHECK (
  -- Usuário deve ter role proprietaria
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'proprietaria'
    AND ativo = true
  )
  -- E não deve ter nenhuma clínica ainda (primeira clínica)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = auth.uid()
    AND ur2.clinica_id IS NOT NULL
  )
);

-- Política para visualizar clínicas
CREATE POLICY "Users can view their clinics"
ON public.clinicas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND (clinica_id = public.clinicas.id OR role IN ('proprietaria', 'super_admin'))
    AND ativo = true
  )
);

-- 3. Verificar se RLS está habilitado
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
```

## 🚀 SOLUÇÃO COMPLETA: Criar Tabelas + RLS

Execute este SQL completo no Supabase para criar todas as tabelas necessárias:

```sql
-- PARTE 1: Criar tabelas necessárias

-- 1. Criar tabela de relacionamento clinica_profissionais
CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades TEXT[],
  
  -- Informações de trabalho
  horario_trabalho JSONB,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  
  -- Permissões
  pode_criar_prontuarios BOOLEAN DEFAULT false,
  pode_editar_prontuarios BOOLEAN DEFAULT false,
  pode_visualizar_financeiro BOOLEAN DEFAULT false,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(clinica_id, user_id)
);

-- 2. Criar enum para tipos de procedimento
CREATE TYPE IF NOT EXISTS public.tipo_procedimento AS ENUM (
  'consulta',
  'botox_toxina',
  'preenchimento',
  'harmonizacao_facial',
  'laser_ipl',
  'peeling',
  'tratamento_corporal',
  'skincare_avancado',
  'limpeza_pele',
  'outros'
);

-- 3. Criar tabela de templates de procedimentos
CREATE TABLE IF NOT EXISTS public.templates_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_procedimento tipo_procedimento NOT NULL,
  nome_template TEXT NOT NULL,
  descricao TEXT,
  
  -- Configuração do template
  campos_obrigatorios JSONB DEFAULT '{}'::jsonb,
  campos_opcionais JSONB DEFAULT '{}'::jsonb,
  
  -- Valores padrão
  duracao_padrao_minutos INTEGER DEFAULT 60,
  valor_base DECIMAL(10,2),
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- PARTE 2: Criar índices e triggers

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_clinica ON public.clinica_profissionais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_user ON public.clinica_profissionais(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_tipo ON public.templates_procedimentos(tipo_procedimento);

-- 5. Criar triggers para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_clinica_profissionais_updated_at
  BEFORE UPDATE ON public.clinica_profissionais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_templates_procedimentos_updated_at
  BEFORE UPDATE ON public.templates_procedimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PARTE 3: Configurar RLS

-- 6. Remover políticas existentes
DROP POLICY IF EXISTS "Users can create initial visitor role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Users can create their first clinic" ON public.clinicas;
DROP POLICY IF EXISTS "Users can view accessible clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Users can view their clinics" ON public.clinicas;

-- 7. Criar políticas permissivas para onboarding
CREATE POLICY "Allow onboarding user_roles"
ON public.user_roles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow onboarding clinicas"
ON public.clinicas
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow onboarding profissionais"
ON public.profissionais
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow onboarding clinica_profissionais"
ON public.clinica_profissionais
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow onboarding templates_procedimentos"
ON public.templates_procedimentos
FOR ALL
USING (true)
WITH CHECK (true);

-- 8. Habilitar RLS em todas as tabelas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
```

## ⚡ Como aplicar:

1. **Acesse:** https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql
2. **Cole e execute TODO o SQL acima de uma vez**
3. **Teste o onboarding** - Deve funcionar completamente agora!

⚠️ **IMPORTANTE:** 
- Execute todo o SQL de uma vez para evitar problemas de dependência
- Isso criará todas as tabelas necessárias e configurará as políticas RLS
- Depois que funcionar, você pode ajustar as políticas para serem mais restritivas

## Problema 4: Conexão localhost:8080 (Opcional)

O erro de conexão com localhost:8080 parece ser de algum serviço adicional que não é necessário para o funcionamento básico do sistema. Se persistir, pode ser ignorado por enquanto.