# 🚀 INSTRUÇÕES FINAIS PARA CORRIGIR O ONBOARDING

## ✅ Status Atual
- **Código corrigido** ✅ - Adaptado para a estrutura real do banco
- **Políticas RLS básicas** ✅ - Já aplicadas (clínicas funcionando)
- **Tabelas faltando** ❌ - Precisam ser criadas

## 🎯 O que falta fazer

### 1. Criar as tabelas necessárias

Execute o SQL abaixo no **Supabase SQL Editor**:
🔗 https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql

```sql
-- 1. Criar tabela clinica_profissionais
CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades TEXT[],
  horario_trabalho JSONB,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  pode_criar_prontuarios BOOLEAN DEFAULT false,
  pode_editar_prontuarios BOOLEAN DEFAULT false,
  pode_visualizar_financeiro BOOLEAN DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinica_id, user_id)
);

-- 2. Criar enum tipo_procedimento
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

-- 3. Criar tabela templates_procedimentos
CREATE TABLE IF NOT EXISTS public.templates_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_procedimento tipo_procedimento NOT NULL,
  nome_template TEXT NOT NULL,
  descricao TEXT,
  campos_obrigatorios JSONB DEFAULT '{}'::jsonb,
  campos_opcionais JSONB DEFAULT '{}'::jsonb,
  duracao_padrao_minutos INTEGER DEFAULT 60,
  valor_base DECIMAL(10,2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_clinica ON public.clinica_profissionais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_user ON public.clinica_profissionais(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_tipo ON public.templates_procedimentos(tipo_procedimento);

-- 5. Criar função para trigger (se não existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Criar triggers
DROP TRIGGER IF EXISTS update_clinica_profissionais_updated_at ON public.clinica_profissionais;
CREATE TRIGGER update_clinica_profissionais_updated_at
  BEFORE UPDATE ON public.clinica_profissionais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_procedimentos_updated_at ON public.templates_procedimentos;
CREATE TRIGGER update_templates_procedimentos_updated_at
  BEFORE UPDATE ON public.templates_procedimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Habilitar RLS e criar políticas
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;

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
```

## 🎉 Depois de executar o SQL

1. **Recarregue a página** do seu app
2. **Teste o onboarding** - deve funcionar completamente agora!

## 📋 O que foi corrigido no código

- ✅ **Estrutura da tabela clinicas** - Usa JSONB para endereço
- ✅ **Campos corretos** - `email_contato`, `telefone_principal`
- ✅ **Tabela profissionais** - Cria registro + relação em `clinica_profissionais`
- ✅ **Templates de procedimento** - Em vez de tabela `servicos` simples
- ✅ **Políticas RLS** - Permissivas para onboarding

## 🔧 Arquivos criados

- `temp_onboarding_setup.sql` - SQL completo para executar
- `supabase/migrations/20250912050000_create_onboarding_tables.sql` - Migração
- Código atualizado em `src/components/OnboardingWizard.tsx`

## ⚠️ Importante

Depois que o onboarding funcionar, você pode ajustar as políticas RLS para serem mais restritivas conforme necessário.

---

**🎯 PRÓXIMO PASSO: Execute o SQL acima no Supabase e teste o onboarding!**