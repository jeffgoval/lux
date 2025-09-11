-- Simplificar sistema de auth e criar estruturas para onboarding

-- 1. Atualizar função handle_new_user para role proprietaria automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar perfil do usuário
  INSERT INTO public.profiles (
    user_id, 
    nome_completo, 
    email, 
    primeiro_acesso
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', ''),
    NEW.email,
    true
  );

  -- Atribuir role proprietaria automaticamente para todos novos usuários
  INSERT INTO public.user_roles (
    user_id,
    role,
    ativo,
    criado_por
  ) VALUES (
    NEW.id,
    'proprietaria'::user_role_type,
    true,
    NEW.id
  );

  RETURN NEW;
END;
$function$;

-- 2. Criar tabela de organizações
CREATE TABLE IF NOT EXISTS public.organizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  descricao TEXT,
  proprietaria_id UUID NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Criar tabela de clínicas
CREATE TABLE IF NOT EXISTS public.clinicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco_rua TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  endereco_cep TEXT,
  telefone TEXT,
  email TEXT,
  site TEXT,
  horario_funcionamento JSONB,
  configuracoes JSONB DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Criar tabela de profissionais
CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  clinica_id UUID NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  especialidade TEXT,
  registro_profissional TEXT,
  configuracoes JSONB DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Criar tabela de serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  preco DECIMAL(10,2),
  categoria TEXT,
  configuracoes JSONB DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Habilitar RLS nas novas tabelas
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS
CREATE POLICY "Proprietárias podem gerenciar suas organizações" 
ON public.organizacoes 
FOR ALL 
USING (auth.uid() = proprietaria_id);

CREATE POLICY "Usuários podem ver organizações de suas clínicas" 
ON public.organizacoes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas c 
    JOIN public.profissionais p ON p.clinica_id = c.id 
    WHERE c.organizacao_id = organizacoes.id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Proprietárias podem gerenciar clínicas de suas organizações" 
ON public.clinicas 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.organizacoes o 
    WHERE o.id = clinicas.organizacao_id AND o.proprietaria_id = auth.uid()
  )
);

CREATE POLICY "Profissionais podem ver suas clínicas" 
ON public.clinicas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profissionais p 
    WHERE p.clinica_id = clinicas.id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários autenticados podem gerenciar profissionais de suas clínicas" 
ON public.profissionais 
FOR ALL 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.clinicas c 
    JOIN public.organizacoes o ON o.id = c.organizacao_id 
    WHERE c.id = profissionais.clinica_id AND o.proprietaria_id = auth.uid()
  )
);

CREATE POLICY "Usuários autenticados podem gerenciar serviços de suas clínicas" 
ON public.servicos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas c 
    JOIN public.organizacoes o ON o.id = c.organizacao_id 
    WHERE c.id = servicos.clinica_id AND o.proprietaria_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profissionais p 
    WHERE p.clinica_id = servicos.clinica_id AND p.user_id = auth.uid()
  )
);

-- 8. Adicionar foreign keys
ALTER TABLE public.clinicas 
ADD CONSTRAINT fk_clinicas_organizacao 
FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE;

ALTER TABLE public.profissionais 
ADD CONSTRAINT fk_profissionais_clinica 
FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE CASCADE;

ALTER TABLE public.servicos 
ADD CONSTRAINT fk_servicos_clinica 
FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE CASCADE;

-- 9. Adicionar coluna organizacao_id e clinica_id ao user_roles para relacionamento
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS organizacao_id UUID,
ADD COLUMN IF NOT EXISTS clinica_id UUID;