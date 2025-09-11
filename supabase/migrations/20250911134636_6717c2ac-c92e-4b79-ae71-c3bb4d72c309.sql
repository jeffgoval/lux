-- Corrigir estrutura de especialidades e popular tabelas

-- 1. Primeiro, limpar dados da tabela especialidades_medicas
TRUNCATE TABLE public.especialidades_medicas;

-- 2. Verificar e recriar enum especialidade_medica
DROP TYPE IF EXISTS public.especialidade_medica CASCADE;
CREATE TYPE public.especialidade_medica AS ENUM (
  'dermatologia',
  'cirurgia_plastica'
);

-- 3. Recriar a coluna codigo com o novo enum
ALTER TABLE public.especialidades_medicas 
DROP COLUMN IF EXISTS codigo CASCADE;

ALTER TABLE public.especialidades_medicas 
ADD COLUMN codigo public.especialidade_medica NOT NULL;

-- 4. Criar enum para especialidades estéticas não-médicas
CREATE TYPE public.especialidade_estetica AS ENUM (
  'esteticista',
  'micropigmentacao', 
  'design_sobrancelhas',
  'extensao_cilios',
  'massoterapia',
  'depilacao',
  'podologia',
  'cosmetologia',
  'harmonizacao_orofacial',
  'limpeza_pele',
  'drenagem_linfatica'
);

-- 5. Popular especialidades médicas corretas
INSERT INTO public.especialidades_medicas (codigo, nome, descricao, conselho_regulamentador, requisitos) VALUES
('dermatologia', 'Dermatologia', 'Especialidade médica que se ocupa do diagnóstico, prevenção e tratamento de doenças e afecções relacionadas à pele, pelos, mucosas, cabelo e unhas', 'CRM', 'Residência médica em Dermatologia (3 anos) ou título de especialista pela SBD'),
('cirurgia_plastica', 'Cirurgia Plástica', 'Especialidade médica que tem por objetivo a reconstituição de uma parte do corpo humano por razões médicas ou estéticas', 'CRM', 'Residência médica em Cirurgia Plástica (5 anos) ou título de especialista pela SBCP');

-- 6. Atualizar tabela profissionais_especialidades
-- Primeiro dropar a coluna e recriar com o novo tipo
ALTER TABLE public.profissionais_especialidades 
DROP COLUMN IF EXISTS especialidade CASCADE;

ALTER TABLE public.profissionais_especialidades 
ADD COLUMN especialidade public.especialidade_estetica NOT NULL DEFAULT 'esteticista';

-- 7. Comentários para documentar
COMMENT ON TABLE public.especialidades_medicas IS 'Especialidades médicas regulamentadas (CRM) - apenas médicos';
COMMENT ON TABLE public.profissionais_especialidades IS 'Especialidades estéticas não-médicas - profissionais da área estética';
COMMENT ON TYPE public.especialidade_medica IS 'Enum para especialidades médicas regulamentadas';
COMMENT ON TYPE public.especialidade_estetica IS 'Enum para especialidades estéticas não-médicas';