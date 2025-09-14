-- =====================================================
-- SEED: ESPECIALIDADES MÉDICAS
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- Especialidades médicas fundamentais para clínicas estéticas
INSERT INTO public.especialidades_medicas (
  nome,
  descricao,
  codigo_cbhm,
  requer_certificacao,
  nivel_acesso_minimo,
  ativo,
  categoria
) VALUES 
-- Dermatologia
('Dermatologia', 'Especialidade médica focada em doenças da pele', 'CBHM-DERM', true, 'profissionais', true, 'medica'),
('Dermatologia Estética', 'Tratamentos estéticos dermatológicos', 'CBHM-DERMEST', true, 'profissionais', true, 'estetica'),

-- Cirurgia Plástica
('Cirurgia Plástica', 'Procedimentos cirúrgicos reparadores e estéticos', 'CBHM-CIRPLAS', true, 'profissionais', true, 'cirurgica'),
('Cirurgia Plástica Facial', 'Especialização em harmonização facial', 'CBHM-CIRFAC', true, 'profissionais', true, 'cirurgica'),

-- Medicina Estética
('Medicina Estética', 'Procedimentos minimamente invasivos', 'CBHM-MEDEST', true, 'profissionais', true, 'estetica'),
('Harmonização Facial', 'Técnicas de preenchimento e toxina botulínica', 'CBHM-HARMFAC', true, 'profissionais', true, 'estetica'),

-- Enfermagem Especializada
('Enfermagem Dermatológica', 'Enfermagem especializada em dermatologia', 'COREN-DERM', true, 'profissionais', true, 'enfermagem'),
('Enfermagem Estética', 'Procedimentos estéticos de enfermagem', 'COREN-EST', true, 'profissionais', true, 'enfermagem'),

-- Biomedicina
('Biomedicina Estética', 'Procedimentos biomédicos estéticos', 'CRBM-EST', true, 'profissionais', true, 'biomedica'),
('Análises Clínicas', 'Exames e análises laboratoriais', 'CRBM-AC', true, 'profissionais', true, 'biomedica'),

-- Fisioterapia
('Fisioterapia Dermatofuncional', 'Tratamentos fisioterápicos estéticos', 'CREFITO-DF', true, 'profissionais', true, 'fisioterapia'),
('Drenagem Linfática', 'Técnicas de drenagem e massoterapia', 'CREFITO-DL', true, 'profissionais', true, 'fisioterapia'),

-- Odontologia
('Odontologia Estética', 'Procedimentos odontológicos estéticos', 'CRO-EST', true, 'profissionais', true, 'odontologica'),
('Harmonização Orofacial', 'HOF - Harmonização da região orofacial', 'CRO-HOF', true, 'profissionais', true, 'odontologica'),

-- Outras Especialidades
('Nutrição Estética', 'Orientação nutricional para tratamentos estéticos', 'CRN-EST', true, 'profissionais', true, 'nutricional'),
('Psicologia Estética', 'Acompanhamento psicológico em tratamentos estéticos', 'CRP-EST', false, 'profissionais', true, 'psicologica'),

-- Técnicos
('Técnico em Estética', 'Procedimentos técnicos em estética', 'TECH-EST', true, 'recepcionistas', true, 'tecnica'),
('Esteticista', 'Tratamentos estéticos não invasivos', 'EST-BASIC', false, 'recepcionistas', true, 'tecnica'),

-- Administrativo
('Gestão de Clínica', 'Administração e gestão de clínicas de estética', 'ADM-CLINIC', false, 'gerente', true, 'administrativa'),
('Atendimento ao Cliente', 'Recepção e atendimento especializado', 'ATEND-ESP', false, 'recepcionistas', true, 'administrativa')

ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  codigo_cbhm = EXCLUDED.codigo_cbhm,
  requer_certificacao = EXCLUDED.requer_certificacao,
  nivel_acesso_minimo = EXCLUDED.nivel_acesso_minimo,
  categoria = EXCLUDED.categoria,
  atualizado_em = now();

-- Log de inserção
DO $$ 
BEGIN 
  RAISE NOTICE '[SEED] Especialidades médicas inseridas: % registros', (
    SELECT COUNT(*) FROM public.especialidades_medicas WHERE ativo = true
  ); 
END $$;