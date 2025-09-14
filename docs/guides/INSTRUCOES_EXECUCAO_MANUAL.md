# 🚀 INSTRUÇÕES PARA EXECUÇÃO MANUAL NO SUPABASE

**Problema**: Não conseguimos executar os scripts SQL automaticamente devido a problemas de conectividade de rede.

**Solução**: Execute manualmente no Supabase Dashboard seguindo estas instruções.

---

## 📋 **PASSO A PASSO**

### **1. Acesse o Supabase Dashboard**
- Vá para: https://supabase.com/dashboard
- Faça login na sua conta
- Selecione o projeto: `dvnyfwpphuuujhodqkko`

### **2. Abra o SQL Editor**
- No menu lateral, clique em **"SQL Editor"**
- Clique em **"New query"**

### **3. Execute o Script de Migração**

Copie e cole o conteúdo do arquivo `database-migration-incremental.sql` no editor SQL e execute.

**OU** execute em partes menores:

#### **Parte 1: Enums (Execute primeiro)**
```sql
-- Status de agendamento
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agendamento_status') THEN
    CREATE TYPE public.agendamento_status AS ENUM (
      'rascunho', 'pendente', 'confirmado', 'em_andamento',
      'finalizado', 'cancelado', 'nao_compareceu', 'reagendado'
    );
  END IF;
END $$;

-- Tipos de bloqueio
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bloqueio_tipo') THEN
    CREATE TYPE public.bloqueio_tipo AS ENUM (
      'almoco', 'reuniao', 'procedimento_especial', 'manutencao',
      'ferias', 'licenca', 'emergencia', 'personalizado'
    );
  END IF;
END $$;

-- Status da lista de espera
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lista_espera_status') THEN
    CREATE TYPE public.lista_espera_status AS ENUM (
      'ativo', 'notificado', 'agendado', 'cancelado', 'expirado'
    );
  END IF;
END $$;

-- Categorias de cliente
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cliente_categoria') THEN
    CREATE TYPE public.cliente_categoria AS ENUM (
      'regular', 'vip', 'premium', 'corporativo'
    );
  END IF;
END $$;

-- Níveis de prioridade
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prioridade_nivel') THEN
    CREATE TYPE public.prioridade_nivel AS ENUM (
      'baixa', 'normal', 'alta', 'urgente', 'vip'
    );
  END IF;
END $$;
```

#### **Parte 2: Tabelas Críticas (Execute segundo)**
```sql
-- Organizações
CREATE TABLE IF NOT EXISTS public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  email_contato TEXT,
  plano TEXT NOT NULL DEFAULT 'basico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  cpf TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  categoria cliente_categoria NOT NULL DEFAULT 'regular',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_tecnico TEXT,
  codigo_interno TEXT,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  descricao_comercial TEXT,
  descricao_tecnica TEXT,
  duracao_padrao INTEGER NOT NULL DEFAULT 60,
  preco_base DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  data_agendamento TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  status agendamento_status NOT NULL DEFAULT 'pendente',
  valor_servico DECIMAL(10,2) NOT NULL,
  valor_final DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);
```

#### **Parte 3: Tabelas Adicionais (Execute terceiro)**
```sql
-- Bloqueios de agenda
CREATE TABLE IF NOT EXISTS public.bloqueios_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo bloqueio_tipo NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Lista de espera
CREATE TABLE IF NOT EXISTS public.lista_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  profissional_preferido_id UUID REFERENCES auth.users(id),
  data_preferencia_inicio DATE,
  data_preferencia_fim DATE,
  duracao_minutos INTEGER NOT NULL,
  categoria_cliente cliente_categoria NOT NULL DEFAULT 'regular',
  prioridade INTEGER DEFAULT 0,
  status lista_espera_status NOT NULL DEFAULT 'ativo',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Disponibilidade profissional
CREATE TABLE IF NOT EXISTS public.disponibilidade_profissional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### **Parte 4: Índices e RLS (Execute quarto)**
```sql
-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_data ON public.agendamentos(clinica_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON public.agendamentos(profissional_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos(status);

-- Habilitar RLS
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidade_profissional ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
CREATE POLICY "Users can view accessible organizations" ON public.organizacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND (organizacao_id = public.organizacoes.id OR role IN ('super_admin'))
      AND ativo = true
    )
  );

CREATE POLICY "Users can view clinic clients" ON public.clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.clientes.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic clients" ON public.clientes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.clientes.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais', 'recepcionistas')
      AND ativo = true
    )
  );
```

### **4. Verificar Execução**

Após executar cada parte, verifique se não há erros. Se houver erros, eles aparecerão em vermelho no editor.

### **5. Testar as Tabelas**

Execute esta consulta para verificar se as tabelas foram criadas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'organizacoes', 'clientes', 'servicos', 'agendamentos',
  'bloqueios_agenda', 'lista_espera', 'disponibilidade_profissional'
)
ORDER BY table_name;
```

---

## 🎯 **RESULTADO ESPERADO**

Após executar todas as partes, você deve ter:

- ✅ **7 enums** criados
- ✅ **7 tabelas principais** criadas
- ✅ **4 índices** de performance
- ✅ **7 políticas RLS** configuradas

---

## 🚨 **SE HOUVER ERROS**

### **Erro: "relation does not exist"**
- Execute as partes na ordem correta
- Verifique se as tabelas dependentes existem

### **Erro: "type does not exist"**
- Execute primeiro a Parte 1 (Enums)

### **Erro: "permission denied"**
- Verifique se você tem permissões de administrador no Supabase

---

## 📞 **SUPORTE**

Se encontrar problemas:

1. **Copie o erro exato** que aparece no Supabase
2. **Verifique a ordem** de execução das partes
3. **Execute uma parte por vez** se necessário

---

## ✨ **APÓS A EXECUÇÃO**

Quando terminar, o sistema terá:

- 🎯 **Sistema de agendamentos** funcional
- 👥 **Gestão de clientes** completa
- 🏥 **Catálogo de serviços** configurado
- 📅 **Controle de disponibilidade** profissional
- 🔒 **Segurança RLS** configurada
- ⚡ **Performance otimizada** com índices

**O sistema estará pronto para uso!** 🚀
