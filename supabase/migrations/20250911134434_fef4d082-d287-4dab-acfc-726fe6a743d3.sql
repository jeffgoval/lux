-- Corrigir estrutura de especialidades e popular tabelas

-- 1. Primeiro, limpar dados incorretos da tabela especialidades_medicas
DELETE FROM public.especialidades_medicas;

-- 2. Recriar enum especialidade_medica apenas com especialidades médicas reais
DROP TYPE IF EXISTS public.especialidade_medica CASCADE;
CREATE TYPE public.especialidade_medica AS ENUM (
  'dermatologia',
  'cirurgia_plastica'
);

-- 3. Criar enum para especialidades estéticas não-médicas
DROP TYPE IF EXISTS public.especialidade_estetica CASCADE;
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

-- 4. Atualizar tabela especialidades_medicas com apenas especialidades médicas
INSERT INTO public.especialidades_medicas (codigo, nome, descricao, conselho_regulamentador, requisitos) VALUES
('dermatologia', 'Dermatologia', 'Especialidade médica que se ocupa do diagnóstico, prevenção e tratamento de doenças e afecções relacionadas à pele, pelos, mucosas, cabelo e unhas', 'CRM', 'Residência médica em Dermatologia (3 anos) ou título de especialista pela SBD'),
('cirurgia_plastica', 'Cirurgia Plástica', 'Especialidade médica que tem por objetivo a reconstituição de uma parte do corpo humano por razões médicas ou estéticas', 'CRM', 'Residência médica em Cirurgia Plástica (5 anos) ou título de especialista pela SBCP');

-- 5. Atualizar tabela profissionais_especialidades para usar o novo enum
ALTER TABLE public.profissionais_especialidades 
ALTER COLUMN especialidade TYPE public.especialidade_estetica 
USING especialidade::public.especialidade_estetica;

-- 6. Popular tabela user_roles com roles básicas do sistema
INSERT INTO public.user_roles (role, user_id, criado_por, ativo) 
SELECT 
  role_enum::user_role_type,
  '00000000-0000-0000-0000-000000000000'::uuid, -- Placeholder UUID para o sistema
  '00000000-0000-0000-0000-000000000000'::uuid,
  false -- Inativo por padrão, será ativado quando um usuário real receber a role
FROM (
  VALUES 
    ('super_admin'),
    ('proprietaria'), 
    ('gerente'),
    ('profissionais'),
    ('recepcionistas'),
    ('visitante')
) AS roles(role_enum)
ON CONFLICT DO NOTHING;

-- 7. Remover os registros placeholder (eram apenas para definir as roles disponíveis)
DELETE FROM public.user_roles WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 8. Comentários para documentar a estrutura
COMMENT ON TABLE public.especialidades_medicas IS 'Especialidades médicas regulamentadas (CRM) - apenas médicos';
COMMENT ON TABLE public.profissionais_especialidades IS 'Especialidades estéticas não-médicas - profissionais da área estética';
COMMENT ON TYPE public.especialidade_medica IS 'Enum para especialidades médicas regulamentadas';
COMMENT ON TYPE public.especialidade_estetica IS 'Enum para especialidades estéticas não-médicas';