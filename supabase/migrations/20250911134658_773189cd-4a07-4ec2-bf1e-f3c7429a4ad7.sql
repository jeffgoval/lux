-- Corrigir estrutura final - verificando o que já existe

-- 1. Limpar dados incorretos da tabela especialidades_medicas
TRUNCATE TABLE public.especialidades_medicas;

-- 2. Dropar e recriar enum especialidade_medica apenas com médicos
DROP TYPE IF EXISTS public.especialidade_medica CASCADE;
CREATE TYPE public.especialidade_medica AS ENUM (
  'dermatologia',
  'cirurgia_plastica'
);

-- 3. Recriar coluna codigo na tabela especialidades_medicas
ALTER TABLE public.especialidades_medicas 
DROP COLUMN IF EXISTS codigo CASCADE;

ALTER TABLE public.especialidades_medicas 
ADD COLUMN codigo public.especialidade_medica NOT NULL;

-- 4. Popular com especialidades médicas corretas
INSERT INTO public.especialidades_medicas (codigo, nome, descricao, conselho_regulamentador, requisitos) VALUES
('dermatologia', 'Dermatologia', 'Especialidade médica que se ocupa do diagnóstico, prevenção e tratamento de doenças e afecções relacionadas à pele, pelos, mucosas, cabelo e unhas', 'CRM', 'Residência médica em Dermatologia (3 anos) ou título de especialista pela SBD'),
('cirurgia_plastica', 'Cirurgia Plástica', 'Especialidade médica que tem por objetivo a reconstituição de uma parte do corpo humano por razões médicas ou estéticas', 'CRM', 'Residência médica em Cirurgia Plástica (5 anos) ou título de especialista pela SBCP');

-- 5. Atualizar profissionais_especialidades para usar especialidade_estetica (se não estiver já)
DO $$
BEGIN
    -- Tentar alterar a coluna especialidade para usar o enum correto
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profissionais_especialidades' 
               AND column_name = 'especialidade' 
               AND table_schema = 'public') THEN
        
        -- Dropar a coluna existente e recriar
        ALTER TABLE public.profissionais_especialidades 
        DROP COLUMN especialidade CASCADE;
        
        ALTER TABLE public.profissionais_especialidades 
        ADD COLUMN especialidade public.especialidade_estetica NOT NULL DEFAULT 'esteticista';
    END IF;
END
$$;